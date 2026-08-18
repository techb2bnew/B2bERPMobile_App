import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  darkAccentGreenColor,
  darkBackgroundColor,
  darkBorderColor,
  darkElevatedColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import { style } from '../constants/Fonts';
import {
  MEETING_JOIN_BUTTON,
  MEETING_LIVE_NOW,
  MEETING_STARTING_SOON_PREFIX,
  MEETING_STATUS_CANCELLED,
  MEETING_STATUS_COMPLETED,
  MEETING_STATUS_ONGOING,
  MEETING_STATUS_SCHEDULED,
} from '../constants/Constants';
import {
  formatDurationLabel,
  formatMeetingTimeRange,
  getMinutesUntilStart,
  isJoinableNow,
} from '../utils/meetingUtils';
import UserAvatar from './UserAvatar';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const BLUE = '#2D7DD2';

const STATUS_COLORS = {
  [MEETING_STATUS_SCHEDULED]: BLUE,
  [MEETING_STATUS_ONGOING]: darkAccentGreenColor,
  [MEETING_STATUS_COMPLETED]: darkTextSecondaryColor,
  [MEETING_STATUS_CANCELLED]: '#F85149',
};

const PLATFORM_META = {
  Zoom: { icon: 'video', color: '#2D8CFF' },
  'Google Meet': { icon: 'video', color: '#34A853' },
  'Microsoft Teams': { icon: 'users', color: '#5059C9' },
  'In-person': { icon: 'map-pin', color: darkTextSecondaryColor },
  Other: { icon: 'link', color: '#94a3b8' },
};

const MAX_AVATARS = 3;

const MeetingCard = ({ meeting, status, onPress, onJoin, compact = false, dragProps, style: customStyle }) => {
  const statusColor = STATUS_COLORS[status] || BLUE;
  const platformMeta = PLATFORM_META[meeting.platform] || PLATFORM_META.Other;
  const participantNames = meeting.participantNames || [];
  const visibleParticipants = participantNames.slice(0, MAX_AVATARS);
  const overflowCount = participantNames.length - visibleParticipants.length;
  const minutesUntil = getMinutesUntilStart(meeting);
  const joinable = isJoinableNow(meeting);

  const content = (
    <>
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} accessible={false} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
            {meeting.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}26` }]}>
            {status === MEETING_STATUS_ONGOING ? <View style={styles.liveDot} /> : null}
            <Text style={[styles.statusText, { color: statusColor }]}>
              {status === MEETING_STATUS_ONGOING ? MEETING_LIVE_NOW : status}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Icon name="clock" size={wp(3.6)} color={darkTextSecondaryColor} />
          <Text style={styles.metaText} numberOfLines={1}>
            {formatMeetingTimeRange(meeting)} · {formatDurationLabel(meeting.durationMinutes)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Icon name={platformMeta.icon} size={wp(3.6)} color={platformMeta.color} />
          <Text style={styles.metaText} numberOfLines={1}>
            {meeting.platform} · {meeting.type}
          </Text>
        </View>

        {participantNames.length > 0 ? (
          <View style={styles.metaRow}>
            <Icon name="users" size={wp(3.6)} color={darkTextSecondaryColor} />
            <Text style={styles.metaText} numberOfLines={1}>
              {participantNames.join(', ')}
            </Text>
          </View>
        ) : null}

        {!compact && status === MEETING_STATUS_SCHEDULED && minutesUntil > 0 && minutesUntil <= 60 ? (
          <Text style={styles.startingSoonText}>
            {MEETING_STARTING_SOON_PREFIX} {minutesUntil} min
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <View style={styles.avatarStack}>
            {visibleParticipants.map((name, index) => (
              <View
                key={`${meeting.id}-${name}-${index}`}
                style={[styles.avatarWrap, index > 0 && styles.avatarOverlap]}>
                <UserAvatar userId={meeting.participantIds?.[index]} name={name} size={wp(6.2)} />
              </View>
            ))}
            {overflowCount > 0 ? (
              <View style={[styles.avatarWrap, styles.avatarOverlap, styles.overflowAvatar]}>
                <Text style={styles.overflowText}>+{overflowCount}</Text>
              </View>
            ) : null}
          </View>

          {joinable && onJoin ? (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={onJoin}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="video" size={wp(3.6)} color={darkTextPrimaryColor} />
              <Text style={styles.joinButtonText}>{MEETING_JOIN_BUTTON}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </>
  );

  if (dragProps) {
    return (
      <View style={[styles.card, compact && styles.cardCompact, customStyle]} {...dragProps}>
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact, customStyle]}
      onPress={onPress}
      activeOpacity={0.85}>
      {content}
    </TouchableOpacity>
  );
};

export default MeetingCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: darkElevatedColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    overflow: 'hidden',
  },
  cardCompact: {
    borderRadius: wp(2.5),
  },
  statusBar: {
    width: wp(1.1),
    backgroundColor: 'transparent',
  },
  body: {
    flex: 1,
    padding: wp(3),
    gap: hp(0.6),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  title: {
    flex: 1,
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    borderRadius: wp(2.5),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
  },
  liveDot: {
    width: wp(1.6),
    height: wp(1.6),
    borderRadius: wp(0.8),
    backgroundColor: darkAccentGreenColor,
  },
  statusText: {
    ...style.fontSizeSmall,
    ...style.fontWeightMedium,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.8),
  },
  metaText: {
    flex: 1,
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  startingSoonText: {
    ...style.fontSizeSmall,
    ...style.fontWeightMedium,
    color: '#F5A623',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.4),
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderRadius: wp(3.5),
    borderWidth: 1.5,
    borderColor: darkElevatedColor,
  },
  avatarOverlap: {
    marginLeft: -wp(2.2),
  },
  overflowAvatar: {
    width: wp(6.2),
    height: wp(6.2),
    borderRadius: wp(3.1),
    backgroundColor: darkBorderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: darkAccentGreenColor,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.7),
  },
  joinButtonText: {
    ...style.fontSizeSmall,
    ...style.fontWeightMedium,
    color: darkBackgroundColor,
  },
});
