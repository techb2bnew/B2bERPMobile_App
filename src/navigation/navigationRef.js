import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

let pendingNavigation = null;

export function navigate(name, params) {
  pendingNavigation = { type: 'navigate', name, params };

  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function resetToChatDeepLink(params) {
  pendingNavigation = { type: 'chat_deep_link', params };

  if (navigationRef.isReady()) {
    executeChatDeepLink(params);
  }
}

function executeChatDeepLink(params) {
  navigationRef.reset({
    index: 2,
    routes: [
      { name: 'Dashboard' },
      { name: 'Chat' },
      { name: 'ChannelChat', params },
    ],
  });
}

export function flushPendingNavigation() {
  if (!pendingNavigation || !navigationRef.isReady()) {
    return;
  }

  const pending = pendingNavigation;
  pendingNavigation = null;

  if (pending.type === 'chat_deep_link') {
    executeChatDeepLink(pending.params);
  } else if (pending.type === 'navigate') {
    navigationRef.navigate(pending.name, pending.params);
  } else {
    // Legacy fallback just in case
    navigationRef.navigate(pending.name, pending.params);
  }
}
