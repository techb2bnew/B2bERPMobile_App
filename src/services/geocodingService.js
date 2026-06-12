import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GOOGLE_MAPS_API_KEY,
  OFFICE_ADDRESS,
  OFFICE_COORDINATES,
} from '../config/officeLocation';

const OFFICE_COORDS_CACHE_KEY = '@office_coordinates_cache';

const parseCoordinates = data => {
  const location = data?.results?.[0]?.geometry?.location;
  if (!location?.lat || !location?.lng) {
    return null;
  }

  return {
    latitude: location.lat,
    longitude: location.lng,
  };
};

export const geocodeOfficeAddress = async () => {
  if (OFFICE_COORDINATES?.latitude && OFFICE_COORDINATES?.longitude) {
    return OFFICE_COORDINATES;
  }

  const cached = await AsyncStorage.getItem(OFFICE_COORDS_CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed?.address === OFFICE_ADDRESS && parsed?.coordinates) {
      return parsed.coordinates;
    }
  }

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error(
      'Google Maps API key is missing. Add GOOGLE_MAPS_API_KEY in src/config/officeLocation.js',
    );
  }

  const encodedAddress = encodeURIComponent(OFFICE_ADDRESS);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(data.error_message || 'Unable to geocode office address.');
  }

  const coordinates = parseCoordinates(data);
  if (!coordinates) {
    throw new Error('Office address could not be resolved to coordinates.');
  }

  await AsyncStorage.setItem(
    OFFICE_COORDS_CACHE_KEY,
    JSON.stringify({ address: OFFICE_ADDRESS, coordinates }),
  );

  return coordinates;
};
