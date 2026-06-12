import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import TimeSheetDateFilterModal from '../../components/Modal/TimeSheetDateFilterModal';
import { useAuth } from '../../context/AuthContext';
import {
  TIME_SHEET_ATTENDANCE_LABEL,
  TIME_SHEET_AVG_LABEL,
  TIME_SHEET_CHANGE_DATES,
  TIME_SHEET_CLOCK_IN_LABEL,
  TIME_SHEET_CLOCK_OUT_LABEL,
  TIME_SHEET_DAILY_BREAKDOWN,
  TIME_SHEET_FROM_LABEL,
  TIME_SHEET_LABEL,
  TIME_SHEET_OFFICE_ATTENDANCE,
  TIME_SHEET_SELECTED_RANGE,
  TIME_SHEET_THIS_WEEK,
  TIME_SHEET_TO_LABEL,
  TIME_SHEET_TOTAL_LABEL,
  WEEKLY_HOURS_TITLE,
} from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkInputBgColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { useTimeSheetHours } from '../../hooks/useTimeSheetHours';
import {
  getCurrentWeekRange,
  getDateRangeDisplay,
} from '../../services/clockSessionsService';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);
const CARD_GAP = hp(2);

const TimeSheetScreen = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState(() => getCurrentWeekRange());
  const [filterVisible, setFilterVisible] = useState(false);
  const { rangeData, loading, isCurrentWeek } = useTimeSheetHours(user?.id, dateRange);

  const rangeDisplay = useMemo(
    () =>
      getDateRangeDisplay(
        dateRange.startDateKey,
        dateRange.endDateKey,
        isCurrentWeek,
      ),
    [dateRange.endDateKey, dateRange.startDateKey, isCurrentWeek],
  );

  const useWideChart = rangeData.days.length > 5;
  const rangeTitle = isCurrentWeek
    ? TIME_SHEET_THIS_WEEK
    : rangeDisplay.isSingleDay
      ? rangeDisplay.title
      : TIME_SHEET_SELECTED_RANGE;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={TIME_SHEET_LABEL} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.rangeCard}>
            <View style={styles.rangeHeader}>
              <View style={styles.rangeIconWrap}>
                <Icon name="calendar" size={wp(5)} color={PURPLE} />
              </View>
              <View style={styles.rangeHeaderText}>
                <Text style={styles.rangeTitle}>{rangeTitle}</Text>
                <Text style={styles.rangeMeta}>
                  {rangeDisplay.dayCountLabel} · {TIME_SHEET_OFFICE_ATTENDANCE}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => setFilterVisible(true)}
                activeOpacity={0.85}>
                <Text style={styles.changeButtonText}>{TIME_SHEET_CHANGE_DATES}</Text>
                <Icon name="chevron-right" size={wp(4)} color={PURPLE} />
              </TouchableOpacity>
            </View>

            {rangeDisplay.showRange ? (
              <View style={styles.rangeDatesRow}>
                <View style={styles.datePill}>
                  <Text style={styles.datePillLabel}>{TIME_SHEET_FROM_LABEL}</Text>
                  <Text style={styles.datePillValue} numberOfLines={1}>
                    {rangeDisplay.fromLabel}
                  </Text>
                </View>
                <View style={styles.rangeArrow}>
                  <Icon name="arrow-right" size={wp(4.5)} color={darkTextSecondaryColor} />
                </View>
                <View style={styles.datePill}>
                  <Text style={styles.datePillLabel}>{TIME_SHEET_TO_LABEL}</Text>
                  <Text style={styles.datePillValue} numberOfLines={1}>
                    {rangeDisplay.toLabel}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{WEEKLY_HOURS_TITLE}</Text>
            {loading ? (
              <ActivityIndicator size="small" color={PURPLE} style={styles.loader} />
            ) : (
              <>
                <ScrollView
                  horizontal={useWideChart}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={useWideChart ? styles.chartRowWide : styles.chartRow}>
                  {rangeData.days.map(item => (
                    <View
                      key={item.dateKey}
                      style={[styles.chartItem, useWideChart && styles.chartItemWide]}>
                      <Text style={styles.chartHours}>{item.hoursLabel}</Text>
                      <View style={styles.chartBarTrack}>
                        <View
                          style={[styles.chartBarFill, { width: `${item.barPercent}%` }]}
                        />
                      </View>
                      <Text style={styles.chartDay}>{item.chartLabel}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{rangeData.totalHoursLabel}</Text>
                    <Text style={styles.summaryLabel}>{TIME_SHEET_TOTAL_LABEL}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{rangeData.avgHoursLabel}</Text>
                    <Text style={styles.summaryLabel}>{TIME_SHEET_AVG_LABEL}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{rangeData.attendanceLabel}</Text>
                    <Text style={styles.summaryLabel}>{TIME_SHEET_ATTENDANCE_LABEL}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <Text style={styles.listTitle}>{TIME_SHEET_DAILY_BREAKDOWN}</Text>
          {loading ? (
            <ActivityIndicator size="small" color={PURPLE} style={styles.loader} />
          ) : rangeData.days.length === 0 ? (
            <Text style={styles.emptyText}>No dates selected.</Text>
          ) : (
            rangeData.days.map(item => (
              <View key={item.dateKey} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>{item.displayLabel}</Text>
                  <Text style={styles.dayHours}>{item.hoursLabel}</Text>
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
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <TimeSheetDateFilterModal
        visible={filterVisible}
        initialStartDateKey={dateRange.startDateKey}
        initialEndDateKey={dateRange.endDateKey}
        onClose={() => setFilterVisible(false)}
        onApply={setDateRange}
        onReset={() => setDateRange(getCurrentWeekRange())}
      />

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
  rangeCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6),
    marginBottom: CARD_GAP,
    gap: hp(1.4),
  },
  rangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  rangeIconWrap: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: 'rgba(155, 89, 182, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  rangeTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.25),
  },
  rangeMeta: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.5),
    paddingVertical: hp(0.5),
  },
  changeButtonText: {
    ...style.fontSizeSmall2x,
    color: PURPLE,
    ...style.fontWeightMedium,
  },
  rangeDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingTop: hp(0.4),
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
  },
  datePill: {
    flex: 1,
    backgroundColor: darkInputBgColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    minWidth: 0,
  },
  datePillLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.25),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  datePillValue: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  rangeArrow: {
    paddingTop: hp(1.2),
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
  loader: {
    marginVertical: hp(2),
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
    marginBottom: hp(2.5),
    width: '100%',
  },
  chartRowWide: {
    flexDirection: 'row',
    gap: wp(3),
    paddingBottom: hp(0.5),
    marginBottom: hp(2),
  },
  chartItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  chartItemWide: {
    width: wp(14),
    flex: 0,
  },
  chartHours: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.8),
    textAlign: 'center',
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
    height: '100%',
    backgroundColor: PURPLE,
    borderRadius: hp(0.3),
  },
  chartDay: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    textAlign: 'center',
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
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    paddingVertical: hp(2),
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
    flex: 1,
    paddingRight: wp(2),
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
