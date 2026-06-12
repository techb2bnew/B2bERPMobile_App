import AsyncStorage from '@react-native-async-storage/async-storage';

const chatStorageKey = userId => `@b2b_erp_chat_threads_${userId || 'guest'}`;

const parseThreads = raw => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const sortThreads = threads =>
  [...threads].sort((a, b) => {
    const aTime = new Date(a.updatedAt || 0).getTime();
    const bTime = new Date(b.updatedAt || 0).getTime();
    return bTime - aTime;
  });

export const buildDirectChatId = (userId, peerId) =>
  ['dm', userId, peerId].filter(Boolean).sort().join('-');

export const findDirectChatByPeerId = (threads, peerId) => {
  if (!peerId) {
    return null;
  }

  return (
    threads.find(
      thread =>
        thread.chatType === 'direct' &&
        (thread.peerId === peerId ||
          (thread.chatId && String(thread.chatId).includes(String(peerId)))),
    ) || null
  );
};

const dedupeDirectThreads = threads => {
  const directByPeer = new Map();
  const others = [];

  threads.forEach(thread => {
    if (thread.chatType === 'direct' && thread.peerId) {
      const existing = directByPeer.get(thread.peerId);
      if (!existing) {
        directByPeer.set(thread.peerId, thread);
        return;
      }

      const existingTime = new Date(existing.updatedAt || 0).getTime();
      const nextTime = new Date(thread.updatedAt || 0).getTime();
      if (nextTime >= existingTime) {
        directByPeer.set(thread.peerId, { ...existing, ...thread });
      }
      return;
    }

    others.push(thread);
  });

  return sortThreads([...directByPeer.values(), ...others]);
};

export const fetchChatThreads = async userId => {
  const raw = await AsyncStorage.getItem(chatStorageKey(userId));
  const parsed = parseThreads(raw);
  const threads = dedupeDirectThreads(parsed);

  if (threads.length !== parsed.length) {
    await AsyncStorage.setItem(chatStorageKey(userId), JSON.stringify(threads));
  }

  return threads;
};

export const resolveDirectChatThread = (userId, threads, incoming) => {
  const peerId = incoming.peerId;
  if (!peerId) {
    return incoming;
  }

  const existing = findDirectChatByPeerId(threads, peerId);
  const chatId = buildDirectChatId(userId, peerId);

  if (!existing) {
    return {
      ...incoming,
      chatType: 'direct',
      chatId,
      peerId,
    };
  }

  return {
    ...existing,
    ...incoming,
    chatType: 'direct',
    chatId: existing.chatId || chatId,
    peerId,
  };
};

export const upsertChatThread = async (userId, thread) => {
  let threads = await fetchChatThreads(userId);
  const now = new Date().toISOString();

  let nextThread = {
    ...thread,
    updatedAt: now,
  };

  if (thread.chatType === 'direct') {
    nextThread = resolveDirectChatThread(userId, threads, nextThread);
  }

  const existingIndex =
    thread.chatType === 'direct' && nextThread.peerId
      ? threads.findIndex(
          item =>
            item.chatType === 'direct' &&
            (item.peerId === nextThread.peerId || item.chatId === nextThread.chatId),
        )
      : threads.findIndex(item => item.chatId === nextThread.chatId);

  if (existingIndex >= 0) {
    threads[existingIndex] = {
      ...threads[existingIndex],
      ...nextThread,
      updatedAt: now,
    };
  } else {
    threads.unshift(nextThread);
  }

  const sorted = sortThreads(threads);
  await AsyncStorage.setItem(chatStorageKey(userId), JSON.stringify(sorted));
  return sorted;
};
