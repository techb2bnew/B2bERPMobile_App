import { Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { fetchUnreadNotificationCount } from './notificationService';

const ensureIosBadgePermission = async () => {
  if (Platform.OS !== 'ios') {
    return;
  }

  await notifee.requestPermission({
    alert: true,
    sound: true,
    badge: true,
  });
};

export const setAppIconBadgeCount = async count => {
  const safeCount = Math.max(0, Number(count) || 0);

  try {
    if (Platform.OS === 'ios') {
      await ensureIosBadgePermission();
    }

    await notifee.setBadgeCount(safeCount);

    if (__DEV__) {
      console.log(`[Badge] set app icon count (${Platform.OS}):`, safeCount);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[Badge] setBadgeCount failed:', error?.message || error);
    }
  }
};

export const syncAppIconBadge = async userId => {
  if (!userId) {
    await setAppIconBadgeCount(0);
    return 0;
  }

  try {
    const count = await fetchUnreadNotificationCount(userId);
    await setAppIconBadgeCount(count);
    return count;
  } catch (error) {
    if (__DEV__) {
      console.warn('[Badge] sync failed:', error?.message || error);
    }
    return null;
  }
};

export const clearAppIconBadge = async () => {
  await setAppIconBadgeCount(0);
};
