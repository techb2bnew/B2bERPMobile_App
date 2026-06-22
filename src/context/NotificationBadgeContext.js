import React, { createContext, useContext } from 'react';
import { useNotificationBadge } from '../hooks/useNotificationBadge';

const NotificationBadgeContext = createContext({
  unreadCount: 0,
  refreshUnreadCount: async () => 0,
});

export const NotificationBadgeProvider = ({ children }) => {
  const value = useNotificationBadge();

  return (
    <NotificationBadgeContext.Provider value={value}>{children}</NotificationBadgeContext.Provider>
  );
};

export const useNotificationBadgeContext = () => useContext(NotificationBadgeContext);
