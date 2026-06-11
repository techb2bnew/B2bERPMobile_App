import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import {
  TIME_SHEET_ATTENDANCE_LABEL,
  TIME_SHEET_AVG_LABEL,
  TIME_SHEET_CLOCK_IN_LABEL,
  TIME_SHEET_CLOCK_OUT_LABEL,
  TIME_SHEET_HOURS_LABEL,
  TIME_SHEET_LABEL,
  TIME_SHEET_SUBTITLE,
  TIME_SHEET_TODAY_LABEL,
  TIME_SHEET_TOTAL_LABEL,
  WEEKLY_HOURS_TITLE,
} from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);
const CARD_GAP = hp(2);

const WEEK_DAYS = [
  { day: 'Mon', hours: '8.0', clockIn: '09:02 AM', clockOut: '06:05 PM' },
  { day: 'Tue', hours: '8.0', clockIn: '09:00 AM', clockOut: '06:00 PM' },
  { day: 'Wed', hours: '8.0', clockIn: '09:15 AM', clockOut: '06:10 PM' },
  { day: 'Thu', hours: '8.0', clockIn: '09:05 AM', clockOut: '06:02 PM' },
  { day: 'Fri', hours: '8.0', clockIn: '09:00 AM', clockOut: '06:00 PM' },
];

const TimeSheetScreen = () => {
  return (
    <View style={styles.root}>
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader title={TIME_SHEET_LABEL} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{TIME_SHEET_SUBTITLE}</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{WEEKLY_HOURS_TITLE}</Text>
          <View style={styles.chartRow}>
            {WEEK_DAYS.map(item => (
              <View key={item.day} style={styles.chartItem}>
                <Text style={styles.chartHours}>{item.hours}h</Text>
                <View style={styles.chartBarTrack}>
                  <View style={styles.chartBarFill} />
                </View>
                <Text style={styles.chartDay}>{item.day}</Text>
              </View>
            ))}
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>40.0h</Text>
              <Text style={styles.summaryLabel}>{TIME_SHEET_TOTAL_LABEL}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>8.0h</Text>
              <Text style={styles.summaryLabel}>{TIME_SHEET_AVG_LABEL}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>100%</Text>
              <Text style={styles.summaryLabel}>{TIME_SHEET_ATTENDANCE_LABEL}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.listTitle}>{TIME_SHEET_TODAY_LABEL}</Text>
        {WEEK_DAYS.map(item => (
          <View key={item.day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{item.day}</Text>
              <Text style={styles.dayHours}>
                {item.hours} {TIME_SHEET_HOURS_LABEL}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>{TIME_SHEET_CLOCK_IN_LABEL}</Text>
                <Text style={styles.timeValue}>{item.clockIn}</Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>{TIME_SHEET_CLOCK_OUT_LABEL}</Text>
                <Text style={styles.timeValue}>{item.clockOut}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
    <AiAssistant />
    </View>
  );
};

export default TimeSheetScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: hp(1.2),
    paddingBottom: hp(4),
  },
  subtitle: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: CARD_GAP,
  },
  sectionCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5),
    paddingTop: hp(2.2),
    paddingBottom: hp(2.4),
    marginBottom: CARD_GAP,
  },
  sectionTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: hp(2),
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
    marginBottom: hp(2.5),
  },
  chartItem: {
    flex: 1,
    alignItems: 'center',
  },
  chartHours: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.8),
  },
  chartBarTrack: {
    width: '100%',
    height: hp(0.55),
    backgroundColor: darkBorderColor,
    borderRadius: hp(0.3),
    overflow: 'hidden',
    marginBottom: hp(0.8),
  },
  chartBarFill: {
    width: '100%',
    height: '100%',
    backgroundColor: PURPLE,
    borderRadius: hp(0.3),
  },
  chartDay: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
    paddingTop: hp(2),
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: hp(4),
    backgroundColor: darkBorderColor,
  },
  summaryValue: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  summaryLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.5),
  },
  listTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: hp(1.2),
  },
  dayCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(1.6),
    marginBottom: hp(1),
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  dayName: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  dayHours: {
    ...style.fontSizeSmall2x,
    color: PURPLE,
    ...style.fontWeightMedium,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlock: {
    flex: 1,
  },
  timeDivider: {
    width: 1,
    height: hp(3.5),
    backgroundColor: darkBorderColor,
    marginHorizontal: wp(3),
  },
  timeLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.3),
  },
  timeValue: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
});
