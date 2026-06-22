import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import { getUserSession } from './authStorage';
import { updateEmployeeFcmToken } from './employeeService';

const FCM_TOKEN_STORAGE_KEY = '@b2b_erp_fcm_token';

let refreshUnsubscribe = null;

const logFcmToken = (token, reason) => {
  if (__DEV__) {
    console.log(`[FCM] Token (${reason}):`, token || 'not available');
  }
};

export const getStoredFcmToken = async () => {
  const token = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  return token?.trim() || null;
};

const saveFcmToken = async token => {
  if (!token) {
    return;
  }

  await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
};

export const requestNotificationPermission = async () => {
  if (Platform.OS === 'ios') {
    await notifee.requestPermission({
      alert: true,
      sound: true,
      badge: true,
    });

    const authStatus = await messaging().requestPermission({
      alert: true,
      sound: true,
      badge: true,
    });

    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
};

const fetchFcmTokenFromDevice = async () => {
  await requestNotificationPermission();
  return messaging().getToken();
};

/**
 * Returns cached device FCM token. Fetches from Firebase only on first run
 * (or when storage is empty). Token is device-based and reused on later opens.
 */
export const initializeFcmToken = async (reason = 'app_open') => {
  try {
    const cachedToken = await getStoredFcmToken();

    if (cachedToken) {
      logFcmToken(cachedToken, `${reason} · cached`);
      return cachedToken;
    }

    const token = await fetchFcmTokenFromDevice();

    if (token) {
      await saveFcmToken(token);
      logFcmToken(token, `${reason} · fetched`);
      return token;
    }

    logFcmToken(null, `${reason} · fetch failed`);
    return null;
  } catch (error) {
    if (__DEV__) {
      console.warn('[FCM] Token error:', error?.message || error);
    }
    return null;
  }
};

const syncTokenToProfile = async (profileId, token, reason) => {
  if (!profileId || !token) {
    return;
  }

  try {
    await updateEmployeeFcmToken(profileId, token);
    if (__DEV__) {
      console.log(`[FCM] Profile synced (${reason}):`, profileId);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[FCM] Profile sync failed:', error?.message || error);
    }
  }
};

export const syncFcmTokenForUser = async (profileId, reason = 'login') => {
  const token = await initializeFcmToken(reason);

  if (profileId && token) {
    await syncTokenToProfile(profileId, token, reason);
  }

  return token;
};

export const setupFcmTokenRefreshListener = () => {
  if (refreshUnsubscribe) {
    return refreshUnsubscribe;
  }

  refreshUnsubscribe = messaging().onTokenRefresh(async newToken => {
    await saveFcmToken(newToken);
    logFcmToken(newToken, 'token_refresh');

    const session = await getUserSession();
    if (session?.id) {
      await syncTokenToProfile(session.id, newToken, 'token_refresh');
    }
  });

  return () => {
    refreshUnsubscribe?.();
    refreshUnsubscribe = null;
  };
};
