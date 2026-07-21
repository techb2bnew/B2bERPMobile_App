import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
  whiteColor,
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
const SHIFT_START_HOUR = 4; // 04:00 AM
const SHIFT_END_HOUR = 27; // 03:00 AM next day
const TOTAL_SHIFT_MS = (SHIFT_END_HOUR - SHIFT_START_HOUR) * 60 * 60 * 1000;

const MEETING_COLOR = '#9B59B6';
const WORKING_COLOR = '#3498DB';
const BREAK_COLOR = '#F5C542';
const IDLE_COLOR = '#F85149';

const isMeetingSegment = (kind, label = '') => {
  const kindNorm = String(kind || '').toLowerCase();
  const labelNorm = String(label || '').toLowerCase();
  return (
    kindNorm === 'meeting' ||
    (kindNorm === 'break' && labelNorm.includes('meeting'))
  );
};

const getSegmentColor = (kind, label = '') => {
  if (isMeetingSegment(kind, label)) {
    return MEETING_COLOR;
  }
  switch (String(kind || '').toLowerCase()) {
    case 'idle':
      return IDLE_COLOR;
    case 'break':
      return BREAK_COLOR;
    case 'working':
      return WORKING_COLOR;
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

const renderTimelineBar = (segments, referenceTime = Date.now()) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const shiftStart = startOfDay.getTime() + SHIFT_START_HOUR * 60 * 60 * 1000;

  if (!segments || segments.length === 0) {
    return <View style={styles.timelineBarPlaceholder} />;
  }

  return (
    <View style={styles.timelineContainer}>
      <View style={[styles.gridline, { left: '17.39%' }]} />
      <View style={[styles.gridline, { left: '34.78%' }]} />
      <View style={[styles.gridline, { left: '52.17%' }]} />
      <View style={[styles.gridline, { left: '69.57%' }]} />
      <View style={[styles.gridline, { left: '86.96%' }]} />

      {segments.map((seg, index) => {
        const segStart = new Date(seg.started_at).getTime();
        const segEnd = seg.ended_at ? new Date(seg.ended_at).getTime() : referenceTime;

        const startOffset = Math.max(0, segStart - shiftStart);
        const endOffset = Math.min(TOTAL_SHIFT_MS, segEnd - shiftStart);

        if (startOffset >= TOTAL_SHIFT_MS || endOffset <= 0) {
          return null;
        }

        const leftPercent = (startOffset / TOTAL_SHIFT_MS) * 100;
        const widthPercent = ((endOffset - startOffset) / TOTAL_SHIFT_MS) * 100;

        return (
          <View
            key={seg.id || `seg-${index}`}
            style={[
              styles.segmentBlock,
              {
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                backgroundColor: getSegmentColor(seg.kind, seg.label),
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
  const [myShiftSession, setMyShiftSession] = useState(null);
  const [myShiftLoading, setMyShiftLoading] = useState(false);
  const [timelineTick, setTimelineTick] = useState(0);
  const [showShiftDetailModal, setShowShiftDetailModal] = useState(false);
  const [detailTasks, setDetailTasks] = useState([]);
  const [detailTasksLoading, setDetailTasksLoading] = useState(false);

  // CEO and Manager specific states
  const [shiftSessions, setShiftSessions] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const loadMyDailyShift = useCallback(async () => {
    if (!user?.id || isCeoAdminUser(user)) {
      setMyShiftSession(null);
      return;
    }

    setMyShiftLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setMyShiftSession(null);
        return;
      }

      const dateKey = getLocalDateKey(new Date());
      const startOfDay = `${dateKey}T00:00:00.000Z`;
      const endOfDay = `${dateKey}T23:59:59.999Z`;
      const supabase = getSupabase();

      const { data: rawSessions, error: sessionErr } = await supabase
        .from('clock_sessions')
        .select('*')
        .eq('employee_id', user.id)
        .gte('clock_in', startOfDay)
        .lte('clock_in', endOfDay)
        .order('clock_in', { ascending: false })
        .limit(1);

      if (sessionErr) throw sessionErr;

      const session = rawSessions?.[0] || null;
      if (!session) {
        setMyShiftSession(null);
        return;
      }

      const { data: rawSegments, error: segmentErr } = await supabase
        .from('clock_session_segments')
        .select('*')
        .eq('session_id', session.id)
        .order('started_at', { ascending: true });

      if (segmentErr) throw segmentErr;

      setMyShiftSession({
        ...session,
        segments: rawSegments || [],
      });
    } catch (e) {
      console.error('Error loading my daily shift:', e);
      setMyShiftSession(null);
    } finally {
      setMyShiftLoading(false);
    }
  }, [user]);

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
      } else {
        loadMyDailyShift();
      }
      if (isReviewerUser(user)) {
        loadRecentLeaves();
      }
      syncSupabaseRealtimeAuth().catch(() => {});

      return () => {
        active = false;
      };
    }, [loadTodayTasks, loadDashboardShifts, loadMyDailyShift, loadRecentLeaves, user]),
  );

  useEffect(() => {
    if (isCeoAdminUser(user)) {
      return;
    }
    loadMyDailyShift();
  }, [isClockedIn, isPaused, loadMyDailyShift, user]);

  useEffect(() => {
    if (isCeoAdminUser(user) || !myShiftSession || myShiftSession.clock_out) {
      return undefined;
    }
    const timer = setInterval(() => {
      setTimelineTick(tick => tick + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, [user, myShiftSession]);

  const myShiftInfo = useMemo(() => {
    void timelineTick;
    if (!myShiftSession) {
      return {
        statusText: 'Not clocked in',
        statusColor: '#8B949E',
        activeMs: 0,
        clockInText: '--',
      };
    }

    let workMs = 0;
    (myShiftSession.segments || []).forEach(seg => {
      if (seg.kind !== 'working' && seg.kind !== 'meeting') {
        const isMeetingLabel =
          seg.kind === 'break' &&
          String(seg.label || '')
            .toLowerCase()
            .includes('meeting');
        if (!isMeetingLabel) return;
      }
      const start = new Date(seg.started_at).getTime();
      const end = seg.ended_at ? new Date(seg.ended_at).getTime() : Date.now();
      workMs += Math.max(0, end - start);
    });

    let statusText = 'Offline';
    let statusColor = '#8B949E';
    const lastSeg =
      myShiftSession.segments && myShiftSession.segments[myShiftSession.segments.length - 1];

    if (myShiftSession.status === 'active') {
      if (lastSeg && !lastSeg.ended_at && lastSeg.kind === 'idle') {
        statusText = 'Idle';
        statusColor = '#F85149';
      } else {
        statusText = 'Working';
        statusColor = '#3498DB';
      }
    } else if (myShiftSession.status === 'paused') {
      if (lastSeg?.label && String(lastSeg.label).toLowerCase().includes('meeting')) {
        statusText = 'Meeting';
        statusColor = '#9B59B6';
      } else {
        statusText = 'On Break';
        statusColor = '#F5C542';
      }
    } else if (myShiftSession.clock_out) {
      statusText = 'Completed';
      statusColor = '#3DDC84';
    }

    return {
      statusText,
      statusColor,
      activeMs: workMs,
      clockInText: formatTimeOfDay(myShiftSession.clock_in),
    };
  }, [myShiftSession, timelineTick]);

  const myShiftDetailStats = useMemo(() => {
    void timelineTick;
    let workMs = 0;
    let meetingMs = 0;
    let breakMs = 0;
    let idleMs = 0;
    const now = Date.now();

    (myShiftSession?.segments || []).forEach(seg => {
      const start = new Date(seg.started_at).getTime();
      const end = seg.ended_at ? new Date(seg.ended_at).getTime() : now;
      const duration = Math.max(0, end - start);
      const isMeeting =
        seg.kind === 'meeting' ||
        (seg.kind === 'break' &&
          String(seg.label || '').toLowerCase().includes('meeting'));

      if (seg.kind === 'working') {
        workMs += duration;
      } else if (seg.kind === 'idle') {
        idleMs += duration;
      } else if (isMeeting) {
        meetingMs += duration;
      } else if (seg.kind === 'break') {
        breakMs += duration;
      }
    });

    return {
      workMs,
      meetingMs,
      breakMs,
      idleMs,
      workTime: formatDuration(workMs),
      meetingTime: formatDuration(meetingMs),
      breakTime: formatDuration(breakMs),
      idleTime: formatDuration(idleMs),
    };
  }, [myShiftSession, timelineTick]);

  const myShiftLogItems = useMemo(() => {
    void timelineTick;
    if (!myShiftSession) return [];

    const items = [];
    if (myShiftSession.clock_in) {
      items.push({
        id: 'clock-in',
        timeText: formatTimeOfDay(myShiftSession.clock_in),
        label: 'Logged in',
        duration: null,
        color: '#3DDC84',
        rightText: `→ ${formatTimeOfDay(myShiftSession.clock_in)}`,
      });
    }

    (myShiftSession.segments || []).forEach((seg, index) => {
      const isMeeting =
        seg.kind === 'meeting' ||
        (seg.kind === 'break' &&
          String(seg.label || '').toLowerCase().includes('meeting'));
      let label = seg.label;
      if (!label) {
        if (seg.kind === 'working') label = 'Working';
        else if (seg.kind === 'idle') label = 'System Idle';
        else if (isMeeting) label = 'Meeting';
        else label = seg.kind || 'Activity';
      }

      const start = new Date(seg.started_at).getTime();
      const end = seg.ended_at ? new Date(seg.ended_at).getTime() : Date.now();
      items.push({
        id: seg.id || `seg-${index}`,
        timeText: formatTimeOfDay(seg.started_at),
        label,
        duration: formatDuration(Math.max(0, end - start)),
        color: getSegmentColor(seg.kind, seg.label),
        rightText: seg.ended_at
          ? `→ ${formatTimeOfDay(seg.ended_at)}`
          : 'Ongoing',
      });
    });

    return items;
  }, [myShiftSession, timelineTick]);

  const loadMyShiftDetailTasks = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured) {
      setDetailTasks([]);
      return;
    }

    setDetailTasksLoading(true);
    try {
      const supabase = getSupabase();
      const dateKey = getLocalDateKey(new Date());
      const startOfDayMs = new Date(`${dateKey}T00:00:00`).getTime();
      const endOfDayMs = new Date(`${dateKey}T23:59:59.999`).getTime();
      const nowMs = Date.now();

      const { data: projects } = await supabase.from('projects').select('id, name');
      const projectNameById = {};
      (projects || []).forEach(p => {
        projectNameById[p.id] = p.name;
      });

      const { data: rawTasks } = await supabase.from('project_tasks').select('*');
      const myTasks = (rawTasks || []).filter(task => {
        const ids = [];
        if (Array.isArray(task.assignee_ids)) ids.push(...task.assignee_ids);
        else if (typeof task.assignee_ids === 'string') {
          try {
            const parsed = JSON.parse(task.assignee_ids);
            if (Array.isArray(parsed)) ids.push(...parsed);
          } catch {
            ids.push(...task.assignee_ids.split(',').map(s => s.trim()));
          }
        }
        if (task.assignee_id) ids.push(task.assignee_id);
        return ids.includes(user.id);
      });

      if (myTasks.length === 0) {
        setDetailTasks([]);
        return;
      }

      const taskIds = myTasks.map(t => t.id);
      const { data: history } = await supabase
        .from('task_status_history')
        .select('*')
        .in('task_id', taskIds);

      const tasksWithTime = myTasks
        .map(task => {
          let progressSecs = 0;
          (history || [])
            .filter(h => h.task_id === task.id)
            .forEach(h => {
              const status = String(h.to_status || '').toLowerCase();
              if (status !== 'in-progress' && status !== 'doing') return;
              const entered = new Date(h.entered_at).getTime();
              const exited = h.exited_at
                ? new Date(h.exited_at).getTime()
                : nowMs;
              const overlapStart = Math.max(entered, startOfDayMs);
              const overlapEnd = Math.min(exited, endOfDayMs, nowMs);
              if (overlapStart < overlapEnd) {
                progressSecs += Math.floor((overlapEnd - overlapStart) / 1000);
              }
            });

          return {
            id: task.id,
            title: task.title,
            status: task.status,
            project_name: projectNameById[task.project_id] || 'General',
            progressSecs,
          };
        })
        .filter(
          t =>
            t.progressSecs > 0 ||
            t.status === 'in-progress' ||
            t.status === 'doing',
        )
        .sort((a, b) => b.progressSecs - a.progressSecs);

      setDetailTasks(tasksWithTime);
    } catch (e) {
      console.error('Error loading shift detail tasks:', e);
      setDetailTasks([]);
    } finally {
      setDetailTasksLoading(false);
    }
  }, [user?.id]);

  const openShiftDetailModal = useCallback(() => {
    setShowShiftDetailModal(true);
    loadMyDailyShift();
    loadMyShiftDetailTasks();
  }, [loadMyDailyShift, loadMyShiftDetailTasks]);

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
        const start = new Date(seg.started_at).getTime();
        const end = seg.ended_at ? new Date(seg.ended_at).getTime() : Date.now();
        if (seg.kind === 'working' || isMeetingSegment(seg.kind, seg.label)) {
          totalWorkMs += end - start;
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
    const liveHours = todayDay?.fromSegments
      ? savedHours
      : Math.max(savedHours, elapsedSeconds / 3600);
    const todayHours = liveHours;

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

          {!isCeoAdminUser(user) && (
            <View style={styles.sectionCard}>
              <View style={styles.dailyTimelineHeader}>
                <View style={styles.dailyTimelineTitleWrap}>
                  <Text style={styles.sectionTitle}>Daily Timeline</Text>
                  <Text style={styles.sectionSubtitle}>
                    04:00 AM → 03:00 AM · only your shift
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.dailyTimelineViewBtn}
                  activeOpacity={0.8}
                  onPress={openShiftDetailModal}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="eye" size={wp(3.4)} color="#5DADE2" />
                  <Text style={styles.dailyTimelineViewBtnText}>View</Text>
                  <Icon name="chevron-right" size={wp(3.4)} color="#5DADE2" />
                </TouchableOpacity>
              </View>

              <View style={styles.timelineLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: WORKING_COLOR }]} />
                  <Text style={styles.legendText}>Working</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: MEETING_COLOR }]} />
                  <Text style={styles.legendText}>Meeting</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: BREAK_COLOR }]} />
                  <Text style={styles.legendText}>Break</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: IDLE_COLOR }]} />
                  <Text style={styles.legendText}>Idle</Text>
                </View>
              </View>

              {myShiftLoading ? (
                <ActivityIndicator size="small" color={PURPLE} style={styles.loaderSpacing} />
              ) : (
                <>
                  <View style={styles.myTimelineBarWrap}>
                    <View style={styles.myTimelineBarInner}>
                      {renderTimelineBar(myShiftSession?.segments || [], Date.now())}
                    </View>
                  </View>
                  <View style={styles.myTimelineAxis}>
                    <Text style={styles.myAxisText}>4AM</Text>
                    <Text style={styles.myAxisText}>7AM</Text>
                    <Text style={styles.myAxisText}>10AM</Text>
                    <Text style={styles.myAxisText}>1PM</Text>
                    <Text style={styles.myAxisText}>4PM</Text>
                    <Text style={styles.myAxisText}>7PM</Text>
                    <Text style={styles.myAxisText}>10PM</Text>
                    <Text style={styles.myAxisText}>1AM</Text>
                    <Text style={styles.myAxisText}>3AM</Text>
                  </View>
                  <View style={styles.myShiftMetaRow}>
                    <Text style={styles.myShiftMetaText}>
                      Status:{' '}
                      <Text style={{ color: myShiftInfo.statusColor }}>
                        {myShiftInfo.statusText}
                      </Text>
                    </Text>
                    <Text style={styles.myShiftMetaText}>
                      Clock in: {myShiftInfo.clockInText}
                    </Text>
                    <Text style={styles.myShiftMetaText}>
                      Active: {formatDuration(myShiftInfo.activeMs)}
                    </Text>
                  </View>
                </>
              )}
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
                      const start = new Date(seg.started_at).getTime();
                      const end = seg.ended_at ? new Date(seg.ended_at).getTime() : Date.now();
                      const isMeeting =
                        seg.kind === 'meeting' ||
                        (seg.kind === 'break' &&
                          String(seg.label || '')
                            .toLowerCase()
                            .includes('meeting'));
                      if (seg.kind === 'working' || isMeeting) {
                        workMs += end - start;
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
      <Modal
        visible={showShiftDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowShiftDetailModal(false)}>
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalCard}>
            <View style={styles.detailModalHeader}>
              <View style={styles.detailModalTitleWrap}>
                <Text style={styles.detailModalTitle}>Today's Shift Details</Text>
                <Text style={styles.detailModalSubtitle}>
                  {myShiftInfo.statusText} · In {myShiftInfo.clockInText}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowShiftDetailModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(6)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailModalScroll}>
              <View style={styles.detailMetricsGrid}>
                <View style={[styles.detailMetricCard, { borderColor: 'rgba(52, 152, 219, 0.2)' }]}>
                  <Icon name="activity" size={wp(4.5)} color="#3498DB" />
                  <Text style={styles.detailMetricValue}>{myShiftDetailStats.workTime}</Text>
                  <Text style={styles.detailMetricLabel}>Work Time</Text>
                </View>
                <View style={[styles.detailMetricCard, { borderColor: 'rgba(155, 89, 182, 0.2)' }]}>
                  <Icon name="users" size={wp(4.5)} color="#9B59B6" />
                  <Text style={styles.detailMetricValue}>{myShiftDetailStats.meetingTime}</Text>
                  <Text style={styles.detailMetricLabel}>Meeting</Text>
                </View>
                <View style={[styles.detailMetricCard, { borderColor: 'rgba(245, 197, 66, 0.2)' }]}>
                  <Icon name="coffee" size={wp(4.5)} color="#F5C542" />
                  <Text style={styles.detailMetricValue}>{myShiftDetailStats.breakTime}</Text>
                  <Text style={styles.detailMetricLabel}>Break / Lunch</Text>
                </View>
                <View style={[styles.detailMetricCard, { borderColor: 'rgba(248, 81, 73, 0.2)' }]}>
                  <Icon name="eye-off" size={wp(4.5)} color="#F85149" />
                  <Text style={styles.detailMetricValue}>{myShiftDetailStats.idleTime}</Text>
                  <Text style={styles.detailMetricLabel}>Idle</Text>
                </View>
              </View>

              <Text style={styles.detailSectionTitle}>Daily Timeline</Text>
              <View style={styles.myTimelineBarWrap}>
                <View style={styles.myTimelineBarInner}>
                  {renderTimelineBar(myShiftSession?.segments || [], Date.now())}
                </View>
              </View>
              <View style={styles.myTimelineAxis}>
                <Text style={styles.myAxisText}>4AM</Text>
                <Text style={styles.myAxisText}>7AM</Text>
                <Text style={styles.myAxisText}>10AM</Text>
                <Text style={styles.myAxisText}>1PM</Text>
                <Text style={styles.myAxisText}>4PM</Text>
                <Text style={styles.myAxisText}>7PM</Text>
                <Text style={styles.myAxisText}>10PM</Text>
                <Text style={styles.myAxisText}>1AM</Text>
                <Text style={styles.myAxisText}>3AM</Text>
              </View>

              <Text style={styles.detailSectionTitle}>Tasks Worked Today</Text>
              {detailTasksLoading ? (
                <ActivityIndicator size="small" color={PURPLE} style={styles.loaderSpacing} />
              ) : detailTasks.length === 0 ? (
                <Text style={styles.detailEmptyText}>No task work logged today.</Text>
              ) : (
                detailTasks.map(task => (
                  <View key={task.id} style={styles.detailTaskRow}>
                    <View style={styles.detailTaskLeft}>
                      <Text style={styles.detailTaskTitle} numberOfLines={2}>
                        {task.title}
                      </Text>
                      <Text style={styles.detailTaskMeta}>
                        {task.project_name} · {task.status}
                      </Text>
                    </View>
                    <Text style={styles.detailTaskTime}>
                      {formatDuration(task.progressSecs * 1000)}
                    </Text>
                  </View>
                ))
              )}

              <Text style={styles.detailSectionTitle}>Activity Log</Text>
              {myShiftLogItems.length === 0 ? (
                <Text style={styles.detailEmptyText}>No activity recorded yet today.</Text>
              ) : (
                myShiftLogItems.map(item => (
                  <View key={item.id} style={styles.detailLogRow}>
                    <View style={[styles.detailLogDot, { backgroundColor: item.color }]} />
                    <View style={styles.detailLogContent}>
                      <Text style={styles.detailLogTime}>{item.timeText}</Text>
                      <Text style={styles.detailLogLabel}>
                        {item.label}
                        {item.duration ? ` (${item.duration})` : ''}
                      </Text>
                    </View>
                    <Text style={styles.detailLogRight}>{item.rightText}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  dailyTimelineHeader: {
    marginBottom: hp(1.6),
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: wp(4),
  },
  dailyTimelineTitleWrap: {
    flex: 1,
    gap: hp(0.45),
    paddingRight: wp(2),
  },
  dailyTimelineViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
    marginTop: hp(0.2),
    backgroundColor: 'rgba(52, 152, 219, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.35)',
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.85),
    borderRadius: wp(2),
  },
  dailyTimelineViewBtnText: {
    fontSize: wp(3.1),
    fontWeight: '600',
    color: '#5DADE2',
    letterSpacing: 0.2,
  },
  timelineLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
    marginBottom: hp(1.2),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
  },
  legendDot: {
    width: wp(2.2),
    height: wp(2.2),
    borderRadius: wp(1.1),
  },
  legendText: {
    fontSize: wp(2.8),
    color: darkTextSecondaryColor,
  },
  myTimelineBarWrap: {
    marginBottom: hp(0.8),
  },
  myTimelineBarInner: {
    minHeight: hp(3.2),
    justifyContent: 'center',
  },
  myTimelineAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1.2),
  },
  myAxisText: {
    fontSize: wp(2.2),
    color: darkTextSecondaryColor,
  },
  myShiftMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
  },
  myShiftMetaText: {
    fontSize: wp(3),
    color: darkTextSecondaryColor,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  detailModalCard: {
    backgroundColor: darkSurfaceColor,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    maxHeight: hp(88),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingBottom: hp(2),
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  detailModalTitleWrap: {
    flex: 1,
    paddingRight: wp(3),
  },
  detailModalTitle: {
    ...style.fontSizeLarge,
    ...style.fontWeightBold,
    color: whiteColor,
  },
  detailModalSubtitle: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.3),
  },
  detailModalScroll: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(4),
  },
  detailMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: hp(1.2),
    marginBottom: hp(2),
  },
  detailMetricCard: {
    width: '48%',
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(3),
    borderWidth: 1,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(3),
    gap: hp(0.4),
  },
  detailMetricValue: {
    ...style.fontSizeNormal,
    ...style.fontWeightBold,
    color: whiteColor,
  },
  detailMetricLabel: {
    fontSize: wp(2.8),
    color: darkTextSecondaryColor,
  },
  detailSectionTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: whiteColor,
    marginBottom: hp(1),
    marginTop: hp(0.5),
  },
  detailEmptyText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(1.5),
  },
  detailTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    marginBottom: hp(1),
  },
  detailTaskLeft: {
    flex: 1,
    paddingRight: wp(2),
  },
  detailTaskTitle: {
    ...style.fontSizeSmall2x,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  detailTaskMeta: {
    fontSize: wp(2.7),
    color: darkTextSecondaryColor,
    marginTop: hp(0.3),
  },
  detailTaskTime: {
    ...style.fontSizeSmall2x,
    color: '#3498DB',
    ...style.fontWeightMedium,
  },
  detailLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: hp(1.2),
  },
  detailLogDot: {
    width: wp(2.4),
    height: wp(2.4),
    borderRadius: wp(1.2),
    marginTop: hp(0.5),
    marginRight: wp(2.5),
  },
  detailLogContent: {
    flex: 1,
  },
  detailLogTime: {
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
  },
  detailLogLabel: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    marginTop: hp(0.2),
  },
  detailLogRight: {
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
    marginLeft: wp(2),
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
