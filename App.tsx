import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { checkSupabaseConnection } from './src/services/supabaseService';

const App = () => {
  useEffect(() => {
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
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
