import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import DropdownSelect from '../DropdownSelect';
import {
  TASK_FILTER_ALL_PRIORITIES,
  TASK_FILTER_ALL_STATUSES,
  TASK_FILTER_CLEAR_ALL,
  TASK_FILTER_DONE,
  TASK_FILTER_IN_PROGRESS,
  TASK_FILTER_SEARCH_LABEL,
  TASK_FILTER_SEARCH_PLACEHOLDER,
  TASK_FILTER_TASKS_TITLE,
  TASK_FILTER_TODO,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_READY_FOR_TESTING,
  TASK_STATUS_REVIEW,
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
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const BLUE = '#2D7DD2';

const PRIORITY_OPTIONS = [
  TASK_FILTER_ALL_PRIORITIES,
  'low',
  'medium',
  'high',
];

const ALL_STATUS_OPTIONS = [
  TASK_FILTER_ALL_STATUSES,
  TASK_FILTER_TODO,
  TASK_FILTER_IN_PROGRESS,
  TASK_STATUS_READY_FOR_TESTING,
  TASK_STATUS_REVIEW,
  TASK_FILTER_DONE,
];

const TaskFilterModal = ({ visible, filters, hideDoneStatus = false, onClose, onApply, onClear }) => {
  const statusOptions = hideDoneStatus
    ? ALL_STATUS_OPTIONS.filter(
        option => option !== TASK_FILTER_DONE && option !== TASK_STATUS_REVIEW,
      )
    : ALL_STATUS_OPTIONS;
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState(TASK_FILTER_ALL_PRIORITIES);
  const [status, setStatus] = useState(TASK_FILTER_ALL_STATUSES);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setSearch(filters.search || '');
    setPriority(filters.priority || TASK_FILTER_ALL_PRIORITIES);
    setStatus(filters.status || TASK_FILTER_ALL_STATUSES);
  }, [visible, filters]);

  const handleClear = () => {
    setSearch('');
    setPriority(TASK_FILTER_ALL_PRIORITIES);
    setStatus(TASK_FILTER_ALL_STATUSES);
    onClear();
  };

  const handleApply = () => {
    onApply({ search, priority, status });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>{TASK_FILTER_TASKS_TITLE}</Text>
                <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.clearText}>{TASK_FILTER_CLEAR_ALL}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{TASK_FILTER_SEARCH_LABEL}</Text>
                <TextInput
                  style={styles.input}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={TASK_FILTER_SEARCH_PLACEHOLDER}
                  placeholderTextColor={darkPlaceholderColor}
                />
              </View>

              <DropdownSelect
                label={TASK_PRIORITY_LABEL}
                value={priority}
                options={PRIORITY_OPTIONS}
                onChange={setPriority}
                containerStyle={styles.dropdownField}
              />

              <DropdownSelect
                label={TASK_STATUS_LABEL}
                value={status}
                options={statusOptions}
                onChange={setStatus}
                containerStyle={styles.dropdownField}
              />

              <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.85}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default TaskFilterModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: hp(12),
    paddingRight: wp(4),
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: wp(88),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingTop: hp(2),
    paddingBottom: hp(2.5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.8),
  },
  title: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  clearText: {
    ...style.fontSizeSmall2x,
    color: BLUE,
    ...style.fontWeightMedium,
  },
  field: {
    marginBottom: hp(1.5),
  },
  label: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.7),
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
  dropdownField: {
    marginBottom: hp(1.5),
  },
  applyButton: {
    marginTop: hp(0.5),
    backgroundColor: BLUE,
    borderRadius: wp(3),
    paddingVertical: hp(1.3),
    alignItems: 'center',
  },
  applyButtonText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
});
