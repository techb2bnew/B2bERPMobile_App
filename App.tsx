import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationBadgeProvider } from './src/context/NotificationBadgeContext';
import RootNavigator from './src/navigation/RootNavigator';
import NotificationBanner from './src/components/NotificationBanner';
import {
  initializeFcmToken,
  setupFcmTokenRefreshListener,
} from './src/services/fcmTokenService';
import { setupNotificationHandlers } from './src/services/notificationHandlerService';
import { checkSupabaseConnection } from './src/services/supabaseService';

const App = () => {
  useEffect(() => {
    initializeFcmToken('app_open');
    const unsubscribeTokenRefresh = setupFcmTokenRefreshListener();
    const unsubscribeNotifications = setupNotificationHandlers();

    if (__DEV__) {
      checkSupabaseConnection().then(result => {
        if (result.connected) {
          console.log('✅ Supabase connected');
          console.log('URL:', result.url);
        } else {
          console.warn('❌ Supabase not connected');
          console.warn(result.message);
        }
      });
    }

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeNotifications();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationBadgeProvider>
            <RootNavigator />
            <NotificationBanner />
          </NotificationBadgeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
