import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const SEND_PUSH_FUNCTION = 'send-push-notification';

export const sendPushToUser = async ({
  recipientUserId,
  title,
  body,
  data = {},
}) => {
  if (!isSupabaseConfigured || !recipientUserId) {
    return { success: false, reason: 'not_configured' };
  }

  const { data: result, error } = await getSupabase().functions.invoke(SEND_PUSH_FUNCTION, {
    body: {
      recipientUserId,
      title,
      body,
      data,
    },
  });

  if (error) {
    if (__DEV__) {
      console.warn('[Push] send failed:', error.message || error);
    }
    throw error;
  }

  if (__DEV__) {
    console.log('[Push] sent to user:', recipientUserId, result);
  }

  return result;
};
