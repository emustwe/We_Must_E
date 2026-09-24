-- =============================================================================
-- Admin panel: employee search, video review, content activation, reordering
-- =============================================================================
-- Every function checks for an MFA admin itself and writes audit_logs in the
-- same transaction as the change.

-- Employee search with filters, 20 per page. Returns a DTO, not raw rows.
create function public.admin_search_employees(
  p_query text default null,
  p_city text default null,
  p_status public.employee_status default null,
  p_availability public.availability default null,
  p_min_score numeric default null,
  p_page integer default 0)
returns table (
  user_id uuid, full_name text, headline text, city_emirate text, skills text[],
  availability public.availability[], status public.employee_status,
  test_score numeric, video_count bigint, pending_videos bigint,
  created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_query text := nullif(btrim(p_query), '');
begin
  perform private.require_mfa_admin();
  return query
    with base as (
      select e.user_id, p.full_name, e.headline, e.city_emirate, e.skills, e.availability,
             e.status, e.created_at,
             (select t.score from public.test_attempts t
               where t.employee_id = e.user_id and t.submitted_at is not null
               order by t.submitted_at desc limit 1) as test_score,
             (select count(*) from public.video_resumes v where v.employee_id = e.user_id) as video_count,
             (select count(*) from public.video_resumes v
               where v.employee_id = e.user_id and v.status = 'uploaded') as pending_videos
        from public.employee_profiles e
        join public.profiles p on p.id = e.user_id
       where (v_query is null
              or p.full_name ilike '%' || v_query || '%'
              or e.headline ilike '%' || v_query || '%'
              or exists (select 1 from unnest(e.skills) s where s ilike '%' || v_query || '%'))
         and (p_city is null or e.city_emirate = p_city)
         and (p_status is null or e.status = p_status)
         and (p_availability is null or p_availability = any (e.availability))
    )
    select b.user_id, b.full_name, b.headline, b.city_emirate, b.skills, b.availability, b.status,
           b.test_score, b.video_count, b.pending_videos, b.created_at, count(*) over ()
      from base b
     where p_min_score is null or b.test_score >= p_min_score
     -- Submitted profiles (awaiting review) first, then newest.
     order by (b.status = 'submitted') desc, b.created_at desc
     limit 20 offset greatest(least(coalesce(p_page, 0), 500), 0) * 20;
end;
$$;

-- Approve or reject a video answer. Only approved videos reach employers.
create function public.admin_set_video_status(p_video_id uuid, p_status public.video_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.video_status; v_employee uuid;
begin
  perform private.require_mfa_admin();
  select status, employee_id into v_old, v_employee from public.video_resumes where id = p_video_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_old = p_status then return; end if;
  update public.video_resumes set status = p_status where id = p_video_id;
  perform private.log_audit('video.status_changed', 'video_resume', p_video_id,
    jsonb_build_object('employee_id', v_employee, 'from', v_old, 'to', p_status));
end;
$$;

-- Only one survey / test is active at a time (partial unique index), so
-- activation swaps in a single transaction.
create function public.admin_activate_survey(p_survey_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  if not exists (select 1 from public.surveys where id = p_survey_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  update public.surveys set is_active = false where is_active and id <> p_survey_id;
  update public.surveys set is_active = true where id = p_survey_id;
  perform private.log_audit('survey.activated', 'survey', p_survey_id);
end;
$$;

create function public.admin_activate_test(p_test_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  if not exists (select 1 from public.tests where id = p_test_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.test_questions q
             left join public.test_answer_keys k on k.question_id = q.id
             where q.test_id = p_test_id and k.question_id is null)
     or not exists (select 1 from public.test_questions where test_id = p_test_id) then
    -- Every question needs a correct answer before candidates can take it.
    raise exception 'incomplete' using errcode = '22023';
  end if;
  update public.tests set is_active = false where is_active and id <> p_test_id;
  update public.tests set is_active = true where id = p_test_id;
  perform private.log_audit('test.activated', 'test', p_test_id);
end;
$$;

-- Swap two questions' positions atomically (unique position is deferrable).
create function public.admin_swap_survey_questions(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_a integer; v_b integer; v_sa uuid; v_sb uuid;
begin
  perform private.require_mfa_admin();
  select position, survey_id into v_a, v_sa from public.survey_questions where id = p_a;
  select position, survey_id into v_b, v_sb from public.survey_questions where id = p_b;
  if v_sa is null or v_sa is distinct from v_sb then raise exception 'not_found' using errcode = 'P0002'; end if;
  set constraints public.survey_questions_position_unique deferred;
  update public.survey_questions set position = v_b where id = p_a;
  update public.survey_questions set position = v_a where id = p_b;
end;
$$;

create function public.admin_swap_test_questions(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_a integer; v_b integer; v_ta uuid; v_tb uuid;
begin
  perform private.require_mfa_admin();
  select position, test_id into v_a, v_ta from public.test_questions where id = p_a;
  select position, test_id into v_b, v_tb from public.test_questions where id = p_b;
  if v_ta is null or v_ta is distinct from v_tb then raise exception 'not_found' using errcode = 'P0002'; end if;
  set constraints public.test_questions_position_unique deferred;
  update public.test_questions set position = v_b where id = p_a;
  update public.test_questions set position = v_a where id = p_b;
end;
$$;

-- Video status changes now go through admin_set_video_status() (audited).
drop policy "video_resumes: admin reviews" on public.video_resumes;
revoke update (status) on public.video_resumes from authenticated;

revoke all on function
  public.admin_search_employees(text, text, public.employee_status, public.availability, numeric, integer),
  public.admin_set_video_status(uuid, public.video_status),
  public.admin_activate_survey(uuid),
  public.admin_activate_test(uuid),
  public.admin_swap_survey_questions(uuid, uuid),
  public.admin_swap_test_questions(uuid, uuid)
  from public, anon;
grant execute on function
  public.admin_search_employees(text, text, public.employee_status, public.availability, numeric, integer),
  public.admin_set_video_status(uuid, public.video_status),
  public.admin_activate_survey(uuid),
  public.admin_activate_test(uuid),
  public.admin_swap_survey_questions(uuid, uuid),
  public.admin_swap_test_questions(uuid, uuid)
  to authenticated;
