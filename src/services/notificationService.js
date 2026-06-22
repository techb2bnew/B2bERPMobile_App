import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const NOTIFICATIONS_TABLE = 'notifications';

export const fetchUnreadNotificationCount = async userId => {
  if (!isSupabaseConfigured || !userId) {
    return 0;
  }

  const { count, error } = await getSupabase()
    .from(NOTIFICATIONS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }

  return count || 0;
};

export const markChannelNotificationsAsRead = async ({ channelId, userId }) => {
  if (!isSupabaseConfigured || !channelId || !userId) {
    return;
  }

  const { error } = await getSupabase()
    .from(NOTIFICATIONS_TABLE)
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('reference_id', channelId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }
};
