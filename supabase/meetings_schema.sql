-- Meeting & Schedule module — run once in your Supabase SQL Editor.
-- Creates the `meetings` table that backs the in-app Meetings & Schedule module.

create extension if not exists pgcrypto;

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'Team Meeting',
  platform text not null default 'Zoom',
  meeting_link text default '',
  date date not null,
  start_time text not null,
  duration_minutes integer not null default 30,
  agenda text default '',
  participant_ids jsonb not null default '[]'::jsonb,
  participant_names jsonb not null default '[]'::jsonb,
  organizer_id text,
  organizer_name text,
  status text, -- null = auto-derived (Scheduled/Ongoing/Completed from date+time); 'Cancelled' overrides
  created_at timestamptz not null default now()
);

create index if not exists meetings_date_idx on public.meetings(date);
create index if not exists meetings_organizer_id_idx on public.meetings(organizer_id);

alter table public.meetings enable row level security;

drop policy if exists "meetings_select_all" on public.meetings;
drop policy if exists "meetings_insert_own" on public.meetings;
drop policy if exists "meetings_insert_any" on public.meetings;
drop policy if exists "meetings_update_any" on public.meetings;
drop policy if exists "meetings_delete_own" on public.meetings;
drop policy if exists "meetings_delete_any" on public.meetings;

-- Every signed-in teammate can see all company meetings.
create policy "meetings_select_all"
on public.meetings
for select
using (true);

-- Any signed-in teammate can schedule a meeting. (Not restricted to
-- organizer_id = auth.uid() because employee_profiles.id isn't guaranteed
-- to equal the Supabase Auth uid for every account in this app.)
create policy "meetings_insert_any"
on public.meetings
for insert
with check (true);

-- Any signed-in teammate can update a meeting (edit, cancel, drag-and-drop
-- reschedule) — matches how project_tasks are collaboratively editable today.
create policy "meetings_update_any"
on public.meetings
for update
using (true)
with check (true);

-- Any signed-in teammate can delete a meeting.
create policy "meetings_delete_any"
on public.meetings
for delete
using (true);

-- Enable Realtime for this table (equivalent to toggling it on in
-- Dashboard → Database → Replication) so status/reschedule changes push
-- live to every connected device. Wrapped in a check so re-running this
-- file is always safe (ALTER PUBLICATION ... ADD TABLE errors if the
-- table is already in the publication).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'meetings'
  ) then
    alter publication supabase_realtime add table public.meetings;
  end if;
end $$;
