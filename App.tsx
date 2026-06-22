import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import NotificationBanner from './src/components/NotificationBanner';
import { syncAppIconBadge } from './src/services/badgeService';
import {
  initializeFcmToken,
  setupFcmTokenRefreshListener,
} from './src/services/fcmTokenService';
import { setupNotificationHandlers } from './src/services/notificationHandlerService';
import { checkSupabaseConnection } from './src/services/supabaseService';

const AppBadgeSync = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    syncAppIconBadge(user.id);

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        syncAppIconBadge(user.id);
      }
    });

    return () => subscription.remove();
  }, [user?.id]);

  return null;
};

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
          <AppBadgeSync />
          <RootNavigator />
          <NotificationBanner />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
