import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_SESSION_KEY = '@b2b_erp_user_session';

export const saveUserSession = async userData => {
  await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userData));
};

export const getUserSession = async () => {
  const raw = await AsyncStorage.getItem(USER_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearUserSession = async () => {
  await AsyncStorage.removeItem(USER_SESSION_KEY);
};
