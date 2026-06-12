import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Feather';
import CommonButton from '../CommonButton';
import {
  TIME_SHEET_APPLY,
  TIME_SHEET_DATE_RANGE,
  TIME_SHEET_RANGE_HINT,
  TIME_SHEET_RESET,
  TIME_SHEET_SELECT_DATES,
  TIME_SHEET_SINGLE_DATE,
} from '../../constants/Constants';
import {
  darkBorderColor,
  darkInputBgColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { getLocalDateKey } from '../../services/clockSessionsService';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const MODES = [
  { id: 'single', label: TIME_SHEET_SINGLE_DATE },
  { id: 'range', label: TIME_SHEET_DATE_RANGE },
];

const buildRangeMarkedDates = (startDateKey, endDateKey) => {
  if (!startDateKey) {
    return {};
  }

  if (!endDateKey || startDateKey === endDateKey) {
    return {
      [startDateKey]: {
        startingDay: true,
        endingDay: true,
        color: PURPLE,
        textColor: '#ffffff',
      },
    };
  }

  const marked = {};
  const start = new Date(`${startDateKey}T00:00:00`);
  const end = new Date(`${endDateKey}T00:00:00`);
  const cursor = new Date(start);

  while (cursor <= end) {
    const dateKey = getLocalDateKey(cursor);
    const isStart = dateKey === startDateKey;
    const isEnd = dateKey === endDateKey;

    marked[dateKey] = {
      startingDay: isStart,
      endingDay: isEnd,
      color: PURPLE,
      textColor: '#ffffff',
    };

    cursor.setDate(cursor.getDate() + 1);
  }

  return marked;
};

const TimeSheetDateFilterModal = ({
  visible,
  initialStartDateKey,
  initialEndDateKey,
  onClose,
  onApply,
  onReset,
}) => {
  const [mode, setMode] = useState('range');
  const [startDateKey, setStartDateKey] = useState('');
  const [endDateKey, setEndDateKey] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    setStartDateKey(initialStartDateKey || getLocalDateKey());
    setEndDateKey(initialEndDateKey || initialStartDateKey || getLocalDateKey());
    setMode(
      initialStartDateKey &&
        initialEndDateKey &&
        initialStartDateKey === initialEndDateKey
        ? 'single'
        : 'range',
    );
  }, [visible, initialStartDateKey, initialEndDateKey]);

  const markedDates = useMemo(
    () => buildRangeMarkedDates(startDateKey, endDateKey),
    [endDateKey, startDateKey],
  );

  const handleDayPress = day => {
    const dateKey = day.dateString;

    if (mode === 'single') {
      setStartDateKey(dateKey);
      setEndDateKey(dateKey);
      return;
    }

    if (!startDateKey || (startDateKey && endDateKey)) {
      setStartDateKey(dateKey);
      setEndDateKey('');
      return;
    }

    if (dateKey < startDateKey) {
      setEndDateKey(startDateKey);
      setStartDateKey(dateKey);
      return;
    }

    setEndDateKey(dateKey);
  };

  const handleApply = () => {
    const start = startDateKey || getLocalDateKey();
    const end = mode === 'single' ? start : endDateKey || start;
    onApply({ startDateKey: start, endDateKey: end });
    onClose();
  };

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
    textDayFontFamily: 'System',
    textMonthFontFamily: 'System',
    textDayHeaderFontFamily: 'System',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.overlay}
        onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>{TIME_SHEET_SELECT_DATES}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="x" size={wp(5)} color={darkTextSecondaryColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            {MODES.map(option => {
              const isActive = mode === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.modeChip, isActive && styles.modeChipActive]}
                  onPress={() => {
                    setMode(option.id);
                    if (option.id === 'single' && startDateKey) {
                      setEndDateKey(startDateKey);
                    }
                  }}
                  activeOpacity={0.85}>
                  <Text style={[styles.modeText, isActive && styles.modeTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.hint}>{TIME_SHEET_RANGE_HINT}</Text>

          <Calendar
            markingType="period"
            markedDates={markedDates}
            onDayPress={handleDayPress}
            enableSwipeMonths
            theme={calendarTheme}
            style={styles.calendar}
          />

          <View style={styles.actions}>
            <CommonButton
              title={TIME_SHEET_RESET}
              variant="outline"
              onPress={() => {
                onReset();
                onClose();
              }}
              style={styles.resetButton}
            />
            <CommonButton
              title={TIME_SHEET_APPLY}
              onPress={handleApply}
              style={styles.applyButton}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default TimeSheetDateFilterModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(4),
  },
  card: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  title: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  modeRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(1.2),
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(1),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: darkInputBgColor,
  },
  modeChipActive: {
    borderColor: PURPLE,
    backgroundColor: 'rgba(155, 89, 182, 0.18)',
  },
  modeText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  modeTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  hint: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(1),
  },
  calendar: {
    borderRadius: wp(3),
    overflow: 'hidden',
    marginBottom: hp(1.5),
  },
  actions: {
    flexDirection: 'row',
    gap: wp(2),
  },
  resetButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
});
