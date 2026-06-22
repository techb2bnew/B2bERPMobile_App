import notifee from '@notifee/react-native';
import { fetchUnreadNotificationCount } from './notificationService';

export const setAppIconBadgeCount = async count => {
  const safeCount = Math.max(0, Number(count) || 0);
  await notifee.setBadgeCount(safeCount);
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
  } catch {
    return null;
  }
};

export const clearAppIconBadge = async () => {
  await setAppIconBadgeCount(0);
};
