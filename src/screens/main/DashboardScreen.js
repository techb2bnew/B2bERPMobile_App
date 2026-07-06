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
import UserAvatar from '../../components/UserAvatar';
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
  MY_TASKS_TL_EMPTY,
  MY_TASKS_TL_SUBTITLE,
  DASHBOARD_TL_TASKS_SUBTITLE,
  DASHBOARD_TL_REVIEW_LABEL,
  TASK_ASSIGNED_TO_LABEL,
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
import { getSupabase, isSupabaseConfigured, syncSupabaseRealtimeAuth } from '../../lib/supabase';
import { isCeoAdminUser, isReviewerUser, isTeamLeaderUser } from '../../constants/roles';
import { fetchAllEmployeeProfiles } from '../../services/employeeService';
import {
  fetchAllProjects,
  fetchProjectsWhereUserIsOnTeam,
} from '../../services/projectsService';
import {
  fetchTeamLeaderTasks,
  fetchTodayTasksForUser,
  subscribeToAllProjectTasksChanges,
  subscribeToAssigneeProjectTasksChanges,
} from '../../services/projectTasksService';
import { subscribeToProjectsChanges } from '../../services/projectsService';
import { buildEmployeeNameMap, formatTaskDate, isTaskScheduledToday } from '../../utils/projectUtils';
import { useWeeklyHours } from '../../hooks/useWeeklyHours';
import { getLocalDateKey } from '../../services/clockSessionsService';
import { normalizeDepartmentName } from '../../services/hrmsService';
import {
  getFirstName,
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);
const CARD_GAP = hp(2);
const getSegmentColor = (kind) => {
  switch (kind) {
    case 'idle':
      return '#F85149'; // Red
    case 'break':
      return '#F5C542'; // Yellow
    case 'working':
      return '#3498DB'; // Blue
    default:
      return '#8B949E';
  }
};

const formatDuration = (ms) => {
  if (!ms || ms <= 0) return '0m';
  const diffMinutes = Math.floor(ms / 60000);
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const formatTimeOfDay = (timestamp) => {
  if (!timestamp) return 'Active';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const renderTimelineBar = (segments) => {
  const SHIFT_START_HOUR = 10;
  const SHIFT_END_HOUR = 21;
  const TOTAL_SHIFT_MS = (SHIFT_END_HOUR - SHIFT_START_HOUR) * 60 * 60 * 1000;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const shiftStart = startOfDay.getTime() + SHIFT_START_HOUR * 60 * 60 * 1000;

  if (!segments || segments.length === 0) {
    return <View style={styles.timelineBarPlaceholder} />;
  }

  return (
    <View style={styles.timelineContainer}>
      {/* Hour Guide lines (10 AM to 9 PM = 11 intervals) */}
      <View style={[styles.gridline, { left: '9.09%' }]} />
      <View style={[styles.gridline, { left: '18.18%' }]} />
      <View style={[styles.gridline, { left: '27.27%' }]} />
      <View style={[styles.gridline, { left: '36.36%' }]} />
      <View style={[styles.gridline, { left: '45.45%' }]} />
      <View style={[styles.gridline, { left: '54.54%' }]} />
      <View style={[styles.gridline, { left: '63.63%' }]} />
      <View style={[styles.gridline, { left: '72.72%' }]} />
      <View style={[styles.gridline, { left: '81.81%' }]} />
      <View style={[styles.gridline, { left: '90.90%' }]} />

      {segments.map((seg) => {
        const segStart = new Date(seg.started_at).getTime();
        const segEnd = seg.ended_at ? new Date(seg.ended_at).getTime() : Date.now();

        const startOffset = Math.max(0, segStart - shiftStart);
        const endOffset = Math.min(TOTAL_SHIFT_MS, segEnd - shiftStart);

        if (startOffset >= TOTAL_SHIFT_MS || endOffset <= 0) {
          return null;
        }

        const leftPercent = (startOffset / TOTAL_SHIFT_MS) * 100;
        const widthPercent = ((endOffset - startOffset) / TOTAL_SHIFT_MS) * 100;

        return (
          <View
            key={seg.id}
            style={[
              styles.segmentBlock,
              {
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                backgroundColor: getSegmentColor(seg.kind),
              },
            ]}
          />
        );
      })}
    </View>
  );
};

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
  const isTeamLeader = isTeamLeaderUser(user);
  const { weeklyData, loading: weeklyLoading } = useWeeklyHours(user?.id);
  const [todayTasks, setTodayTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // CEO and Manager specific states
  const [shiftSessions, setShiftSessions] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const loadTodayTasks = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setTasksLoading(true);
    }
    try {
      const [teamProjects, allProjects, employees] = await Promise.all([
        fetchProjectsWhereUserIsOnTeam(user),
        fetchAllProjects(),
        isTeamLeader ? fetchAllEmployeeProfiles() : Promise.resolve([]),
      ]);
      const projectNameById = allProjects.reduce((map, project) => {
        map[project.id] = project.name;
        return map;
      }, {});

      if (isTeamLeader) {
        const employeeNameMap = buildEmployeeNameMap(employees);
        const projectIds = teamProjects.map(project => project.id);
        const teamLeaderTasks = await fetchTeamLeaderTasks({
          assigneeId: user?.id,
          projectIds,
          projectNameById,
          employeeNameMap,
          assigneeName: user?.name || '',
        });
        setTodayTasks(teamLeaderTasks.filter(isTaskScheduledToday));
      } else {
        setTodayTasks(
          await fetchTodayTasksForUser(
            user,
            teamProjects.reduce((map, project) => {
              map[project.id] = project.name;
              return map;
            }, {}),
          ),
        );
      }
    } catch {
      setTodayTasks([]);
    } finally {
      if (!silent) {
        setTasksLoading(false);
      }
    }
  }, [isTeamLeader, user]);

  const loadDashboardShifts = useCallback(async () => {
    if (!isCeoAdminUser(user)) return;
    setShiftsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const supabase = getSupabase();
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = `${today}T00:00:00.000Z`;
        const endOfDay = `${today}T23:59:59.999Z`;

        const { data: rawSessions, error: sessionErr } = await supabase
          .from('clock_sessions')
          .select('*')
          .gte('clock_in', startOfDay)
          .lte('clock_in', endOfDay)
          .order('clock_in', { ascending: true });

        if (sessionErr) throw sessionErr;

        const { data: rawProfiles } = await supabase
          .from('employee_profiles')
          .select('id, role, dept');

        const nonCeoProfiles = (rawProfiles || []).filter(p => !isCeoAdminUser({ role: p.role }));
        setTotalEmployees(nonCeoProfiles.length);

        const profileMap = {};
        nonCeoProfiles.forEach(p => {
          profileMap[p.id] = p;
        });

        if (rawSessions && rawSessions.length > 0) {
          const ids = rawSessions.map(s => s.id);
          const { data: rawSegments, error: segmentErr } = await supabase
            .from('clock_session_segments')
            .select('*')
            .in('session_id', ids)
            .order('started_at', { ascending: true });

          if (segmentErr) throw segmentErr;

          const mapped = rawSessions
            .filter(session => profileMap[session.employee_id] !== undefined)
            .map(session => {
              const profile = profileMap[session.employee_id];
              return {
                ...session,
                employee_dept: normalizeDepartmentName(profile.dept),
                segments: (rawSegments || []).filter(seg => seg.session_id === session.id)
              };
            });
          setShiftSessions(mapped);
        } else {
          setShiftSessions([]);
        }
      } else {
        // Mock team sessions for offline CEO view
        setShiftSessions([
          {
            id: 'mock-1',
            employee_name: 'Shubham',
            employee_dept: 'Development',
            status: 'active',
            segments: [{ kind: 'working', started_at: Date.now() - 3.5 * 3600 * 1000, ended_at: null }]
          },
          {
            id: 'mock-2',
            employee_name: 'Lakhwinder',
            employee_dept: 'Development',
            status: 'active',
            segments: [{ kind: 'working', started_at: Date.now() - 3.3 * 3600 * 1000, ended_at: null }]
          },
          {
            id: 'mock-3',
            employee_name: 'Anurag Sharma',
            employee_dept: 'Digital Marketing',
            status: 'active',
            segments: [{ kind: 'working', started_at: Date.now() - 3.1 * 3600 * 1000, ended_at: null }]
          }
        ]);
        setTotalEmployees(10);
      }
    } catch (e) {
      console.error('Error loading dashboard shifts:', e);
      setShiftSessions([]);
    } finally {
      setShiftsLoading(false);
    }
  }, [user]);

  const loadRecentLeaves = useCallback(async () => {
    if (!isReviewerUser(user)) return;
    setLeavesLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await getSupabase()
          .from('leave_requests')
          .select('*')
          .ilike('reporting_officer', user?.name || '')
          .eq('status', 'Pending')
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setRecentLeaves(data || []);
      } else {
        // Mock leaves for offline/testing review
        setRecentLeaves([
          {
            id: 'leave-1',
            employee_name: 'Kartik',
            leave_type: 'Sick Leave',
            start_date: '2026-06-26',
            end_date: '2026-06-27',
            reason: 'Fever and cold',
            status: 'Pending',
            days: 2,
          },
          {
            id: 'leave-2',
            employee_name: 'Saravjeet Singh',
            leave_type: 'Casual Leave',
            start_date: '2026-06-30',
            end_date: '2026-06-30',
            reason: 'Personal urgent work',
            status: 'Pending',
            days: 1,
          }
        ]);
      }
    } catch (e) {
      console.error('Error fetching dashboard leaves:', e);
      setRecentLeaves([]);
    } finally {
      setLeavesLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      loadTodayTasks();
      if (isCeoAdminUser(user)) {
        loadDashboardShifts();
      }
      if (isReviewerUser(user)) {
        loadRecentLeaves();
      }
      syncSupabaseRealtimeAuth().catch(() => {});

      return () => {
        active = false;
      };
    }, [loadTodayTasks, loadDashboardShifts, loadRecentLeaves, user]),
  );

  const ceoStats = useMemo(() => {
    let working = 0;
    let onBreak = 0;
    let idle = 0;
    let totalWorkMs = 0;
    const uniquePresent = new Set();

    shiftSessions.forEach(session => {
      uniquePresent.add(session.employee_id);
      if (session.status === 'active') {
        const lastSeg = session.segments && session.segments[session.segments.length - 1];
        if (lastSeg && !lastSeg.ended_at && lastSeg.kind === 'idle') {
          idle += 1;
        } else {
          working += 1;
        }
      } else if (session.status === 'paused') {
        onBreak += 1;
      }

      (session.segments || []).forEach(seg => {
        if (seg.kind === 'working') {
          const start = new Date(seg.started_at).getTime();
          const end = seg.ended_at ? new Date(seg.ended_at).getTime() : Date.now();
          totalWorkMs += (end - start);
        }
      });
    });

    return {
      working,
      onBreak,
      idle,
      present: uniquePresent.size,
      workTimeStr: formatDuration(totalWorkMs),
    };
  }, [shiftSessions]);



  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    const refresh = () => {
      loadTodayTasks({ silent: true });
    };

    const unsubscribeTasks = isTeamLeader
      ? subscribeToAllProjectTasksChanges(refresh)
      : subscribeToAssigneeProjectTasksChanges(user.id, refresh);
    const unsubscribeProjects = subscribeToProjectsChanges(refresh);

    return () => {
      unsubscribeTasks();
      unsubscribeProjects();
    };
  }, [isTeamLeader, loadTodayTasks, user?.id]);

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
    if (isTeamLeader) {
      return {
        done: 0,
        total: todayTasks.length,
        reviewCount: todayTasks.length,
      };
    }

    const done = todayTasks.filter(task => task.status === TASK_FILTER_DONE).length;

    return {
      done,
      total: todayTasks.length,
      reviewCount: 0,
    };
  }, [isTeamLeader, todayTasks]);

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
    if (task.taskDate) {
      parts.push(`Task ${formatTaskDate(task.taskDate)}`);
    }
    if (task.dueDate) {
      parts.push(`${DASHBOARD_TASK_DUE_LABEL} ${formatTaskDate(task.dueDate)}`);
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
            {/* {DASHBOARD_LIVE_SUFFIX} */}
          </Text>

          {isCeoAdminUser(user) && (
            /* CEO Summary Grid */
            <View style={styles.ceoOverviewGrid}>
              <TouchableOpacity style={styles.ceoStatCard} onPress={() => navigation.navigate(MAIN_ROUTES.SHIFT_TRACKER, { filter: 'active' })}>
                <View style={styles.ceoStatHeader}>
                  <Icon name="users" size={wp(4.2)} color="#3DDC84" />
                  <Text style={styles.ceoStatLabel}>Active Staff</Text>
                </View>
                <Text style={styles.ceoStatValue}>
                  {shiftsLoading ? '--' : `${ceoStats.working} / ${ceoStats.present}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.ceoStatCard} onPress={() => navigation.navigate(MAIN_ROUTES.SHIFT_TRACKER, { filter: 'paused' })}>
                <View style={styles.ceoStatHeader}>
                  <Icon name="coffee" size={wp(4.2)} color="#F5C542" />
                  <Text style={styles.ceoStatLabel}>On Break</Text>
                </View>
                <Text style={styles.ceoStatValue}>
                  {shiftsLoading ? '--' : `${ceoStats.onBreak}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.ceoStatCard} onPress={() => navigation.navigate(MAIN_ROUTES.SHIFT_TRACKER, { filter: 'all' })}>
                <View style={styles.ceoStatHeader}>
                  <Icon name="zap" size={wp(4.2)} color="#3498DB" />
                  <Text style={styles.ceoStatLabel}>Team Work Hours</Text>
                </View>
                <Text style={styles.ceoStatValue}>
                  {shiftsLoading ? '--' : ceoStats.workTimeStr}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.ceoStatCard} onPress={() => navigation.navigate(MAIN_ROUTES.APPLY_LEAVE)}>
                <View style={styles.ceoStatHeader}>
                  <Icon name="calendar" size={wp(4.2)} color={PURPLE} />
                  <Text style={styles.ceoStatLabel}>Pending Leaves</Text>
                </View>
                <Text style={styles.ceoStatValue}>
                  {leavesLoading ? '--' : `${recentLeaves.length}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.ceoStatCard} onPress={() => navigation.navigate(MAIN_ROUTES.SHIFT_TRACKER, { filter: 'idle' })}>
                <View style={styles.ceoStatHeader}>
                  <Icon name="clock" size={wp(4.2)} color="#F85149" />
                  <Text style={styles.ceoStatLabel}>Idle</Text>
                </View>
                <Text style={styles.ceoStatValue}>
                  {shiftsLoading ? '--' : `${ceoStats.idle}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.ceoStatCard} onPress={() => navigation.navigate(MAIN_ROUTES.SHIFT_TRACKER, { filter: 'absent' })}>
                <View style={styles.ceoStatHeader}>
                  <Icon name="user-x" size={wp(4.2)} color="#E85D5D" />
                  <Text style={styles.ceoStatLabel}>Absent Today</Text>
                </View>
                <Text style={styles.ceoStatValue}>
                  {shiftsLoading ? '--' : `${Math.max(0, totalEmployees - ceoStats.present)} / ${totalEmployees}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* <View style={styles.clockCard}>
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
          </View> */}

          {isCheckingLocation ? (
            <Text style={styles.locationHint}>{CHECKING_LOCATION_TEXT}</Text>
          ) : null}

          {!isCeoAdminUser(user) && (
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
                  <Text style={styles.statLabel}>
                    {isTeamLeader ? DASHBOARD_TL_REVIEW_LABEL : TASKS_DONE_LABEL}
                  </Text>
                </View>
                <Text style={styles.statValue}>
                  {statsLoading
                    ? '--'
                    : isTeamLeader
                      ? `${taskStats.reviewCount}`
                      : `${taskStats.done}/${taskStats.total}`}
                </Text>
              </View>
            </View>
          )}

          {isCeoAdminUser(user) ? (
            /* Shift Tracker Widget for CEO */
            <TouchableOpacity
              style={styles.sectionCard}
              onPress={() => navigation.navigate(MAIN_ROUTES.SHIFT_TRACKER)}
              activeOpacity={0.85}>
              <Text style={styles.sectionTitle}>Shift Tracker →</Text>
              <Text style={styles.sectionSubtitle}>Today's active shifts</Text>
              {shiftsLoading ? (
                <ActivityIndicator size="small" color={PURPLE} style={styles.loaderSpacing} />
              ) : shiftSessions.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No active shifts logged today.</Text>
                </View>
              ) : (
                <View style={styles.shiftWidgetList}>
                  {shiftSessions.slice(0, 3).map(session => {
                    let workMs = 0;
                    (session.segments || []).forEach(seg => {
                      if (seg.kind === 'working') {
                        const start = new Date(seg.started_at).getTime();
                        const end = seg.ended_at ? new Date(seg.ended_at).getTime() : Date.now();
                        workMs += (end - start);
                      }
                    });
                    
                    let statusDotColor = '#8B949E'; // Gray (Offline)
                    let statusText = 'Offline';

                    if (session.status === 'active') {
                      const lastSeg = session.segments && session.segments[session.segments.length - 1];
                      if (lastSeg && !lastSeg.ended_at) {
                        if (lastSeg.kind === 'idle') {
                          statusDotColor = '#F85149'; // Red (Not at desk)
                          const idleMins = Math.floor((Date.now() - new Date(lastSeg.started_at).getTime()) / 60000);
                          statusText = `Not at desk for ${idleMins}m`;
                        } else {
                          statusDotColor = '#3498DB'; // Blue (Clocked in)
                          statusText = 'Clocked in';
                        }
                      } else {
                        statusDotColor = '#3498DB';
                        statusText = 'Clocked in';
                      }
                    } else if (session.status === 'paused') {
                      const lastSeg = session.segments && session.segments[session.segments.length - 1];
                      if (lastSeg && !lastSeg.ended_at) {
                        if (lastSeg.label && lastSeg.label.toLowerCase().includes('meeting')) {
                          statusDotColor = '#9B59B6'; // Purple (Meeting)
                          statusText = 'Meeting';
                        } else {
                          statusDotColor = '#F5C542'; // Yellow (On Break)
                          statusText = `On Break: ${lastSeg.label}`;
                        }
                      } else {
                        statusDotColor = '#F5C542';
                        statusText = 'On Break';
                      }
                    }

                    return (
                      <View key={session.id} style={styles.shiftWidgetRow}>
                        <UserAvatar
                          name={session.employee_name}
                          userId={session.employee_id}
                          size={wp(10.5)}
                        />

                        <View style={styles.employeeMeta}>
                          <Text style={styles.employeeName} numberOfLines={1}>
                            {session.employee_name}
                          </Text>
                          <Text style={styles.employeeDept} numberOfLines={1}>
                            {session.employee_dept || 'Digital Marketing'}
                          </Text>
                          <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
                            <Text style={styles.statusLabel} numberOfLines={1}>
                              {statusText}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.barWrapper}>
                          {renderTimelineBar(session.segments)}
                          <View style={styles.rowTimeLabels}>
                            <Text style={styles.rowTimeText}>
                              {formatTimeOfDay(session.clock_in)}
                            </Text>
                            <Text style={styles.rowTimeText}>
                              {session.clock_out ? formatTimeOfDay(session.clock_out) : 'Active'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.productivityWrapper}>
                          <Text style={styles.workingHoursValue}>
                            {session.status === 'offline' || workMs === 0 ? '-' : formatDuration(workMs)}
                          </Text>
                          <Text style={styles.prodLabel}>Work Time</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          ) : (
            /* Today's Tasks Card for Employee & Manager */
            <TouchableOpacity
              style={styles.sectionCard}
              onPress={() => navigation.navigate(MAIN_ROUTES.PROJECTS_WORK)}
              activeOpacity={0.85}>
              <Text style={styles.sectionTitle}>{MY_TASKS_TITLE} →</Text>
              <Text style={styles.sectionSubtitle}>
                {isTeamLeader ? DASHBOARD_TL_TASKS_SUBTITLE : MY_TASKS_TODAY_LABEL}
              </Text>
              {tasksLoading ? (
                <ActivityIndicator size="small" color={PURPLE} style={styles.tasksLoader} />
              ) : todayTasks.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    {isTeamLeader ? MY_TASKS_TL_EMPTY : MY_TASKS_EMPTY}
                  </Text>
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
                          {isTeamLeader && task.assignee
                            ? ` · ${TASK_ASSIGNED_TO_LABEL}: ${task.assignee}`
                            : ''}
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
          )}

          {!isCeoAdminUser(user) && (
            /* Weekly Hours (Hidden for CEO, visible for Manager & Employee) */
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
          )}

          {isReviewerUser(user) && (
            /* Pending Leave Requests Widget (For CEO & Manager) */
            <TouchableOpacity
              style={styles.sectionCard}
              onPress={() => navigation.navigate(MAIN_ROUTES.APPLY_LEAVE)}
              activeOpacity={0.85}>
              <Text style={styles.sectionTitle}>Leave Applications →</Text>
              <Text style={styles.sectionSubtitle}>Pending approval requests</Text>
              
              {leavesLoading ? (
                <ActivityIndicator size="small" color={PURPLE} style={styles.tasksLoader} />
              ) : recentLeaves.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No pending leave requests.</Text>
                </View>
              ) : (
                <View style={styles.leaveList}>
                  {recentLeaves.map(leave => (
                    <TouchableOpacity
                      key={leave.id}
                      style={styles.leaveRow}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate(MAIN_ROUTES.APPLY_LEAVE)}>
                      <View style={styles.leaveRowLeft}>
                        <View style={styles.leaveHeaderRow}>
                          <Text style={styles.leaveEmployeeName}>{leave.employee_name}</Text>
                          <View style={styles.leaveStatusBadge}>
                            <Text style={styles.leaveStatusText}>Pending</Text>
                          </View>
                        </View>
                        <Text style={styles.leaveMeta}>
                          {leave.leave_type} · {leave.days} day{leave.days > 1 ? 's' : ''}
                        </Text>
                        <Text style={styles.leaveDuration}>
                          {new Date(leave.start_date).toLocaleDateString([], { day: '2-digit', month: 'short' })} → {new Date(leave.end_date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                        </Text>
                        {leave.reason ? (
                          <Text style={styles.leaveReason} numberOfLines={1}>
                            "{leave.reason}"
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          )}
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
  
  // CEO & Manager Widgets Styles
  ceoOverviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: wp(3.2),
    marginBottom: CARD_GAP,
  },
  ceoStatCard: {
    width: wp(43.2),
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    minHeight: hp(10),
    justifyContent: 'space-between',
  },
  ceoStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacings.small,
  },
  ceoStatLabel: {
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
    fontWeight: '500',
  },
  ceoStatValue: {
    fontSize: wp(6),
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
    marginTop: hp(1),
  },
  loaderSpacing: {
    marginVertical: hp(2),
  },
  shiftWidgetList: {
    gap: hp(1.2),
  },
  shiftWidgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(3.5),
  },
  employeeMeta: {
    width: wp(21),
    paddingLeft: wp(2),
    gap: hp(0.3),
  },
  employeeName: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  employeeDept: {
    fontSize: wp(2.7),
    color: darkTextSecondaryColor,
    opacity: 0.9,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
    marginTop: hp(0.2),
  },
  statusDot: {
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(0.9),
  },
  statusLabel: {
    fontSize: wp(2.8),
    color: darkTextSecondaryColor,
    flex: 1,
  },
  barWrapper: {
    flex: 1,
    paddingHorizontal: wp(1),
    gap: hp(0.5),
  },
  rowTimeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(0.5),
  },
  rowTimeText: {
    fontSize: wp(2.1),
    color: darkTextSecondaryColor,
    opacity: 0.8,
  },
  productivityWrapper: {
    width: wp(18),
    alignItems: 'flex-end',
    gap: hp(0.3),
  },
  workingHoursValue: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: '#3498DB',
  },
  prodLabel: {
    fontSize: wp(2.3),
    color: darkTextSecondaryColor,
  },
  timelineBarPlaceholder: {
    height: hp(1.8),
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: wp(1),
  },
  timelineContainer: {
    height: hp(2.2),
    backgroundColor: '#21262D',
    borderRadius: wp(1.5),
    borderWidth: 1,
    borderColor: '#30363D',
    overflow: 'hidden',
    position: 'relative',
  },
  gridline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  segmentBlock: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: wp(0.4),
  },
  leaveList: {
    gap: hp(1.2),
  },
  leaveRow: {
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
  },
  leaveRowLeft: {
    gap: hp(0.3),
  },
  leaveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveEmployeeName: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  leaveStatusBadge: {
    backgroundColor: 'rgba(245, 197, 66, 0.15)',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: wp(1),
  },
  leaveStatusText: {
    fontSize: wp(2.4),
    color: '#F5C542',
    fontWeight: '600',
  },
  leaveMeta: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  leaveDuration: {
    fontSize: wp(2.5),
    color: darkTextSecondaryColor,
    opacity: 0.8,
  },
  leaveReason: {
    ...style.fontSizeSmall,
    color: PURPLE,
    fontStyle: 'italic',
    marginTop: hp(0.2),
  },
});
