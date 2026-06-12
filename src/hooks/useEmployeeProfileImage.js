import { useEffect, useState } from 'react';
import {
  getEmployeeProfileById,
  getEmployeeProfileImageUrl,
} from '../services/employeeService';

const listeners = new Set();
let cachedUserId = null;
let cachedImageUrl = null;
let inflightRequest = null;

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export const refreshEmployeeProfileImage = async userId => {
  if (!userId) {
    cachedUserId = null;
    cachedImageUrl = null;
    notifyListeners();
    return null;
  }

  if (inflightRequest?.userId === userId) {
    return inflightRequest.promise;
  }

  const promise = (async () => {
    try {
      const profile = await getEmployeeProfileById(userId);
      cachedUserId = userId;
      cachedImageUrl = getEmployeeProfileImageUrl(profile);
    } catch {
      cachedUserId = userId;
      cachedImageUrl = null;
    } finally {
      inflightRequest = null;
      notifyListeners();
    }

    return cachedImageUrl;
  })();

  inflightRequest = { userId, promise };
  return promise;
};

export const useEmployeeProfileImage = userId => {
  const [imageUrl, setImageUrl] = useState(() =>
    cachedUserId === userId ? cachedImageUrl : null,
  );

  useEffect(() => {
    const syncFromCache = () => {
      setImageUrl(cachedUserId === userId ? cachedImageUrl : null);
    };

    listeners.add(syncFromCache);
    return () => listeners.delete(syncFromCache);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setImageUrl(null);
      return;
    }

    if (cachedUserId === userId && cachedImageUrl) {
      setImageUrl(cachedImageUrl);
      return;
    }

    refreshEmployeeProfileImage(userId);
  }, [userId]);

  return imageUrl;
};
