import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

let pendingNavigation = null;

export function navigate(name, params) {
  pendingNavigation = { name, params };

  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function flushPendingNavigation() {
  if (!pendingNavigation || !navigationRef.isReady()) {
    return;
  }

  const { name, params } = pendingNavigation;
  pendingNavigation = null;
  navigationRef.navigate(name, params);
}
