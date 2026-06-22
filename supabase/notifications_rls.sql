-- Notifications table policies for mobile app (run once in Supabase SQL editor).
-- Requires users to sign in with Supabase Auth so auth.uid() matches recipient_id / sender_id.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_sender" ON public.notifications;

CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid()::text);

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid()::text)
WITH CHECK (recipient_id = auth.uid()::text);

CREATE POLICY "notifications_insert_sender"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid()::text);

-- Enable Realtime: Dashboard → Database → Replication → add "notifications" table.
