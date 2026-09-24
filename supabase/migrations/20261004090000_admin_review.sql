-- =============================================================================
-- v2 phase 5: admin review of applications, content builders
-- =============================================================================
-- Admins (MFA only) review every submitted application: grade written test
-- answers, watch the videos (each view is logged) and approve or reject with
-- notes. Applications are never edited directly: these audited functions are
-- the only way. Audit entries never contain personal data.
-- =============================================================================

-- Score as a percentage, for the inbox filter.
alter table public.applications add column test_percent numeric(5,1)
  generated always as (case when test_max_score > 0 then round(test_score * 100 / test_max_score, 1) end) stored;
create index applications_percent_idx on public.applications (test_percent) where status <> 'in_progress';

-- Approve or reject (or change a decision) with notes.
create function public.admin_review_application(
  p_application_id uuid, p_decision public.application_status, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.application_status;
begin
  perform private.require_mfa_admin();
  if p_decision not in ('approved', 'rejected') or char_length(p_notes) > 2000 then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  select status into v_old from public.applications where id = p_application_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_old = 'in_progress' then raise exception 'invalid_transition' using errcode = '22023'; end if;
  update public.applications set
    status = p_decision, admin_notes = nullif(trim(p_notes), ''),
    reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = p_application_id;
  perform private.log_audit('application.reviewed', 'application', p_application_id,
                            jsonb_build_object('from', v_old, 'to', p_decision));
end;
$$;

-- Points for a written answer (0 to the question's points); updates the score.
create function public.admin_grade_answer(p_application_id uuid, p_question_id uuid, p_points numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare v_max smallint; v_type public.test_question_type;
begin
  perform private.require_mfa_admin();
  select q.points, q.type into v_max, v_type
    from public.application_test_answers a
    join public.test_questions q on q.id = a.question_id
   where a.application_id = p_application_id and a.question_id = p_question_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_type not in ('short_text', 'long_text') or p_points is null or p_points < 0 or p_points > v_max then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;
  update public.application_test_answers set
    points_awarded = p_points, is_correct = p_points > 0, graded_by = (select auth.uid())
  where application_id = p_application_id and question_id = p_question_id;
  update public.applications set
    test_score = (select coalesce(sum(points_awarded), 0) from public.application_test_answers
                   where application_id = p_application_id)
  where id = p_application_id;
  perform private.log_audit('application.graded', 'application', p_application_id,
                            jsonb_build_object('question', p_question_id, 'points', p_points));
end;
$$;

-- Every time someone opens an applicant's video, it is logged.
create function public.log_video_view(p_application_id uuid, p_question_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_mfa_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.application_videos
                  where application_id = p_application_id and question_id = p_question_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform private.log_audit('application.video_viewed', 'application', p_application_id,
                            jsonb_build_object('question', p_question_id));
end;
$$;

-- One video question set is live; new jobs use it.
create function public.admin_activate_video_set(p_set_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa_admin();
  if not exists (select 1 from public.video_questions where set_id = p_set_id and is_active) then
    raise exception 'incomplete' using errcode = '22023';
  end if;
  update public.video_question_sets set is_active = false where is_active and id <> p_set_id;
  update public.video_question_sets set is_active = true where id = p_set_id;
  perform private.log_audit('video_set.activated', 'video_question_set', p_set_id);
end;
$$;

-- Written questions have no answer key: an empty list removes it.
create or replace function public.admin_set_answer_key(p_question_id uuid, p_correct_options smallint[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_options integer; v_type public.test_question_type;
begin
  perform private.require_mfa_admin();
  select jsonb_array_length(options), type into v_options, v_type
    from public.test_questions where id = p_question_id;
  if v_options is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_type in ('short_text', 'long_text') then
    if cardinality(p_correct_options) > 0 then raise exception 'invalid_option' using errcode = '22023'; end if;
    delete from public.test_answer_keys where question_id = p_question_id;
    return;
  end if;
  if cardinality(p_correct_options) < 1
     or (v_type = 'single_choice' and cardinality(p_correct_options) <> 1)
     or exists (select 1 from unnest(p_correct_options) o where o < 0 or o >= v_options) then
    raise exception 'invalid_option' using errcode = '22023';
  end if;
  insert into public.test_answer_keys (question_id, correct_options)
  values (p_question_id, (select array_agg(distinct o order by o) from unnest(p_correct_options) o))
  on conflict (question_id) do update set correct_options = excluded.correct_options;
  perform private.log_audit('test.answer_key_set', 'test_question', p_question_id);
end;
$$;

-- Reorder video questions within a set.
create function public.admin_swap_video_questions(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_a public.video_questions; v_b public.video_questions;
begin
  perform private.require_mfa_admin();
  select * into v_a from public.video_questions where id = p_a;
  select * into v_b from public.video_questions where id = p_b;
  if v_a.id is null or v_b.id is null or v_a.set_id <> v_b.set_id then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  update public.video_questions set position = v_b.position where id = p_a;
  update public.video_questions set position = v_a.position where id = p_b;
end;
$$;

revoke all on function
  public.admin_review_application(uuid, public.application_status, text),
  public.admin_grade_answer(uuid, uuid, numeric),
  public.log_video_view(uuid, uuid),
  public.admin_activate_video_set(uuid),
  public.admin_swap_video_questions(uuid, uuid)
  from public, anon;
grant execute on function
  public.admin_review_application(uuid, public.application_status, text),
  public.admin_grade_answer(uuid, uuid, numeric),
  public.log_video_view(uuid, uuid),
  public.admin_activate_video_set(uuid),
  public.admin_swap_video_questions(uuid, uuid)
  to authenticated;

-- Video question sets are managed by MFA admins (RLS "admin writes"); the
-- table needs the matching privileges for signed-in users.
grant select, insert, update, delete on public.video_question_sets to authenticated;
