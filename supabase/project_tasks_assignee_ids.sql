-- Run once in Supabase SQL editor to support multiple assignees per task.
alter table public.project_tasks
  add column if not exists assignee_ids jsonb not null default '[]'::jsonb;

-- Backfill existing rows so each task keeps its current assignee.
update public.project_tasks
set assignee_ids = jsonb_build_array(assignee_id)
where assignee_id is not null
  and (assignee_ids is null or assignee_ids = '[]'::jsonb);
