import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MeetingCard from './MeetingCard';
import { useDragDropSlots } from '../hooks/useDragDropSlots';
import {
  darkAccentGreenColor,
  darkBorderColor,
  darkElevatedColor,
  darkSurfaceColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import { style } from '../constants/Fonts';
import {
  MEETING_DRAG_HINT_BOARD,
  MEETING_STATUS_CANCELLED,
  MEETING_STATUS_COMPLETED,
  MEETING_STATUS_ONGOING,
  MEETING_STATUS_SCHEDULED,
} from '../constants/Constants';
import { computeMeetingStatus, openMeetingLink, sortMeetingsByStartTime } from '../utils/meetingUtils';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const BLUE = '#2D7DD2';
const COLUMN_WIDTH = wp(60);

const COLUMNS = [
  MEETING_STATUS_SCHEDULED,
  MEETING_STATUS_ONGOING,
  MEETING_STATUS_COMPLETED,
  MEETING_STATUS_CANCELLED,
];

const COLUMN_COLORS = {
  [MEETING_STATUS_SCHEDULED]: BLUE,
  [MEETING_STATUS_ONGOING]: darkAccentGreenColor,
  [MEETING_STATUS_COMPLETED]: darkTextSecondaryColor,
  [MEETING_STATUS_CANCELLED]: '#F85149',
};

const MeetingKanbanBoard = ({ meetings, onMeetingPress, onStatusChange }) => {
  const handleDrop = (meeting, targetColumn) => {
    if (targetColumn === computeMeetingStatus(meeting)) {
      return;
    }
    onStatusChange?.(meeting, targetColumn);
  };

  const { dragState, hoverSlot, registerSlot, dragHandlersFor } = useDragDropSlots({
    onDrop: handleDrop,
    onTap: onMeetingPress,
  });

  const meetingsByColumn = useMemo(() => {
    const map = {};
    COLUMNS.forEach(column => {
      map[column] = [];
    });
    meetings.forEach(meeting => {
      const status = computeMeetingStatus(meeting);
      if (map[status]) {
        map[status].push(meeting);
      }
    });
    COLUMNS.forEach(column => {
      map[column] = sortMeetingsByStartTime(map[column]);
    });
    return map;
  }, [meetings]);

  return (
    <View style={styles.root}>
      <Text style={styles.dragHintText}>{MEETING_DRAG_HINT_BOARD}</Text>

      <ScrollView
        horizontal
        scrollEnabled={!dragState}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.boardRow}>
        {COLUMNS.map(column => {
          const columnMeetings = meetingsByColumn[column] || [];
          const columnColor = COLUMN_COLORS[column];
          const isDropTarget = dragState && hoverSlot === column;

          return (
            <View
              key={column}
              ref={ref => registerSlot(column, ref)}
              collapsable={false}
              style={[
                styles.column,
                isDropTarget && styles.columnDropTarget,
                isDropTarget && { borderColor: columnColor },
              ]}>
              <View style={styles.columnHeader}>
                <Text style={[styles.columnTitle, { color: columnColor }]}>{column}</Text>
                <View style={styles.columnCount}>
                  <Text style={styles.columnCountText}>{columnMeetings.length}</Text>
                </View>
              </View>

              <ScrollView
                style={styles.columnBody}
                contentContainerStyle={styles.columnBodyContent}
                scrollEnabled={!dragState}
                showsVerticalScrollIndicator={false}>
                {columnMeetings.length === 0 ? (
                  <View style={styles.emptySlot} />
                ) : (
                  columnMeetings.map(meeting => {
                    const isDragging = dragState?.item?.id === meeting.id;
                    return (
                      <View key={meeting.id} style={isDragging && styles.draggingCard}>
                        <MeetingCard
                          meeting={meeting}
                          status={computeMeetingStatus(meeting)}
                          compact
                          onJoin={() => openMeetingLink(meeting.meetingLink)}
                          dragProps={dragHandlersFor(meeting, column, COLUMNS)}
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

export default MeetingKanbanBoard;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dragHintText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    paddingHorizontal: wp(5),
    marginBottom: hp(1),
  },
  boardRow: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(12),
    gap: wp(3),
  },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    maxHeight: hp(70),
  },
  columnDropTarget: {
    borderWidth: 2,
    backgroundColor: 'rgba(155, 89, 182, 0.08)',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.4),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  columnTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
  },
  columnCount: {
    minWidth: wp(5.5),
    height: wp(5.5),
    borderRadius: wp(3),
    backgroundColor: darkElevatedColor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.5),
  },
  columnCountText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  columnBody: {
    flex: 1,
  },
  columnBodyContent: {
    padding: wp(2.5),
    gap: hp(1.2),
  },
  emptySlot: {
    minHeight: hp(6),
  },
  draggingCard: {
    opacity: 0.35,
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 20,
  },
  dragGhost: {
    position: 'absolute',
    width: wp(56),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 24,
  },
});
