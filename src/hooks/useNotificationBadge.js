import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { setAppIconBadgeCount } from '../services/badgeService';
import {
  fetchUnreadNotificationCount,
  subscribeToUserNotifications,
} from '../services/notificationService';

export const useNotificationBadge = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      await setAppIconBadgeCount(0);
      return 0;
    }

    try {
      const count = await fetchUnreadNotificationCount(user.id);
      setUnreadCount(count);
      await setAppIconBadgeCount(count);

      if (__DEV__) {
        console.log('[Badge] app icon count:', count);
      }

      return count;
    } catch (error) {
      if (__DEV__) {
        console.warn('[Badge] sync failed:', error?.message || error);
      }
      return null;
    }
  }, [user?.id]);

  useEffect(() => {
    refreshUnreadCount();

    if (!user?.id) {
      return undefined;
    }

    const unsubscribeRealtime = subscribeToUserNotifications(user.id, refreshUnreadCount);
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refreshUnreadCount();
      }
    });

    return () => {
      unsubscribeRealtime();
      appStateSub.remove();
    };
  }, [user?.id, refreshUnreadCount]);

  return { unreadCount, refreshUnreadCount };
};
