-- Web + mobile shared chat schema (already live in Supabase).
-- Mobile app reads/writes using these columns — do NOT run if tables exist.

-- chat_channels: id, slug, name, description, is_announcements, channel_type (dm|group|team), created_by, created_at
-- chat_channel_members: channel_id, user_id, role (member|admin), joined_at
-- chat_messages: channel_id, sender_id, sender_name, content, message_type, is_broadcast, media_*, created_at
-- chat_channel_reads: channel_id, user_id, last_read_at

-- DM slug format (web): dm-{uuid}-{uuid}  (sorted user ids)
-- Group slug format (web): group-{timestamp}

-- Enable Realtime in Dashboard → Database → Replication:
--   chat_messages (required)
--   chat_channel_reads (required for live read receipts in direct chat)
--   chat_channels (optional)
