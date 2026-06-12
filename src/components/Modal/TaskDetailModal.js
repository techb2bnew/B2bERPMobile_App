import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Feather';
import DropdownSelect from '../DropdownSelect';
import {
  TASK_ASSIGNEE_LABEL,
  TASK_CANCEL_BUTTON,
  TASK_DUE_DATE_LABEL,
  TASK_EDIT_TASK_TITLE,
  TASK_ESTIMATED_HOURS_LABEL,
  TASK_FILTER_DONE,
  TASK_FILTER_IN_PROGRESS,
  TASK_FILTER_TODO,
  TASK_NEW_TASK_TITLE,
  TASK_PRIORITY_LABEL,
  TASK_SAVE_TASK_BUTTON,
  TASK_SELECT_DUE_DATE,
  TASK_STATUS_LABEL,
  TASK_STATUS_READY_FOR_TESTING,
  TASK_TITLE_LABEL,
  TASK_TITLE_PLACEHOLDER,
  TASK_UPDATE_TASK_BUTTON,
  TASK_WORK_DESCRIPTION_LABEL,
  TASK_WORK_DESCRIPTION_PLACEHOLDER,
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
import { getLocalDateKey } from '../../services/clockSessionsService';
import { formatTaskDate, parseDueDateToKey } from '../../utils/projectUtils';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const ALL_STATUS_OPTIONS = [
  TASK_FILTER_TODO,
  TASK_FILTER_IN_PROGRESS,
  TASK_STATUS_READY_FOR_TESTING,
  TASK_FILTER_DONE,
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

const TaskDetailModal = ({
  visible,
  mode = 'edit',
  task,
  defaultStatus,
  hideDoneStatus = false,
  onClose,
  onSave,
}) => {
  const statusOptions = hideDoneStatus
    ? ALL_STATUS_OPTIONS.filter(option => option !== TASK_FILTER_DONE)
    : ALL_STATUS_OPTIONS;
  const isCreate = mode === 'create';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(TASK_FILTER_TODO);
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [dueDateKey, setDueDateKey] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [saving, setSaving] = useState(false);

  const dueDateLabel = useMemo(
    () => (dueDateKey ? formatTaskDate(dueDateKey) : ''),
    [dueDateKey],
  );

  const calendarMarkedDates = useMemo(() => {
    if (!dueDateKey) {
      return {};
    }

    return {
      [dueDateKey]: {
        selected: true,
        selectedColor: PURPLE,
        selectedTextColor: '#ffffff',
      },
    };
  }, [dueDateKey]);

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

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (isCreate) {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus || TASK_FILTER_TODO);
      setPriority('medium');
      setAssignee(task?.assignee || '');
      setDueDateKey(getLocalDateKey());
      setEstimatedHours('');
      return;
    }
    if (!task) {
      return;
    }
    setTitle(task.title || '');
    setDescription(task.description || '');
    setStatus(task.status || TASK_FILTER_TODO);
    setPriority(task.priority || 'medium');
    setAssignee(task.assignee || '');
    setDueDateKey(parseDueDateToKey(task.dueDate) || getLocalDateKey());
    setEstimatedHours(task.estimatedHours || '');
  }, [visible, task, isCreate, defaultStatus]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }

    if (!assignee.trim()) {
      Alert.alert('Required', 'Please enter an assignee.');
      return;
    }

    const payload = {
      ...(task || {}),
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee: assignee.trim(),
      assigneeId: task?.assigneeId || '',
      dueDate: dueDateKey,
      estimatedHours: estimatedHours.trim(),
      hoursWorked: estimatedHours.trim()
        ? `${estimatedHours.trim()}h worked`
        : task?.hoursWorked || '',
    };

    console.log('[TaskModal] save clicked', {
      mode: isCreate ? 'create' : 'edit',
      payload,
      formFields: { title, description, status, priority, assignee, dueDateKey, estimatedHours },
    });

    setSaving(true);
    try {
      const saved = await onSave(payload, isCreate);
      console.log('[TaskModal] onSave result', { saved, mode: isCreate ? 'create' : 'edit' });
      if (saved) {
        onClose();
      }
    } catch (error) {
      console.log('[TaskModal] onSave threw', error);
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
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>
              <Text style={styles.title}>{isCreate ? TASK_NEW_TASK_TITLE : TASK_EDIT_TASK_TITLE}</Text>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={styles.form}>
                <Text style={styles.label}>{TASK_TITLE_LABEL} *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={TASK_TITLE_PLACEHOLDER}
                  placeholderTextColor={darkPlaceholderColor}
                />

                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.label}>{TASK_ASSIGNEE_LABEL} *</Text>
                    <TextInput
                      style={styles.input}
                      value={assignee}
                      onChangeText={setAssignee}
                      placeholderTextColor={darkPlaceholderColor}
                    />
                  </View>
                  <DropdownSelect
                    label={TASK_STATUS_LABEL}
                    value={status}
                    options={statusOptions}
                    onChange={setStatus}
                  />
                </View>

                <View style={styles.row}>
                  <DropdownSelect
                    label={TASK_PRIORITY_LABEL}
                    value={priority}
                    options={PRIORITY_OPTIONS}
                    onChange={setPriority}
                  />
                  <View style={styles.halfField}>
                    <Text style={styles.label}>{TASK_DUE_DATE_LABEL}</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setCalendarVisible(true)}>
                      <View style={styles.dateWrap} pointerEvents="none">
                        <TextInput
                          style={[styles.input, styles.dateInput]}
                          value={dueDateLabel}
                          editable={false}
                          placeholder="Select date"
                          placeholderTextColor={darkPlaceholderColor}
                        />
                        <View style={styles.calendarIcon}>
                          <Icon name="calendar" size={wp(4.5)} color={PURPLE} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.label}>{TASK_ESTIMATED_HOURS_LABEL}</Text>
                <TextInput
                  style={styles.input}
                  value={estimatedHours}
                  onChangeText={setEstimatedHours}
                  keyboardType="numeric"
                  placeholderTextColor={darkPlaceholderColor}
                />

                <Text style={styles.label}>{TASK_WORK_DESCRIPTION_LABEL}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  placeholder={TASK_WORK_DESCRIPTION_PLACEHOLDER}
                  placeholderTextColor={darkPlaceholderColor}
                />
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
                    {isCreate ? TASK_SAVE_TASK_BUTTON : TASK_UPDATE_TASK_BUTTON}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
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
              <Text style={styles.calendarTitle}>{TASK_SELECT_DUE_DATE}</Text>
              <TouchableOpacity
                onPress={() => setCalendarVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(5)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>

            <Calendar
              current={dueDateKey || getLocalDateKey()}
              markedDates={calendarMarkedDates}
              onDayPress={day => {
                setDueDateKey(day.dateString);
                setCalendarVisible(false);
              }}
              enableSwipeMonths
              theme={calendarTheme}
              style={styles.calendar}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

export default TaskDetailModal;

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
  textArea: {
    minHeight: hp(12),
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
  calendarIcon: {
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
