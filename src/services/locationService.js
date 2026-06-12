import { Linking, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

const EARTH_RADIUS_METERS = 6371000;

if (Platform.OS === 'android') {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: true,
    locationProvider: 'playServices',
  });
}

const toRadians = value => (value * Math.PI) / 180;

export const calculateDistanceMeters = (from, to) => {
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

export const isWithinGeofence = (currentLocation, officeLocation, radiusMeters) => {
  const distance = calculateDistanceMeters(currentLocation, officeLocation);
  return {
    isInside: distance <= radiusMeters,
    distanceMeters: distance,
  };
};

export const openAppSettings = () => {
  Linking.openSettings();
};

let iosLocationPermissionGranted = null;

export const markLocationPermissionGranted = () => {
  if (Platform.OS === 'ios') {
    iosLocationPermissionGranted = true;
  }
};

export const getLocationErrorMessage = error => {
  if (!error) {
    return 'Unable to get your location. Please try again.';
  }

  if (error.code === 1) {
    return 'Location permission is required. Please allow location access.';
  }

  if (error.code === 2) {
    return 'Location is unavailable. Please turn on GPS/location on your device.';
  }

  if (error.code === 3) {
    return 'Location request timed out. Please turn on GPS, go near a window, and try again.';
  }

  return error.message || 'Unable to get your location. Please try again.';
};

const hasAndroidLocationPermission = async () => {
  const fineGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  if (fineGranted) {
    return true;
  }

  return PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  );
};

export const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    const alreadyGranted = await hasAndroidLocationPermission();
    if (alreadyGranted) {
      return true;
    }

    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Location is required to verify office attendance.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    if (fine === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    if (fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return false;
    }

    const coarse = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Location is required to verify office attendance.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    return coarse === PermissionsAndroid.RESULTS.GRANTED;
  }

  if (iosLocationPermissionGranted) {
    return true;
  }

  return new Promise(resolve => {
    let settled = false;

    const finish = granted => {
      if (settled) {
        return;
      }
      settled = true;
      if (granted) {
        iosLocationPermissionGranted = true;
      }
      resolve(granted);
    };

    // iOS may not call callbacks when permission is already granted.
    const fallbackTimer = setTimeout(() => finish(true), 800);

    Geolocation.requestAuthorization(
      () => {
        clearTimeout(fallbackTimer);
        finish(true);
      },
      () => {
        clearTimeout(fallbackTimer);
        finish(false);
      },
    );
  });
};

const tryGetPosition = options =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      error => reject(error),
      options,
    );
  });

export const getCurrentPosition = async () => {
  const attempts =
    Platform.OS === 'android'
      ? [
          { enableHighAccuracy: false, timeout: 25000, maximumAge: 120000 },
          { enableHighAccuracy: true, timeout: 35000, maximumAge: 30000 },
        ]
      : [{ enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 }];

  let lastError = null;

  for (const options of attempts) {
    try {
      const position = await tryGetPosition(options);
      markLocationPermissionGranted();
      return position;
    } catch (error) {
      lastError = error;
      if (error?.code === 1) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Unable to get current location.');
};

export const watchUserLocation = (onSuccess, onError, options = {}) => {
  return Geolocation.watchPosition(
    position =>
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
    onError,
    {
      enableHighAccuracy: Platform.OS === 'android' ? false : true,
      distanceFilter: 10,
      interval: options.interval || 5000,
      fastestInterval: options.fastestInterval || 3000,
      timeout: 30000,
      maximumAge: 60000,
      ...options,
    },
  );
};

export const clearLocationWatch = watchId => {
  if (watchId != null) {
    Geolocation.clearWatch(watchId);
  }
};
