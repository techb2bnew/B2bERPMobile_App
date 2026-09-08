// Update OFFICE_ADDRESS and GOOGLE_MAPS_API_KEY — coordinates are fetched from address automatically.
// OFFICE_COORDINATES is only for manual override (leave null in normal use).

export const OFFICE_ADDRESS =
  'Base2Brand Infotech Pvt. Ltd., F-209, Phase 8B, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar, Punjab 160074';

export const GOOGLE_MAPS_API_KEY = 'AIzaSyBEQp-ZFMYZjsTNyximu2pAifQ9EWA4W3M';

export const OFFICE_COORDINATES = null;

// 🔘 GEOFENCE ON / OFF — this single line is the only switch.
//   true  = office location is checked (clock in only within 50m of the office,
//           and the timer auto-stops as soon as you leave)
//   false = no location check at all (clock in from anywhere, no auto-stop)
export const GEOFENCE_ENABLED = true;

export const GEOFENCE_RADIUS_METERS = 50;

export const LOCATION_CHECK_INTERVAL_MS = 5000;
