import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';
import { MAIN_ROUTES } from '../navigation/routes';
import { navigate } from '../navigation/navigationRef';
import { getUserSession } from './authStorage';
import { syncAppIconBadge } from './badgeService';
import { markChannelNotificationsAsRead } from './notificationService';

let notificationListener = null;

export const setNotificationListener = listener => {
  notificationListener = listener;
};

export const handleNotificationClick = async remoteMessage => {
  if (!remoteMessage) {
    return;
  }

  const data = remoteMessage.data || {};
  const channelId = data?.channelId || data?.channel_id || data?.reference_id || data?.referenceId;
  const type = data?.type;

  if (['leave_request', 'leave_status'].includes(type)) {
    navigate(MAIN_ROUTES.APPLY_LEAVE);
    return;
  }

  const isChatNotification = type === 'chat_message' || type === 'chat_reaction' || !!channelId;

  if (isChatNotification) {
    const session = await getUserSession().catch(() => null);
    
    let safeChannelId = channelId;
    if (safeChannelId === 'undefined' || safeChannelId === 'null') {
      safeChannelId = null;
    }
    
    let senderId = data?.senderId || data?.sender_id;
    if (senderId === 'undefined' || senderId === 'null') {
      senderId = null;
    }

    const title = remoteMessage.notification?.title || '';
    let chatName = data?.senderName || data?.sender_name || 'Chat';
    if (title.startsWith('New Message from ')) {
      chatName = title.replace('New Message from ', '');
    }

    if (session?.id && safeChannelId) {
      markChannelNotificationsAsRead({ channelId: safeChannelId, userId: session.id })
        .then(() => syncAppIconBadge(session.id))
        .catch(() => {});
    }

    navigate(MAIN_ROUTES.CHAT, {
      autoOpenChat: {
        chatType: senderId ? 'direct' : 'group',
        channelId: safeChannelId,
        chatId: safeChannelId,
        chatName: chatName,
        peerId: senderId,
      }
    });
    return;
  }

  // Notifications screen disabled for now — open chat list instead.
  // navigate(MAIN_ROUTES.NOTIFICATIONS);
  navigate(MAIN_ROUTES.CHAT);
};

const showForegroundNotification = remoteMessage => {
  const title = remoteMessage.notification?.title || 'New notification';
  const body = remoteMessage.notification?.body || '';

  if (!body) {
    return;
  }

  if (notificationListener) {
    notificationListener({ title, body, data: remoteMessage.data });
  } else {
    Alert.alert(title, body);
  }
};

export const setupNotificationHandlers = () => {
  const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    if (__DEV__) {
      console.log('[Push] foreground message:', remoteMessage);
    }
    showForegroundNotification(remoteMessage);

    const session = await getUserSession().catch(() => null);
    if (session?.id) {
      syncAppIconBadge(session.id).catch(() => {});
    }
  });

  const unsubscribeOpened = messaging().onNotificationOpenedApp(remoteMessage => {
    if (__DEV__) {
      console.log('[Push] opened from background:', remoteMessage?.data);
    }
    handleNotificationClick(remoteMessage);
  });

  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        if (__DEV__) {
          console.log('[Push] opened from quit state:', remoteMessage?.data);
        }
        handleNotificationClick(remoteMessage);
      }
    })
    .catch(() => {});

  return () => {
    unsubscribeForeground();
    unsubscribeOpened();
  };
};
