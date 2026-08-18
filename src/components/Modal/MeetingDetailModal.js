import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import ConfirmModal from './ConfirmModal';
import UserAvatar from '../UserAvatar';
import {
  darkAccentGreenColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import {
  MEETING_AGENDA_EMPTY,
  MEETING_AGENDA_LABEL,
  MEETING_CANCEL_ACTION,
  MEETING_CANCEL_CONFIRM_MESSAGE,
  MEETING_CANCEL_CONFIRM_NO,
  MEETING_CANCEL_CONFIRM_TITLE,
  MEETING_CANCEL_CONFIRM_YES,
  MEETING_DETAIL_TITLE,
  MEETING_DURATION_LABEL,
  MEETING_EDIT_ACTION,
  MEETING_JOIN_BUTTON,
  MEETING_LIVE_NOW,
  MEETING_LINK_LABEL,
  MEETING_ORGANIZER_LABEL,
  MEETING_PARTICIPANTS_LABEL,
  MEETING_PLATFORM_LABEL,
  MEETING_STATUS_CANCELLED,
  MEETING_STATUS_COMPLETED,
  MEETING_STATUS_ONGOING,
  MEETING_STATUS_SCHEDULED,
  MEETING_TYPE_LABEL,
} from '../../constants/Constants';
import {
  computeMeetingStatus,
  copyMeetingLink,
  formatDurationLabel,
  formatMeetingDateLabel,
  formatMeetingTimeRange,
  isJoinableNow,
  openMeetingLink,
} from '../../utils/meetingUtils';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const BLUE = '#2D7DD2';

const STATUS_COLORS = {
  [MEETING_STATUS_SCHEDULED]: BLUE,
  [MEETING_STATUS_ONGOING]: darkAccentGreenColor,
  [MEETING_STATUS_COMPLETED]: darkTextSecondaryColor,
  [MEETING_STATUS_CANCELLED]: '#F85149',
};

const MeetingDetailModal = ({ visible, meeting, onClose, onEdit, onCancelMeeting }) => {
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const status = useMemo(() => (meeting ? computeMeetingStatus(meeting) : MEETING_STATUS_SCHEDULED), [meeting]);
  const statusColor = STATUS_COLORS[status] || BLUE;
  const canJoin = meeting ? isJoinableNow(meeting) : false;
  const canEditOrCancel = status === MEETING_STATUS_SCHEDULED || status === MEETING_STATUS_ONGOING;

  if (!visible || !meeting) {
    return null;
  }

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      await onCancelMeeting?.(meeting);
      setCancelConfirmVisible(false);
      onClose();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{MEETING_DETAIL_TITLE}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(5.5)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.meetingTitle}>{meeting.title}</Text>

              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}26` }]}>
                {status === MEETING_STATUS_ONGOING ? <View style={styles.liveDot} /> : null}
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {status === MEETING_STATUS_ONGOING ? MEETING_LIVE_NOW : status}
                </Text>
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.label}>Date & Time</Text>
                  <Text style={styles.value}>{formatMeetingDateLabel(meeting.date)}</Text>
                  <Text style={styles.valueSecondary}>{formatMeetingTimeRange(meeting)}</Text>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.label}>{MEETING_DURATION_LABEL}</Text>
                  <Text style={styles.value}>{formatDurationLabel(meeting.durationMinutes)}</Text>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.label}>{MEETING_TYPE_LABEL}</Text>
                  <Text style={styles.value}>{meeting.type}</Text>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.label}>{MEETING_PLATFORM_LABEL}</Text>
                  <Text style={styles.value}>{meeting.platform}</Text>
                </View>
              </View>

              {meeting.meetingLink ? (
                <View style={styles.section}>
                  <Text style={styles.label}>{MEETING_LINK_LABEL}</Text>
                  <View style={styles.linkRow}>
                    <TouchableOpacity
                      style={styles.linkTextWrap}
                      onPress={() => openMeetingLink(meeting.meetingLink)}
                      activeOpacity={0.7}>
                      <Text style={styles.linkValue} numberOfLines={1}>
                        {meeting.meetingLink}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => copyMeetingLink(meeting.meetingLink)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Copy meeting link">
                      <Icon name="copy" size={wp(4.2)} color={darkTextSecondaryColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {meeting.organizerName ? (
                <View style={styles.section}>
                  <Text style={styles.label}>{MEETING_ORGANIZER_LABEL}</Text>
                  <Text style={styles.value}>{meeting.organizerName}</Text>
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.label}>
                  {MEETING_PARTICIPANTS_LABEL} ({(meeting.participantNames || []).length})
                </Text>
                <View style={styles.participantsList}>
                  {(meeting.participantNames || []).map((name, index) => (
                    <View key={`${name}-${index}`} style={styles.participantRow}>
                      <UserAvatar userId={meeting.participantIds?.[index]} name={name} size={wp(7.5)} />
                      <Text style={styles.participantName}>{name}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>{MEETING_AGENDA_LABEL}</Text>
                <Text style={styles.agendaText}>{meeting.agenda || MEETING_AGENDA_EMPTY}</Text>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              {canJoin ? (
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => openMeetingLink(meeting.meetingLink)}
                  activeOpacity={0.85}>
                  <Icon name="video" size={wp(4.2)} color={darkTextPrimaryColor} />
                  <Text style={styles.joinButtonText}>{MEETING_JOIN_BUTTON}</Text>
                </TouchableOpacity>
              ) : null}

              {canEditOrCancel ? (
                <View style={styles.secondaryActions}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => onEdit?.(meeting)}
                    activeOpacity={0.85}>
                    <Icon name="edit-2" size={wp(4)} color={darkTextPrimaryColor} />
                    <Text style={styles.secondaryButtonText}>{MEETING_EDIT_ACTION}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryButton, styles.cancelButton]}
                    onPress={() => setCancelConfirmVisible(true)}
                    activeOpacity={0.85}>
                    <Icon name="x-circle" size={wp(4)} color="#F85149" />
                    <Text style={[styles.secondaryButtonText, styles.cancelButtonText]}>
                      {MEETING_CANCEL_ACTION}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={cancelConfirmVisible}
        title={MEETING_CANCEL_CONFIRM_TITLE}
        message={MEETING_CANCEL_CONFIRM_MESSAGE}
        confirmTitle={cancelling ? 'Cancelling...' : MEETING_CANCEL_CONFIRM_YES}
        cancelTitle={MEETING_CANCEL_CONFIRM_NO}
        iconName="x-circle"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelConfirmVisible(false)}
      />
    </>
  );
};

export default MeetingDetailModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  card: {
    maxHeight: hp(85),
    backgroundColor: darkSurfaceColor,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderBottomWidth: 0,
    paddingHorizontal: wp(5),
    paddingTop: hp(2.2),
    paddingBottom: hp(2.5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  headerTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  scrollContent: {
    paddingBottom: hp(1),
  },
  meetingTitle: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: hp(1),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(1.5),
    borderRadius: wp(2.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    marginBottom: hp(2),
  },
  liveDot: {
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(1),
    backgroundColor: darkAccentGreenColor,
  },
  statusText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: hp(1.8),
  },
  gridCol: {
    flex: 1,
  },
  section: {
    marginBottom: hp(1.8),
  },
  label: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.5),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  valueSecondary: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  linkTextWrap: {
    flex: 1,
  },
  linkValue: {
    ...style.fontSizeNormal,
    color: BLUE,
    textDecorationLine: 'underline',
  },
  copyButton: {
    padding: wp(1),
  },
  participantsList: {
    gap: hp(1),
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  participantName: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  agendaText: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    lineHeight: hp(2.4),
  },
  actions: {
    gap: hp(1.2),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    backgroundColor: darkAccentGreenColor,
    borderRadius: wp(3),
    paddingVertical: hp(1.3),
  },
  joinButtonText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: wp(3),
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.8),
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3),
    paddingVertical: hp(1.2),
  },
  secondaryButtonText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  cancelButton: {
    borderColor: 'rgba(248, 81, 73, 0.4)',
  },
  cancelButtonText: {
    color: '#F85149',
  },
});
