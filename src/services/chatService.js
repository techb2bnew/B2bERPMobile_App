import {
  createRealtimeChannelName,
  getSupabase,
  isSupabaseConfigured,
  syncSupabaseRealtimeAuth,
} from '../lib/supabase';
import { getEmployeeProfileImageUrl } from './employeeService';
import { seedEmployeeProfileImageCacheFromProfiles } from '../hooks/useEmployeeProfileImage';
import { getLastMessagePreview } from './chatMediaService';
import { capitalizeName } from '../utils';
import { syncAppIconBadge } from './badgeService';
import { markChannelNotificationsAsRead } from './notificationService';

const CHANNELS_TABLE = 'chat_channels';
const MEMBERS_TABLE = 'chat_channel_members';
const MESSAGES_TABLE = 'chat_messages';
const READS_TABLE = 'chat_channel_reads';
const PROFILES_TABLE = 'employee_profiles';

const AVATAR_COLORS = ['#2D7DD2', '#9B59B6', '#E84393', '#3DDC84', '#F5A623'];
const REALTIME_EVENTS = ['INSERT'];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = value => UUID_PATTERN.test(String(value || ''));

const isDirectChannelType = type => type === 'dm' || type === 'direct';

/** Web app slug format: dm-{uuid}-{uuid} */
export const buildDirectSlug = (userId, peerId) =>
  `dm-${[userId, peerId].filter(Boolean).sort().join('-')}`;

export const buildDirectDmKey = buildDirectSlug;

const hashString = value => {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getAvatarColor = id => AVATAR_COLORS[hashString(id) % AVATAR_COLORS.length];

const getInitials = name => {
  const parts = String(name || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const formatMessageTime = iso => {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const buildDirectChannelName = (currentUserName, peerName) =>
  `${capitalizeName(currentUserName || 'You')} & ${capitalizeName(peerName || 'User')}`;

const fetchProfilesByIds = async ids => {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  const { data, error } = await getSupabase()
    .from(PROFILES_TABLE)
    .select('id, name, email, profile_image_url, avatar')
    .in('id', uniqueIds);

  if (error) {
    throw error;
  }

  const profiles = data || [];
  seedEmployeeProfileImageCacheFromProfiles(profiles);

  return profiles.reduce((map, profile) => {
    map[profile.id] = profile;
    return map;
  }, {});
};

const ensureReadRows = async (channelId, userIds) => {
  const rows = userIds.map(userId => ({
    channel_id: channelId,
    user_id: userId,
    last_read_at: new Date().toISOString(),
  }));

  const { error } = await getSupabase().from(READS_TABLE).upsert(rows, {
    onConflict: 'channel_id,user_id',
    ignoreDuplicates: true,
  });

  if (error) {
    throw error;
  }
};

const addChannelMembers = async ({ channelId, userIds, createdBy, channelType }) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = uniqueIds.map(userId => ({
    channel_id: channelId,
    user_id: userId,
    role: channelType === 'group' && userId === createdBy ? 'admin' : 'member',
  }));

  const { error } = await getSupabase().from(MEMBERS_TABLE).upsert(rows, {
    onConflict: 'channel_id,user_id',
    ignoreDuplicates: true,
  });

  if (error) {
    throw error;
  }

  await ensureReadRows(channelId, uniqueIds);
};

export const mapMessageRow = (row, profileMap = {}) => {
  const sender = profileMap[row.sender_id];
  const senderName = capitalizeName(row.sender_name || sender?.name || 'User');

  return {
    id: row.id,
    channelId: row.channel_id,
    senderId: row.sender_id,
    name: senderName,
    initial: getInitials(senderName),
    color: getAvatarColor(row.sender_id),
    avatarUrl: getEmployeeProfileImageUrl(sender),
    time: formatMessageTime(row.created_at),
    text: row.content || '',
    messageType: row.message_type || 'text',
    mediaUrl: row.media_url || null,
    mediaType: row.media_type || null,
    fileName: row.file_name || null,
    fileSize: row.file_size || null,
    isBroadcast: Boolean(row.is_broadcast),
    createdAt: row.created_at,
  };
};

export const mapChannelToThread = (
  channel,
  { peerId, membersCount, lastMessage, lastMessageAt, unreadCount = 0, profileMap = {} },
) => {
  const isDirect = isDirectChannelType(channel.channel_type);
  let chatName = capitalizeName(channel.name);

  if (isDirect && peerId && profileMap[peerId]?.name) {
    chatName = capitalizeName(profileMap[peerId].name);
  }

  return {
    chatType: isDirect ? 'direct' : 'group',
    chatId: channel.id,
    channelId: channel.id,
    slug: channel.slug,
    chatName,
    peerId: peerId || null,
    peerAvatarUrl:
      isDirect && peerId ? getEmployeeProfileImageUrl(profileMap[peerId]) : null,
    members: membersCount || 0,
    updatedAt: lastMessageAt || channel.created_at,
    lastMessage: lastMessage || '',
    unreadCount: Number(unreadCount) || 0,
  };
};

export const findDirectChannel = async (userId, peerId) => {
  if (!isSupabaseConfigured || !userId || !peerId) {
    return null;
  }

  const slug = buildDirectSlug(userId, peerId);
  const { data, error } = await getSupabase()
    .from(CHANNELS_TABLE)
    .select('*')
    .eq('channel_type', 'dm')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export const findOrCreateDirectChannel = async ({
  userId,
  peerId,
  peerName,
  currentUserName,
}) => {
  const existing = await findDirectChannel(userId, peerId);
  if (existing) {
    return existing;
  }

  const slug = buildDirectSlug(userId, peerId);
  const { data: channel, error } = await getSupabase()
    .from(CHANNELS_TABLE)
    .insert({
      slug,
      name: buildDirectChannelName(currentUserName, peerName),
      description: 'Direct message',
      channel_type: 'dm',
      is_announcements: false,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const duplicate = await findDirectChannel(userId, peerId);
      if (duplicate) {
        return duplicate;
      }
    }
    throw error;
  }

  await addChannelMembers({
    channelId: channel.id,
    userIds: [userId, peerId],
    createdBy: userId,
    channelType: 'dm',
  });

  return channel;
};

export const createGroupChannel = async ({ userId, name, memberIds }) => {
  const uniqueMemberIds = [...new Set([userId, ...memberIds.filter(Boolean)])];

  const { data: channel, error } = await getSupabase()
    .from(CHANNELS_TABLE)
    .insert({
      slug: `group-${Date.now()}`,
      name: capitalizeName(name),
      description: 'Group chat',
      channel_type: 'group',
      is_announcements: false,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  await addChannelMembers({
    channelId: channel.id,
    userIds: uniqueMemberIds,
    createdBy: userId,
    channelType: 'group',
  });

  return channel;
};

const fetchMemberCounts = async channelIds => {
  if (channelIds.length === 0) {
    return {};
  }

  const { data, error } = await getSupabase()
    .from(MEMBERS_TABLE)
    .select('channel_id')
    .in('channel_id', channelIds);

  if (error) {
    throw error;
  }

  return (data || []).reduce((counts, row) => {
    counts[row.channel_id] = (counts[row.channel_id] || 0) + 1;
    return counts;
  }, {});
};

const fetchLastMessages = async channelIds => {
  if (channelIds.length === 0) {
    return {};
  }

  const { data, error } = await getSupabase()
    .from(MESSAGES_TABLE)
    .select('channel_id, content, created_at, message_type, media_url, file_name')
    .in('channel_id', channelIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const map = {};
  (data || []).forEach(row => {
    if (!map[row.channel_id]) {
      map[row.channel_id] = {
        content: getLastMessagePreview({
          text: row.content,
          messageType: row.message_type,
          mediaUrl: row.media_url,
          fileName: row.file_name,
        }),
        createdAt: row.created_at,
      };
    }
  });
  return map;
};

const fetchChannelReadsForUser = async (channelIds, userId) => {
  if (channelIds.length === 0) {
    return {};
  }

  const { data, error } = await getSupabase()
    .from(READS_TABLE)
    .select('channel_id, last_read_at')
    .eq('user_id', userId)
    .in('channel_id', channelIds);

  if (error) {
    throw error;
  }

  return (data || []).reduce((map, row) => {
    map[row.channel_id] = row.last_read_at;
    return map;
  }, {});
};

const fetchUnreadCountsForChannels = async (channelIds, userId, readsMap) => {
  if (channelIds.length === 0) {
    return {};
  }

  const { data, error } = await getSupabase()
    .from(MESSAGES_TABLE)
    .select('channel_id, created_at')
    .in('channel_id', channelIds)
    .neq('sender_id', userId);

  if (error) {
    throw error;
  }

  const counts = Object.fromEntries(channelIds.map(id => [id, 0]));

  (data || []).forEach(row => {
    const lastReadAt = readsMap[row.channel_id];
    const readMs = lastReadAt ? new Date(lastReadAt).getTime() : 0;
    const messageMs = new Date(row.created_at).getTime();

    if (!Number.isNaN(messageMs) && messageMs > readMs) {
      counts[row.channel_id] += 1;
    }
  });

  return counts;
};

const fetchPeerIdsForDirectChannels = async (channelIds, userId) => {
  if (channelIds.length === 0) {
    return {};
  }

  const { data, error } = await getSupabase()
    .from(MEMBERS_TABLE)
    .select('channel_id, user_id')
    .in('channel_id', channelIds)
    .neq('user_id', userId);

  if (error) {
    throw error;
  }

  return (data || []).reduce((map, row) => {
    map[row.channel_id] = row.user_id;
    return map;
  }, {});
};

export const fetchUserChatThreads = async userId => {
  if (!isSupabaseConfigured || !userId) {
    return [];
  }

  const { data: memberships, error: memberError } = await getSupabase()
    .from(MEMBERS_TABLE)
    .select('channel_id')
    .eq('user_id', userId);

  if (memberError) {
    throw memberError;
  }

  const channelIds = [...new Set((memberships || []).map(row => row.channel_id))];
  if (channelIds.length === 0) {
    return [];
  }

  const { data: channels, error: channelError } = await getSupabase()
    .from(CHANNELS_TABLE)
    .select('*')
    .in('id', channelIds)
    .order('created_at', { ascending: false });

  if (channelError) {
    throw channelError;
  }

  const directChannelIds = (channels || [])
    .filter(channel => isDirectChannelType(channel.channel_type))
    .map(channel => channel.id);

  const [memberCounts, lastMessages, peerMap, readsMap] = await Promise.all([
    fetchMemberCounts(channelIds),
    fetchLastMessages(channelIds),
    fetchPeerIdsForDirectChannels(directChannelIds, userId),
    fetchChannelReadsForUser(channelIds, userId),
  ]);

  const unreadCounts = await fetchUnreadCountsForChannels(channelIds, userId, readsMap);

  const peerIds = Object.values(peerMap);
  const profileMap = await fetchProfilesByIds(peerIds);

  const threads = (channels || []).map(channel => {
    const lastMessageRow = lastMessages[channel.id];
    return mapChannelToThread(channel, {
      peerId: peerMap[channel.id],
      membersCount: memberCounts[channel.id] || 0,
      lastMessage: lastMessageRow?.content || '',
      lastMessageAt: lastMessageRow?.createdAt,
      unreadCount: unreadCounts[channel.id] || 0,
      profileMap,
    });
  });

  return threads.sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
  );
};

export const fetchTotalUnreadChatCount = async userId => {
  if (!isSupabaseConfigured || !userId) {
    return 0;
  }

  const { data: memberships, error: memberError } = await getSupabase()
    .from(MEMBERS_TABLE)
    .select('channel_id')
    .eq('user_id', userId);

  if (memberError) {
    throw memberError;
  }

  const channelIds = [...new Set((memberships || []).map(row => row.channel_id))];
  if (channelIds.length === 0) {
    return 0;
  }

  const readsMap = await fetchChannelReadsForUser(channelIds, userId);
  const unreadCounts = await fetchUnreadCountsForChannels(channelIds, userId, readsMap);

  return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
};

export const fetchChannelMessages = async channelId => {
  if (!isSupabaseConfigured || !channelId) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from(MESSAGES_TABLE)
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const senderIds = (data || []).map(row => row.sender_id);
  const profileMap = await fetchProfilesByIds(senderIds);
  return (data || []).map(row => mapMessageRow(row, profileMap));
};

export const sendChannelMessage = async ({
  channelId,
  senderId,
  senderName,
  content,
  messageType = 'text',
  mediaUrl = null,
  mediaType = null,
  fileName = null,
  fileSize = null,
  isBroadcast = false,
}) => {
  if (!channelId || !senderId) {
    throw new Error('Missing channel or sender');
  }

  const trimmed = String(content || '').trim();
  const hasMedia = Boolean(mediaUrl);

  if (!trimmed && !hasMedia) {
    throw new Error('Message cannot be empty');
  }

  const { data, error } = await getSupabase()
    .from(MESSAGES_TABLE)
    .insert({
      channel_id: channelId,
      sender_id: senderId,
      sender_name: capitalizeName(senderName || 'User'),
      content: trimmed || fileName || 'Attachment',
      message_type: messageType || 'text',
      media_url: mediaUrl,
      media_type: mediaType,
      file_name: fileName,
      file_size: fileSize,
      is_broadcast: isBroadcast,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Create database notification records for other channel members
  try {
    const { data: members, error: membersError } = await getSupabase()
      .from(MEMBERS_TABLE)
      .select('user_id')
      .eq('channel_id', channelId)
      .neq('user_id', senderId);

    if (!membersError && members && members.length > 0) {
      const notificationsToInsert = members.map(member => ({
        recipient_id: member.user_id,
        sender_id: senderId,
        title: `New Message from ${capitalizeName(senderName || 'User')}`,
        message: trimmed || fileName || 'Attachment',
        type: 'chat_message',
        reference_id: channelId,
        is_read: false,
      }));

      const { error: notifError } = await getSupabase()
        .from('notifications')
        .insert(notificationsToInsert);

      if (notifError && __DEV__) {
        console.warn('[chat] Failed to insert notifications:', notifError.message || notifError);
      }
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[chat] Error in inserting notifications:', err);
    }
  }

  const profileMap = await fetchProfilesByIds([senderId]);
  return mapMessageRow(data, profileMap);
};

export const markChannelAsRead = async ({ channelId, userId }) => {
  if (!isSupabaseConfigured || !channelId || !userId) {
    return;
  }

  const { error } = await getSupabase().from(READS_TABLE).upsert(
    {
      channel_id: channelId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: 'channel_id,user_id' },
  );

  if (error) {
    throw error;
  }

  try {
    await markChannelNotificationsAsRead({ channelId, userId });
  } catch {
    // Notification rows are best-effort; chat read state is already saved.
  }

  syncAppIconBadge(userId).catch(() => {});
};

export const fetchChannelMemberLastReadAt = async ({ channelId, userId }) => {
  if (!isSupabaseConfigured || !channelId || !userId) {
    return null;
  }

  const { data, error } = await getSupabase()
    .from(READS_TABLE)
    .select('last_read_at')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.last_read_at || null;
};

export const isMessageReadByPeer = (messageCreatedAt, peerLastReadAt) => {
  if (!messageCreatedAt || !peerLastReadAt) {
    return false;
  }

  const messageMs = new Date(messageCreatedAt).getTime();
  const readMs = new Date(peerLastReadAt).getTime();

  if (Number.isNaN(messageMs) || Number.isNaN(readMs)) {
    return false;
  }

  return readMs >= messageMs;
};

const subscribeToTable = ({ channelPrefix, table, filter, onChange, events = REALTIME_EVENTS }) => {
  let active = true;
  let channel = null;
  let reconnectTimer = null;
  const onChangeRef = { current: onChange };
  onChangeRef.current = onChange;

  const teardownChannel = () => {
    if (channel) {
      getSupabase().removeChannel(channel);
      channel = null;
    }
  };

  const connect = async () => {
    if (!active) {
      return;
    }

    await syncSupabaseRealtimeAuth();

    if (!active) {
      return;
    }

    teardownChannel();

    const supabase = getSupabase();
    const channelName = createRealtimeChannelName(channelPrefix);
    const nextChannel = supabase.channel(channelName);

    events.forEach(event => {
      nextChannel.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        payload => onChangeRef.current(payload),
      );
    });

    channel = nextChannel;

    channel.subscribe((status, err) => {
      if (__DEV__) {
        console.log('[realtime] chat channel', channelName, status, err?.message || '');
      }

      if (!active) {
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        reconnectTimer = setTimeout(() => {
          connect();
        }, 1500);
      }
    });
  };

  connect();

  return () => {
    active = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    teardownChannel();
  };
};

export const subscribeToChannelMessages = (channelId, onInsert) =>
  subscribeToTable({
    channelPrefix: `chat-messages-${channelId}`,
    table: MESSAGES_TABLE,
    filter: `channel_id=eq.${channelId}`,
    onChange: async payload => {
      if (payload.eventType !== 'INSERT' || !payload.new) {
        return;
      }

      const profileMap = await fetchProfilesByIds([payload.new.sender_id]);
      onInsert(mapMessageRow(payload.new, profileMap));
    },
  });

export const subscribeToChannelReads = (channelId, onReadUpdate) =>
  subscribeToTable({
    channelPrefix: `chat-reads-${channelId}`,
    table: READS_TABLE,
    filter: `channel_id=eq.${channelId}`,
    events: ['INSERT', 'UPDATE'],
    onChange: payload => {
      if (
        (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
        payload.new
      ) {
        onReadUpdate(payload.new);
      }
    },
  });

export const subscribeToUserChannels = (userId, onChange) =>
  subscribeToTable({
    channelPrefix: `chat-channels-${userId}`,
    table: CHANNELS_TABLE,
    onChange,
  });

export const subscribeToUserChatInbox = (userId, onChange) => {
  if (!isSupabaseConfigured || !userId) {
    return () => {};
  }

  let debounceTimer = null;
  const notify = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      onChange();
    }, 400);
  };

  const cleanups = [
    subscribeToTable({
      channelPrefix: `chat-inbox-members-${userId}`,
      table: MEMBERS_TABLE,
      filter: `user_id=eq.${userId}`,
      onChange: notify,
    }),
    subscribeToTable({
      channelPrefix: `chat-inbox-messages-${userId}`,
      table: MESSAGES_TABLE,
      onChange: notify,
    }),
    subscribeToTable({
      channelPrefix: `chat-inbox-reads-${userId}`,
      table: READS_TABLE,
      filter: `user_id=eq.${userId}`,
      onChange: notify,
    }),
    subscribeToUserChannels(userId, notify),
  ];

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    cleanups.forEach(unsubscribe => unsubscribe());
  };
};

export const resolveChannelForChatParams = async (userId, params) => {
  if (!isSupabaseConfigured || !userId) {
    return params;
  }

  const existingId = params.channelId || params.chatId;
  if (isUuid(existingId)) {
    return {
      ...params,
      channelId: existingId,
      chatId: existingId,
    };
  }

  if (params.chatType === 'direct' && params.peerId) {
    const channel = await findOrCreateDirectChannel({
      userId,
      peerId: params.peerId,
      peerName: params.chatName,
      currentUserName: params.currentUserName,
    });

    return {
      ...params,
      chatId: channel.id,
      channelId: channel.id,
      chatName: capitalizeName(params.chatName || channel.name),
    };
  }

  if (params.chatType === 'group' && params.memberIds?.length) {
    const channel = await createGroupChannel({
      userId,
      name: params.chatName,
      memberIds: params.memberIds,
    });

    return {
      ...params,
      chatId: channel.id,
      channelId: channel.id,
      chatName: capitalizeName(channel.name),
      members: params.memberIds.length + 1,
    };
  }

  return params;
};
