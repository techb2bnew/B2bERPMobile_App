import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import UserAvatar from './UserAvatar';
import PerformanceMeterBar from './PerformanceMeterBar';
import {
  PERFORMANCE_ATTENDANCE_LABEL,
  PERFORMANCE_DONE_SUFFIX,
  PERFORMANCE_NO_SHIFT_CAPTION,
  PERFORMANCE_NO_TASKS_CAPTION,
  PERFORMANCE_PAYABLE_DAYS_SUFFIX,
  PERFORMANCE_SHIFT_LABEL,
  PERFORMANCE_TASK_LABEL,
} from '../constants/Constants';
import { darkBorderColor, darkElevatedColor, darkTextPrimaryColor, darkTextSecondaryColor } from '../constants/Color';
import { style } from '../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const PerformanceEmployeeCard = ({ row, onPress }) => {
  const { employee, attendanceMeter, taskMeter, shiftMeter } = row;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <UserAvatar userId={employee.id} name={employee.name} size={wp(10)} />
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {employee.name}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            {employee.role}{employee.dept ? ` · ${employee.dept}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.metersStack}>
        <PerformanceMeterBar
          label={PERFORMANCE_ATTENDANCE_LABEL}
          percent={attendanceMeter.percent}
          caption={`${attendanceMeter.payableDays} of ${attendanceMeter.daysInMonth} ${PERFORMANCE_PAYABLE_DAYS_SUFFIX}`}
        />
        <PerformanceMeterBar
          label={PERFORMANCE_TASK_LABEL}
          percent={taskMeter.percent}
          caption={taskMeter.total > 0 ? `${taskMeter.done}/${taskMeter.total} ${PERFORMANCE_DONE_SUFFIX}` : PERFORMANCE_NO_TASKS_CAPTION}
        />
        <PerformanceMeterBar
          label={PERFORMANCE_SHIFT_LABEL}
          percent={shiftMeter.percent}
          caption={
            shiftMeter.totalDays > 0
              ? `${shiftMeter.totalHours.toFixed(1)}h of ${shiftMeter.expectedHours}h`
              : PERFORMANCE_NO_SHIFT_CAPTION
          }
        />
      </View>
    </TouchableOpacity>
  );
};

export default PerformanceEmployeeCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: darkElevatedColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(3.5),
    gap: hp(1.6),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  role: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  metersStack: {
    gap: hp(1.2),
  },
});
