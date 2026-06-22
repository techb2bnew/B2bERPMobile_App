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
  const channelId = data?.channelId || data?.channel_id;
  const session = await getUserSession().catch(() => null);

  if (channelId && session?.id) {
    const senderId = data?.senderId || data?.sender_id;
    const title = remoteMessage.notification?.title || '';
    let chatName = data?.senderName || data?.sender_name || 'Chat';
    if (title.startsWith('New Message from ')) {
      chatName = title.replace('New Message from ', '');
    }

    markChannelNotificationsAsRead({ channelId, userId: session.id })
      .then(() => syncAppIconBadge(session.id))
      .catch(() => {});

    navigate(MAIN_ROUTES.CHANNEL_CHAT, {
      chatType: senderId ? 'direct' : 'group',
      channelId: channelId,
      chatName: chatName,
      peerId: senderId,
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
