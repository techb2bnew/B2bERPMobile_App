import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import { useAuth } from '../../context/AuthContext';
import {
  CLOCK_IN_TEXT,
  CLOCKED_OUT_TEXT,
  DASHBOARD_LIVE_PREFIX,
  DASHBOARD_LIVE_SUFFIX,
  FOCUS_SCORE_LABEL,
  MY_DASHBOARD_TITLE,
  MY_TASKS_EMPTY,
  MY_TASKS_TITLE,
  OFFICE_ATTENDANCE_NOTE,
  OFFICE_LABEL,
  TASKS_DONE_LABEL,
  WEEKLY_HOURS_TITLE,
} from '../../constants/Constants';
import {
  darkAccentGreenColor,
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style, spacings } from '../../constants/Fonts';
import { MAIN_ROUTES } from '../../navigation/routes';
import {
  getFirstName,
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);
const CARD_GAP = hp(2);
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const displayName = getFirstName(user?.name || 'User');

  return (
    <View style={styles.root}>
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader title={MY_DASHBOARD_TITLE} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          {displayName}
          {DASHBOARD_LIVE_PREFIX}
          {DASHBOARD_LIVE_SUFFIX}
        </Text>

        <View style={styles.clockCard}>
          <View style={styles.clockLeft}>
            <Text style={styles.timer}>00:00:00</Text>
            <Text style={styles.clockStatus}>
              {OFFICE_LABEL} · {CLOCKED_OUT_TEXT}
            </Text>
            <Text style={styles.clockNote}>{OFFICE_ATTENDANCE_NOTE}</Text>
          </View>
          <TouchableOpacity style={styles.clockInButton} activeOpacity={0.8}>
            <Text style={styles.clockInText}>{CLOCK_IN_TEXT}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Icon name="target" size={wp(4.5)} color={PURPLE} />
              <Text style={styles.statLabel}>{FOCUS_SCORE_LABEL}</Text>
            </View>
            <Text style={styles.statValue}>90%</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Icon name="check-square" size={wp(4.5)} color={darkAccentGreenColor} />
              <Text style={styles.statLabel}>{TASKS_DONE_LABEL}</Text>
            </View>
            <Text style={styles.statValue}>0/0</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => navigation.navigate(MAIN_ROUTES.PROJECTS_WORK)}
          activeOpacity={0.85}>
          <Text style={styles.sectionTitle}>{MY_TASKS_TITLE} →</Text>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{MY_TASKS_EMPTY}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => navigation.navigate(MAIN_ROUTES.TIME_SHEET)}
          activeOpacity={0.85}>
          <Text style={styles.sectionTitle}>{WEEKLY_HOURS_TITLE} →</Text>
          <View style={styles.chartRow}>
            {WEEK_DAYS.map(day => (
              <View key={day} style={styles.chartItem}>
                <Text style={styles.chartHours}>8h</Text>
                <View style={styles.chartBarTrack}>
                  <View style={styles.chartBarFill} />
                </View>
                <Text style={styles.chartDay}>{day}</Text>
              </View>
            ))}
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>40.0h</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>8.0h</Text>
              <Text style={styles.summaryLabel}>Avg/Day</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>100%</Text>
              <Text style={styles.summaryLabel}>Attendance</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    <AiAssistant />
    </View>
  );
};

export default DashboardScreen;

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
    paddingBottom: hp(14),
  },
  subtitle: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: CARD_GAP,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    letterSpacing: 0.3,
  },
  clockCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5),
    paddingVertical: hp(2.4),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: CARD_GAP,
  },
  clockLeft: {
    flex: 1,
    paddingRight: spacings.normal,
  },
  timer: {
    fontSize: wp(8),
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    letterSpacing: 3,
    lineHeight: wp(9),
  },
  clockStatus: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginTop: hp(0.6),
  },
  clockNote: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.4),
    opacity: 0.85,
  },
  clockInButton: {
    borderWidth: 1,
    borderColor: darkAccentGreenColor,
    backgroundColor: 'rgba(61, 220, 132, 0.1)',
    borderRadius: wp(2.5),
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(1.2),
    alignSelf: 'center',
  },
  clockInText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkAccentGreenColor,
  },
  statsRow: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: CARD_GAP,
  },
  statCard: {
    flex: 1,
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    minHeight: hp(12),
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacings.small,
  },
  statLabel: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    flex: 1,
  },
  statValue: {
    fontSize: wp(7),
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginTop: hp(1.5),
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
  emptyWrap: {
    minHeight: hp(10),
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(2),
  },
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
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
});
