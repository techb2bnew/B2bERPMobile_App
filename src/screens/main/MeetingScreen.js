import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';
import AiAssistant from '../../components/AiAssistant';
import MeetingCard from '../../components/MeetingCard';
import MeetingCalendarView from '../../components/MeetingCalendarView';
import MeetingKanbanBoard from '../../components/MeetingKanbanBoard';
import MeetingFormModal from '../../components/Modal/MeetingFormModal';
import MeetingDetailModal from '../../components/Modal/MeetingDetailModal';
import MeetingFilterModal, { DEFAULT_MEETING_FILTERS } from '../../components/Modal/MeetingFilterModal';
import {
  MEETINGS_NEW_BUTTON,
  MEETINGS_SEARCH_PLACEHOLDER,
  MEETINGS_TITLE,
  MEETING_EMPTY_COMPLETED,
  MEETING_EMPTY_ONGOING,
  MEETING_EMPTY_SEARCH,
  MEETING_EMPTY_TODAY,
  MEETING_EMPTY_UPCOMING,
  MEETING_FILTER_ALL,
  MEETING_FILTER_DATE_ALL,
  MEETING_FILTER_DATE_TODAY,
  MEETING_FILTER_DATE_WEEK,
  MEETING_REMINDER_MINUTES_SUFFIX,
  MEETING_REMINDER_STARTS_IN,
  MEETING_REMINDER_TITLE,
  MEETING_STATUS_CANCELLED,
  MEETING_STATUS_COMPLETED,
  MEETING_STATUS_ONGOING,
  MEETING_STATUS_SCHEDULED,
  MEETING_TAB_COMPLETED,
  MEETING_TAB_ONGOING,
  MEETING_TAB_TODAY,
  MEETING_TAB_UPCOMING,
  MEETING_VIEW_BOARD,
  MEETING_VIEW_CALENDAR,
  MEETING_VIEW_LIST,
} from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import {
  cancelMeeting,
  changeMeetingStatus,
  createMeeting,
  fetchMeetings,
  fetchParticipantDirectory,
  mapMeetingRowToApp,
  subscribeToMeetingsChanges,
  updateMeeting,
} from '../../services/meetingsService';
import {
  computeMeetingStatus,
  getMinutesUntilStart,
  getWeekDateKeys,
  isMeetingToday,
  openMeetingLink,
  sortMeetingsByStartTime,
} from '../../utils/meetingUtils';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const TABS = [MEETING_TAB_TODAY, MEETING_TAB_UPCOMING, MEETING_TAB_ONGOING, MEETING_TAB_COMPLETED];
const TAB_EMPTY_MESSAGES = {
  [MEETING_TAB_TODAY]: MEETING_EMPTY_TODAY,
  [MEETING_TAB_UPCOMING]: MEETING_EMPTY_UPCOMING,
  [MEETING_TAB_ONGOING]: MEETING_EMPTY_ONGOING,
  [MEETING_TAB_COMPLETED]: MEETING_EMPTY_COMPLETED,
};

const REMINDER_WINDOW_MINUTES = 15;
const STATUS_TICK_INTERVAL_MS = 60000;

const VIEW_TAB_ICONS = {
  [MEETING_VIEW_LIST]: 'list',
  [MEETING_VIEW_CALENDAR]: 'calendar',
  [MEETING_VIEW_BOARD]: 'columns',
};

const MeetingScreen = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [participantOptions, setParticipantOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [activeTab, setActiveTab] = useState(MEETING_TAB_TODAY);
  const [viewMode, setViewMode] = useState(MEETING_VIEW_BOARD);
  const [filters, setFilters] = useState(DEFAULT_MEETING_FILTERS);

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formDefaultDate, setFormDefaultDate] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const [meetingRows, participants] = await Promise.all([
        fetchMeetings(),
        fetchParticipantDirectory(),
      ]);
      setMeetings(meetingRows);
      setParticipantOptions(participants);
    } catch (error) {
      Alert.alert('Load Failed', error?.message || 'Unable to load meetings.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  const applyRealtimePayload = useCallback(
    payload => {
      const eventType = payload?.eventType;
      const deletedId = payload?.old?.id;

      if (eventType === 'DELETE' && deletedId) {
        setMeetings(prev => prev.filter(meeting => meeting.id !== deletedId));
        return;
      }

      const row = payload?.new;
      if (!row) {
        loadData({ silent: true });
        return;
      }

      const appMeeting = mapMeetingRowToApp(row);
      setMeetings(prev => {
        const exists = prev.some(meeting => meeting.id === appMeeting.id);
        if (!exists) {
          return [...prev, appMeeting];
        }
        return prev.map(meeting => (meeting.id === appMeeting.id ? appMeeting : meeting));
      });
    },
    [loadData],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
      const unsubscribe = subscribeToMeetingsChanges(applyRealtimePayload);
      const tickTimer = setInterval(() => setNow(new Date()), STATUS_TICK_INTERVAL_MS);

      return () => {
        unsubscribe();
        clearInterval(tickTimer);
      };
    }, [loadData, applyRealtimePayload]),
  );

  const activeMeetings = useMemo(
    () => meetings.filter(meeting => computeMeetingStatus(meeting, now) !== MEETING_STATUS_CANCELLED),
    [meetings, now],
  );

  const reminderMeetings = useMemo(() => {
    return sortMeetingsByStartTime(
      activeMeetings.filter(meeting => {
        if (computeMeetingStatus(meeting, now) !== MEETING_STATUS_SCHEDULED) {
          return false;
        }
        const minutesUntil = getMinutesUntilStart(meeting, now);
        return minutesUntil >= 0 && minutesUntil <= REMINDER_WINDOW_MINUTES;
      }),
    ).slice(0, 2);
  }, [activeMeetings, now]);

  const matchesFilters = useCallback(
    meeting => {
      const query = filters.search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        meeting.title.toLowerCase().includes(query) ||
        (meeting.agenda || '').toLowerCase().includes(query) ||
        (meeting.participantNames || []).some(name => name.toLowerCase().includes(query));

      const matchesType = filters.type === MEETING_FILTER_ALL || meeting.type === filters.type;
      const matchesPlatform = filters.platform === MEETING_FILTER_ALL || meeting.platform === filters.platform;
      const matchesParticipant =
        filters.participant === MEETING_FILTER_ALL ||
        (meeting.participantNames || []).includes(filters.participant);

      let matchesDateRange = true;
      if (filters.dateRange === MEETING_FILTER_DATE_TODAY) {
        matchesDateRange = isMeetingToday(meeting);
      } else if (filters.dateRange === MEETING_FILTER_DATE_WEEK) {
        matchesDateRange = getWeekDateKeys().includes(meeting.date);
      }

      return matchesSearch && matchesType && matchesPlatform && matchesParticipant && matchesDateRange;
    },
    [filters],
  );

  const { displayList, emptyMessage } = useMemo(() => {
    if (filters.status !== MEETING_FILTER_ALL) {
      return {
        displayList: sortMeetingsByStartTime(
          meetings.filter(meeting => computeMeetingStatus(meeting, now) === filters.status),
        ),
        emptyMessage: MEETING_EMPTY_SEARCH,
      };
    }

    if (activeTab === MEETING_TAB_TODAY) {
      return {
        displayList: sortMeetingsByStartTime(activeMeetings.filter(isMeetingToday)),
        emptyMessage: TAB_EMPTY_MESSAGES[MEETING_TAB_TODAY],
      };
    }

    if (activeTab === MEETING_TAB_UPCOMING) {
      return {
        displayList: sortMeetingsByStartTime(
          activeMeetings.filter(
            meeting => computeMeetingStatus(meeting, now) === MEETING_STATUS_SCHEDULED && !isMeetingToday(meeting),
          ),
        ),
        emptyMessage: TAB_EMPTY_MESSAGES[MEETING_TAB_UPCOMING],
      };
    }

    if (activeTab === MEETING_TAB_ONGOING) {
      return {
        displayList: sortMeetingsByStartTime(
          activeMeetings.filter(meeting => computeMeetingStatus(meeting, now) === MEETING_STATUS_ONGOING),
        ),
        emptyMessage: TAB_EMPTY_MESSAGES[MEETING_TAB_ONGOING],
      };
    }

    return {
      displayList: sortMeetingsByStartTime(
        activeMeetings.filter(meeting => computeMeetingStatus(meeting, now) === MEETING_STATUS_COMPLETED),
      ).reverse(),
      emptyMessage: TAB_EMPTY_MESSAGES[MEETING_TAB_COMPLETED],
    };
  }, [filters.status, meetings, activeMeetings, activeTab, now]);

  const filteredList = useMemo(() => displayList.filter(matchesFilters), [displayList, matchesFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count += 1;
    if (filters.status !== MEETING_FILTER_ALL) count += 1;
    if (filters.type !== MEETING_FILTER_ALL) count += 1;
    if (filters.platform !== MEETING_FILTER_ALL) count += 1;
    if (filters.participant !== MEETING_FILTER_ALL) count += 1;
    if (filters.dateRange !== MEETING_FILTER_DATE_ALL && filters.dateRange) count += 1;
    return count;
  }, [filters]);

  const openCreateMeeting = (defaultDate = null) => {
    setFormMode('create');
    setSelectedMeeting(null);
    setFormDefaultDate(defaultDate);
    setFormVisible(true);
  };

  const openEditMeeting = meeting => {
    setDetailVisible(false);
    setFormMode('edit');
    setSelectedMeeting(meeting);
    setFormVisible(true);
  };

  const openMeetingDetail = meeting => {
    setSelectedMeeting(meeting);
    setDetailVisible(true);
  };

  const handleSaveMeeting = async (payload, isCreate) => {
    try {
      if (isCreate) {
        const created = await createMeeting(payload);
        setMeetings(prev => [...prev, created]);
      } else {
        const updated = await updateMeeting(payload.id, payload);
        setMeetings(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      }
      return true;
    } catch (error) {
      Alert.alert('Save Failed', error?.message || 'Unable to save meeting.');
      return false;
    }
  };

  const handleCancelMeeting = async meeting => {
    try {
      const updated = await cancelMeeting(meeting, user?.id);
      setMeetings(prev => prev.map(item => (item.id === updated.id ? updated : item)));
    } catch (error) {
      Alert.alert('Cancel Failed', error?.message || 'Unable to cancel meeting.');
    }
  };

  const handleReschedule = async (meeting, changes) => {
    const previousMeetings = meetings;
    setMeetings(prev => prev.map(item => (item.id === meeting.id ? { ...item, ...changes } : item)));
    try {
      await updateMeeting(meeting.id, changes);
    } catch (error) {
      setMeetings(previousMeetings);
      Alert.alert('Reschedule Failed', error?.message || 'Unable to reschedule this meeting.');
    }
  };

  const handleStatusChange = async (meeting, newStatus) => {
    const previousMeetings = meetings;
    setMeetings(prev => prev.map(item => (item.id === meeting.id ? { ...item, status: newStatus } : item)));
    try {
      await changeMeetingStatus(meeting, newStatus, user?.id);
    } catch (error) {
      setMeetings(previousMeetings);
      Alert.alert('Status Update Failed', error?.message || 'Unable to update this meeting.');
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={MEETINGS_TITLE} />

        {reminderMeetings.length > 0 ? (
          <View style={styles.reminderStrip}>
            <Text style={styles.reminderTitle}>{MEETING_REMINDER_TITLE}</Text>
            {reminderMeetings.map(meeting => {
              const minutesUntil = Math.max(getMinutesUntilStart(meeting, now), 0);
              return (
                <TouchableOpacity
                  key={meeting.id}
                  style={styles.reminderRow}
                  onPress={() => openMeetingDetail(meeting)}
                  activeOpacity={0.85}>
                  <Icon name="bell" size={wp(3.8)} color="#F5A623" />
                  <Text style={styles.reminderText} numberOfLines={1}>
                    {meeting.title} {MEETING_REMINDER_STARTS_IN} {minutesUntil} {MEETING_REMINDER_MINUTES_SUFFIX}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={wp(4)} color={darkTextSecondaryColor} />
            <TextInput
              style={styles.searchInput}
              value={filters.search}
              onChangeText={text => setFilters(prev => ({ ...prev, search: text }))}
              placeholder={MEETINGS_SEARCH_PLACEHOLDER}
              placeholderTextColor={darkPlaceholderColor}
            />
          </View>
          <TouchableOpacity
            style={styles.newMeetingButton}
            onPress={() => openCreateMeeting()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={MEETINGS_NEW_BUTTON}>
            <Icon name="plus" size={wp(5)} color={darkTextPrimaryColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterVisible(true)}
            activeOpacity={0.8}>
            <Icon name="sliders" size={wp(4.4)} color={PURPLE} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.viewTabs}>
          {[MEETING_VIEW_BOARD, MEETING_VIEW_LIST, MEETING_VIEW_CALENDAR].map(view => {
            const isActive = viewMode === view;
            return (
              <TouchableOpacity
                key={view}
                style={[styles.viewTab, isActive && styles.viewTabActive]}
                onPress={() => setViewMode(view)}
                activeOpacity={0.8}>
                <Icon
                  name={VIEW_TAB_ICONS[view]}
                  size={wp(4)}
                  color={isActive ? darkTextPrimaryColor : darkTextSecondaryColor}
                />
                <Text style={[styles.viewTabText, isActive && styles.viewTabTextActive]}>{view}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={styles.loader} />
        ) : viewMode === MEETING_VIEW_LIST ? (
          <>
            <ScrollView
              horizontal
              style={styles.tabChipsScroll}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabChipsRow}>
              {TABS.map(tab => {
                const isActive = activeTab === tab && filters.status === MEETING_FILTER_ALL;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabChip, isActive && styles.tabChipActive]}
                    onPress={() => {
                      setActiveTab(tab);
                      if (filters.status !== MEETING_FILTER_ALL) {
                        setFilters(prev => ({ ...prev, status: MEETING_FILTER_ALL }));
                      }
                    }}
                    activeOpacity={0.85}>
                    <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView
              style={styles.listView}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}>
              {filteredList.length === 0 ? (
                <Text style={styles.emptyText}>{emptyMessage}</Text>
              ) : (
                filteredList.map(meeting => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    status={computeMeetingStatus(meeting, now)}
                    onPress={() => openMeetingDetail(meeting)}
                    onJoin={() => openMeetingLink(meeting.meetingLink)}
                  />
                ))
              )}
            </ScrollView>
          </>
        ) : viewMode === MEETING_VIEW_CALENDAR ? (
          <MeetingCalendarView
            meetings={activeMeetings}
            onMeetingPress={openMeetingDetail}
            onReschedule={handleReschedule}
          />
        ) : (
          <MeetingKanbanBoard
            meetings={meetings}
            onMeetingPress={openMeetingDetail}
            onStatusChange={handleStatusChange}
          />
        )}
      </SafeAreaView>

      <MeetingFormModal
        visible={formVisible}
        mode={formMode}
        meeting={selectedMeeting}
        defaultDate={formDefaultDate}
        participantOptions={participantOptions}
        currentUserId={user?.id || ''}
        currentUserName={user?.name || ''}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveMeeting}
      />

      <MeetingDetailModal
        visible={detailVisible}
        meeting={selectedMeeting}
        onClose={() => setDetailVisible(false)}
        onEdit={openEditMeeting}
        onCancelMeeting={handleCancelMeeting}
      />

      <MeetingFilterModal
        visible={filterVisible}
        filters={filters}
        participantOptions={participantOptions}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
        onClear={() => setFilters(DEFAULT_MEETING_FILTERS)}
      />

      <AiAssistant />
    </View>
  );
};

export default MeetingScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  reminderStrip: {
    marginHorizontal: wp(5),
    marginTop: hp(1.2),
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.3)',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1),
    gap: hp(0.5),
  },
  reminderTitle: {
    ...style.fontSizeSmall,
    ...style.fontWeightMedium,
    color: '#F5A623',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  reminderText: {
    flex: 1,
    ...style.fontSizeSmall2x,
    color: darkTextPrimaryColor,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingHorizontal: wp(5),
    marginTop: hp(1.5),
    marginBottom: hp(1.2),
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    height: hp(5),
  },
  searchInput: {
    flex: 1,
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  newMeetingButton: {
    width: wp(10.5),
    height: hp(5),
    borderRadius: wp(3),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    width: wp(10.5),
    height: hp(5),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: darkInputBgColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: wp(4.2),
    height: wp(4.2),
    borderRadius: wp(2.1),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1),
  },
  filterBadgeText: {
    ...style.fontSizeExtraSmall,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  viewTabs: {
    flexDirection: 'row',
    marginHorizontal: wp(5),
    marginBottom: hp(1.2),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(1),
    gap: wp(1),
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(1),
    borderRadius: wp(2.5),
  },
  viewTabActive: {
    backgroundColor: PURPLE,
  },
  viewTabText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  viewTabTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  loader: {
    marginTop: hp(8),
  },
  tabChipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabChipsRow: {
    paddingHorizontal: wp(5),
    gap: wp(2),
    marginBottom: hp(1.2),
  },
  tabChip: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: darkSurfaceColor,
  },
  tabChipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  tabChipText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  tabChipTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  listView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
    gap: hp(1.2),
  },
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginTop: hp(4),
  },
});
