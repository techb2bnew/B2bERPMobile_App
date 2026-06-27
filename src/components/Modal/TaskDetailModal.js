import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
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
import MultiSelectDropdown from '../MultiSelectDropdown';
import {
  TASK_ASSIGNEE_LABEL,
  TASK_ASSIGNEES_LABEL,
  TASK_ASSIGNEE_REQUIRED,
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
  TASK_SELECT_ASSIGNEES_PLACEHOLDER,
  TASK_SELECT_DUE_DATE,
  TASK_STATUS_LABEL,
  TASK_STATUS_READY_FOR_TESTING,
  TASK_STATUS_REVIEW,
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
import { formatTaskDate, normalizeAssigneeIds, parseDueDateToKey } from '../../utils/projectUtils';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const ALL_STATUS_OPTIONS = [
  TASK_FILTER_TODO,
  TASK_FILTER_IN_PROGRESS,
  TASK_STATUS_READY_FOR_TESTING,
  TASK_STATUS_REVIEW,
  TASK_FILTER_DONE,
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

const TaskDetailModal = ({
  visible,
  mode = 'edit',
  task,
  defaultStatus,
  hideDoneStatus = false,
  allowMultipleAssignees = false,
  employeeOptions = [],
  currentUserId = '',
  currentUserName = '',
  onClose,
  onSave,
}) => {
  const statusOptions = hideDoneStatus
    ? ALL_STATUS_OPTIONS.filter(
        option => option !== TASK_FILTER_DONE && option !== TASK_STATUS_REVIEW,
      )
    : ALL_STATUS_OPTIONS;
  const isCreate = mode === 'create';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(TASK_FILTER_TODO);
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState([]);
  const [dueDateKey, setDueDateKey] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-focus title ref
  const titleInputRef = useRef(null);
  const scrollRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const lastFocusedFieldRef = useRef(null);
  const titleFieldRef = useRef(null);
  const hoursFieldRef = useRef(null);
  const descriptionFieldRef = useRef(null);

  const scrollFieldIntoView = useCallback(fieldRef => {
    if (!fieldRef?.current || !scrollRef?.current) {
      return;
    }

    lastFocusedFieldRef.current = fieldRef;

    const run = () => {
      const keyboardHeight = keyboardHeightRef.current;
      if (!keyboardHeight || !fieldRef.current || !scrollRef.current) {
        return;
      }

      fieldRef.current.measureInWindow((_x, fieldTop, _width, fieldHeight) => {
        const windowHeight = Dimensions.get('window').height;
        const safeBottom = windowHeight - keyboardHeight - hp(2);
        const fieldBottom = fieldTop + fieldHeight;

        if (fieldBottom <= safeBottom) {
          return;
        }

        const overlap = fieldBottom - safeBottom;
        scrollRef.current.scrollTo({
          y: scrollOffsetRef.current + overlap,
          animated: true,
        });
      });
    };

    run();
    setTimeout(run, Platform.OS === 'ios' ? 120 : 250);
  }, []);

  useEffect(() => {
    if (!visible) {
      keyboardHeightRef.current = 0;
      setKeyboardInset(0);
      lastFocusedFieldRef.current = null;
      return undefined;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, event => {
      keyboardHeightRef.current = event.endCoordinates.height;
      setKeyboardInset(event.endCoordinates.height);
      if (lastFocusedFieldRef.current) {
        scrollFieldIntoView(lastFocusedFieldRef.current);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      setKeyboardInset(0);
      lastFocusedFieldRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, scrollFieldIntoView]);

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
      setErrorMsg('');
      return;
    }
    setErrorMsg('');
    if (isCreate) {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus || TASK_FILTER_TODO);
      setPriority('medium');
      if (allowMultipleAssignees) {
        setSelectedAssigneeIds([]);
        setAssignee('');
      } else {
        setSelectedAssigneeIds(currentUserId ? [currentUserId] : []);
        setAssignee(currentUserName || task?.assignee || '');
      }
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
    const taskAssigneeIds = normalizeAssigneeIds(task.assigneeIds, task.assigneeId);
    setSelectedAssigneeIds(taskAssigneeIds);
    setAssignee(task.assignee || '');
    setDueDateKey(parseDueDateToKey(task.dueDate) || getLocalDateKey());
    setEstimatedHours(task.estimatedHours || '');
  }, [
    visible,
    task,
    isCreate,
    defaultStatus,
    allowMultipleAssignees,
    currentUserId,
    currentUserName,
  ]);

  const selectedAssigneeLabel = useMemo(() => {
    if (!allowMultipleAssignees) {
      return assignee;
    }

    return selectedAssigneeIds
      .map(id => employeeOptions.find(option => option.id === id)?.name || '')
      .filter(Boolean)
      .join(', ');
  }, [allowMultipleAssignees, assignee, employeeOptions, selectedAssigneeIds]);

  const handleSave = async () => {
    setErrorMsg('');
    if (!title.trim()) {
      setErrorMsg('Please enter a task title (*).');
      return;
    }

    const resolvedAssigneeIds = allowMultipleAssignees
      ? selectedAssigneeIds
      : normalizeAssigneeIds(selectedAssigneeIds, currentUserId || task?.assigneeId);

    if (resolvedAssigneeIds.length === 0) {
      setErrorMsg(TASK_ASSIGNEE_REQUIRED + ' (*)');
      return;
    }

    const payload = {
      ...(task || {}),
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee: selectedAssigneeLabel.trim(),
      assigneeId: resolvedAssigneeIds[0] || '',
      assigneeIds: resolvedAssigneeIds,
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

              <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                bounces={false}
                style={styles.form}
                contentContainerStyle={[
                  styles.formContent,
                  keyboardInset > 0 && { paddingBottom: keyboardInset },
                ]}
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
                onScroll={event => {
                  scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
                }}>
                <View ref={titleFieldRef} collapsable={false}>
                  <Text style={styles.label}>{TASK_TITLE_LABEL} *</Text>
                  <TextInput
                    ref={titleInputRef}
                    style={[styles.input, errorMsg && !title.trim() ? styles.inputError : null]}
                    placeholder={TASK_TITLE_PLACEHOLDER}
                    placeholderTextColor={darkPlaceholderColor}
                    value={title}
                    onChangeText={setTitle}
                  />
                  {errorMsg && !title.trim() && <Text style={styles.errorText}>{errorMsg}</Text>}
                </View>

                {/* Assignee Section */}
                <View style={styles.section}>
                  <Text style={styles.label}>
                    {allowMultipleAssignees ? TASK_ASSIGNEES_LABEL : TASK_ASSIGNEE_LABEL} *
                  </Text>
                  <View style={[(errorMsg && allowMultipleAssignees && selectedAssigneeIds.length === 0) || (errorMsg && !allowMultipleAssignees && !assignee) ? styles.dropdownError : null]}>
                  {allowMultipleAssignees ? (
                  <MultiSelectDropdown
                    label={TASK_ASSIGNEES_LABEL}
                    required
                    options={employeeOptions}
                    selectedIds={selectedAssigneeIds}
                    onChange={setSelectedAssigneeIds}
                    placeholder={TASK_SELECT_ASSIGNEES_PLACEHOLDER}
                    sheetTitle={TASK_ASSIGNEES_LABEL}
                  />
                ) : (
                  <>
                    <TextInput
                      style={[styles.input, styles.readonlyInput]}
                      value={assignee}
                      editable={false}
                      placeholderTextColor={darkPlaceholderColor}
                    />
                  </>
                )}
                </View>
                {errorMsg && ((allowMultipleAssignees && selectedAssigneeIds.length === 0) || (!allowMultipleAssignees && !assignee)) && (
                  <Text style={styles.errorText}>{errorMsg}</Text>
                )}
              </View>

              <View style={styles.row}>
                  <DropdownSelect
                    label={TASK_STATUS_LABEL}
                    value={status}
                    options={statusOptions}
                    onChange={setStatus}
                  />
                  <DropdownSelect
                    label={TASK_PRIORITY_LABEL}
                    value={priority}
                    options={PRIORITY_OPTIONS}
                    onChange={setPriority}
                  />
                </View>

                <View style={styles.row}>
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

                <View ref={hoursFieldRef} collapsable={false}>
                  <Text style={styles.label}>{TASK_ESTIMATED_HOURS_LABEL}</Text>
                  <TextInput
                    style={styles.input}
                    value={estimatedHours}
                    onChangeText={setEstimatedHours}
                    onFocus={() => scrollFieldIntoView(hoursFieldRef)}
                    keyboardType="numeric"
                    placeholderTextColor={darkPlaceholderColor}
                  />
                </View>

                <View ref={descriptionFieldRef} collapsable={false}>
                  <Text style={styles.label}>{TASK_WORK_DESCRIPTION_LABEL}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    onFocus={() => scrollFieldIntoView(descriptionFieldRef)}
                    multiline
                    placeholder={TASK_WORK_DESCRIPTION_PLACEHOLDER}
                    placeholderTextColor={darkPlaceholderColor}
                  />
                </View>
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
    opacity: 0.85,
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
  inputError: { borderColor: '#E74C3C', borderWidth: 1 },
  dropdownError: { borderColor: '#E74C3C', borderWidth: 1, borderRadius: wp(3), padding: wp(1) },
  errorText: { color: '#E74C3C', ...style.fontSizeSmall, marginTop: hp(1), marginBottom: hp(1), textAlign: 'left' }
});
