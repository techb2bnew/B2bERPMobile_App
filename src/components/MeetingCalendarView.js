import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Feather';
import MeetingCard from './MeetingCard';
import { useDragDropSlots } from '../hooks/useDragDropSlots';
import {
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import { style } from '../constants/Fonts';
import {
  MEETING_CALENDAR_DAY,
  MEETING_CALENDAR_MONTH,
  MEETING_CALENDAR_WEEK,
  MEETING_DRAG_HINT_DAY,
  MEETING_DRAG_HINT_WEEK,
} from '../constants/Constants';
import {
  buildDayHourSlots,
  computeMeetingStatus,
  formatDayNumber,
  formatWeekdayShort,
  getHourSlotForMeeting,
  getTodayMeetingDateKey,
  getWeekDateKeys,
  isMeetingOnDate,
  openMeetingLink,
  shiftDateKey,
  sortMeetingsByStartTime,
} from '../utils/meetingUtils';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const PURPLE = '#9B59B6';
const HOUR_SLOTS = buildDayHourSlots();
const DAY_COLUMN_WIDTH = wp(40);

const calendarTheme = {
  backgroundColor: darkSurfaceColor,
  calendarBackground: darkSurfaceColor,
  textSectionTitleColor: darkTextSecondaryColor,
  selectedDayBackgroundColor: PURPLE,
  selectedDayTextColor: '#ffffff',
  todayTextColor: PURPLE,
  dayTextColor: darkTextPrimaryColor,
  textDisabledColor: 'rgba(255,255,255,0.15)',
  monthTextColor: darkTextPrimaryColor,
  arrowColor: PURPLE,
  dotColor: PURPLE,
  selectedDotColor: '#ffffff',
};

const CALENDAR_MODES = [MEETING_CALENDAR_DAY, MEETING_CALENDAR_WEEK, MEETING_CALENDAR_MONTH];

const MeetingCalendarView = ({ meetings, onMeetingPress, onReschedule }) => {
  const [mode, setMode] = useState(MEETING_CALENDAR_WEEK);
  const [anchorDate, setAnchorDate] = useState(getTodayMeetingDateKey());
  const [monthSelectedDate, setMonthSelectedDate] = useState(getTodayMeetingDateKey());

  const handleDrop = useCallback(
    (meeting, targetSlot) => {
      if (mode === MEETING_CALENDAR_WEEK) {
        if (targetSlot === meeting.date) {
          return;
        }
        onReschedule?.(meeting, { date: targetSlot });
        return;
      }

      if (mode === MEETING_CALENDAR_DAY) {
        const currentSlot = getHourSlotForMeeting(meeting, HOUR_SLOTS);
        if (targetSlot === currentSlot) {
          return;
        }
        onReschedule?.(meeting, { startTime: targetSlot });
      }
    },
    [mode, onReschedule],
  );

  const { dragState, hoverSlot, registerSlot, dragHandlersFor } = useDragDropSlots({
    onDrop: handleDrop,
    onTap: onMeetingPress,
  });

  // ---- Week view -----------------------------------------------------
  const weekDateKeys = useMemo(() => getWeekDateKeys(anchorDate), [anchorDate]);

  const meetingsByDate = useMemo(() => {
    const map = {};
    weekDateKeys.forEach(key => {
      map[key] = sortMeetingsByStartTime(meetings.filter(meeting => isMeetingOnDate(meeting, key)));
    });
    return map;
  }, [meetings, weekDateKeys]);

  const renderWeekView = () => (
    <View style={styles.viewContainer}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => setAnchorDate(shiftDateKey(anchorDate, -7))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-left" size={wp(5)} color={darkTextPrimaryColor} />
        </TouchableOpacity>
        <Text style={styles.navLabel}>
          {formatWeekdayShort(weekDateKeys[0])} {formatDayNumber(weekDateKeys[0])} - {formatWeekdayShort(weekDateKeys[6])}{' '}
          {formatDayNumber(weekDateKeys[6])}
        </Text>
        <TouchableOpacity onPress={() => setAnchorDate(shiftDateKey(anchorDate, 7))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-right" size={wp(5)} color={darkTextPrimaryColor} />
        </TouchableOpacity>
      </View>

      <Text style={styles.dragHintText}>{MEETING_DRAG_HINT_WEEK}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={!dragState}>
        {weekDateKeys.map(dateKey => {
          const isToday = dateKey === getTodayMeetingDateKey();
          const isDropTarget = dragState && hoverSlot === dateKey;
          const dayMeetings = meetingsByDate[dateKey] || [];

          return (
            <View
              key={dateKey}
              ref={ref => registerSlot(dateKey, ref)}
              collapsable={false}
              style={[
                styles.dayColumn,
                isToday && styles.dayColumnToday,
                isDropTarget && styles.dayColumnDropTarget,
              ]}>
              <View style={styles.dayColumnHeader}>
                <Text style={[styles.dayColumnWeekday, isToday && styles.dayColumnHeaderActive]}>
                  {formatWeekdayShort(dateKey)}
                </Text>
                <Text style={[styles.dayColumnNumber, isToday && styles.dayColumnHeaderActive]}>
                  {formatDayNumber(dateKey)}
                </Text>
              </View>

              <ScrollView
                style={styles.dayColumnBody}
                contentContainerStyle={styles.dayColumnBodyContent}
                scrollEnabled={!dragState}
                showsVerticalScrollIndicator={false}>
                {dayMeetings.length === 0 ? (
                  <View style={styles.emptySlot} />
                ) : (
                  dayMeetings.map(meeting => {
                    const isDragging = dragState?.item?.id === meeting.id;
                    return (
                      <View key={meeting.id} style={isDragging && styles.draggingCard}>
                        <MeetingCard
                          meeting={meeting}
                          status={computeMeetingStatus(meeting)}
                          compact
                          onJoin={() => openMeetingLink(meeting.meetingLink)}
                          dragProps={dragHandlersFor(meeting, dateKey, weekDateKeys)}
                        />
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // ---- Day view -------------------------------------------------------
  const dayMeetingsByHour = useMemo(() => {
    const map = {};
    HOUR_SLOTS.forEach(slot => {
      map[slot] = [];
    });
    sortMeetingsByStartTime(meetings.filter(meeting => isMeetingOnDate(meeting, anchorDate))).forEach(meeting => {
      const slot = getHourSlotForMeeting(meeting, HOUR_SLOTS);
      map[slot] = [...(map[slot] || []), meeting];
    });
    return map;
  }, [meetings, anchorDate]);

  const renderDayView = () => (
    <View style={styles.viewContainer}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => setAnchorDate(shiftDateKey(anchorDate, -1))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-left" size={wp(5)} color={darkTextPrimaryColor} />
        </TouchableOpacity>
        <Text style={styles.navLabel}>
          {formatWeekdayShort(anchorDate)} {formatDayNumber(anchorDate)}
        </Text>
        <TouchableOpacity onPress={() => setAnchorDate(shiftDateKey(anchorDate, 1))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-right" size={wp(5)} color={darkTextPrimaryColor} />
        </TouchableOpacity>
      </View>

      <Text style={styles.dragHintText}>{MEETING_DRAG_HINT_DAY}</Text>

      <ScrollView scrollEnabled={!dragState} showsVerticalScrollIndicator={false} contentContainerStyle={styles.dayTimelineContent}>
        {HOUR_SLOTS.map(hourSlot => {
          const slotMeetings = dayMeetingsByHour[hourSlot] || [];
          const isDropTarget = dragState && hoverSlot === hourSlot;

          return (
            <View
              key={hourSlot}
              ref={ref => registerSlot(hourSlot, ref)}
              collapsable={false}
              style={[styles.hourRow, isDropTarget && styles.hourRowDropTarget]}>
              <Text style={styles.hourLabel}>{hourSlot}</Text>
              <View style={styles.hourRowBody}>
                {slotMeetings.length === 0 ? (
                  <View style={styles.hourRowDivider} />
                ) : (
                  slotMeetings.map(meeting => {
                    const isDragging = dragState?.item?.id === meeting.id;
                    return (
                      <View key={meeting.id} style={[styles.hourMeetingWrap, isDragging && styles.draggingCard]}>
                        <MeetingCard
                          meeting={meeting}
                          status={computeMeetingStatus(meeting)}
                          compact
                          onJoin={() => openMeetingLink(meeting.meetingLink)}
                          dragProps={dragHandlersFor(meeting, hourSlot, HOUR_SLOTS)}
                        />
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // ---- Month view -------------------------------------------------------
  const markedDates = useMemo(() => {
    const marks = {};
    meetings.forEach(meeting => {
      if (!meeting.date) return;
      if (!marks[meeting.date]) {
        marks[meeting.date] = { dots: [{ color: PURPLE }] };
      }
    });
    if (marks[monthSelectedDate]) {
      marks[monthSelectedDate] = { ...marks[monthSelectedDate], selected: true, selectedColor: 'rgba(155, 89, 182, 0.25)' };
    } else {
      marks[monthSelectedDate] = { selected: true, selectedColor: 'rgba(155, 89, 182, 0.25)' };
    }
    return marks;
  }, [meetings, monthSelectedDate]);

  const monthDayMeetings = useMemo(
    () => sortMeetingsByStartTime(meetings.filter(meeting => isMeetingOnDate(meeting, monthSelectedDate))),
    [meetings, monthSelectedDate],
  );

  const renderMonthView = () => (
    <View style={styles.viewContainer}>
      <Calendar
        current={monthSelectedDate}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={day => setMonthSelectedDate(day.dateString)}
        enableSwipeMonths
        theme={calendarTheme}
        style={styles.monthCalendar}
      />

      <Text style={styles.monthListTitle}>
        {formatWeekdayShort(monthSelectedDate)} {formatDayNumber(monthSelectedDate)} ·{' '}
        {monthDayMeetings.length} meeting{monthDayMeetings.length === 1 ? '' : 's'}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.monthListContent}>
        {monthDayMeetings.length === 0 ? (
          <Text style={styles.emptyText}>No meetings on this day.</Text>
        ) : (
          monthDayMeetings.map(meeting => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              status={computeMeetingStatus(meeting)}
              onPress={() => onMeetingPress(meeting)}
              onJoin={() => openMeetingLink(meeting.meetingLink)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.modeTabs}>
        {CALENDAR_MODES.map(item => {
          const isActive = mode === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.modeTab, isActive && styles.modeTabActive]}
              onPress={() => setMode(item)}
              activeOpacity={0.8}>
              <Text style={[styles.modeTabText, isActive && styles.modeTabTextActive]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === MEETING_CALENDAR_DAY ? renderDayView() : null}
      {mode === MEETING_CALENDAR_WEEK ? renderWeekView() : null}
      {mode === MEETING_CALENDAR_MONTH ? renderMonthView() : null}

      {dragState ? (
        <View style={styles.dragOverlay} pointerEvents="none">
          <View
            style={[
              styles.dragGhost,
              {
                left: dragState.x - wp(30),
                top: dragState.y - hp(5),
              },
            ]}>
            <MeetingCard meeting={dragState.item} status={computeMeetingStatus(dragState.item)} compact />
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default MeetingCalendarView;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: wp(5),
    marginBottom: hp(1.5),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(1),
    gap: wp(1),
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(0.9),
    borderRadius: wp(2.5),
  },
  modeTabActive: {
    backgroundColor: PURPLE,
  },
  modeTabText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  modeTabTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  viewContainer: {
    flex: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    marginBottom: hp(0.5),
  },
  navLabel: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  dragHintText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    paddingHorizontal: wp(5),
    marginBottom: hp(1),
  },
  dayColumn: {
    width: DAY_COLUMN_WIDTH,
    marginLeft: wp(2),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    maxHeight: hp(60),
  },
  dayColumnToday: {
    borderColor: PURPLE,
  },
  dayColumnDropTarget: {
    borderWidth: 2,
    backgroundColor: 'rgba(155, 89, 182, 0.08)',
  },
  dayColumnHeader: {
    alignItems: 'center',
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  dayColumnWeekday: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  dayColumnNumber: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  dayColumnHeaderActive: {
    color: PURPLE,
  },
  dayColumnBody: {
    flex: 1,
  },
  dayColumnBodyContent: {
    padding: wp(2),
    paddingBottom: hp(10),
    gap: hp(1),
  },
  emptySlot: {
    minHeight: hp(6),
  },
  draggingCard: {
    opacity: 0.35,
  },
  dayTimelineContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
  },
  hourRow: {
    flexDirection: 'row',
    minHeight: hp(6.5),
    borderRadius: wp(2),
  },
  hourRowDropTarget: {
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
  },
  hourLabel: {
    width: wp(16),
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    paddingTop: hp(0.6),
  },
  hourRowBody: {
    flex: 1,
    gap: hp(0.8),
    paddingBottom: hp(0.8),
  },
  hourRowDivider: {
    height: 1,
    backgroundColor: darkBorderColor,
    marginTop: hp(1.2),
  },
  hourMeetingWrap: {
    marginBottom: hp(0.4),
  },
  monthCalendar: {
    marginHorizontal: wp(4),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    overflow: 'hidden',
  },
  monthListTitle: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextSecondaryColor,
    paddingHorizontal: wp(5),
    marginTop: hp(1.5),
    marginBottom: hp(1),
  },
  monthListContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
    gap: hp(1.2),
  },
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginTop: hp(2),
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 20,
  },
  dragGhost: {
    position: 'absolute',
    width: wp(60),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 24,
  },
});
