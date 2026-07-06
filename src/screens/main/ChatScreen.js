import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import UserAvatar from '../../components/UserAvatar';
import NewChatFab from '../../components/NewChatFab';
import NewChatTypeModal from '../../components/Modal/NewChatTypeModal';
import StartChatModal from '../../components/Modal/StartChatModal';
import {
  CHAT_DIRECT_SUBTITLE,
  CHAT_EMPTY_DESC,
  CHAT_EMPTY_TITLE,
  CHAT_FILTER_ALL,
  CHAT_FILTER_GROUP,
  CHAT_FILTER_INDIVIDUAL,
  CHAT_LABEL,
  CHAT_MEMBERS_SUFFIX,
  CHAT_LIST_SEARCH_NO_RESULTS,
  CHAT_LIST_SEARCH_PLACEHOLDER,
  CHAT_NO_RESULTS_FILTER,
  CHAT_NEW_CHAT,
  CHAT_START_NEW,
} from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured, syncSupabaseRealtimeAuth } from '../../lib/supabase';
import { MAIN_ROUTES } from '../../navigation/routes';
import {
  fetchUserChatThreads,
  resolveChannelForChatParams,
  subscribeToUserChatInbox,
} from '../../services/chatService';
import {
  fetchChatThreads,
  resolveDirectChatThread,
  upsertChatThread,
} from '../../services/chatStorageService';
import { capitalizeName, heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(3.5);
const HORIZONTAL_PAD = wp(4.5);
const CARD_GAP = hp(1);
const AVATAR_COLORS = ['#2D7DD2', '#9B59B6', '#E84393', '#3DDC84', '#F5A623'];

const FILTER_ITEMS = [
  { key: CHAT_FILTER_ALL, icon: 'layers' },
  { key: CHAT_FILTER_INDIVIDUAL, icon: 'user' },
  { key: CHAT_FILTER_GROUP, icon: 'users' },
];

const hashString = value => {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getThreadAvatarColor = thread => {
  const key = thread.peerId || thread.channelId || thread.chatId || thread.chatName;
  return AVATAR_COLORS[hashString(key) % AVATAR_COLORS.length];
};

const formatThreadTime = iso => {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.floor((today - messageDay) / (1000 * 60 * 60 * 24));

  if (dayDiff === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  if (dayDiff === 1) {
    return 'Yesterday';
  }

  if (dayDiff < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const ChatScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeFilter, setActiveFilter] = useState(CHAT_FILTER_ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [modalMode, setModalMode] = useState(null);

  const loadThreads = useCallback(async () => {
    if (isSupabaseConfigured && user?.id) {
      try {
        const data = await fetchUserChatThreads(user.id);
        setThreads(data);
        return;
      } catch (error) {
        if (__DEV__) {
          console.log('[chat] supabase threads failed, using local cache', error?.message);
        }
      }
    }

    const data = await fetchChatThreads(user?.id);
    setThreads(data);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      syncSupabaseRealtimeAuth().catch(() => {});
      loadThreads();
    }, [loadThreads]),
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) {
      return undefined;
    }

    syncSupabaseRealtimeAuth().catch(() => {});

    const unsubscribe = subscribeToUserChatInbox(user.id, () => {
      loadThreads();
    });

    return unsubscribe;
  }, [loadThreads, user?.id]);

  const route = useRoute();
  useEffect(() => {
    if (route.params?.autoOpenChat) {
      const chatParams = route.params.autoOpenChat;
      
      const timer = setTimeout(() => {
        navigation.setParams({ autoOpenChat: undefined });
        let finalParams = { ...chatParams };
        if (chatParams.channelId && threads?.length > 0) {
          const existingThread = threads.find(
            t => t.channelId === chatParams.channelId || t.chatId === chatParams.channelId
          );
          if (existingThread) {
            finalParams = {
              ...existingThread,
              ...chatParams,
              chatType: existingThread.chatType || chatParams.chatType,
              members: existingThread.members || chatParams.members,
              peerId: existingThread.peerId || chatParams.peerId,
            };
          }
        }
        openChat(finalParams);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [route.params?.autoOpenChat, navigation, threads]);

  const filteredThreads = useMemo(() => {
    let list = threads;

    if (activeFilter === CHAT_FILTER_INDIVIDUAL) {
      list = list.filter(thread => thread.chatType === 'direct');
    } else if (activeFilter === CHAT_FILTER_GROUP) {
      list = list.filter(thread => thread.chatType === 'group');
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return list;
    }

    return list.filter(thread => {
      const name = capitalizeName(thread.chatName || '').toLowerCase();
      const lastMessage = String(thread.lastMessage || '').toLowerCase();
      const typeLabel = thread.chatType === 'group' ? 'group' : 'direct';
      return (
        name.includes(query) ||
        lastMessage.includes(query) ||
        typeLabel.includes(query)
      );
    });
  }, [activeFilter, searchQuery, threads]);

  const hasSearchQuery = Boolean(searchQuery.trim());
  const hasThreads = threads.length > 0;

  const totalUnreadCount = useMemo(
    () => threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0),
    [threads],
  );

  const openTypePicker = () => setTypePickerVisible(true);
  const closeTypePicker = () => setTypePickerVisible(false);

  const handleSelectType = mode => {
    closeTypePicker();
    setModalMode(mode);
  };

  const closeStartModal = () => setModalMode(null);

  const openChat = params => {
    navigation.navigate(MAIN_ROUTES.CHANNEL_CHAT, params);
  };

  const handleStartChat = async params => {
    if (isSupabaseConfigured && user?.id) {
      try {
        let resolvedParams = params;
        if (params.chatType === 'direct') {
          resolvedParams = resolveDirectChatThread(user.id, threads, params);
        }
        const channelParams = await resolveChannelForChatParams(user.id, {
          ...resolvedParams,
          currentUserName: user.name,
        });
        openChat(channelParams);
        await loadThreads();
        return;
      } catch (error) {
        if (__DEV__) {
          console.log('[chat] supabase start chat failed', error?.message);
        }
      }
    }

    const resolvedParams =
      params.chatType === 'direct'
        ? resolveDirectChatThread(user?.id, threads, params)
        : params;
    const updated = await upsertChatThread(user?.id, resolvedParams);
    setThreads(updated);
    openChat(resolvedParams);
  };

  const renderThreadSubtitle = thread => {
    if (thread.lastMessage) {
      return thread.lastMessage;
    }

    if (thread.chatType === 'direct') {
      return CHAT_DIRECT_SUBTITLE;
    }

    return `${thread.members || 0} ${CHAT_MEMBERS_SUFFIX}`;
  };

  const renderThreadTitle = thread => {
    const displayName = capitalizeName(thread.chatName);
    return thread.chatType === 'group' ? `# ${displayName}` : displayName;
  };

  const renderThreadAvatar = thread => {
    if (thread.chatType === 'group') {
      return (
        <View style={[styles.threadAvatar, styles.threadAvatarGroup]}>
          <Icon name="users" size={wp(4.8)} color={PURPLE} />
        </View>
      );
    }

    return (
      <UserAvatar
        userId={thread.peerId}
        name={thread.chatName}
        imageUrl={thread.peerAvatarUrl}
        size={wp(12)}
        backgroundColor={getThreadAvatarColor(thread)}
        textStyle={styles.threadInitial}
      />
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={CHAT_LABEL} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {hasThreads ? (
            <>
              <View style={styles.controlsSection}>
                <View style={[styles.searchBar, hasSearchQuery && styles.searchBarFocused]}>
                  <View style={styles.searchIconWrap}>
                    <Icon name="search" size={wp(4)} color={hasSearchQuery ? PURPLE : '#8B95A5'} />
                  </View>
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={CHAT_LIST_SEARCH_PLACEHOLDER}
                    placeholderTextColor={darkPlaceholderColor}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {hasSearchQuery ? (
                    <TouchableOpacity
                      style={styles.clearSearchBtn}
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="x" size={wp(3.8)} color={darkTextSecondaryColor} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.filterRow}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}>
                    {FILTER_ITEMS.map(({ key, icon }) => {
                      const isActive = activeFilter === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[styles.filterPill, isActive && styles.filterPillActive]}
                          onPress={() => setActiveFilter(key)}
                          activeOpacity={0.85}>
                          <Icon
                            name={icon}
                            size={wp(3.8)}
                            color={isActive ? '#FFFFFF' : darkTextSecondaryColor}
                          />
                          <Text
                            style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                            {key}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <Text style={styles.filterCountText}>
                    {filteredThreads.length} chat{filteredThreads.length === 1 ? '' : 's'}
                    {totalUnreadCount > 0
                      ? ` · ${totalUnreadCount} unread`
                      : ''}
                  </Text>
                </View>
              </View>

              {filteredThreads.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Icon name="message-square" size={wp(9)} color={darkTextSecondaryColor} />
                  <Text style={styles.emptyText}>
                    {hasSearchQuery ? CHAT_LIST_SEARCH_NO_RESULTS : CHAT_NO_RESULTS_FILTER}
                  </Text>
                </View>
              ) : (
                <View style={styles.threadList}>
                  {filteredThreads.map(thread => {
                    const timeLabel = formatThreadTime(thread.updatedAt);
                    const unreadCount = thread.unreadCount || 0;
                    const hasUnread = unreadCount > 0;
                    const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

                    return (
                      <TouchableOpacity
                        key={thread.channelId || thread.chatId}
                        style={[styles.threadCard, hasUnread && styles.threadCardUnread]}
                        onPress={() => openChat(thread)}
                        activeOpacity={0.82}>
                        <View style={styles.threadAvatarWrap}>
                          {renderThreadAvatar(thread)}
                          {hasUnread ? <View style={styles.avatarUnreadDot} /> : null}
                        </View>
                        <View style={styles.threadBody}>
                          <View style={styles.threadTopRow}>
                            <Text
                              style={[styles.threadTitle, hasUnread && styles.threadTitleUnread]}
                              numberOfLines={1}>
                              {renderThreadTitle(thread)}
                            </Text>
                            {timeLabel ? (
                              <Text
                                style={[styles.threadTime, hasUnread && styles.threadTimeUnread]}>
                                {timeLabel}
                              </Text>
                            ) : null}
                          </View>
                          <Text
                            style={[
                              styles.threadSubtitle,
                              hasUnread && styles.threadSubtitleUnread,
                            ]}
                            numberOfLines={1}>
                            {renderThreadSubtitle(thread)}
                          </Text>
                        </View>
                        <View style={styles.threadTrailing}>
                          {hasUnread ? (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadBadgeText}>{unreadLabel}</Text>
                            </View>
                          ) : null}
                          <Icon
                            name="chevron-right"
                            size={wp(4.5)}
                            color="rgba(255,255,255,0.28)"
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Icon name="message-circle" size={wp(12)} color={PURPLE} />
              </View>
              <Text style={styles.emptyTitle}>{CHAT_EMPTY_TITLE}</Text>
              <Text style={styles.emptyDescription}>{CHAT_EMPTY_DESC}</Text>
              <TouchableOpacity
                style={styles.emptyNewChatButton}
                onPress={openTypePicker}
                activeOpacity={0.85}>
                <Icon name="plus" size={wp(4.5)} color={darkTextPrimaryColor} />
                <Text style={styles.emptyNewChatText}>{CHAT_NEW_CHAT}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {hasThreads ? (
        <NewChatFab onPress={openTypePicker} accessibilityLabel={CHAT_START_NEW} />
      ) : (
        <AiAssistant />
      )}

      <NewChatTypeModal
        visible={typePickerVisible}
        onClose={closeTypePicker}
        onSelectType={handleSelectType}
      />

      <StartChatModal
        visible={modalMode != null}
        mode={modalMode || 'direct'}
        onClose={closeStartModal}
        onStartChat={handleStartChat}
      />
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: hp(0.6),
    paddingBottom: hp(18),
  },
  controlsSection: {
    marginBottom: hp(1.4),
    gap: hp(1.1),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hp(5.2),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: wp(3),
    paddingRight: wp(2),
  },
  searchBarFocused: {
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.35)',
  },
  searchIconWrap: {
    width: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  clearSearchBtn: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  filterScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingRight: wp(1),
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.75),
    borderRadius: wp(5),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterPillActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  filterPillText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    ...style.fontWeightMedium,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  filterCountText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    flexShrink: 0,
  },
  threadList: {
    gap: CARD_GAP,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.35),
    gap: wp(3),
  },
  threadCardUnread: {
    borderColor: 'rgba(155, 89, 182, 0.35)',
    backgroundColor: 'rgba(155, 89, 182, 0.06)',
  },
  threadAvatarWrap: {
    position: 'relative',
  },
  avatarUnreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: wp(2.8),
    height: wp(2.8),
    borderRadius: wp(1.4),
    backgroundColor: PURPLE,
    borderWidth: 2,
    borderColor: darkSurfaceColor,
  },
  threadAvatar: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAvatarGroup: {
    backgroundColor: 'rgba(155, 89, 182, 0.18)',
  },
  threadInitial: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  threadBody: {
    flex: 1,
    minWidth: 0,
  },
  threadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
    marginBottom: hp(0.3),
  },
  threadTitle: {
    flex: 1,
    ...style.fontSizeNormal,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  threadTitleUnread: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium1x,
  },
  threadTime: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  threadTimeUnread: {
    color: PURPLE,
    ...style.fontWeightMedium,
  },
  threadSubtitle: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  threadSubtitleUnread: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  threadTrailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: hp(0.5),
    minWidth: wp(8),
  },
  unreadBadge: {
    minWidth: wp(5.5),
    height: wp(5.5),
    borderRadius: wp(2.75),
    paddingHorizontal: wp(1.5),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium1x,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingVertical: hp(4),
    gap: hp(1),
  },
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    paddingHorizontal: wp(6),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: hp(12),
    paddingBottom: hp(4),
  },
  emptyIconWrap: {
    width: wp(22),
    height: wp(22),
    borderRadius: wp(11),
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
  },
  emptyTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.8),
    textAlign: 'center',
  },
  emptyDescription: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    paddingHorizontal: wp(8),
    marginBottom: hp(2),
  },
  emptyNewChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: PURPLE,
    borderRadius: wp(8),
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.3),
    elevation: 6,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  emptyNewChatText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
});
