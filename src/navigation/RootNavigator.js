import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { darkBackgroundColor } from '../constants/Color';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import { flushPendingNavigation, navigationRef } from './navigationRef';

const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      flushPendingNavigation();
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#9B59B6" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={flushPendingNavigation}
      onStateChange={flushPendingNavigation}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default RootNavigator;

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
