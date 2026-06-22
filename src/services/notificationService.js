import { createRealtimeChannelName, getSupabase, isSupabaseConfigured } from '../lib/supabase';

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

export const fetchUserNotifications = async userId => {
  if (!isSupabaseConfigured || !userId) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from(NOTIFICATIONS_TABLE)
    .select(
      'id, recipient_id, sender_id, title, message, type, reference_id, is_read, created_at',
    )
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

export const markAllNotificationsAsRead = async userId => {
  if (!isSupabaseConfigured || !userId) {
    return;
  }

  const { error } = await getSupabase()
    .from(NOTIFICATIONS_TABLE)
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }
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

export const markNotificationAsRead = async ({ notificationId, userId }) => {
  if (!isSupabaseConfigured || !notificationId || !userId) {
    return;
  }

  const { error } = await getSupabase()
    .from(NOTIFICATIONS_TABLE)
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', userId);

  if (error) {
    throw error;
  }
};

export const subscribeToUserNotifications = (userId, onChange) => {
  if (!isSupabaseConfigured || !userId || typeof onChange !== 'function') {
    return () => {};
  }

  const supabase = getSupabase();
  const channelName = createRealtimeChannelName(`notifications-${userId}`);
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: NOTIFICATIONS_TABLE,
        filter: `recipient_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const formatNotificationTime = iso => {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) {
    return 'Just now';
  }

  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr} hr ago`;
  }

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) {
    return 'Yesterday';
  }

  if (diffDay < 7) {
    return `${diffDay} days ago`;
  }

  return date.toLocaleDateString();
};

export const getNotificationTypeLabel = type => {
  if (type === 'chat_message') {
    return 'Chat';
  }

  if (!type) {
    return 'General';
  }

  return String(type)
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getSenderLabelFromTitle = title => {
  const text = String(title || '');
  if (text.startsWith('New Message from ')) {
    return text.replace('New Message from ', '');
  }
  return text || 'Someone';
};
