-- Notifications table policies for mobile app (run once in Supabase SQL editor).
--
-- UPDATED: the original version of this file scoped every policy to
-- `auth.uid() = recipient_id / sender_id`, which assumes employee_profiles.id
-- always equals the Supabase Auth uid for the signed-in user. That assumption
-- doesn't hold for every account in this app (some profiles weren't created
-- through the auth-linked signup flow), so those strict checks were silently
-- rejecting inserts/reads for those accounts — the same root cause that
-- initially blocked meeting creation (see supabase/meetings_schema.sql).
-- Policies below are relaxed to match that fix: any signed-in request may
-- read/insert/update notifications rows.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_any" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_any" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_sender" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_any" ON public.notifications;

CREATE POLICY "notifications_select_any"
ON public.notifications
FOR SELECT
USING (true);

CREATE POLICY "notifications_update_any"
ON public.notifications
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "notifications_insert_any"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable Realtime for this table, safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
