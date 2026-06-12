import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import ClockOutReasonModal from '../../components/Modal/ClockOutReasonModal';
import { useAttendance } from '../../context/AttendanceContext';
import { useAuth } from '../../context/AuthContext';
import {
  CHECKING_LOCATION_TEXT,
  CLOCK_IN_TEXT,
  CLOCK_OUT_TEXT,
  CLOCK_RESUME_TEXT,
  CLOCKED_IN_TEXT,
  CLOCKED_OUT_TEXT,
  PAUSED_TEXT,
  DAILY_WORK_HOURS_TARGET,
  DASHBOARD_LIVE_PREFIX,
  DASHBOARD_LIVE_SUFFIX,
  FOCUS_SCORE_LABEL,
  TASK_FILTER_DONE,
  MY_DASHBOARD_TITLE,
  DASHBOARD_TASK_CREATED_LABEL,
  DASHBOARD_TASK_DUE_LABEL,
  DASHBOARD_TASK_EST_LABEL,
  MY_TASKS_EMPTY,
  MY_TASKS_TODAY_LABEL,
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
import { syncSupabaseRealtimeAuth } from '../../lib/supabase';
import { fetchProjectsForUser } from '../../services/projectsService';
import {
  fetchTodayTasksForUser,
  subscribeToAssigneeProjectTasksChanges,
} from '../../services/projectTasksService';
import { subscribeToProjectsChanges } from '../../services/projectsService';
import { useWeeklyHours } from '../../hooks/useWeeklyHours';
import { getLocalDateKey } from '../../services/clockSessionsService';
import {
  getFirstName,
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);
const CARD_GAP = hp(2);
const LIVE_POLL_INTERVAL_MS = 5000;

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const {
    isClockedIn,
    isPaused,
    formattedTime,
    isCheckingLocation,
    showReasonModal,
    lastStopReason,
    handlePrimaryAction,
    confirmClockOut,
    closeReasonModal,
    elapsedSeconds,
  } = useAttendance();
  const displayName = getFirstName(user?.name || 'User');
  const { weeklyData, loading: weeklyLoading } = useWeeklyHours(user?.id);
  const [todayTasks, setTodayTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const loadTodayTasks = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setTasksLoading(true);
    }
    try {
      const projects = await fetchProjectsForUser(user);
      const projectNameById = projects.reduce((map, project) => {
        map[project.id] = project.name;
        return map;
      }, {});
      setTodayTasks(await fetchTodayTasksForUser(user, projectNameById));
    } catch {
      setTodayTasks([]);
    } finally {
      if (!silent) {
        setTasksLoading(false);
      }
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refresh = () => {
        if (active) {
          loadTodayTasks({ silent: true });
        }
      };

      loadTodayTasks();
      syncSupabaseRealtimeAuth().catch(() => {});

      const pollTimer = setInterval(refresh, LIVE_POLL_INTERVAL_MS);

      return () => {
        active = false;
        clearInterval(pollTimer);
      };
    }, [loadTodayTasks]),
  );

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    const refresh = () => {
      loadTodayTasks({ silent: true });
    };

    const unsubscribeTasks = subscribeToAssigneeProjectTasksChanges(user.id, refresh);
    const unsubscribeProjects = subscribeToProjectsChanges(refresh);

    return () => {
      unsubscribeTasks();
      unsubscribeProjects();
    };
  }, [loadTodayTasks, user?.id]);

  const clockStatusText = isClockedIn
    ? CLOCKED_IN_TEXT
    : isPaused
      ? PAUSED_TEXT
      : CLOCKED_OUT_TEXT;

  const clockButtonText = isClockedIn
    ? CLOCK_OUT_TEXT
    : isPaused
      ? CLOCK_RESUME_TEXT
      : CLOCK_IN_TEXT;

  const taskStats = useMemo(() => {
    const done = todayTasks.filter(task => task.status === TASK_FILTER_DONE).length;

    return {
      done,
      total: todayTasks.length,
    };
  }, [todayTasks]);

  const focusScore = useMemo(() => {
    const todayKey = getLocalDateKey();
    const todayDay = weeklyData?.days?.find(day => day.dateKey === todayKey);
    const savedHours = todayDay?.hours || 0;
    const liveHours = elapsedSeconds / 3600;
    const todayHours = Math.max(savedHours, liveHours);

    return Math.min(
      100,
      Math.round((todayHours / DAILY_WORK_HOURS_TARGET) * 100),
    );
  }, [elapsedSeconds, weeklyData?.days]);

  const statsLoading = tasksLoading || weeklyLoading;

  const buildTaskDetailLine = task => {
    const parts = [];

    if (task.createdDate) {
      parts.push(`${DASHBOARD_TASK_CREATED_LABEL} ${task.createdDate}`);
    }
    if (task.dueDate) {
      parts.push(`${DASHBOARD_TASK_DUE_LABEL} ${task.dueDate}`);
    }
    if (task.estimateLabel) {
      parts.push(`${DASHBOARD_TASK_EST_LABEL} ${task.estimateLabel}`);
    }

    return parts.join(' · ');
  };

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
              <Text style={styles.timer}>{formattedTime}</Text>
              <Text style={styles.clockStatus}>
                {OFFICE_LABEL} · {clockStatusText}
              </Text>
              {isPaused && lastStopReason ? (
                <Text style={styles.pauseReason}>{lastStopReason}</Text>
              ) : null}

            </View>
            <TouchableOpacity
              style={[
                styles.clockInButton,
                isClockedIn && styles.clockOutButton,
                isCheckingLocation && styles.clockButtonDisabled,
              ]}
              activeOpacity={0.8}
              disabled={isCheckingLocation && !isClockedIn}
              onPress={handlePrimaryAction}>
              {isCheckingLocation && !isClockedIn ? (
                <ActivityIndicator size="small" color={darkAccentGreenColor} />
              ) : (
                <Text
                  style={[
                    styles.clockInText,
                    isClockedIn && styles.clockOutText,
                  ]}>
                  {clockButtonText}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {isCheckingLocation ? (
            <Text style={styles.locationHint}>{CHECKING_LOCATION_TEXT}</Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Icon name="target" size={wp(4.5)} color={PURPLE} />
                <Text style={styles.statLabel}>{FOCUS_SCORE_LABEL}</Text>
              </View>
              <Text style={styles.statValue}>
                {statsLoading ? '--' : `${focusScore}%`}
              </Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Icon name="check-square" size={wp(4.5)} color={darkAccentGreenColor} />
                <Text style={styles.statLabel}>{TASKS_DONE_LABEL}</Text>
              </View>
              <Text style={styles.statValue}>
                {statsLoading
                  ? '--'
                  : `${taskStats.done}/${taskStats.total}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => navigation.navigate(MAIN_ROUTES.PROJECTS_WORK)}
            activeOpacity={0.85}>
            <Text style={styles.sectionTitle}>{MY_TASKS_TITLE} →</Text>
            <Text style={styles.sectionSubtitle}>{MY_TASKS_TODAY_LABEL}</Text>
            {tasksLoading ? (
              <ActivityIndicator size="small" color={PURPLE} style={styles.tasksLoader} />
            ) : todayTasks.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>{MY_TASKS_EMPTY}</Text>
              </View>
            ) : (
              <View style={styles.taskList}>
                {todayTasks.map(task => {
                  const detailLine = buildTaskDetailLine(task);

                  return (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskRow}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate(MAIN_ROUTES.TASK_MANAGEMENT, {
                        projectId: task.projectId,
                        projectName: task.project,
                      })
                    }>
                    <View style={styles.taskRowLeft}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Text style={styles.taskMeta} numberOfLines={1}>
                        {task.project} · {task.status}
                      </Text>
                      {detailLine ? (
                        <Text style={styles.taskDetails} numberOfLines={2}>
                          {detailLine}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => navigation.navigate(MAIN_ROUTES.TIME_SHEET)}
            activeOpacity={0.85}>
            <Text style={styles.sectionTitle}>{WEEKLY_HOURS_TITLE} →</Text>
            {weeklyLoading ? (
              <ActivityIndicator size="small" color={PURPLE} style={styles.weeklyLoader} />
            ) : (
              <>
                <View style={styles.chartRow}>
                  {weeklyData.days.map(day => (
                    <View key={day.day} style={styles.chartItem}>
                      <Text style={styles.chartHours}>{day.hoursLabel}</Text>
                      <View style={styles.chartBarTrack}>
                        <View
                          style={[styles.chartBarFill, { width: `${day.barPercent}%` }]}
                        />
                      </View>
                      <Text style={styles.chartDay}>{day.day}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{weeklyData.totalHoursLabel}</Text>
                    <Text style={styles.summaryLabel}>Total</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{weeklyData.avgHoursLabel}</Text>
                    <Text style={styles.summaryLabel}>Avg/Day</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{weeklyData.attendanceLabel}</Text>
                    <Text style={styles.summaryLabel}>Attendance</Text>
                  </View>
                </View>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
      <ClockOutReasonModal
        visible={showReasonModal}
        onConfirm={confirmClockOut}
        onCancel={closeReasonModal}
      />
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
  pauseReason: {
    ...style.fontSizeSmall,
    color: '#F47C20',
    marginTop: hp(0.4),
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
  clockOutButton: {
    borderColor: '#E85D5D',
    backgroundColor: 'rgba(232, 93, 93, 0.1)',
  },
  clockOutText: {
    color: '#E85D5D',
  },
  clockButtonDisabled: {
    opacity: 0.7,
  },
  locationHint: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginTop: -hp(1),
    marginBottom: CARD_GAP,
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
    marginBottom: hp(0.8),
  },
  sectionSubtitle: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(1.5),
  },
  tasksLoader: {
    marginVertical: hp(2),
  },
  taskList: {
    gap: hp(1),
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    gap: wp(3),
  },
  taskRowLeft: {
    flex: 1,
  },
  taskTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.3),
  },
  taskMeta: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.25),
  },
  taskDetails: {
    ...style.fontSizeSmall,
    color: PURPLE,
    ...style.fontWeightMedium,
    marginTop: hp(0.2),
    lineHeight: hp(2),
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
    height: '100%',
    backgroundColor: PURPLE,
    borderRadius: hp(0.3),
  },
  weeklyLoader: {
    marginVertical: hp(2),
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
