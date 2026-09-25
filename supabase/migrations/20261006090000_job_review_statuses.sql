-- =============================================================================
-- Job review, part 1: new job statuses
-- =============================================================================
-- Jobs now wait for an admin before they appear on the map. Postgres needs a
-- new enum value committed before other statements can use it, so this is a
-- separate file (run it before 20261006090100_job_review.sql).
alter type public.job_status add value if not exists 'pending' before 'published';
alter type public.job_status add value if not exists 'rejected' after 'removed';
