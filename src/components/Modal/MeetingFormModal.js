import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  KeyboardAvoidingView,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Feather';
import DropdownSelect from '../DropdownSelect';
import MultiSelectDropdown from '../MultiSelectDropdown';
import AnalogClockPickerModal from '../AnalogClockPickerModal';
import {
  MEETING_AGENDA_LABEL,
  MEETING_AGENDA_PLACEHOLDER,
  MEETING_DATE_LABEL,
  MEETING_DATE_REQUIRED,
  MEETING_DURATION_LABEL,
  MEETING_EDIT_TITLE,
  MEETING_END_TIME_LABEL,
  MEETING_LINK_LABEL,
  MEETING_LINK_PLACEHOLDER,
  MEETING_LINK_REQUIRED,
  MEETING_NEW_TITLE,
  MEETING_PARTICIPANTS_LABEL,
  MEETING_PARTICIPANTS_REQUIRED,
  MEETING_PLATFORM_LABEL,
  MEETING_SAVE_BUTTON,
  MEETING_SELECT_DATE,
  MEETING_SELECT_PARTICIPANTS_PLACEHOLDER,
  MEETING_START_TIME_LABEL,
  MEETING_TITLE_LABEL,
  MEETING_TITLE_PLACEHOLDER,
  MEETING_TITLE_REQUIRED,
  MEETING_TYPE_LABEL,
  MEETING_UPDATE_BUTTON,
  TASK_CANCEL_BUTTON,
} from '../../constants/Constants';
import {
  darkBorderColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import {
  MEETING_DURATION_OPTIONS_MINUTES,
  MEETING_PLATFORM_OPTIONS,
  MEETING_TYPE_OPTIONS,
} from '../../services/meetingsService';
import {
  buildMeetingDateKey,
  combineDateAndTime,
  formatDateToTimeString,
  formatDurationLabel,
  formatMeetingDateLabel,
} from '../../utils/meetingUtils';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const DURATION_OPTION_LABELS = MEETING_DURATION_OPTIONS_MINUTES.map(formatDurationLabel);

const calendarTheme = {
  backgroundColor: darkSurfaceColor,
  calendarBackground: darkSurfaceColor,
  textSectionTitleColor: darkTextSecondaryColor,
  selectedDayBackgroundColor: PURPLE,
  selectedDayTextColor: '#ffffff',
  todayTextColor: PURPLE,
  dayTextColor: darkTextPrimaryColor,
  textDisabledColor: 'rgba(255,255,255,0.25)',
  monthTextColor: darkTextPrimaryColor,
  arrowColor: PURPLE,
};

const MeetingFormModal = ({
  visible,
  mode = 'create',
  meeting,
  defaultDate,
  participantOptions = [],
  currentUserId = '',
  currentUserName = '',
  onClose,
  onSave,
}) => {
  const isCreate = mode === 'create';

  const [title, setTitle] = useState('');
  const [type, setType] = useState(MEETING_TYPE_OPTIONS[0]);
  const [platform, setPlatform] = useState(MEETING_PLATFORM_OPTIONS[0]);
  const [meetingLink, setMeetingLink] = useState('');
  const [dateKey, setDateKey] = useState('');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [durationMinutes, setDurationMinutes] = useState(MEETING_DURATION_OPTIONS_MINUTES[1]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [agenda, setAgenda] = useState('');

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [clockVisible, setClockVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!visible) {
      setErrorMsg('');
      return;
    }

    if (isCreate) {
      setTitle('');
      setType(MEETING_TYPE_OPTIONS[0]);
      setPlatform(MEETING_PLATFORM_OPTIONS[0]);
      setMeetingLink('');
      setDateKey(defaultDate || buildMeetingDateKey(0));
      setStartTime('10:00 AM');
      setDurationMinutes(MEETING_DURATION_OPTIONS_MINUTES[1]);
      setSelectedParticipantIds([]);
      setAgenda('');
      setErrorMsg('');
      return;
    }

    if (!meeting) {
      return;
    }

    setTitle(meeting.title || '');
    setType(meeting.type || MEETING_TYPE_OPTIONS[0]);
    setPlatform(meeting.platform || MEETING_PLATFORM_OPTIONS[0]);
    setMeetingLink(meeting.meetingLink || '');
    setDateKey(meeting.date || buildMeetingDateKey(0));
    setStartTime(meeting.startTime || '10:00 AM');
    setDurationMinutes(meeting.durationMinutes || MEETING_DURATION_OPTIONS_MINUTES[1]);
    setSelectedParticipantIds(meeting.participantIds || []);
    setAgenda(meeting.agenda || '');
    setErrorMsg('');
  }, [visible, isCreate, meeting, defaultDate]);

  const requiresLink = platform !== 'In-person';

  const dateLabel = useMemo(
    () => (dateKey ? formatMeetingDateLabel(dateKey) : ''),
    [dateKey],
  );

  const endTimeLabel = useMemo(() => {
    if (!dateKey || !startTime) {
      return '';
    }
    const start = combineDateAndTime(dateKey, startTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return formatDateToTimeString(end);
  }, [dateKey, startTime, durationMinutes]);

  const durationLabel = formatDurationLabel(durationMinutes);

  const calendarMarkedDates = useMemo(() => {
    if (!dateKey) {
      return {};
    }
    return {
      [dateKey]: { selected: true, selectedColor: PURPLE, selectedTextColor: '#ffffff' },
    };
  }, [dateKey]);

  const handleDurationChange = label => {
    const index = DURATION_OPTION_LABELS.indexOf(label);
    setDurationMinutes(MEETING_DURATION_OPTIONS_MINUTES[index] ?? durationMinutes);
  };

  const handleSave = async () => {
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg(MEETING_TITLE_REQUIRED);
      return;
    }

    if (!dateKey) {
      setErrorMsg(MEETING_DATE_REQUIRED);
      return;
    }

    if (requiresLink && !meetingLink.trim()) {
      setErrorMsg(MEETING_LINK_REQUIRED);
      return;
    }

    if (selectedParticipantIds.length === 0) {
      setErrorMsg(MEETING_PARTICIPANTS_REQUIRED);
      return;
    }

    const participantNames = selectedParticipantIds
      .map(id => participantOptions.find(option => option.id === id)?.name || '')
      .filter(Boolean);

    const payload = {
      ...(meeting || {}),
      title: title.trim(),
      type,
      platform,
      meetingLink: requiresLink ? meetingLink.trim() : '',
      date: dateKey,
      startTime,
      durationMinutes,
      agenda: agenda.trim(),
      participantIds: selectedParticipantIds,
      participantNames,
    };

    if (isCreate) {
      payload.organizerId = currentUserId;
      payload.organizerName = currentUserName;
    }

    setSaving(true);
    try {
      const saved = await onSave(payload, isCreate);
      if (saved) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>
              <Text style={styles.title}>{isCreate ? MEETING_NEW_TITLE : MEETING_EDIT_TITLE}</Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                style={styles.form}
                contentContainerStyle={styles.formContent}
                keyboardShouldPersistTaps="handled">
                <Text style={styles.label}>{MEETING_TITLE_LABEL} *</Text>
                <TextInput
                  style={[styles.input, errorMsg === MEETING_TITLE_REQUIRED && styles.inputError]}
                  placeholder={MEETING_TITLE_PLACEHOLDER}
                  placeholderTextColor={darkPlaceholderColor}
                  value={title}
                  onChangeText={setTitle}
                />

                <View style={styles.row}>
                  <DropdownSelect
                    label={MEETING_TYPE_LABEL}
                    value={type}
                    options={MEETING_TYPE_OPTIONS}
                    onChange={setType}
                    containerStyle={styles.halfField}
                  />
                  <DropdownSelect
                    label={MEETING_PLATFORM_LABEL}
                    value={platform}
                    options={MEETING_PLATFORM_OPTIONS}
                    onChange={setPlatform}
                    containerStyle={styles.halfField}
                  />
                </View>

                {requiresLink ? (
                  <>
                    <Text style={styles.label}>{MEETING_LINK_LABEL} *</Text>
                    <TextInput
                      style={[styles.input, errorMsg === MEETING_LINK_REQUIRED && styles.inputError]}
                      placeholder={MEETING_LINK_PLACEHOLDER}
                      placeholderTextColor={darkPlaceholderColor}
                      value={meetingLink}
                      onChangeText={setMeetingLink}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </>
                ) : null}

                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.label}>{MEETING_DATE_LABEL} *</Text>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setCalendarVisible(true)}>
                      <View style={styles.dateWrap} pointerEvents="none">
                        <TextInput
                          style={[styles.input, styles.dateInput]}
                          value={dateLabel}
                          editable={false}
                          placeholder={MEETING_SELECT_DATE}
                          placeholderTextColor={darkPlaceholderColor}
                        />
                        <View style={styles.inputIcon}>
                          <Icon name="calendar" size={wp(4.5)} color={PURPLE} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.halfField}>
                    <Text style={styles.label}>{MEETING_START_TIME_LABEL} *</Text>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setClockVisible(true)}>
                      <View style={styles.dateWrap} pointerEvents="none">
                        <TextInput
                          style={[styles.input, styles.dateInput]}
                          value={startTime}
                          editable={false}
                          placeholderTextColor={darkPlaceholderColor}
                        />
                        <View style={styles.inputIcon}>
                          <Icon name="clock" size={wp(4.5)} color={PURPLE} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.row}>
                  <DropdownSelect
                    label={MEETING_DURATION_LABEL}
                    value={durationLabel}
                    options={DURATION_OPTION_LABELS}
                    onChange={handleDurationChange}
                    containerStyle={styles.halfField}
                  />
                  <View style={styles.halfField}>
                    <Text style={styles.label}>{MEETING_END_TIME_LABEL}</Text>
                    <View style={[styles.input, styles.readonlyInput]}>
                      <Text style={styles.readonlyText}>{endTimeLabel}</Text>
                    </View>
                  </View>
                </View>

                <View style={[errorMsg === MEETING_PARTICIPANTS_REQUIRED && styles.dropdownError]}>
                  <MultiSelectDropdown
                    label={MEETING_PARTICIPANTS_LABEL}
                    required
                    options={participantOptions}
                    selectedIds={selectedParticipantIds}
                    onChange={setSelectedParticipantIds}
                    placeholder={MEETING_SELECT_PARTICIPANTS_PLACEHOLDER}
                    sheetTitle={MEETING_PARTICIPANTS_LABEL}
                  />
                </View>

                <Text style={styles.label}>{MEETING_AGENDA_LABEL}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={agenda}
                  onChangeText={setAgenda}
                  multiline
                  placeholder={MEETING_AGENDA_PLACEHOLDER}
                  placeholderTextColor={darkPlaceholderColor}
                />

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
              </ScrollView>

              <View style={styles.actions}>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.cancelText}>{TASK_CANCEL_BUTTON}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}>
                  {saving ? (
                    <ActivityIndicator size="small" color={darkTextPrimaryColor} />
                  ) : (
                    <Icon name="save" size={wp(4.5)} color={darkTextPrimaryColor} />
                  )}
                  <Text style={styles.saveButtonText}>
                    {isCreate ? MEETING_SAVE_BUTTON : MEETING_UPDATE_BUTTON}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.calendarOverlay}
          onPress={() => setCalendarVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.calendarCard} onPress={() => {}}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>{MEETING_DATE_LABEL}</Text>
              <TouchableOpacity
                onPress={() => setCalendarVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(5)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={dateKey || buildMeetingDateKey(0)}
              markedDates={calendarMarkedDates}
              onDayPress={day => {
                setDateKey(day.dateString);
                setCalendarVisible(false);
              }}
              enableSwipeMonths
              theme={calendarTheme}
              style={styles.calendar}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AnalogClockPickerModal
        visible={clockVisible}
        onClose={() => setClockVisible(false)}
        onConfirm={setStartTime}
        initialTime={startTime}
      />
    </Modal>
  );
};

export default MeetingFormModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  card: {
    width: '100%',
    maxHeight: hp(88),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5),
    paddingTop: hp(2.2),
    paddingBottom: hp(2),
  },
  title: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: hp(1.8),
  },
  form: {
    maxHeight: hp(62),
  },
  formContent: {
    paddingBottom: hp(2),
  },
  label: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.7),
    marginTop: hp(1),
  },
  input: {
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  readonlyInput: {
    justifyContent: 'center',
    opacity: 0.85,
  },
  readonlyText: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  textArea: {
    minHeight: hp(10),
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: wp(3),
  },
  halfField: {
    flex: 1,
    minWidth: 0,
  },
  dateWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  dateInput: {
    paddingRight: wp(10),
  },
  inputIcon: {
    position: 'absolute',
    right: wp(3.5),
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: wp(4),
    marginTop: hp(2),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
  },
  cancelText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    ...style.fontWeightMedium,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: PURPLE,
    borderRadius: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
  },
  saveButtonText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  inputError: { borderColor: '#E74C3C', borderWidth: 1 },
  dropdownError: { borderColor: '#E74C3C', borderWidth: 1, borderRadius: wp(3), padding: wp(1) },
  errorText: { color: '#E74C3C', ...style.fontSizeSmall, marginTop: hp(1), marginBottom: hp(0.5) },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  calendarCard: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingTop: hp(1.8),
    paddingBottom: hp(2),
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  calendarTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  calendar: {
    borderRadius: wp(3),
    overflow: 'hidden',
  },
});
