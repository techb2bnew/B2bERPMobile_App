import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import { MARK_ALL_READ, NOTIFICATIONS_TITLE } from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { useAuth } from '../../context/AuthContext';
import { useNotificationBadgeContext } from '../../context/NotificationBadgeContext';
import { MAIN_ROUTES } from '../../navigation/routes';
import {
  fetchUserNotifications,
  formatNotificationTime,
  getNotificationTypeLabel,
  getSenderLabelFromTitle,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToUserNotifications,
} from '../../services/notificationService';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../../utils';

const PURPLE = '#9B59B6';
const CHAT_COLOR = '#3DDC84';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);
const CARD_GAP = hp(1);
const FILTERS = ['All', 'Unread', 'Chat'];

const getNotificationIcon = type => {
  if (type === 'chat_message') {
    return 'message-square';
  }
  return 'bell';
};

const getNotificationColor = type => {
  if (type === 'chat_message') {
    return CHAT_COLOR;
  }
  return PURPLE;
};

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { refreshUnreadCount } = useNotificationBadgeContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const rows = await fetchUserNotifications(user.id);
    setNotifications(rows);
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      await loadNotifications();
      await refreshUnreadCount();
    } catch {
      // Keep the last loaded list if refresh fails.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadNotifications, refreshUnreadCount, user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    const unsubscribe = subscribeToUserNotifications(user.id, () => {
      loadNotifications().catch(() => {});
      refreshUnreadCount().catch(() => {});
    });

    return unsubscribe;
  }, [loadNotifications, refreshUnreadCount, user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter(item => !item.is_read).length,
    [notifications],
  );

  const filtered = useMemo(() => {
    if (activeFilter === 'Unread') {
      return notifications.filter(item => !item.is_read);
    }

    if (activeFilter === 'Chat') {
      return notifications.filter(item => item.type === 'chat_message');
    }

    return notifications;
  }, [activeFilter, notifications]);

  const subtitle = `${unreadCount} unread · ${notifications.length} total`;

  const handleMarkAllRead = async () => {
    if (!user?.id || unreadCount === 0 || markingAllRead) {
      return;
    }

    setMarkingAllRead(true);
    try {
      await markAllNotificationsAsRead(user.id);
      await refresh();
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationPress = async item => {
    if (!user?.id) {
      return;
    }

    if (!item.is_read) {
      await markNotificationAsRead({ notificationId: item.id, userId: user.id }).catch(() => {});
      await refreshUnreadCount();
      setNotifications(current =>
        current.map(row => (row.id === item.id ? { ...row, is_read: true } : row)),
      );
    }

    if (item.type === 'chat_message' && item.reference_id) {
      navigation.navigate(MAIN_ROUTES.CHANNEL_CHAT, {
        chatType: item.sender_id ? 'direct' : 'group',
        channelId: item.reference_id,
        chatName: getSenderLabelFromTitle(item.title),
        peerId: item.sender_id,
      });
    } else if (['leave_request', 'leave_status'].includes(item.type)) {
      navigation.navigate(MAIN_ROUTES.APPLY_LEAVE);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={NOTIFICATIONS_TITLE} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                refresh();
              }}
              tintColor={PURPLE}
            />
          }>
          <View style={styles.topRow}>
            <View style={styles.topRowLeft}>
              <Text style={styles.heading}>{NOTIFICATIONS_TITLE}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity
              style={[styles.markReadButton, unreadCount === 0 && styles.markReadButtonDisabled]}
              activeOpacity={0.8}
              onPress={handleMarkAllRead}
              disabled={unreadCount === 0 || markingAllRead}>
              <Text style={styles.markReadText}>
                {markingAllRead ? 'Updating...' : MARK_ALL_READ}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}>
            {FILTERS.map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.8}>
                <Text
                  style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={PURPLE} />
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Icon name="bell-off" size={wp(10)} color={darkTextSecondaryColor} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>
                {activeFilter === 'Unread'
                  ? 'You have read all your notifications.'
                  : 'New chat messages and alerts will show up here.'}
              </Text>
            </View>
          ) : (
            <View style={styles.listSection}>
              {filtered.map(item => {
                const color = getNotificationColor(item.type);
                const senderLabel = getSenderLabelFromTitle(item.title);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.card, !item.is_read && styles.cardUnread]}
                    activeOpacity={0.85}
                    onPress={() => handleNotificationPress(item)}>
                    <View style={[styles.iconCircle, { backgroundColor: `${color}22` }]}>
                      <Icon name={getNotificationIcon(item.type)} size={wp(5.2)} color={color} />
                    </View>
                    <View style={styles.cardContent}>
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {item.title || `Message from ${senderLabel}`}
                        </Text>
                        <Text style={styles.cardTime}>{formatNotificationTime(item.created_at)}</Text>
                      </View>
                      <Text style={styles.cardBody} numberOfLines={2}>
                        {item.message}
                      </Text>
                      <View style={styles.cardFooter}>
                        <View style={styles.typeTag}>
                          <Text style={styles.typeTagText}>
                            {getNotificationTypeLabel(item.type)}
                          </Text>
                        </View>
                        <Text style={styles.senderText}>From {senderLabel}</Text>
                        {!item.is_read ? <View style={styles.unreadDot} /> : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <AiAssistant />
    </View>
  );
};

export default NotificationsScreen;

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
    paddingTop: hp(1.2),
    paddingBottom: hp(14),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(2),
    gap: wp(3),
  },
  topRowLeft: {
    flex: 1,
    paddingRight: wp(2),
  },
  heading: {
    ...style.fontSizeLargeXX,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    lineHeight: hp(3.2),
  },
  subtitle: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginTop: hp(0.6),
    lineHeight: hp(2.2),
  },
  markReadButton: {
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1),
    marginTop: hp(0.3),
  },
  markReadButtonDisabled: {
    opacity: 0.45,
  },
  markReadText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightThin1x,
    color: darkTextSecondaryColor,
  },
  filters: {
    gap: wp(2.5),
    paddingBottom: hp(0.5),
    marginBottom: hp(1.8),
  },
  filterChip: {
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(5),
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(1),
    minHeight: hp(4.2),
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: darkSurfaceColor,
    borderColor: darkTextSecondaryColor,
  },
  filterText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  filterTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  loadingWrap: {
    paddingVertical: hp(8),
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: hp(8),
    gap: hp(1),
  },
  emptyTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  emptyText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    lineHeight: hp(2.4),
    paddingHorizontal: wp(8),
  },
  listSection: {
    gap: CARD_GAP,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    gap: wp(3),
  },
  cardUnread: {
    borderColor: 'rgba(61, 220, 132, 0.35)',
  },
  iconCircle: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.2),
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: wp(2),
    marginBottom: hp(0.6),
  },
  cardTitle: {
    flex: 1,
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    lineHeight: hp(2.6),
  },
  cardTime: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.3),
    minWidth: wp(16),
    textAlign: 'right',
  },
  cardBody: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    lineHeight: hp(2.4),
    marginBottom: hp(1),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    flexWrap: 'wrap',
  },
  typeTag: {
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(4),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.5),
  },
  typeTagText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  senderText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    flex: 1,
  },
  unreadDot: {
    width: wp(2.2),
    height: wp(2.2),
    borderRadius: wp(1.1),
    backgroundColor: '#2D7DD2',
  },
});
