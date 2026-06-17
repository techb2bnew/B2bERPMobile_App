import { useEffect, useState } from 'react';
import {
  getEmployeeProfileById,
  getEmployeeProfileImageUrl,
} from '../services/employeeService';

const listeners = new Set();
const imageCache = new Map();
const inflightRequests = new Map();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export const setEmployeeProfileImageCache = (userId, imageUrl) => {
  if (!userId) {
    return;
  }

  imageCache.set(userId, imageUrl ?? null);
  notifyListeners();
};

export const seedEmployeeProfileImageCacheFromProfiles = profiles => {
  if (!Array.isArray(profiles)) {
    return;
  }

  profiles.forEach(profile => {
    if (profile?.id) {
      imageCache.set(profile.id, getEmployeeProfileImageUrl(profile));
    }
  });

  notifyListeners();
};

export const clearEmployeeProfileImageCache = () => {
  imageCache.clear();
  inflightRequests.clear();
  notifyListeners();
};

export const refreshEmployeeProfileImage = async userId => {
  if (!userId) {
    clearEmployeeProfileImageCache();
    return null;
  }

  if (inflightRequests.has(userId)) {
    return inflightRequests.get(userId);
  }

  const promise = (async () => {
    try {
      const profile = await getEmployeeProfileById(userId);
      imageCache.set(userId, getEmployeeProfileImageUrl(profile));
    } catch {
      imageCache.set(userId, null);
    } finally {
      inflightRequests.delete(userId);
      notifyListeners();
    }

    return imageCache.get(userId) ?? null;
  })();

  inflightRequests.set(userId, promise);
  return promise;
};

export const useEmployeeProfileImage = userId => {
  const [imageUrl, setImageUrl] = useState(() => {
    if (!userId || !imageCache.has(userId)) {
      return null;
    }

    return imageCache.get(userId);
  });

  useEffect(() => {
    const syncFromCache = () => {
      if (!userId) {
        setImageUrl(null);
        return;
      }

      if (imageCache.has(userId)) {
        setImageUrl(imageCache.get(userId));
      }
    };

    listeners.add(syncFromCache);
    return () => listeners.delete(syncFromCache);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setImageUrl(null);
      return;
    }

    if (imageCache.has(userId)) {
      setImageUrl(imageCache.get(userId));
      return;
    }

    refreshEmployeeProfileImage(userId);
  }, [userId]);

  return imageUrl;
};
