import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AppHeader from '../../components/AppHeader';
import UserAvatar from '../../components/UserAvatar';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { createRealtimeChannelName, getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';
import { fetchTasksForAssignee } from '../../services/projectTasksService';
import { formatTaskDate, normalizeTaskDateKey } from '../../utils/projectUtils';
import { Calendar } from 'react-native-calendars';
import { getLocalDateKey } from '../../services/clockSessionsService';
import { normalizeDepartmentName } from '../../services/hrmsService';
import { isCeoAdminUser } from '../../constants/roles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PURPLE = '#9B59B6';
const SHIFT_START_HOUR = 4;  // 04:00 AM
const SHIFT_END_HOUR = 27;   // 03:00 AM next day (24 + 3)
const TOTAL_SHIFT_MS = (SHIFT_END_HOUR - SHIFT_START_HOUR) * 60 * 60 * 1000;

const MOCK_SESSIONS = [
  {
    id: 'session-1',
    employee_id: 'emp-1',
    employee_name: 'Kartik',
    employee_dept: 'Digital Marketing',
    clock_in: new Date().setHours(10, 0, 0, 0),
    clock_out: null,
    status: 'active',
    segments: [
      { id: 'seg-1-1', kind: 'working', label: 'Office attendance', started_at: new Date().setHours(10, 0, 0, 0), ended_at: new Date().setHours(11, 28, 0, 0) },
      { id: 'seg-1-2', kind: 'idle', label: 'System Idle', started_at: new Date().setHours(11, 28, 0, 0), ended_at: new Date().setHours(11, 40, 0, 0) },
      { id: 'seg-1-3', kind: 'working', label: 'Office attendance', started_at: new Date().setHours(11, 40, 0, 0), ended_at: null },
    ]
  },
  {
    id: 'session-2',
    employee_id: 'emp-2',
    employee_name: 'Abhishek Thakur',
    employee_dept: 'Digital Marketing',
    clock_in: new Date().setHours(10, 15, 0, 0),
    clock_out: null,
    status: 'paused',
    segments: [
      { id: 'seg-2-1', kind: 'working', label: 'Office attendance', started_at: new Date().setHours(10, 15, 0, 0), ended_at: new Date().setHours(11, 22, 0, 0) },
      { id: 'seg-2-2', kind: 'break', label: 'Personal / Urgent work', started_at: new Date().setHours(11, 22, 0, 0), ended_at: null },
    ]
  },
  {
    id: 'session-3',
    employee_id: 'emp-3',
    employee_name: 'Saravjeet Singh',
    employee_dept: 'Digital Marketing',
    clock_in: new Date().setHours(10, 30, 0, 0),
    clock_out: null,
    status: 'active',
    segments: [
      { id: 'seg-3-1', kind: 'working', label: 'Office attendance', started_at: new Date().setHours(10, 30, 0, 0), ended_at: null },
    ]
  },
  {
    id: 'session-4',
    employee_id: 'emp-4',
    employee_name: 'Anila Iqbal',
    employee_dept: 'Development',
    clock_in: new Date().setHours(9, 45, 0, 0),
    clock_out: null,
    status: 'active',
    segments: [
      { id: 'seg-4-1', kind: 'working', label: 'Office attendance', started_at: new Date().setHours(9, 45, 0, 0), ended_at: null },
    ]
  },
  {
    id: 'session-5',
    employee_id: 'emp-5',
    employee_name: 'Rajnish Kaur',
    employee_dept: 'Digital Marketing',
    clock_in: new Date().setHours(10, 10, 0, 0),
    clock_out: null,
    status: 'active',
    segments: [
      { id: 'seg-5-1', kind: 'working', label: 'Office attendance', started_at: new Date().setHours(10, 10, 0, 0), ended_at: new Date().setHours(12, 15, 0, 0) },
      { id: 'seg-5-2', kind: 'idle', label: 'System Idle', started_at: new Date().setHours(12, 15, 0, 0), ended_at: new Date().setHours(12, 35, 0, 0) },
      { id: 'seg-5-3', kind: 'working', label: 'Office attendance', started_at: new Date().setHours(12, 35, 0, 0), ended_at: null },
    ]
  }
];

const MOCK_EMPLOYEES = [
  { id: 'emp-1', name: 'Kartik', dept: 'Digital Marketing' },
  { id: 'emp-2', name: 'Abhishek Thakur', dept: 'Digital Marketing' },
  { id: 'emp-3', name: 'Saravjeet Singh', dept: 'Digital Marketing' },
  { id: 'emp-4', name: 'Anila Iqbal', dept: 'Development' },
  { id: 'emp-5', name: 'Rajnish Kaur', dept: 'Digital Marketing' },
  { id: 'emp-6', name: 'Gurbaksh Singh', dept: 'Development' },
  { id: 'emp-7', name: 'Saurabh Bhatia', dept: 'Management' },
];

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

const formatTimeOfDay = (timestamp) => {
  if (!timestamp) return 'Active';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getDurationString = (startedAt, endedAt, referenceTime = Date.now()) => {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : referenceTime;
  const diffMinutes = Math.floor((end - start) / 60000);

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
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

const formatSecsToMinHr = (s) => {
  if (!s || s <= 0) return '0m';
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
};

const getStatusBgColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'in-progress' || s === 'doing') return 'rgba(52, 152, 219, 0.15)';
  if (s === 'ready-for-testing' || s === 'testing' || s === 'qa') return 'rgba(155, 89, 182, 0.15)';
  if (s === 'done') return 'rgba(61, 220, 132, 0.15)';
  return 'rgba(255, 255, 255, 0.05)';
};

const getStatusTextColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'in-progress' || s === 'doing') return '#3498DB';
  if (s === 'ready-for-testing' || s === 'testing' || s === 'qa') return '#9B59B6';
  if (s === 'done') return '#3DDC84';
  return '#8B949E';
};

const getStatusLabel = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'in-progress' || s === 'doing') return 'In Progress';
  if (s === 'ready-for-testing' || s === 'testing' || s === 'qa') return 'QA';
  if (s === 'done') return 'Done';
  return 'To Do';
};

const getPriorityColor = (priority) => {
  const p = (priority || '').toLowerCase();
  if (p === 'high' || p === 'urgent') return '#F85149';
  if (p === 'medium') return '#F5C542';
  return '#8B949E';
};

const buildTaskDatesLine = task => {
  const taskDate = normalizeTaskDateKey(task?.task_date ?? task?.taskDate);
  const dueDate = normalizeTaskDateKey(task?.due ?? task?.dueDate);
  const parts = [];

  if (taskDate) {
    parts.push(`Task: ${formatTaskDate(taskDate)}`);
  }
  if (dueDate) {
    parts.push(`Due: ${formatTaskDate(dueDate)}`);
  }

  return parts.join('   ·   ');
};

const isTaskInProgressStatus = status => {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'in-progress' || normalized === 'doing';
};

const isWorkingDayDate = date => {
  const day = date.getDay();
  return day !== 0 && day !== 6;
};

const getRecentWorkingDayKeys = (count = 5, fromDate = new Date()) => {
  const keys = [];
  const cursor = new Date(fromDate);

  while (keys.length < count) {
    if (isWorkingDayDate(cursor)) {
      keys.push(getLocalDateKey(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return keys;
};

const getTaskRelevantDateKey = task =>
  normalizeTaskDateKey(task?.task_date ?? task?.taskDate)
  || normalizeTaskDateKey(String(task?.updated_at || '').slice(0, 10))
  || normalizeTaskDateKey(String(task?.created_at || '').slice(0, 10));

const isTaskInRecentWorkingDays = (task, workingDayKeys) => {
  const dateKey = getTaskRelevantDateKey(task);
  if (!dateKey) {
    return false;
  }
  return workingDayKeys.includes(dateKey);
};

const splitEmployeeTasksForTracker = (tasks, workingDayKeys) => {
  const inProgressTasks = [];
  const recentOtherTasks = [];

  (tasks || []).forEach(task => {
    if (isTaskInProgressStatus(task.status)) {
      inProgressTasks.push(task);
      return;
    }

    if (isTaskInRecentWorkingDays(task, workingDayKeys)) {
      recentOtherTasks.push(task);
    }
  });

  recentOtherTasks.sort((a, b) => getTaskRelevantDateKey(b).localeCompare(getTaskRelevantDateKey(a)));

  return { inProgressTasks, recentOtherTasks };
};

const adjustTimestampToDate = (timestamp, targetDate) => {
  if (!timestamp) return null;
  const d = new Date(timestamp);
  const target = new Date(targetDate);
  target.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  return target.getTime();
};

const formatSelectedDateDisplay = (date) => {
  const todayKey = getLocalDateKey(new Date());
  const dateKey = getLocalDateKey(date);

  if (dateKey === todayKey) {
    return 'Today';
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  if (dateKey === yesterdayKey) {
    return 'Yesterday';
  }

  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

const getMockTasksForDate = (date) => {
  const dateKey = getLocalDateKey(date);
  const todayKey = getLocalDateKey(new Date());

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  if (dateKey === todayKey) {
    return {
      'emp-1': [
        { id: 'mt-1', title: 'Design premium task details tab', project_name: 'ERP Mobile App', status: 'in-progress', todoSecs: 0, progressSecs: 8100, testingSecs: 0, doneSecs: 0, totalSecs: 8100 },
        { id: 'mt-2', title: 'Setup database triggers for status log', project_name: 'B2B Core Web', status: 'to-do', todoSecs: 10800, progressSecs: 0, testingSecs: 0, doneSecs: 0, totalSecs: 10800 },
      ],
      'emp-2': [
        { id: 'mt-3', title: 'QA testing of clock session mappings', project_name: 'QA Dashboard', status: 'in-progress', todoSecs: 0, progressSecs: 11400, testingSecs: 0, doneSecs: 0, totalSecs: 11400 },
      ],
      'emp-3': [
        { id: 'mt-4', title: 'Fix Login Issue', project_name: 'JOP Electric', status: 'in-progress', todoSecs: 0, progressSecs: 12000, testingSecs: 0, doneSecs: 0, totalSecs: 12000 },
      ],
      'emp-6': [
        { id: 'mt-5', title: 'new UI Modifications in home page as per figma', project_name: 'RPR Logistics', status: 'in-progress', todoSecs: 0, progressSecs: 1440, testingSecs: 0, doneSecs: 0, totalSecs: 1440 },
        { id: 'mt-6', title: 'truck dispatch USA pages and UI changes in home page', project_name: 'B2B Campus', status: 'ready-for-testing', todoSecs: 0, progressSecs: 11580, testingSecs: 1440, doneSecs: 0, totalSecs: 13020 },
      ],
      'emp-7': [
        { id: 'mt-7', title: 'Test the B2B campus site', project_name: 'B2B Campus', status: 'to-do', todoSecs: 21240, progressSecs: 10620, testingSecs: 0, doneSecs: 0, totalSecs: 31860 },
      ]
    };
  } else if (dateKey === yesterdayKey) {
    return {
      'emp-1': [
        { id: 'mt-y1', title: 'Setup database triggers for status log', project_name: 'B2B Core Web', status: 'done', todoSecs: 3600, progressSecs: 14400, testingSecs: 0, doneSecs: 10800, totalSecs: 28800 },
        { id: 'mt-y2', title: 'Fix Android navbar alignment issues', project_name: 'ERP Mobile App', status: 'done', todoSecs: 1800, progressSecs: 7200, testingSecs: 0, doneSecs: 0, totalSecs: 9000 },
      ],
      'emp-2': [
        { id: 'mt-y3', title: 'Draft weekly hours aggregate report', project_name: 'HR Analytics', status: 'done', todoSecs: 7200, progressSecs: 18000, testingSecs: 0, doneSecs: 3600, totalSecs: 28800 },
      ],
      'emp-3': [
        { id: 'mt-y4', title: 'set time tracker', project_name: 'Base2Brand Website', status: 'done', todoSecs: 7200, progressSecs: 21600, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
      ],
      'emp-6': [
        { id: 'mt-y5', title: 'Create new truck dispatch USA pages and UI changes in home page', project_name: 'B2B Campus', status: 'done', todoSecs: 0, progressSecs: 16440, testingSecs: 12360, doneSecs: 0, totalSecs: 28800 },
      ],
      'emp-7': [
        { id: 'mt-y6', title: 'Test the B2B campus site', project_name: 'B2B Campus', status: 'done', todoSecs: 0, progressSecs: 28800, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
      ]
    };
  } else {
    return {
      'emp-1': [
        { id: 'mt-o1', title: 'Code Review & Refactoring', project_name: 'ERP Mobile App', status: 'done', todoSecs: 3600, progressSecs: 25200, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
      ],
      'emp-2': [
        { id: 'mt-o2', title: 'Database Optimization', project_name: 'B2B Core Web', status: 'done', todoSecs: 3600, progressSecs: 25200, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
      ],
      'emp-3': [
        { id: 'mt-o3', title: 'API Integration testing', project_name: 'JOP Electric', status: 'done', todoSecs: 3600, progressSecs: 25200, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
      ],
      'emp-6': [
        { id: 'mt-o4', title: 'Initial structure setup', project_name: 'RPR Logistics', status: 'done', todoSecs: 0, progressSecs: 28800, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
      ]
    };
  }
};

const TRACKER_STATUS_FILTERS = [
  { id: 'all', label: 'All', icon: 'users', color: '#9B59B6' },
  { id: 'active', label: 'Active', icon: 'zap', color: '#3DDC84' },
  { id: 'paused', label: 'On Break', icon: 'coffee', color: '#F5C542' },
  { id: 'idle', label: 'Idle', icon: 'clock', color: '#F85149' },
  { id: 'absent', label: 'Absent', icon: 'user-x', color: '#E85D5D' },
];

const getTrackerFilterLabel = filterId =>
  TRACKER_STATUS_FILTERS.find(filter => filter.id === filterId)?.label || 'All';

const ShiftTrackerScreen = () => {
  const route = useRoute();
  const initialFilter = route.params?.filter || 'all';
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState('LIVE_ACTIVITY');
  const [employeeTasks, setEmployeeTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [trackingMode, setTrackingMode] = useState('SHIFT');
  const [trackerFilter, setTrackerFilter] = useState(initialFilter);

  useEffect(() => {
    setTrackerFilter(route.params?.filter || 'all');
  }, [route.params?.filter]);
  const [allTasksByEmployee, setAllTasksByEmployee] = useState({});
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [tick, setTick] = useState(0);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [expandedTaskEmployees, setExpandedTaskEmployees] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [rawTasks, setRawTasks] = useState([]);
  const [rawHistory, setRawHistory] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const selectedEmployeeName = useMemo(() => {
    if (!selectedEmployeeId) return '';
    const emp = employees.find(e => e.id === selectedEmployeeId);
    return emp ? emp.name : '';
  }, [employees, selectedEmployeeId]);

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      depts.add(normalizeDepartmentName(emp.dept));
    });
    return Array.from(depts).sort();
  }, [employees]);

  const scopedSessions = useMemo(() => {
    let result = sessions;

    if (selectedDepartment) {
      result = result.filter(s => s.employee_dept === selectedDepartment);
    }
    if (selectedEmployeeId) {
      result = result.filter(s => s.employee_id === selectedEmployeeId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.employee_name?.toLowerCase().includes(q) ||
        s.employee_dept?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [sessions, selectedDepartment, selectedEmployeeId, searchQuery]);

  const filteredSessions = useMemo(() => {
    let result = scopedSessions;

    if (trackerFilter === 'active') {
      result = result.filter(s => s.status === 'active' && !(s.segments && s.segments[s.segments.length - 1]?.kind === 'idle' && !s.segments[s.segments.length - 1]?.ended_at));
    } else if (trackerFilter === 'paused') {
      result = result.filter(s => s.status === 'paused');
    } else if (trackerFilter === 'idle') {
      result = result.filter(s => s.status === 'active' && s.segments && s.segments[s.segments.length - 1]?.kind === 'idle' && !s.segments[s.segments.length - 1]?.ended_at);
    } else if (trackerFilter === 'absent') {
      result = result.filter(s => s.status === 'offline');
    }

    return result;
  }, [scopedSessions, trackerFilter]);

  useEffect(() => {
    setExpandedTaskEmployees({});
  }, [selectedDate]);

  const recentWorkingDayKeys = useMemo(
    () => getRecentWorkingDayKeys(5, selectedDate),
    [selectedDate],
  );

  const toggleTaskExpand = useCallback((employeeId) => {
    setExpandedTaskEmployees(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId],
    }));
  }, []);

  const renderTaskModeItem = useCallback((task) => {
    const totalSecs = task.totalSecs || 0;
    const isActiveTask = isTaskInProgressStatus(task.status);

    let statusLabel = task.status || 'To Do';
    let statusColor = '#8B949E';
    let statusBg = 'rgba(255, 255, 255, 0.05)';

    if (isActiveTask) {
      statusLabel = 'In Progress';
      statusColor = '#3498DB';
      statusBg = 'rgba(52, 152, 219, 0.15)';
    } else if (task.status === 'ready-for-testing' || task.status === 'testing' || task.status === 'qa') {
      statusLabel = 'QA';
      statusColor = '#9B59B6';
      statusBg = 'rgba(155, 89, 182, 0.15)';
    } else if (task.status === 'done') {
      statusLabel = 'Done';
      statusColor = '#3DDC84';
      statusBg = 'rgba(61, 220, 132, 0.15)';
    }

    const todoStr = formatSecsToMinHr(task.todoSecs);
    const progressStr = formatSecsToMinHr(task.progressSecs);
    const testingStr = formatSecsToMinHr(task.testingSecs);
    const doneStr = formatSecsToMinHr(task.doneSecs);

    const labelParts = [];
    if (task.todoSecs > 0) labelParts.push(`To Do: ${todoStr}`);
    if (task.progressSecs > 0) labelParts.push(`In Progress: ${progressStr}`);
    if (task.testingSecs > 0) labelParts.push(`QA: ${testingStr}`);
    if (task.doneSecs > 0) labelParts.push(`Done: ${doneStr}`);
    const detailsStr = labelParts.join(' • ') || 'To Do: 0m';

    const todoWidth = totalSecs > 0 ? (task.todoSecs / totalSecs) * 100 : 0;
    const progressWidth = totalSecs > 0 ? (task.progressSecs / totalSecs) * 100 : 0;
    const testingWidth = totalSecs > 0 ? (task.testingSecs / totalSecs) * 100 : 0;
    const doneWidth = totalSecs > 0 ? (task.doneSecs / totalSecs) * 100 : 0;
    const hasSpentTime = totalSecs > 0;
    const taskDatesLine = buildTaskDatesLine(task);

    return (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.taskModeItemRow,
          isActiveTask && styles.activeTaskModeItemRow,
        ]}
        onPress={() => setSelectedTaskDetail(task)}
        activeOpacity={0.85}>
        <View style={styles.taskModeItemContent}>
          <View style={styles.taskModeItemTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: wp(1.2) }}>
              {isActiveTask && (
                <Icon name="play" size={wp(3)} color="#3498DB" />
              )}
              <Text style={styles.taskModeItemTitle} numberOfLines={1}>
                {task.title}
              </Text>
            </View>
            <Text style={styles.taskModeItemProject} numberOfLines={1}>
              {task.project_name || task.project}
            </Text>
          </View>
          {taskDatesLine ? (
            <Text style={styles.taskDatesLine} numberOfLines={1}>
              {taskDatesLine}
            </Text>
          ) : null}

          <View style={styles.taskModeProgressBarWrapper}>
            {!hasSpentTime ? (
              <View style={[styles.taskModeBarSegment, { backgroundColor: '#30363D', width: '100%' }]} />
            ) : (
              <View style={styles.taskModeProgressBar}>
                {todoWidth > 0 && (
                  <View style={[styles.taskModeBarSegment, { backgroundColor: '#8B949E', width: `${todoWidth}%` }]}>
                    {todoWidth > 20 && <Text style={styles.taskModeBarText} numberOfLines={1}>{todoStr}</Text>}
                  </View>
                )}
                {progressWidth > 0 && (
                  <View style={[styles.taskModeBarSegment, { backgroundColor: '#3498DB', width: `${progressWidth}%` }]}>
                    {progressWidth > 20 && <Text style={styles.taskModeBarText} numberOfLines={1}>{progressStr}</Text>}
                  </View>
                )}
                {testingWidth > 0 && (
                  <View style={[styles.taskModeBarSegment, { backgroundColor: '#9B59B6', width: `${testingWidth}%` }]}>
                    {testingWidth > 20 && <Text style={styles.taskModeBarText} numberOfLines={1}>{testingStr}</Text>}
                  </View>
                )}
                {doneWidth > 0 && (
                  <View style={[styles.taskModeBarSegment, { backgroundColor: '#3DDC84', width: `${doneWidth}%` }]}>
                    {doneWidth > 20 && <Text style={styles.taskModeBarText} numberOfLines={1}>{doneStr}</Text>}
                  </View>
                )}
              </View>
            )}
          </View>

          <Text style={styles.taskModeItemDetails} numberOfLines={1}>
            {detailsStr}
          </Text>
        </View>

        <View style={[styles.taskModeStatusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.taskModeStatusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const referenceTime = useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    const selectedKey = getLocalDateKey(selectedDate);
    if (selectedKey === todayKey) {
      return Date.now();
    }
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, tick]);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  const sessionStats = useMemo(() => {
    if (!activeSession) return null;
    let workMs = 0;
    let meetingMs = 0;
    let breakMs = 0;
    let idleMs = 0;

    (activeSession.segments || []).forEach(seg => {
      const start = new Date(seg.started_at).getTime();
      const end = seg.ended_at ? new Date(seg.ended_at).getTime() : referenceTime;
      const duration = end - start;

      if (seg.kind === 'working') {
        workMs += duration;
      } else if (seg.kind === 'idle') {
        idleMs += duration;
      } else if (seg.kind === 'meeting') {
        meetingMs += duration;
      } else if (seg.kind === 'break') {
        const isMeeting = seg.label && seg.label.toLowerCase().includes('meeting');
        if (isMeeting) {
          meetingMs += duration;
        } else {
          breakMs += duration;
        }
      }
    });

    return {
      workTime: formatDuration(workMs),
      meetingTime: formatDuration(meetingMs),
      breakTime: formatDuration(breakMs),
      idleTime: formatDuration(idleMs),
      workMs,
      meetingMs,
      breakMs,
      idleMs,
    };
  }, [activeSession, referenceTime]);

  const getArrivalStatus = (clockIn) => {
    if (!clockIn) return { text: 'On Time', color: '#2EA043', bg: 'rgba(46, 160, 67, 0.15)' };
    const date = new Date(clockIn);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    // 10:15 AM
    if (hours > 10 || (hours === 10 && minutes > 15)) {
      return { text: 'Late Start', color: '#F85149', bg: 'rgba(248, 81, 73, 0.15)' };
    }
    return { text: 'On Time', color: '#2EA043', bg: 'rgba(46, 160, 67, 0.15)' };
  };

  const modalInfo = useMemo(() => {
    if (!activeSession) return null;

    let statusDotColor = '#8B949E';
    let statusBadgeText = 'Offline';
    let isAtDesk = false;

    if (activeSession.status === 'active') {
      const lastSeg = activeSession.segments && activeSession.segments[activeSession.segments.length - 1];
      if (lastSeg && !lastSeg.ended_at) {
        if (lastSeg.kind === 'idle') {
          statusDotColor = '#F85149';
          statusBadgeText = 'Working';
          isAtDesk = false;
        } else {
          statusDotColor = '#3DDC84';
          statusBadgeText = 'Working';
          isAtDesk = true;
        }
      } else {
        statusDotColor = '#3DDC84';
        statusBadgeText = 'Working';
        isAtDesk = true;
      }
    } else if (activeSession.status === 'paused') {
      statusDotColor = '#F5C542';
      statusBadgeText = 'On Break';
      isAtDesk = false;
    }

    const arrivalStatus = getArrivalStatus(activeSession.clock_in);

    return {
      statusDotColor,
      statusBadgeText,
      isAtDesk,
      arrivalStatus,
    };
  }, [activeSession]);

  const modalActiveTask = useMemo(() => {
    if (!activeSession) return null;
    const tasks = allTasksByEmployee[activeSession.employee_id] || [];
    return tasks.find(t => t.status === 'in-progress' || t.status === 'doing') || null;
  }, [activeSession, allTasksByEmployee]);

  const selectedTaskDatesLine = useMemo(
    () => (selectedTaskDetail ? buildTaskDatesLine(selectedTaskDetail) : ''),
    [selectedTaskDetail],
  );

  const logItems = useMemo(() => {
    if (!activeSession) return [];

    const items = [];
    items.push({
      type: 'clock_in',
      time: activeSession.clock_in,
      label: 'Logged in',
      dotColor: '#3DDC84',
      isGreen: true,
      timeText: formatTimeOfDay(activeSession.clock_in),
      rightText: `→ ${formatTimeOfDay(activeSession.clock_in)}`,
    });

    (activeSession.segments || []).forEach(seg => {
      let label = seg.label;
      if (!label) {
        if (seg.kind === 'working') label = 'Office attendance';
        else if (seg.kind === 'idle') label = 'System Idle';
        else label = seg.kind;
      }

      let dotColor = getSegmentColor(seg.kind, seg.label);

      items.push({
        type: 'segment',
        time: seg.started_at,
        label: label,
        dotColor: dotColor,
        duration: getDurationString(seg.started_at, seg.ended_at, referenceTime),
        isCurrent: !seg.ended_at,
        timeText: formatTimeOfDay(seg.started_at),
        rightText: seg.ended_at ? `→ ${formatTimeOfDay(seg.ended_at)}` : 'Ongoing',
      });
    });

    return items;
  }, [activeSession, referenceTime]);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySessions, setHistorySessions] = useState([]);

  const loadEmployeeHistory = useCallback(async (employeeId) => {
    if (!employeeId) return;
    setHistoryLoading(true);
    try {
      if (isSupabaseConfigured) {
        // Fetch last 6 sessions for this employee
        const { data: rawPast, error: pastErr } = await getSupabase()
          .from('clock_sessions')
          .select('*')
          .eq('employee_id', employeeId)
          .order('clock_in', { ascending: false })
          .limit(6);

        if (pastErr) throw pastErr;

        if (rawPast && rawPast.length > 0) {
          const ids = rawPast.map(s => s.id);
          const { data: rawSegs, error: segsErr } = await getSupabase()
            .from('clock_session_segments')
            .select('*')
            .in('session_id', ids)
            .order('started_at', { ascending: true });

          if (segsErr) throw segsErr;

          const mapped = rawPast.map(session => {
            return {
              ...session,
              segments: (rawSegs || []).filter(seg => seg.session_id === session.id)
            };
          });
          setHistorySessions(mapped);
        } else {
          setHistorySessions([]);
        }
      } else {
        setHistorySessions([]);
      }
    } catch (e) {
      console.error('Error loading employee history:', e);
      setHistorySessions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadEmployeeTasks = useCallback(async (employeeId, refTime = Date.now()) => {
    if (!employeeId) return;
    setTasksLoading(true);
    try {
      if (isSupabaseConfigured) {
        const supabase = getSupabase();

        // 1. Fetch projects to map names
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name');

        const projectNameById = {};
        (projects || []).forEach(p => {
          projectNameById[p.id] = p.name;
        });

        // 2. Fetch all profiles to map names
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('id, name');

        const employeeNameMap = {};
        (profiles || []).forEach(pr => {
          employeeNameMap[pr.id] = pr.name;
        });

        // 3. Fetch tasks for assignee
        const tasks = await fetchTasksForAssignee(employeeId, {
          projectNameById,
          employeeNameMap,
        });

        if (tasks && tasks.length > 0) {
          const taskIds = tasks.map(t => t.id);

          // 4. Fetch status history
          const { data: history } = await supabase
            .from('task_status_history')
            .select('*')
            .in('task_id', taskIds);

          const timeSpentMap = {};
          (history || []).forEach(h => {
            if (h.to_status === 'in-progress' || h.to_status === 'doing') {
              let secs = h.duration_seconds || 0;
              if (!h.exited_at && h.entered_at) {
                secs += Math.max(0, Math.floor((refTime - new Date(h.entered_at).getTime()) / 1000));
              }
              timeSpentMap[h.task_id] = (timeSpentMap[h.task_id] || 0) + secs;
            }
          });

          const tasksWithTime = tasks.map(t => {
            const secs = timeSpentMap[t.id] || 0;
            return {
              ...t,
              timeSpentSeconds: secs,
              timeSpentStr: secs > 0 ? formatDuration(secs * 1000) : '0m',
            };
          });

          setEmployeeTasks(tasksWithTime);
          setRawTasks(tasks);
          setRawHistory(history || []);
        } else {
          setEmployeeTasks([]);
          setRawTasks([]);
          setRawHistory([]);
        }
      } else {
        // Offline / Mock Data for employees
        const mockTasksMap = {
          'emp-1': [
            { id: 't-1-1', title: 'Design premium task details tab', project: 'ERP Mobile App', status: 'in-progress', priority: 'high', timeSpentStr: '2h 15m', estimatedHours: '4' },
            { id: 't-1-2', title: 'Setup database triggers for status log', project: 'B2B Core Web', status: 'to-do', priority: 'medium', timeSpentStr: '0m', estimatedHours: '3' },
            { id: 't-1-3', title: 'Fix Android navbar alignment issues', project: 'ERP Mobile App', status: 'done', priority: 'low', timeSpentStr: '1h 20m', estimatedHours: '2' }
          ],
          'emp-2': [
            { id: 't-2-1', title: 'QA testing of clock session mappings', project: 'QA Dashboard', status: 'in-progress', priority: 'high', timeSpentStr: '3h 10m', estimatedHours: '6' },
            { id: 't-2-2', title: 'Draft weekly hours aggregate report', project: 'HR Analytics', status: 'to-do', priority: 'low', timeSpentStr: '0m', estimatedHours: '5' }
          ]
        };
        const userMockTasks = mockTasksMap[employeeId] || [
          { id: 't-mock-1', title: 'Analyze activity logs for anomalies', project: 'Security Suite', status: 'in-progress', priority: 'high', timeSpentStr: '1h 45m', estimatedHours: '4' },
          { id: 't-mock-2', title: 'Refactor state selectors in store', project: 'B2B Core Web', status: 'done', priority: 'medium', timeSpentStr: '2h 30m', estimatedHours: '3' }
        ];
        setEmployeeTasks(userMockTasks);
        setRawTasks([]);
        setRawHistory([]);
      }
    } catch (err) {
      console.error('Error loading employee tasks:', err);
      setEmployeeTasks([]);
      setRawTasks([]);
      setRawHistory([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSession?.employee_id) {
      loadEmployeeHistory(activeSession.employee_id);
      loadEmployeeTasks(activeSession.employee_id, referenceTime);
    } else {
      setHistorySessions([]);
      setEmployeeTasks([]);
    }
  }, [activeSession?.employee_id, loadEmployeeHistory, loadEmployeeTasks, referenceTime]);

  const pastSessionsOnly = useMemo(() => {
    return historySessions.filter(s => s.id !== selectedSessionId);
  }, [historySessions, selectedSessionId]);

  const getHistoricalTasksForDate = useCallback((date) => {
    if (!rawTasks || rawTasks.length === 0) return [];

    const dateKey = getLocalDateKey(date);
    const startOfDayMs = new Date(`${dateKey}T00:00:00`).getTime();
    const endOfDayMs = new Date(`${dateKey}T23:59:59.999`).getTime();

    // Group history by task_id
    const historyByTaskId = {};
    rawHistory.forEach(h => {
      if (!historyByTaskId[h.task_id]) {
        historyByTaskId[h.task_id] = [];
      }
      historyByTaskId[h.task_id].push(h);
    });

    return rawTasks.map(task => {
      const hist = historyByTaskId[task.id] || [];
      let todoSecs = 0;
      let progressSecs = 0;
      let testingSecs = 0;
      let doneSecs = 0;

      hist.forEach(h => {
        const enteredTime = new Date(h.entered_at).getTime();
        const exitedTime = h.exited_at ? new Date(h.exited_at).getTime() : Date.now();

        const overlapStart = Math.max(enteredTime, startOfDayMs);
        const overlapEnd = Math.min(exitedTime, endOfDayMs);
        const secs = overlapStart < overlapEnd ? Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000)) : 0;

        const status = (h.to_status || '').toLowerCase();
        if (status === 'to-do' || status === 'todo') {
          todoSecs += secs;
        } else if (status === 'in-progress' || status === 'doing') {
          progressSecs += secs;
        } else if (status === 'ready-for-testing' || status === 'testing' || status === 'qa') {
          testingSecs += secs;
        } else if (status === 'done') {
          doneSecs += secs;
        }
      });

      // Map current state duration as well if not logged in history
      const currentStatus = (task.status || '').toLowerCase();
      const hasActiveHistory = hist.some(h => !h.exited_at);
      if (!hasActiveHistory && currentStatus) {
        const enteredTime = new Date(task.updated_at || task.created_at).getTime();

        const overlapStart = Math.max(enteredTime, startOfDayMs);
        const overlapEnd = Math.min(Date.now(), endOfDayMs);
        const elapsed = overlapStart < overlapEnd ? Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000)) : 0;

        if (currentStatus === 'to-do' || currentStatus === 'todo') {
          todoSecs += elapsed;
        } else if (currentStatus === 'in-progress' || currentStatus === 'doing') {
          progressSecs += elapsed;
        } else if (currentStatus === 'ready-for-testing' || currentStatus === 'testing' || currentStatus === 'qa') {
          testingSecs += elapsed;
        } else if (currentStatus === 'done') {
          doneSecs += elapsed;
        }
      }

      const totalSecs = todoSecs + progressSecs + testingSecs + doneSecs;

      return {
        ...task,
        todoSecs,
        progressSecs,
        testingSecs,
        doneSecs,
        totalSecs,
        timeSpentStr: totalSecs > 0 ? formatSecsToMinHr(totalSecs) : '0m',
      };
    }).filter(t => t.totalSecs > 0);
  }, [rawTasks, rawHistory]);

  const visualHistoryStats = useMemo(() => {
    if (!sessionStats) return null;
    const { workMs, meetingMs, breakMs, idleMs } = sessionStats;
    const totalMs = workMs + meetingMs + breakMs + idleMs;

    if (totalMs === 0) {
      return {
        workPct: 0,
        meetingPct: 0,
        breakPct: 0,
        idlePct: 0,
      };
    }

    return {
      workPct: Math.round((workMs / totalMs) * 100),
      meetingPct: Math.round((meetingMs / totalMs) * 100),
      breakPct: Math.round((breakMs / totalMs) * 100),
      idlePct: Math.round((idleMs / totalMs) * 100),
    };
  }, [sessionStats]);

  const getHistoricalSessionStats = (session) => {
    let workMs = 0;
    let meetingMs = 0;
    let breakMs = 0;
    let idleMs = 0;

    (session.segments || []).forEach(seg => {
      const start = new Date(seg.started_at).getTime();
      let end = seg.ended_at ? new Date(seg.ended_at).getTime() : Date.now();
      if (!seg.ended_at) {
        const sessionDate = new Date(session.clock_in);
        const todayKey = getLocalDateKey(new Date());
        const sessionDateKey = getLocalDateKey(sessionDate);
        if (sessionDateKey !== todayKey) {
          sessionDate.setHours(23, 59, 59, 999);
          end = sessionDate.getTime();
        }
      }
      const duration = end - start;

      if (seg.kind === 'working') {
        workMs += duration;
      } else if (seg.kind === 'idle') {
        idleMs += duration;
      } else if (seg.kind === 'meeting') {
        meetingMs += duration;
      } else if (seg.kind === 'break') {
        const isMeeting = seg.label && seg.label.toLowerCase().includes('meeting');
        if (isMeeting) {
          meetingMs += duration;
        } else {
          breakMs += duration;
        }
      }
    });

    const totalMs = workMs + meetingMs + breakMs + idleMs;

    return {
      workMs,
      meetingMs,
      breakMs,
      idleMs,
      totalMs,
      workPct: totalMs > 0 ? Math.round((workMs / totalMs) * 100) : 0,
      meetingPct: totalMs > 0 ? Math.round((meetingMs / totalMs) * 100) : 0,
      breakPct: totalMs > 0 ? Math.round((breakMs / totalMs) * 100) : 0,
      idlePct: totalMs > 0 ? Math.round((idleMs / totalMs) * 100) : 0,
      workStr: formatDuration(workMs),
      meetingStr: formatDuration(meetingMs),
      breakStr: formatDuration(breakMs),
      idleStr: formatDuration(idleMs),
    };
  };

  const handleOpenDetail = (sessionId) => {
    setActiveTab('LIVE_ACTIVITY');
    setSelectedSessionId(sessionId);
  };

  // Time Window boundaries (04:00 AM → 03:00 AM next day)
  const shiftBoundaries = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const start = startOfDay.getTime() + SHIFT_START_HOUR * 60 * 60 * 1000;
    const end = startOfDay.getTime() + SHIFT_END_HOUR * 60 * 60 * 1000;
    return { start, end };
  }, [selectedDate]);

  const loadTrackerData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      if (isSupabaseConfigured) {
        const dateKey = getLocalDateKey(selectedDate);
        const startOfDay = `${dateKey}T00:00:00.000Z`;
        const endOfDay = `${dateKey}T23:59:59.999Z`;

        // 1. Fetch clock sessions for selected date
        const { data: rawSessions, error: sessionErr } = await getSupabase()
          .from('clock_sessions')
          .select('*')
          .gte('clock_in', startOfDay)
          .lte('clock_in', endOfDay)
          .order('clock_in', { ascending: true });

        if (sessionErr) throw sessionErr;

        if (rawSessions && rawSessions.length > 0) {
          const ids = rawSessions.map(s => s.id);
          const empIds = rawSessions.map(s => s.employee_id);

          // 2. Fetch segments for today's sessions
          const { data: rawSegments, error: segmentErr } = await getSupabase()
            .from('clock_session_segments')
            .select('*')
            .in('session_id', ids)
            .order('started_at', { ascending: true });

          if (segmentErr) throw segmentErr;

          // Fetch profiles to get dept & role
          const { data: rawProfiles } = await getSupabase()
            .from('employee_profiles')
            .select('id, role, dept, name');

          const nonCeoProfiles = (rawProfiles || []).filter(p => !isCeoAdminUser({ role: p.role }));

          const profileMap = {};
          const employeeNameMap = {};
          nonCeoProfiles.forEach(p => {
            profileMap[p.id] = p;
            employeeNameMap[p.id] = p.name;
          });

          // 3. Map segments & profiles to their corresponding sessions
          const presentEmpIds = new Set();
          const mapped = [];
          rawSessions.forEach(session => {
            const profile = profileMap[session.employee_id];
            if (profile) {
              presentEmpIds.add(session.employee_id);
              mapped.push({
                ...session,
                employee_name: profile.name || session.employee_name,
                employee_role: profile.role || 'Employee',
                employee_dept: normalizeDepartmentName(profile.dept),
                segments: (rawSegments || []).filter(seg => seg.session_id === session.id)
              });
            }
          });

          const offlineSessions = [];
          nonCeoProfiles.forEach(p => {
            if (!presentEmpIds.has(p.id)) {
              offlineSessions.push({
                id: `offline-${p.id}`,
                employee_id: p.id,
                employee_name: p.name,
                employee_role: p.role || 'Employee',
                employee_dept: normalizeDepartmentName(p.dept),
                status: 'offline',
                clock_in: null,
                clock_out: null,
                segments: [],
              });
            }
          });

          setSessions([...mapped, ...offlineSessions]);
          setEmployees(nonCeoProfiles);

          // 4. Fetch all projects to map names
          const { data: projects } = await getSupabase()
            .from('projects')
            .select('id, name');

          const projectNameById = {};
          (projects || []).forEach(p => {
            projectNameById[p.id] = p.name;
          });

          // 5. Fetch all tasks
          const { data: rawTasks } = await getSupabase()
            .from('project_tasks')
            .select('*');

          if (rawTasks && rawTasks.length > 0) {
            const taskIds = rawTasks.map(t => t.id);

            // Fetch task status histories
            const { data: rawHistory } = await getSupabase()
              .from('task_status_history')
              .select('*')
              .in('task_id', taskIds);

            // Group history by task_id
            const historyByTaskId = {};
            (rawHistory || []).forEach(h => {
              if (!historyByTaskId[h.task_id]) {
                historyByTaskId[h.task_id] = [];
              }
              historyByTaskId[h.task_id].push(h);
            });

            const dateKey = getLocalDateKey(selectedDate);
            const startOfDayMs = new Date(`${dateKey}T00:00:00`).getTime();
            const endOfDayMs = new Date(`${dateKey}T23:59:59.999`).getTime();
            const isTodaySelectedVal = dateKey === getLocalDateKey(new Date());
            const refTime = isTodaySelectedVal ? Date.now() : endOfDayMs;

            // Map time spent in each state for each task
            const tasksWithTime = rawTasks.map(task => {
              const hist = historyByTaskId[task.id] || [];
              let todoSecs = 0;
              let progressSecs = 0;
              let testingSecs = 0;
              let doneSecs = 0;

              hist.forEach(h => {
                const enteredTime = new Date(h.entered_at).getTime();
                const exitedTime = h.exited_at ? new Date(h.exited_at).getTime() : refTime;

                const overlapStart = Math.max(enteredTime, startOfDayMs);
                const overlapEnd = Math.min(exitedTime, refTime);
                const secs = overlapStart < overlapEnd ? Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000)) : 0;

                const status = (h.to_status || '').toLowerCase();
                if (status === 'to-do' || status === 'todo') {
                  todoSecs += secs;
                } else if (status === 'in-progress' || status === 'doing') {
                  progressSecs += secs;
                } else if (status === 'ready-for-testing' || status === 'testing' || status === 'qa') {
                  testingSecs += secs;
                } else if (status === 'done') {
                  doneSecs += secs;
                }
              });

              // Map current state duration as well if not logged in history
              const currentStatus = (task.status || '').toLowerCase();
              const hasActiveHistory = hist.some(h => !h.exited_at);
              if (!hasActiveHistory && currentStatus) {
                const enteredTime = new Date(task.updated_at || task.created_at).getTime();

                const overlapStart = Math.max(enteredTime, startOfDayMs);
                const overlapEnd = Math.min(refTime, endOfDayMs);
                const elapsed = overlapStart < overlapEnd ? Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000)) : 0;

                if (currentStatus === 'to-do' || currentStatus === 'todo') {
                  todoSecs += elapsed;
                } else if (currentStatus === 'in-progress' || currentStatus === 'doing') {
                  progressSecs += elapsed;
                } else if (currentStatus === 'ready-for-testing' || currentStatus === 'testing' || currentStatus === 'qa') {
                  testingSecs += elapsed;
                } else if (currentStatus === 'done') {
                  doneSecs += elapsed;
                }
              }

              return {
                ...task,
                project_name: projectNameById[task.project_id] || 'General',
                todoSecs,
                progressSecs,
                testingSecs,
                doneSecs,
                totalSecs: todoSecs + progressSecs + testingSecs + doneSecs,
              };
            });

            // Group tasks by employee_id
            const tasksByEmp = {};
            empIds.forEach(empId => {
              const empTasks = tasksWithTime.filter(task => {
                const assigneeIds = [];
                if (task.assignee_ids) {
                  if (Array.isArray(task.assignee_ids)) {
                    assigneeIds.push(...task.assignee_ids);
                  } else if (typeof task.assignee_ids === 'string') {
                    try {
                      const parsed = JSON.parse(task.assignee_ids);
                      if (Array.isArray(parsed)) {
                        assigneeIds.push(...parsed);
                      }
                    } catch {
                      assigneeIds.push(...task.assignee_ids.split(','));
                    }
                  }
                }
                if (task.assignee_id) {
                  assigneeIds.push(task.assignee_id);
                }
                return assigneeIds.includes(empId);
              });

              if (isTodaySelectedVal) {
                tasksByEmp[empId] = empTasks;
              } else {
                tasksByEmp[empId] = empTasks.filter(t => (t.totalSecs || 0) > 0);
              }
            });

            setAllTasksByEmployee(tasksByEmp);
          } else {
            setAllTasksByEmployee({});
          }
        } else {
          setSessions([]);
          setAllTasksByEmployee({});
        }
      } else {
        const adjustedSessions = MOCK_SESSIONS.map(session => {
          const clockInAdjusted = adjustTimestampToDate(session.clock_in, selectedDate);
          const clockOutAdjusted = adjustTimestampToDate(session.clock_out, selectedDate);
          const segmentsAdjusted = (session.segments || []).map(seg => ({
            ...seg,
            started_at: adjustTimestampToDate(seg.started_at, selectedDate),
            ended_at: adjustTimestampToDate(seg.ended_at, selectedDate),
          }));
          return {
            ...session,
            clock_in: clockInAdjusted,
            clock_out: clockOutAdjusted,
            segments: segmentsAdjusted,
          };
        });

        const presentEmpIds = new Set(adjustedSessions.map(s => s.employee_id));
        const offlineSessions = [];
        MOCK_EMPLOYEES.forEach(emp => {
          if (!presentEmpIds.has(emp.id)) {
            offlineSessions.push({
              id: `offline-${emp.id}`,
              employee_id: emp.id,
              employee_name: emp.name,
              employee_dept: emp.dept,
              status: 'offline',
              clock_in: null,
              clock_out: null,
              segments: [],
            });
          }
        });

        setSessions([...adjustedSessions, ...offlineSessions]);
        setEmployees(MOCK_EMPLOYEES);
        const dateKey = getLocalDateKey(selectedDate);
        const todayKey = getLocalDateKey(new Date());

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = getLocalDateKey(yesterday);

        let mockTasksByEmp = {};

        if (dateKey === todayKey) {
          mockTasksByEmp = {
            'emp-1': [
              { id: 'mt-1', title: 'Design premium task details tab', project_name: 'ERP Mobile App', status: 'in-progress', todoSecs: 0, progressSecs: 8100, testingSecs: 0, doneSecs: 0, totalSecs: 8100 },
              { id: 'mt-2', title: 'Setup database triggers for status log', project_name: 'B2B Core Web', status: 'to-do', todoSecs: 10800, progressSecs: 0, testingSecs: 0, doneSecs: 0, totalSecs: 10800 },
            ],
            'emp-2': [
              { id: 'mt-3', title: 'QA testing of clock session mappings', project_name: 'QA Dashboard', status: 'in-progress', todoSecs: 0, progressSecs: 11400, testingSecs: 0, doneSecs: 0, totalSecs: 11400 },
            ],
            'emp-3': [
              { id: 'mt-4', title: 'Fix Login Issue', project_name: 'JOP Electric', status: 'in-progress', todoSecs: 0, progressSecs: 12000, testingSecs: 0, doneSecs: 0, totalSecs: 12000 },
            ],
            'emp-6': [
              { id: 'mt-5', title: 'new UI Modifications in home page as per figma', project_name: 'RPR Logistics', status: 'in-progress', todoSecs: 0, progressSecs: 1440, testingSecs: 0, doneSecs: 0, totalSecs: 1440 },
              { id: 'mt-6', title: 'truck dispatch USA pages and UI changes in home page', project_name: 'B2B Campus', status: 'ready-for-testing', todoSecs: 0, progressSecs: 11580, testingSecs: 1440, doneSecs: 0, totalSecs: 13020 },
            ],
            'emp-7': [
              { id: 'mt-7', title: 'Test the B2B campus site', project_name: 'B2B Campus', status: 'to-do', todoSecs: 21240, progressSecs: 10620, testingSecs: 0, doneSecs: 0, totalSecs: 31860 },
            ]
          };
        } else if (dateKey === yesterdayKey) {
          mockTasksByEmp = {
            'emp-1': [
              { id: 'mt-y1', title: 'Setup database triggers for status log', project_name: 'B2B Core Web', status: 'done', todoSecs: 3600, progressSecs: 14400, testingSecs: 0, doneSecs: 10800, totalSecs: 28800 },
              { id: 'mt-y2', title: 'Fix Android navbar alignment issues', project_name: 'ERP Mobile App', status: 'done', todoSecs: 1800, progressSecs: 7200, testingSecs: 0, doneSecs: 0, totalSecs: 9000 },
            ],
            'emp-2': [
              { id: 'mt-y3', title: 'Draft weekly hours aggregate report', project_name: 'HR Analytics', status: 'done', todoSecs: 7200, progressSecs: 18000, testingSecs: 0, doneSecs: 3600, totalSecs: 28800 },
            ],
            'emp-3': [
              { id: 'mt-y4', title: 'set time tracker', project_name: 'Base2Brand Website', status: 'done', todoSecs: 7200, progressSecs: 21600, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
            ],
            'emp-6': [
              { id: 'mt-y5', title: 'Create new truck dispatch USA pages and UI changes in home page', project_name: 'B2B Campus', status: 'done', todoSecs: 0, progressSecs: 16440, testingSecs: 12360, doneSecs: 0, totalSecs: 28800 },
            ],
            'emp-7': [
              { id: 'mt-y6', title: 'Test the B2B campus site', project_name: 'B2B Campus', status: 'done', todoSecs: 0, progressSecs: 28800, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
            ]
          };
        } else {
          mockTasksByEmp = {
            'emp-1': [
              { id: 'mt-o1', title: 'Code Review & Refactoring', project_name: 'ERP Mobile App', status: 'done', todoSecs: 3600, progressSecs: 25200, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
            ],
            'emp-2': [
              { id: 'mt-o2', title: 'Database Optimization', project_name: 'B2B Core Web', status: 'done', todoSecs: 3600, progressSecs: 25200, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
            ],
            'emp-3': [
              { id: 'mt-o3', title: 'API Integration testing', project_name: 'JOP Electric', status: 'done', todoSecs: 3600, progressSecs: 25200, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
            ],
            'emp-6': [
              { id: 'mt-o4', title: 'Initial structure setup', project_name: 'RPR Logistics', status: 'done', todoSecs: 0, progressSecs: 28800, testingSecs: 0, doneSecs: 0, totalSecs: 28800 },
            ]
          };
        }
        setAllTasksByEmployee(mockTasksByEmp);
      }
    } catch (e) {
      console.error('Error loading shift tracker data:', e);
      setSessions(MOCK_SESSIONS);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    loadTrackerData();

    const todayKey = getLocalDateKey(new Date());
    const selectedKey = getLocalDateKey(selectedDate);
    const isToday = todayKey === selectedKey;

    if (!isSupabaseConfigured || !isToday) {
      return () => { };
    }

    const supabase = getSupabase();
    const sessionChannelName = createRealtimeChannelName('clock-sessions-tracker');
    const segmentChannelName = createRealtimeChannelName('clock-segments-tracker');

    // Subscribe to clock sessions
    const sessionChannel = supabase
      .channel(sessionChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clock_sessions' },
        () => loadTrackerData(true)
      )
      .subscribe();

    // Subscribe to clock session segments
    const segmentChannel = supabase
      .channel(segmentChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clock_session_segments' },
        () => loadTrackerData(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(segmentChannel);
    };
  }, [loadTrackerData, selectedDate]);

  // Aggregate Stats
  const summaryStats = useMemo(() => {
    let active = 0;
    let onBreak = 0;
    let idle = 0;

    scopedSessions.forEach(session => {
      if (session.status === 'active') {
        const lastSeg = session.segments && session.segments[session.segments.length - 1];
        if (lastSeg && !lastSeg.ended_at && lastSeg.kind === 'idle') {
          idle += 1;
        } else {
          active += 1;
        }
      } else if (session.status === 'paused') {
        onBreak += 1;
      }
    });

    return { active, onBreak, idle, total: scopedSessions.length };
  }, [scopedSessions]);

  const renderTimelineBar = (segments) => {
    if (!segments || segments.length === 0) {
      return <View style={styles.timelineBarPlaceholder} />;
    }

    return (
      <View style={styles.timelineContainer}>
        {/* Hour Guide lines (4 AM → 3 AM next day = 23h, marks every ~4h) */}
        <View style={[styles.gridline, { left: '17.39%' }]} />
        <View style={[styles.gridline, { left: '34.78%' }]} />
        <View style={[styles.gridline, { left: '52.17%' }]} />
        <View style={[styles.gridline, { left: '69.57%' }]} />
        <View style={[styles.gridline, { left: '86.96%' }]} />

        {segments.map((seg) => {
          const segStart = new Date(seg.started_at).getTime();
          const segEnd = seg.ended_at ? new Date(seg.ended_at).getTime() : referenceTime;

          // Calculate offsets relative to the shift window (4 AM → 3 AM next day)
          const startOffset = Math.max(0, segStart - shiftBoundaries.start);
          const endOffset = Math.min(TOTAL_SHIFT_MS, segEnd - shiftBoundaries.start);

          if (startOffset >= TOTAL_SHIFT_MS || endOffset <= 0) {
            return null; // Segment falls entirely outside the shift window
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
                  backgroundColor: getSegmentColor(seg.kind, seg.label),
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const renderEmployeeRow = ({ item: session }) => {
    const tasks = allTasksByEmployee[session.employee_id] || [];
    const activeTask = tasks.find(t => t.status === 'in-progress' || t.status === 'doing');

    // Calculate current activity text and colors matching web view
    let statusDotColor = '#8B949E'; // Gray (Offline)
    let statusText = 'Offline';

    if (session.status === 'active') {
      const lastSeg = session.segments && session.segments[session.segments.length - 1];
      if (lastSeg && !lastSeg.ended_at) {
        if (lastSeg.kind === 'idle') {
          statusDotColor = '#F85149'; // Red (Not at desk)
          const idleMins = Math.floor((referenceTime - new Date(lastSeg.started_at).getTime()) / 60000);
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

    // Working + meeting hours (office time shown on card)
    let workingMs = 0;
    (session.segments || []).forEach(seg => {
      const start = new Date(seg.started_at).getTime();
      const end = seg.ended_at ? new Date(seg.ended_at).getTime() : referenceTime;
      const duration = end - start;
      if (seg.kind === 'working' || isMeetingSegment(seg.kind, seg.label)) {
        workingMs += duration;
      }
    });

    if (trackingMode === 'TASK') {
      const { inProgressTasks, recentOtherTasks } = splitEmployeeTasksForTracker(tasks, recentWorkingDayKeys);
      const isTaskExpanded = !!expandedTaskEmployees[session.employee_id];
      const visibleTaskCount = inProgressTasks.length + (isTaskExpanded ? recentOtherTasks.length : 0);

      return (
        <View style={styles.employeeCard}>
          <TouchableOpacity
            style={styles.taskModeRowContainer}
            onPress={() => handleOpenDetail(session.id)}
            activeOpacity={0.85}>
            {/* Left Column: Employee details */}
            <View style={styles.taskModeEmpCol}>
              <UserAvatar
                name={session.employee_name}
                userId={session.employee_id}
                size={wp(10.5)}
              />
              <View style={styles.taskModeEmpMeta}>
                <Text style={styles.employeeName} numberOfLines={1}>{session.employee_name}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
                  <Text style={styles.statusLabel} numberOfLines={1}>{statusText}</Text>
                </View>
                <Text style={styles.taskModeWorkTime} numberOfLines={1}>
                  Since {formatTimeOfDay(session.clock_in)}
                </Text>
                <Text style={styles.taskModeTotalHours}>
                  {formatDuration(workingMs)}
                </Text>
              </View>
            </View>

            {/* Right Column: Task list */}
            <View style={styles.taskModeTasksCol}>
              {visibleTaskCount === 0 ? (
                <View style={styles.taskModeEmptyTasks}>
                  <Text style={styles.taskModeEmptyText}>No active tasks in last 5 working days.</Text>
                </View>
              ) : (
                <View style={styles.taskModeTasksList}>
                  {inProgressTasks.map(renderTaskModeItem)}

                  {recentOtherTasks.length > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.taskExpandBtn}
                        onPress={() => toggleTaskExpand(session.employee_id)}
                        activeOpacity={0.85}>
                        <Icon
                          name={isTaskExpanded ? 'chevron-up' : 'chevron-down'}
                          size={wp(3.5)}
                          color={PURPLE}
                        />
                        <Text style={styles.taskExpandBtnText}>
                          {isTaskExpanded
                            ? 'Hide recent tasks'
                            : `${recentOtherTasks.length} more task${recentOtherTasks.length === 1 ? '' : 's'} (last 5 days)`}
                        </Text>
                      </TouchableOpacity>

                      {isTaskExpanded && recentOtherTasks.map(renderTaskModeItem)}
                    </>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.employeeCard}>
        <TouchableOpacity
          onPress={() => handleOpenDetail(session.id)}
          activeOpacity={0.85}>
          <View style={styles.cardHeader}>
            <UserAvatar
              name={session.employee_name}
              userId={session.employee_id}
              size={wp(10.5)}
            />

            <View style={styles.employeeMeta}>
              <Text style={styles.employeeName}>{session.employee_name}</Text>
              <Text style={styles.employeeDept} numberOfLines={1}>
                {session.employee_dept || 'Digital Marketing'}
              </Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
                <Text style={styles.statusLabel} numberOfLines={1}>{statusText}</Text>
              </View>
            </View>

            {/* Timeline center */}
            <View style={styles.barWrapper}>
              {renderTimelineBar(session.segments)}
              <View style={styles.rowTimeLabels}>
                <Text style={styles.rowTimeText}>
                  In: {formatTimeOfDay(session.clock_in)}
                </Text>
                <Text style={styles.rowTimeText}>
                  Out: {session.clock_out ? formatTimeOfDay(session.clock_out) : 'Active'}
                </Text>
              </View>
            </View>

            {/* Total Working Hours */}
            <View style={styles.productivityWrapper}>
              <Text style={styles.workingHoursValue}>
                {session.status === 'offline' || workingMs === 0 ? '-' : formatDuration(workingMs)}
              </Text>
              <Text style={styles.prodLabel}>Work + Meet</Text>
            </View>
          </View>

          {/* Active Task Footer for Clocked In Employees */}
          {isTodaySelected && (
            <>
              {activeTask ? (
                <View style={styles.cardActiveTaskFooter}>
                  <View style={styles.activeTaskIndicatorGroup}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.activeTaskPrefix}>Active: </Text>
                    <Text style={styles.activeTaskTitle} numberOfLines={1}>
                      {activeTask.title}
                    </Text>
                  </View>
                  <Text style={styles.activeTaskTime}>
                    {formatSecsToMinHr(activeTask.progressSecs)}
                  </Text>
                </View>
              ) : session.status === 'active' ? (
                <View style={[styles.cardActiveTaskFooter, styles.idleFooter]}>
                  <View style={styles.activeTaskIndicatorGroup}>
                    <Icon name="alert-circle" size={wp(3.5)} color="#F85149" />
                    <Text style={[styles.activeTaskPrefix, { color: '#F85149', marginLeft: wp(1) }]}>
                      No active task (Idle)
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const isTodaySelected = useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    const selectedKey = getLocalDateKey(selectedDate);
    return todayKey === selectedKey;
  }, [selectedDate]);

  const clearAllFilters = () => {
    setTrackerFilter('all');
    setSelectedDepartment(null);
    setSelectedEmployeeId(null);
    setSearchQuery('');
    setSelectedDate(new Date());
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (trackerFilter !== 'all') count += 1;
    if (selectedDepartment) count += 1;
    if (selectedEmployeeId) count += 1;
    if (searchQuery) count += 1;
    if (!isTodaySelected) count += 1;
    return count;
  }, [trackerFilter, selectedDepartment, selectedEmployeeId, searchQuery, isTodaySelected]);

  const filterSummaryText = useMemo(() => {
    const tags = [];
    if (!isTodaySelected) tags.push(formatSelectedDateDisplay(selectedDate));
    if (trackerFilter !== 'all') tags.push(getTrackerFilterLabel(trackerFilter));
    if (selectedDepartment) tags.push(selectedDepartment);
    if (selectedEmployeeId) tags.push(selectedEmployeeName ? selectedEmployeeName.split(' ')[0] : 'Staff');
    if (searchQuery) tags.push(`"${searchQuery}"`);
    return tags.length > 0 ? tags.join(' · ') : 'All staff · Today';
  }, [isTodaySelected, selectedDate, trackerFilter, selectedDepartment, selectedEmployeeId, selectedEmployeeName, searchQuery]);

  const filteredEmptyState = useMemo(() => {
    if (selectedEmployeeId) {
      return {
        title: `No Shifts Tracked for ${selectedEmployeeName}`,
        subtitle: 'This employee has not clocked in on this date.',
      };
    }

    if (selectedDepartment) {
      const filterLabel = getTrackerFilterLabel(trackerFilter).toLowerCase();
      const dateLabel = isTodaySelected
        ? 'today'
        : `on ${formatSelectedDateDisplay(selectedDate)}`;

      if (trackerFilter === 'all') {
        return {
          title: `No staff in ${selectedDepartment}`,
          subtitle: isTodaySelected
            ? 'No employee from this department has clocked in today.'
            : 'No employee shifts found for this department on this date.',
        };
      }

      return {
        title: `No ${filterLabel} staff in ${selectedDepartment} ${dateLabel}`,
        subtitle: 'Try another department or switch filter above.',
      };
    }

    const filterLabel = getTrackerFilterLabel(trackerFilter).toLowerCase();
    const dateLabel = isTodaySelected
      ? 'today'
      : `on ${formatSelectedDateDisplay(selectedDate)}`;

    if (trackerFilter === 'all') {
      return {
        title: isTodaySelected
          ? 'No Shifts Tracked Today'
          : `No Shifts Tracked on ${formatSelectedDateDisplay(selectedDate)}`,
        subtitle: isTodaySelected
          ? 'No employee has clocked in yet today.'
          : 'No employee shifts found for this date.',
      };
    }

    return {
      title: `No ${filterLabel} staff ${dateLabel}`,
      subtitle: 'Switch filter above — tap All to see everyone.',
    };
  }, [isTodaySelected, selectedDate, selectedDepartment, selectedEmployeeId, selectedEmployeeName, trackerFilter]);

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const todayKey = getLocalDateKey(new Date());
    const selectedKey = getLocalDateKey(selectedDate);
    if (selectedKey === todayKey) return;

    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title="Shift Tracker" />

        <View style={styles.filterBarRow}>
          <View style={styles.searchContainerMain}>
            <Icon name="search" size={wp(4.2)} color={darkTextSecondaryColor} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search staff or department..."
              placeholderTextColor={darkTextSecondaryColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x-circle" size={wp(4.3)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterOpenBtn, activeFilterCount > 0 && styles.filterOpenBtnActive]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.85}>
            <Icon name="sliders" size={wp(4)} color={activeFilterCount > 0 ? '#ffffff' : PURPLE} />
            <Text style={[styles.filterOpenBtnText, activeFilterCount > 0 && styles.filterOpenBtnTextActive]}>
              Filter
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterCountBadgeOnPurple}>
                <Text style={styles.filterCountBadgeOnPurpleText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : (
          <View style={styles.content}>

            {/* Tracking Mode Switcher Tabs */}
            <View style={styles.modeTabsRow}>
              <TouchableOpacity
                style={[styles.modeTabButton, trackingMode === 'SHIFT' && styles.activeModeTab]}
                onPress={() => setTrackingMode('SHIFT')}>
                <Icon name="clock" size={wp(3.8)} color={trackingMode === 'SHIFT' ? '#ffffff' : darkTextSecondaryColor} />
                <Text style={[styles.modeTabText, trackingMode === 'SHIFT' && styles.activeModeTabText]}>
                  Shift Tracking
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTabButton, trackingMode === 'TASK' && styles.activeModeTab]}
                onPress={() => setTrackingMode('TASK')}>
                <Icon name="check-square" size={wp(3.8)} color={trackingMode === 'TASK' ? '#ffffff' : darkTextSecondaryColor} />
                <Text style={[styles.modeTabText, trackingMode === 'TASK' && styles.activeModeTabText]}>
                  Task Tracking
                </Text>
              </TouchableOpacity>
            </View>

            {/* Summary counters */}
            <View style={styles.statsSummaryGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statCount}>{summaryStats.total}</Text>
                <Text style={styles.statLabel}>Total Staff</Text>
              </View>
              <View style={[styles.statBox, styles.statBorder]}>
                <Text style={[styles.statCount, { color: '#3DDC84' }]}>{summaryStats.active}</Text>
                <Text style={styles.statLabel}>Working</Text>
              </View>
              <View style={[styles.statBox, styles.statBorder]}>
                <Text style={[styles.statCount, { color: '#F5C542' }]}>{summaryStats.onBreak}</Text>
                <Text style={styles.statLabel}>On Break</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statCount, { color: '#F85149' }]}>{summaryStats.idle}</Text>
                <Text style={styles.statLabel}>Idle</Text>
              </View>
            </View>

            {/* Time guide header axis (Only for Shift mode) */}
            {trackingMode === 'SHIFT' && (
              <View style={styles.timeAxisRow}>
                <View style={styles.axisSpacer} />
                <View style={styles.axisScaleContainer}>
                  <Text style={styles.axisScaleText}>4 AM</Text>
                  <Text style={styles.axisScaleText}>8 AM</Text>
                  <Text style={styles.axisScaleText}>12 PM</Text>
                  <Text style={styles.axisScaleText}>4 PM</Text>
                  <Text style={styles.axisScaleText}>8 PM</Text>
                  <Text style={styles.axisScaleText}>12 AM</Text>
                  <Text style={styles.axisScaleText}>3 AM</Text>
                </View>
                <View style={styles.axisRightSpacer} />
              </View>
            )}

            {filteredSessions.length === 0 ? (
              <ScrollView contentContainerStyle={styles.emptyContainer}>
                <Icon name="users" size={wp(14)} color="rgba(255,255,255,0.15)" />
                <Text style={styles.emptyTitle}>{filteredEmptyState.title}</Text>
                <Text style={styles.emptySubtitle}>{filteredEmptyState.subtitle}</Text>
              </ScrollView>
            ) : (
              <FlatList
                data={filteredSessions}
                renderItem={renderEmployeeRow}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
      </SafeAreaView>

      {/* Employee Details Web-style Modal */}
      {activeSession && modalInfo && (
        <Modal
          visible={!!selectedSessionId}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedSessionId(null)}>
          <SafeAreaView style={styles.modalSafeArea} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.modalHeaderRow}>
              <UserAvatar
                name={activeSession.employee_name}
                userId={activeSession.employee_id}
                size={wp(13)}
              />
              <View style={styles.modalHeaderMeta}>
                <Text style={styles.modalEmployeeName}>{activeSession.employee_name}</Text>
                <Text style={styles.modalEmployeeSubtitle}>
                  {(activeSession.employee_role || 'software developer').toLowerCase()} • {(activeSession.employee_dept || 'software development').toLowerCase()}
                </Text>
                <View style={styles.modalBadgesRow}>
                  <View style={[styles.modalBadge, { backgroundColor: 'rgba(52, 152, 219, 0.15)' }]}>
                    <View style={[styles.badgeDot, { backgroundColor: modalInfo.statusDotColor }]} />
                    <Text style={[styles.badgeText, { color: modalInfo.statusDotColor }]}>
                      {modalInfo.statusBadgeText}
                    </Text>
                  </View>
                  <View style={[styles.modalBadge, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                    <Icon name="map-pin" size={wp(2.8)} color={darkTextSecondaryColor} />
                    <Text style={styles.badgeText}>{modalInfo.isAtDesk ? 'At Desk' : 'Not at Desk'}</Text>
                  </View>
                  <View style={[styles.modalBadge, { backgroundColor: modalInfo.arrivalStatus.bg }]}>
                    <Text style={[styles.badgeText, { color: modalInfo.arrivalStatus.color }]}>
                      {modalInfo.arrivalStatus.text}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedSessionId(null)}>
                <Icon name="x" size={wp(6)} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Modal Tabs */}
            <View style={styles.modalTabsRow}>
              <TouchableOpacity
                style={[styles.modalTabButton, activeTab === 'LIVE_ACTIVITY' && styles.activeModalTab]}
                onPress={() => setActiveTab('LIVE_ACTIVITY')}>
                <Text style={[styles.modalTabText, activeTab === 'LIVE_ACTIVITY' && styles.activeModalTabText]}>
                  LIVE ACTIVITY
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTabButton, activeTab === 'TASKS' && styles.activeModalTab]}
                onPress={() => setActiveTab('TASKS')}>
                <Text style={[styles.modalTabText, activeTab === 'TASKS' && styles.activeModalTabText]}>
                  TASKS
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTabButton, activeTab === 'VISUAL_HISTORY' && styles.activeModalTab]}
                onPress={() => setActiveTab('VISUAL_HISTORY')}>
                <Text style={[styles.modalTabText, activeTab === 'VISUAL_HISTORY' && styles.activeModalTabText]}>
                  VISUAL HISTORY
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {activeTab === 'LIVE_ACTIVITY' ? (
                <View style={styles.tabContentContainer}>
                  {/* Live Activity Column Box */}
                  <View style={styles.liveActivityBox}>
                    <Text style={styles.liveActivityTitle}>LIVE ACTIVITY</Text>

                    <View style={styles.liveActivityRow}>
                      {/* Left Column */}
                      <View style={styles.liveColumn}>
                        <View style={styles.liveItem}>
                          <Icon name="check-square" size={wp(3.8)} color={darkTextSecondaryColor} />
                          <View style={styles.liveItemTexts}>
                            <Text style={styles.liveItemLabel}>Current task</Text>
                            <Text style={styles.liveItemValue} numberOfLines={1}>
                              {modalActiveTask ? modalActiveTask.title : 'No task in progress'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.liveItem}>
                          <Icon name="monitor" size={wp(3.8)} color={darkTextSecondaryColor} />
                          <View style={styles.liveItemTexts}>
                            <Text style={styles.liveItemLabel}>App</Text>
                            <Text style={styles.liveItemValue} numberOfLines={1}>
                              {modalActiveTask ? (activeSession.employee_dept === 'Development' ? 'VS Code' : 'Browser / Figma') : '—'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.liveItem}>
                          <Icon name="globe" size={wp(3.8)} color={darkTextSecondaryColor} />
                          <View style={styles.liveItemTexts}>
                            <Text style={styles.liveItemLabel}>Screen</Text>
                            <Text style={styles.liveItemValue} numberOfLines={1}>
                              {modalActiveTask ? `Working on ${modalActiveTask.project_name || modalActiveTask.project}` : 'No active screen'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Right Column */}
                      <View style={styles.liveColumn}>
                        <View style={styles.liveItem}>
                          <Icon name="activity" size={wp(3.8)} color="#3DDC84" />
                          <View style={styles.liveItemTexts}>
                            <Text style={styles.liveItemLabel}>Active for</Text>
                            <Text style={[styles.liveItemValue, { color: '#3DDC84' }]} numberOfLines={1}>
                              {formatDuration((sessionStats?.workMs || 0) + (sessionStats?.meetingMs || 0))}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.liveItem}>
                          <Icon name="clock" size={wp(3.8)} color={darkTextSecondaryColor} />
                          <View style={styles.liveItemTexts}>
                            <Text style={styles.liveItemLabel}>Shift ends</Text>
                            <Text style={styles.liveItemValue} numberOfLines={1}>03:00 AM</Text>
                          </View>
                        </View>

                        <View style={styles.liveItem}>
                          <Icon name="zap" size={wp(3.8)} color="#3498DB" />
                          <View style={styles.liveItemTexts}>
                            <Text style={styles.liveItemLabel}>Work + Meet</Text>
                            <Text style={[styles.liveItemValue, { color: '#3498DB' }]} numberOfLines={1}>
                              {formatDuration((sessionStats?.workMs || 0) + (sessionStats?.meetingMs || 0))}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 4-Metric Grid */}
                  <View style={styles.metricsGrid}>
                    {/* Work Time */}
                    <View style={[styles.metricCard, { borderColor: 'rgba(52, 152, 219, 0.15)' }]}>
                      <Icon name="activity" size={wp(4.5)} color="#3498DB" />
                      <Text style={styles.metricValue}>{sessionStats?.workTime}</Text>
                      <Text style={styles.metricLabel}>Work Time</Text>
                    </View>

                    {/* Meetings */}
                    <View style={[styles.metricCard, { borderColor: 'rgba(155, 89, 182, 0.15)' }]}>
                      <Icon name="users" size={wp(4.5)} color="#9B59B6" />
                      <Text style={styles.metricValue}>{sessionStats?.meetingTime}</Text>
                      <Text style={styles.metricLabel}>Meetings</Text>
                    </View>

                    {/* Breaks */}
                    <View style={[styles.metricCard, { borderColor: 'rgba(245, 197, 66, 0.15)' }]}>
                      <Icon name="coffee" size={wp(4.5)} color="#F5C542" />
                      <Text style={styles.metricValue}>{sessionStats?.breakTime}</Text>
                      <Text style={styles.metricLabel}>Breaks</Text>
                    </View>

                    {/* Idle Time */}
                    <View style={[styles.metricCard, { borderColor: 'rgba(248, 81, 73, 0.15)' }]}>
                      <Icon name="eye-off" size={wp(4.5)} color="#F85149" />
                      <Text style={styles.metricValue}>{sessionStats?.idleTime}</Text>
                      <Text style={styles.metricLabel}>Idle Time</Text>
                    </View>
                  </View>

                  {/* Daily Timeline */}
                  <View style={styles.modalTimelineBox}>
                    <View style={styles.timelineHeaderRow}>
                      <Text style={styles.timelineTitle}>
                        Daily Timeline • 04:00 AM → 03:00 AM
                      </Text>
                    </View>

                    <View style={styles.legendContainer}>
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

                    {/* Detail Timeline Bar */}
                    <View style={styles.modalTimelineBarWrapper}>
                      {renderTimelineBar(activeSession.segments)}
                    </View>

                    {/* Axis Labels */}
                    <View style={styles.modalTimeAxis}>
                      <Text style={styles.modalAxisText}>4 AM</Text>
                      <Text style={styles.modalAxisText}>8 AM</Text>
                      <Text style={styles.modalAxisText}>12 PM</Text>
                      <Text style={styles.modalAxisText}>4 PM</Text>
                      <Text style={styles.modalAxisText}>8 PM</Text>
                      <Text style={styles.modalAxisText}>12 AM</Text>
                      <Text style={styles.modalAxisText}>3 AM</Text>
                    </View>
                  </View>

                  {/* Vertical Activity Log */}
                  <View style={styles.modalLogSection}>
                    <Text style={styles.modalLogSectionTitle}>Activity Log</Text>

                    {logItems.length === 0 ? (
                      <Text style={styles.modalNoSegmentsText}>No tracking activity recorded.</Text>
                    ) : (
                      <View style={styles.logTimelineList}>
                        {logItems.map((item, idx) => (
                          <View key={idx} style={styles.modalLogItem}>
                            <View style={styles.logLeftCol}>
                              <View style={[styles.modalLogDot, { backgroundColor: item.dotColor }]} />
                              {idx < logItems.length - 1 && (
                                <View style={styles.logVerticalLine} />
                              )}
                            </View>
                            <View style={styles.modalLogContent}>
                              <Text style={styles.modalLogTime}>{item.timeText}</Text>
                              <View style={styles.modalLogMain}>
                                <Text style={[styles.modalLogText, item.isGreen && { color: '#3DDC84', fontWeight: '500' }]}>
                                  {item.label}
                                </Text>
                                {item.duration ? (
                                  <Text style={styles.modalLogDuration}>({item.duration})</Text>
                                ) : null}
                              </View>
                              {item.rightText === 'Ongoing' ? (
                                <View style={styles.ongoingBadge}>
                                  <Text style={styles.ongoingBadgeText}>Ongoing</Text>
                                </View>
                              ) : (
                                <Text style={styles.modalLogRightText}>{item.rightText}</Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ) : activeTab === 'TASKS' ? (
                <View style={styles.tabContentContainer}>
                  <View style={styles.tasksSectionCard}>
                    <Text style={styles.tasksSectionTitle}>Assigned Tasks</Text>
                    <Text style={styles.tasksSectionSubtitle}>Tasks assigned to this employee</Text>

                    {tasksLoading ? (
                      <ActivityIndicator size="small" color={PURPLE} style={styles.tasksTabLoader} />
                    ) : employeeTasks.length === 0 ? (
                      <View style={styles.tasksEmptyState}>
                        <Icon name="check-square" size={wp(10)} color={darkTextSecondaryColor} style={{ opacity: 0.5 }} />
                        <Text style={styles.tasksEmptyText}>No tasks assigned to this employee.</Text>
                      </View>
                    ) : (
                      <View style={styles.tasksListContainer}>
                        {employeeTasks.map(task => {
                          const isInProgress = task.status === 'in-progress' || task.status === 'doing';

                          // Define status color theme
                          let statusBg = 'rgba(255,255,255,0.06)';
                          let statusTextCol = '#8B949E';
                          let statusLabelText = task.status || 'To Do';

                          if (task.status === 'in-progress' || task.status === 'doing') {
                            statusBg = 'rgba(52, 152, 219, 0.15)';
                            statusTextCol = '#3498DB';
                            statusLabelText = 'In Progress';
                          } else if (task.status === 'ready-for-testing' || task.status === 'testing') {
                            statusBg = 'rgba(155, 89, 182, 0.15)';
                            statusTextCol = '#9B59B6';
                            statusLabelText = 'Testing';
                          } else if (task.status === 'done') {
                            statusBg = 'rgba(61, 220, 132, 0.15)';
                            statusTextCol = '#3DDC84';
                            statusLabelText = 'Done';
                          }

                          // Define priority color theme
                          let prioColor = '#8B949E';
                          if (task.priority === 'high' || task.priority === 'urgent') {
                            prioColor = '#F85149';
                          } else if (task.priority === 'medium') {
                            prioColor = '#F5C542';
                          }

                          const taskDatesLine = buildTaskDatesLine(task);

                          return (
                            <View
                              key={task.id}
                              style={[
                                styles.taskItemCard,
                                isInProgress && styles.activeTaskItemCard
                              ]}
                            >
                              <View style={styles.taskItemHeader}>
                                <Text style={styles.taskItemTitle} numberOfLines={2}>
                                  {task.title}
                                </Text>
                                <View style={[styles.taskStatusBadge, { backgroundColor: statusBg }]}>
                                  <Text style={[styles.taskStatusText, { color: statusTextCol }]}>
                                    {statusLabelText}
                                  </Text>
                                </View>
                              </View>

                              {task.description ? (
                                <Text style={styles.taskItemDesc} numberOfLines={2}>
                                  {task.description}
                                </Text>
                              ) : null}

                              {taskDatesLine ? (
                                <Text style={styles.taskDatesLine} numberOfLines={2}>
                                  {taskDatesLine}
                                </Text>
                              ) : null}

                              <View style={styles.taskItemFooter}>
                                <View style={styles.taskFooterLeft}>
                                  <Text style={styles.taskProjectText} numberOfLines={1}>
                                    {task.project || 'General'}
                                  </Text>
                                  <View style={styles.footerBullet} />
                                  <Text style={[styles.taskPriorityText, { color: prioColor }]}>
                                    {task.priority ? task.priority.toUpperCase() : 'MEDIUM'}
                                  </Text>
                                </View>

                                <View style={styles.taskTimeTracker}>
                                  <Icon
                                    name={isInProgress ? 'activity' : 'clock'}
                                    size={wp(3.2)}
                                    color={isInProgress ? '#3498DB' : darkTextSecondaryColor}
                                  />
                                  <Text style={[
                                    styles.taskTimeText,
                                    isInProgress && { color: '#3498DB', fontWeight: '500' }
                                  ]}>
                                    {task.timeSpentStr || '0m'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.tabContentContainer}>
                  {/* Shift Time Share Breakdown */}
                  {visualHistoryStats && (
                    <View style={styles.breakdownCard}>
                      <Text style={styles.breakdownCardTitle}>Shift Time Share (Today)</Text>

                      {/* Horizontal Color Bar */}
                      <View style={styles.chartBarContainer}>
                        {(visualHistoryStats.workPct === 0 &&
                          visualHistoryStats.meetingPct === 0 &&
                          visualHistoryStats.breakPct === 0 &&
                          visualHistoryStats.idlePct === 0) ? (
                          <View style={[styles.chartBarSegment, { backgroundColor: '#30363D', flex: 1 }]} />
                        ) : (
                          <>
                            {visualHistoryStats.workPct > 0 && (
                              <View style={[styles.chartBarSegment, { backgroundColor: '#3498DB', flex: visualHistoryStats.workPct }]} />
                            )}
                            {visualHistoryStats.meetingPct > 0 && (
                              <View style={[styles.chartBarSegment, { backgroundColor: '#9B59B6', flex: visualHistoryStats.meetingPct }]} />
                            )}
                            {visualHistoryStats.breakPct > 0 && (
                              <View style={[styles.chartBarSegment, { backgroundColor: '#F5C542', flex: visualHistoryStats.breakPct }]} />
                            )}
                            {visualHistoryStats.idlePct > 0 && (
                              <View style={[styles.chartBarSegment, { backgroundColor: '#F85149', flex: visualHistoryStats.idlePct }]} />
                            )}
                          </>
                        )}
                      </View>

                      {/* Details breakdown list */}
                      <View style={styles.breakdownList}>
                        <View style={styles.breakdownRow}>
                          <View style={styles.breakdownLeft}>
                            <View style={[styles.legendDot, { backgroundColor: '#3498DB' }]} />
                            <Text style={styles.breakdownText}>Work Time</Text>
                          </View>
                          <Text style={styles.breakdownVal}>
                            {sessionStats.workTime} ({visualHistoryStats.workPct}%)
                          </Text>
                        </View>

                        <View style={styles.breakdownRow}>
                          <View style={styles.breakdownLeft}>
                            <View style={[styles.legendDot, { backgroundColor: '#9B59B6' }]} />
                            <Text style={styles.breakdownText}>Meetings</Text>
                          </View>
                          <Text style={styles.breakdownVal}>
                            {sessionStats.meetingTime} ({visualHistoryStats.meetingPct}%)
                          </Text>
                        </View>

                        <View style={styles.breakdownRow}>
                          <View style={styles.breakdownLeft}>
                            <View style={[styles.legendDot, { backgroundColor: '#F5C542' }]} />
                            <Text style={styles.breakdownText}>Breaks</Text>
                          </View>
                          <Text style={styles.breakdownVal}>
                            {sessionStats.breakTime} ({visualHistoryStats.breakPct}%)
                          </Text>
                        </View>

                        <View style={styles.breakdownRow}>
                          <View style={styles.breakdownLeft}>
                            <View style={[styles.legendDot, { backgroundColor: '#F85149' }]} />
                            <Text style={styles.breakdownText}>Idle Time</Text>
                          </View>
                          <Text style={styles.breakdownVal}>
                            {sessionStats.idleTime} ({visualHistoryStats.idlePct}%)
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Real Historical Logs */}
                  <View style={styles.historySection}>
                    <Text style={styles.historySectionTitle}>Recent History (Past Shifts)</Text>

                    {historyLoading ? (
                      <View style={styles.historyLoadingContainer}>
                        <ActivityIndicator size="small" color={PURPLE} />
                      </View>
                    ) : pastSessionsOnly.length === 0 ? (
                      <View style={styles.emptyHistoryContainer}>
                        <Icon name="calendar" size={wp(10)} color="rgba(255,255,255,0.15)" />
                        <Text style={styles.emptyHistoryText}>No past shift history found.</Text>
                        <Text style={[styles.emptyHistoryText, { fontSize: wp(2.8), color: darkTextSecondaryColor, marginTop: hp(0.5) }]}>
                          Shift records will appear here as you log more days.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.historyList}>
                        {pastSessionsOnly.map((session, index) => {
                          const stats = getHistoricalSessionStats(session);
                          const dateObj = new Date(session.clock_in);
                          const dayText = dateObj.toLocaleDateString([], { weekday: 'short' });
                          const dateText = dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' });
                          const isExpanded = expandedSessionId === session.id;
                          const sessionTasks = isSupabaseConfigured
                            ? getHistoricalTasksForDate(new Date(session.clock_in))
                            : (getMockTasksForDate(new Date(session.clock_in))[session.employee_id] || []);

                          return (
                            <View key={session.id || index} style={[styles.historyItemContainer, isExpanded && styles.activeHistoryItemContainer]}>
                              <TouchableOpacity
                                style={styles.historyItemHeader}
                                onPress={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                activeOpacity={0.85}>
                                <View style={styles.historyDateCol}>
                                  <Text style={styles.historyDay}>{dayText}</Text>
                                  <Text style={styles.historyDate}>{dateText}</Text>
                                </View>
                                <View style={styles.historyStatsCol}>
                                  <View style={styles.historyMiniProgress}>
                                    {stats.workPct > 0 && (
                                      <View style={[styles.miniProgressSegment, { backgroundColor: '#3498DB', flex: stats.workPct }]} />
                                    )}
                                    {stats.meetingPct > 0 && (
                                      <View style={[styles.miniProgressSegment, { backgroundColor: '#9B59B6', flex: stats.meetingPct }]} />
                                    )}
                                    {stats.breakPct > 0 && (
                                      <View style={[styles.miniProgressSegment, { backgroundColor: '#F5C542', flex: stats.breakPct }]} />
                                    )}
                                    {stats.idlePct > 0 && (
                                      <View style={[styles.miniProgressSegment, { backgroundColor: '#F85149', flex: stats.idlePct }]} />
                                    )}
                                  </View>
                                  <View style={styles.historySummaryRow}>
                                    <Text style={styles.historySummaryText} numberOfLines={1}>
                                      Work: {stats.workStr}
                                      {stats.meetingMs > 0 ? ` • Meet: ${stats.meetingStr}` : ''}
                                      {stats.breakMs > 0 ? ` • Break: ${stats.breakStr}` : ''}
                                      {stats.idleMs > 0 ? ` • Idle: ${stats.idleStr}` : ''}
                                    </Text>
                                    <Icon
                                      name={isExpanded ? "chevron-up" : "chevron-down"}
                                      size={wp(3.8)}
                                      color={darkTextSecondaryColor}
                                      style={{ marginLeft: wp(1.5) }}
                                    />
                                  </View>
                                </View>
                              </TouchableOpacity>

                              {isExpanded && (
                                <View style={styles.historyTasksDropdown}>
                                  <Text style={styles.dropdownTitle}>Daily Work Record</Text>
                                  {sessionTasks.length === 0 ? (
                                    <Text style={styles.dropdownEmptyText}>No tasks logged on this day.</Text>
                                  ) : (
                                    <View style={styles.dropdownTasksList}>
                                      {sessionTasks.map(task => {
                                        const taskTotalSecs = task.totalSecs || 0;
                                        const taskTimeStr = taskTotalSecs > 0 ? formatSecsToMinHr(taskTotalSecs) : '0m';

                                        // Status styling inside dropdown
                                        let badgeColor = '#8B949E';
                                        let badgeBg = 'rgba(255, 255, 255, 0.05)';
                                        let label = task.status || 'To Do';

                                        if (task.status === 'in-progress' || task.status === 'doing') {
                                          badgeColor = '#3498DB';
                                          badgeBg = 'rgba(52, 152, 219, 0.15)';
                                          label = 'In Progress';
                                        } else if (task.status === 'ready-for-testing' || task.status === 'testing' || task.status === 'qa') {
                                          badgeColor = '#9B59B6';
                                          badgeBg = 'rgba(155, 89, 182, 0.15)';
                                          label = 'Testing';
                                        } else if (task.status === 'done') {
                                          badgeColor = '#3DDC84';
                                          badgeBg = 'rgba(61, 220, 132, 0.15)';
                                          label = 'Done';
                                        }

                                        const taskDatesLine = buildTaskDatesLine(task);

                                        return (
                                          <View key={task.id} style={styles.dropdownTaskItem}>
                                            <View style={styles.dropdownTaskMain}>
                                              <Text style={styles.dropdownTaskTitle} numberOfLines={1}>
                                                {task.title}
                                              </Text>
                                              <Text style={styles.dropdownTaskProject} numberOfLines={1}>
                                                {task.project_name || task.project || 'General'}
                                              </Text>
                                              {taskDatesLine ? (
                                                <Text style={styles.taskDatesLine} numberOfLines={1}>
                                                  {taskDatesLine}
                                                </Text>
                                              ) : null}
                                            </View>
                                            <View style={styles.dropdownTaskMeta}>
                                              <View style={[styles.dropdownStatusBadge, { backgroundColor: badgeBg }]}>
                                                <Text style={[styles.dropdownStatusText, { color: badgeColor }]}>
                                                  {label}
                                                </Text>
                                              </View>
                                              <Text style={styles.dropdownTaskTime}>{taskTimeStr}</Text>
                                            </View>
                                          </View>
                                        );
                                      })}
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Task Details Modal */}
      {selectedTaskDetail && (
        <Modal
          visible={!!selectedTaskDetail}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSelectedTaskDetail(null)}>
          <View style={styles.taskModalOverlay}>
            <View style={styles.taskModalContainer}>
              {/* Modal Header */}
              <View style={styles.taskModalHeader}>
                <View style={styles.taskModalTitleWrap}>
                  <Text style={styles.taskModalProject}>{selectedTaskDetail.project_name || 'General'}</Text>
                  <Text style={styles.taskModalTitle}>{selectedTaskDetail.title}</Text>
                </View>
                <TouchableOpacity
                  style={styles.taskModalCloseBtn}
                  onPress={() => setSelectedTaskDetail(null)}>
                  <Icon name="x" size={wp(5.5)} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.taskModalBody} showsVerticalScrollIndicator={false}>
                {/* Status and Priority badges */}
                <View style={styles.taskModalBadgesRow}>
                  <View style={[styles.taskModalBadge, { backgroundColor: getStatusBgColor(selectedTaskDetail.status) }]}>
                    <Text style={[styles.taskModalBadgeText, { color: getStatusTextColor(selectedTaskDetail.status) }]}>
                      {getStatusLabel(selectedTaskDetail.status)}
                    </Text>
                  </View>
                  <View style={[styles.taskModalBadge, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                    <Text style={[styles.taskModalBadgeText, { color: getPriorityColor(selectedTaskDetail.priority) }]}>
                      Priority: {selectedTaskDetail.priority ? selectedTaskDetail.priority.toUpperCase() : 'MEDIUM'}
                    </Text>
                  </View>
                  {selectedTaskDetail.estimatedHours ? (
                    <View style={[styles.taskModalBadge, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                      <Text style={[styles.taskModalBadgeText, { color: darkTextSecondaryColor }]}>
                        Est: {selectedTaskDetail.estimatedHours}h
                      </Text>
                    </View>
                  ) : selectedTaskDetail.est ? (
                    <View style={[styles.taskModalBadge, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                      <Text style={[styles.taskModalBadgeText, { color: darkTextSecondaryColor }]}>
                        Est: {selectedTaskDetail.est}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {selectedTaskDatesLine ? (
                  <View style={styles.taskModalSection}>
                    <Text style={styles.taskModalSectionLabel}>Dates</Text>
                    <Text style={styles.taskModalSectionContent}>
                      {selectedTaskDatesLine}
                    </Text>
                  </View>
                ) : null}

                {/* Description */}
                <View style={styles.taskModalSection}>
                  <Text style={styles.taskModalSectionLabel}>Description / Work Notes</Text>
                  <Text style={styles.taskModalSectionContent}>
                    {selectedTaskDetail.work_notes || selectedTaskDetail.description || 'No description provided.'}
                  </Text>
                </View>

                {/* Time Spent Details */}
                <View style={styles.taskModalSection}>
                  <Text style={styles.taskModalSectionLabel}>Time Spent Breakdown</Text>

                  <View style={styles.taskModalTimeBreakdownList}>
                    <View style={styles.taskModalTimeRow}>
                      <View style={styles.taskModalTimeLeft}>
                        <View style={[styles.legendDot, { backgroundColor: '#8B949E' }]} />
                        <Text style={styles.taskModalTimeLabel}>To Do</Text>
                      </View>
                      <Text style={styles.taskModalTimeVal}>{formatSecsToMinHr(selectedTaskDetail.todoSecs)}</Text>
                    </View>

                    <View style={styles.taskModalTimeRow}>
                      <View style={styles.taskModalTimeLeft}>
                        <View style={[styles.legendDot, { backgroundColor: '#3498DB' }]} />
                        <Text style={styles.taskModalTimeLabel}>In Progress</Text>
                      </View>
                      <Text style={styles.taskModalTimeVal}>{formatSecsToMinHr(selectedTaskDetail.progressSecs)}</Text>
                    </View>

                    <View style={styles.taskModalTimeRow}>
                      <View style={styles.taskModalTimeLeft}>
                        <View style={[styles.legendDot, { backgroundColor: '#9B59B6' }]} />
                        <Text style={styles.taskModalTimeLabel}>QA / Testing</Text>
                      </View>
                      <Text style={styles.taskModalTimeVal}>{formatSecsToMinHr(selectedTaskDetail.testingSecs)}</Text>
                    </View>

                    <View style={styles.taskModalTimeRow}>
                      <View style={styles.taskModalTimeLeft}>
                        <View style={[styles.legendDot, { backgroundColor: '#3DDC84' }]} />
                        <Text style={styles.taskModalTimeLabel}>Done</Text>
                      </View>
                      <Text style={styles.taskModalTimeVal}>{formatSecsToMinHr(selectedTaskDetail.doneSecs)}</Text>
                    </View>
                  </View>

                  <View style={styles.taskModalTotalRow}>
                    <Text style={styles.taskModalTotalLabel}>Total Time Spent</Text>
                    <Text style={styles.taskModalTotalVal}>{formatSecsToMinHr(selectedTaskDetail.totalSecs)}</Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalCard}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filters</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(5.5)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterModalScroll}>
              {/* Date */}
              <Text style={styles.filterGroupLabel}>Date</Text>
              <TouchableOpacity
                style={styles.filterDateRow}
                onPress={() => { setShowFilterModal(false); setShowDatePicker(true); }}
                activeOpacity={0.85}>
                <Icon name="calendar" size={wp(4) } color={PURPLE} />
                <Text style={styles.filterDateText}>{formatSelectedDateDisplay(selectedDate)}</Text>
                {!isTodaySelected && (
                  <TouchableOpacity onPress={() => setSelectedDate(new Date())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.filterDateTodayBtn}>Today</Text>
                  </TouchableOpacity>
                )}
                <Icon name="chevron-right" size={wp(4)} color={darkTextSecondaryColor} />
              </TouchableOpacity>

              {/* Status */}
              <Text style={styles.filterGroupLabel}>Status</Text>
              <View style={styles.filterChipWrap}>
                {TRACKER_STATUS_FILTERS.map(filter => {
                  const isActive = trackerFilter === filter.id;

                  return (
                    <TouchableOpacity
                      key={filter.id}
                      style={[styles.statusFilterChip, isActive && styles.activeStatusFilterChip]}
                      onPress={() => setTrackerFilter(filter.id)}
                      activeOpacity={0.85}>
                      <Icon name={filter.icon} size={wp(3)} color={isActive ? '#ffffff' : filter.color} />
                      <Text style={[styles.statusFilterChipText, isActive && styles.activeStatusFilterChipText]}>
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Department */}
              {departments.length > 0 && (
                <>
                  <Text style={styles.filterGroupLabel}>Department</Text>
                  <View style={styles.filterChipWrap}>
                    <TouchableOpacity
                      style={[styles.deptFilterChip, !selectedDepartment && styles.activeDeptFilterChip]}
                      onPress={() => setSelectedDepartment(null)}
                      activeOpacity={0.85}>
                      <Icon name="layers" size={wp(3)} color={!selectedDepartment ? '#ffffff' : PURPLE} />
                      <Text style={[styles.deptFilterChipText, !selectedDepartment && styles.activeDeptFilterChipText]}>
                        All Depts
                      </Text>
                    </TouchableOpacity>
                    {departments.map(dept => {
                      const isActive = selectedDepartment === dept;

                      return (
                        <TouchableOpacity
                          key={dept}
                          style={[styles.deptFilterChip, isActive && styles.activeDeptFilterChip]}
                          onPress={() => setSelectedDepartment(isActive ? null : dept)}
                          activeOpacity={0.85}>
                          <Icon name="briefcase" size={wp(3)} color={isActive ? '#ffffff' : darkTextSecondaryColor} />
                          <Text style={[styles.deptFilterChipText, isActive && styles.activeDeptFilterChipText]}>
                            {dept}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterResetBtn}
                onPress={clearAllFilters}
                activeOpacity={0.85}>
                <Icon name="rotate-ccw" size={wp(3.8)} color="#F85149" />
                <Text style={styles.filterResetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyBtn}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.85}>
                <Text style={styles.filterApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.calendarOverlay}
          onPress={() => setShowDatePicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.calendarCard} onPress={() => { }}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(5)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>

            <Calendar
              maxDate={getLocalDateKey(new Date())}
              current={getLocalDateKey(selectedDate)}
              markedDates={{
                [getLocalDateKey(selectedDate)]: {
                  selected: true,
                  selectedColor: PURPLE,
                  selectedTextColor: '#ffffff',
                },
              }}
              onDayPress={(day) => {
                setSelectedDate(new Date(day.timestamp));
                setShowDatePicker(false);
              }}
              theme={{
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
              }}
              style={styles.calendarComponent}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default ShiftTrackerScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingTop: hp(1.5),
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingVertical: hp(1.4),
    marginBottom: hp(2),
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: darkBorderColor,
  },
  statCount: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightBold,
    color: '#ffffff',
  },
  statLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.3),
  },
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  searchContainerMain: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkSurfaceColor,
    paddingHorizontal: wp(3),
    height: hp(5.6),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  filterOpenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    height: hp(5.6),
    backgroundColor: darkSurfaceColor,
    paddingHorizontal: wp(2),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  filterOpenBtnText: {
    ...style.fontSizeSmall,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  filterOpenBtnActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  filterCountBadgeOnPurple: {
    minWidth: wp(4.5),
    height: wp(4.5),
    borderRadius: wp(2.25),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1),
  },
  filterCountBadgeOnPurpleText: {
    fontSize: wp(2.7),
    fontWeight: '700',
    color: PURPLE,
  },
  filterOpenBtnTextActive: {
    color: '#ffffff',
  },
  filterCountBadge: {
    minWidth: wp(4.8),
    height: wp(4.8),
    borderRadius: wp(2.4),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1),
  },
  filterCountBadgeText: {
    fontSize: wp(2.7),
    fontWeight: '700',
    color: '#ffffff',
  },
  filterClearBtn: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.35)',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  filterModalCard: {
    backgroundColor: darkBackgroundColor,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: darkBorderColor,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  filterModalTitle: {
    ...style.fontSizeLarge,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
  },
  filterModalScroll: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(2),
  },
  filterGroupLabel: {
    fontSize: wp(2.9),
    ...style.fontWeightBold,
    color: darkTextSecondaryColor,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: hp(2),
    marginBottom: hp(1),
  },
  filterChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  filterDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    backgroundColor: darkSurfaceColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.4),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  filterDateText: {
    flex: 1,
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  filterDateTodayBtn: {
    fontSize: wp(3),
    color: PURPLE,
    ...style.fontWeightBold,
  },
  filterModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    paddingHorizontal: wp(5),
    paddingTop: hp(1.5),
    paddingBottom: hp(3),
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
  },
  filterResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.4)',
    backgroundColor: 'rgba(248, 81, 73, 0.08)',
  },
  filterResetBtnText: {
    ...style.fontSizeNormal,
    color: '#F85149',
    ...style.fontWeightMedium,
  },
  filterApplyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.6),
    borderRadius: wp(2.5),
    backgroundColor: PURPLE,
  },
  filterApplyBtnText: {
    ...style.fontSizeNormal,
    ...style.fontWeightBold,
    color: '#ffffff',
  },
  deptFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2.4),
    paddingVertical: hp(0.55),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  activeDeptFilterChip: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  deptFilterChipText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    ...style.fontWeightMedium,
  },
  activeDeptFilterChipText: {
    color: '#ffffff',
  },
  timeAxisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: hp(0.8),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: hp(1),
  },
  axisSpacer: {
    width: wp(30),
  },
  axisScaleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(1.5),
  },
  axisScaleText: {
    fontSize: wp(2.5),
    color: darkTextSecondaryColor,
    opacity: 0.85,
  },
  axisRightSpacer: {
    width: wp(14),
  },
  listContainer: {
    paddingBottom: hp(6),
    gap: hp(1.2),
  },
  employeeCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(3.5),
  },
  employeeMeta: {
    width: wp(24),
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
    fontSize: wp(2.3),
    color: darkTextSecondaryColor,
    opacity: 0.8,
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
  productivityWrapper: {
    width: wp(14),
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(8),
    gap: hp(1.4),
  },
  emptyTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  emptySubtitle: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    textAlign: 'center',
  },

  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4.5),
    paddingTop: Platform.OS === 'ios' ? hp(7) : hp(1.8),
    paddingBottom: hp(1.8),
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  modalHeaderMeta: {
    flex: 1,
    paddingLeft: wp(3),
    gap: hp(0.3),
  },
  modalEmployeeName: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightBold,
    color: '#ffffff',
  },
  modalEmployeeSubtitle: {
    fontSize: wp(2.8),
    color: darkTextSecondaryColor,
    opacity: 0.9,
  },
  modalBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.8),
    marginTop: hp(0.6),
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: wp(1),
    gap: wp(1.2),
  },
  badgeDot: {
    width: wp(1.6),
    height: wp(1.6),
    borderRadius: wp(0.8),
  },
  badgeText: {
    fontSize: wp(2.6),
    color: darkTextPrimaryColor,
    fontWeight: '500',
  },
  modalCloseBtn: {
    padding: wp(2.5),
  },
  modalTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  modalTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeModalTab: {
    borderBottomColor: '#58A6FF',
  },
  modalTabText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextSecondaryColor,
  },
  activeModalTabText: {
    color: '#58A6FF',
  },
  modalScroll: {
    flex: 1,
  },
  tabContentContainer: {
    paddingHorizontal: wp(4.5),
    paddingTop: hp(2),
    paddingBottom: hp(4),
  },
  liveActivityBox: {
    backgroundColor: '#161B22',
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#30363D',
    padding: wp(4),
    marginBottom: hp(2),
    gap: hp(1.4),
  },
  liveActivityTitle: {
    fontSize: wp(2.8),
    fontWeight: '700',
    color: '#8B949E',
    letterSpacing: 0.5,
  },
  liveActivityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveColumn: {
    flex: 1,
    gap: hp(1.4),
  },
  liveItem: {
    flexDirection: 'row',
    gap: wp(2.2),
    alignItems: 'flex-start',
    paddingRight: wp(2),
  },
  liveItemTexts: {
    flex: 1,
    gap: hp(0.2),
  },
  liveItemLabel: {
    fontSize: wp(2.5),
    color: darkTextSecondaryColor,
  },
  liveItemValue: {
    fontSize: wp(2.8),
    fontWeight: '500',
    color: darkTextPrimaryColor,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: wp(2.5),
    marginBottom: hp(2.2),
  },
  metricCard: {
    width: wp(43.8),
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderRadius: wp(2.5),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(3.5),
    gap: hp(0.4),
  },
  metricValue: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
    marginTop: hp(0.4),
  },
  metricLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  modalTimelineBox: {
    backgroundColor: '#161B22',
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#30363D',
    padding: wp(4),
    marginBottom: hp(2.5),
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  timelineTitle: {
    fontSize: wp(2.8),
    fontWeight: '600',
    color: darkTextPrimaryColor,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
    marginBottom: hp(1.4),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
  },
  legendDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
  },
  legendText: {
    fontSize: wp(2.5),
    color: darkTextSecondaryColor,
  },
  modalTimelineBarWrapper: {
    height: hp(3.2),
    justifyContent: 'center',
    marginVertical: hp(0.8),
  },
  modalTimeAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(0.6),
    paddingHorizontal: wp(1),
  },
  modalAxisText: {
    fontSize: wp(2.3),
    color: darkTextSecondaryColor,
    opacity: 0.8,
  },
  modalLogSection: {
    gap: hp(1.6),
  },
  modalLogSectionTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
  },
  modalNoSegmentsText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    fontStyle: 'italic',
  },
  logTimelineList: {
    paddingLeft: wp(1),
  },
  modalLogItem: {
    flexDirection: 'row',
    minHeight: hp(5.5),
  },
  logLeftCol: {
    alignItems: 'center',
    width: wp(6),
  },
  logVerticalLine: {
    position: 'absolute',
    top: wp(2.5),
    bottom: 0,
    width: 2,
    backgroundColor: '#30363D',
    zIndex: 1,
  },
  modalLogContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: wp(2),
    paddingBottom: hp(1.2),
  },
  modalLogTime: {
    width: wp(16),
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
  },
  modalLogMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  modalLogText: {
    fontSize: wp(2.8),
    color: darkTextPrimaryColor,
  },
  modalLogDuration: {
    fontSize: wp(2.5),
    color: darkTextSecondaryColor,
  },
  ongoingBadge: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    paddingHorizontal: wp(1.8),
    paddingVertical: hp(0.3),
    borderRadius: wp(0.8),
  },
  ongoingBadgeText: {
    fontSize: wp(2.4),
    color: '#3498DB',
    fontWeight: '500',
  },
  modalLogRightText: {
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
    textAlign: 'right',
  },
  breakdownCard: {
    backgroundColor: '#161B22',
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#30363D',
    padding: wp(4),
    marginBottom: hp(2.5),
  },
  breakdownCardTitle: {
    fontSize: wp(2.8),
    fontWeight: '700',
    color: '#8B949E',
    letterSpacing: 0.5,
    marginBottom: hp(1.4),
  },
  chartBarContainer: {
    flexDirection: 'row',
    height: hp(2.4),
    borderRadius: wp(1.2),
    overflow: 'hidden',
    marginBottom: hp(2.2),
  },
  chartBarSegment: {
    height: '100%',
  },
  breakdownList: {
    gap: hp(1.2),
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  breakdownText: {
    fontSize: wp(2.8),
    color: darkTextPrimaryColor,
  },
  breakdownVal: {
    fontSize: wp(2.8),
    fontWeight: '500',
    color: darkTextPrimaryColor,
  },
  historySection: {
    gap: hp(1.6),
  },
  historySectionTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
  },
  historyList: {
    gap: hp(1.4),
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#30363D',
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3.5),
    alignItems: 'center',
  },
  historyDateCol: {
    width: wp(20),
    borderRightWidth: 1,
    borderRightColor: '#30363D',
    paddingRight: wp(2),
    gap: hp(0.2),
  },
  historyDay: {
    fontSize: wp(2.8),
    fontWeight: '600',
    color: darkTextPrimaryColor,
  },
  historyDate: {
    fontSize: wp(2.5),
    color: darkTextSecondaryColor,
  },
  historyStatsCol: {
    flex: 1,
    paddingLeft: wp(3),
    gap: hp(0.8),
  },
  historyMiniProgress: {
    flexDirection: 'row',
    height: hp(0.8),
    borderRadius: wp(0.4),
    overflow: 'hidden',
    backgroundColor: '#30363D',
  },
  miniProgressSegment: {
    height: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkSurfaceColor,
    paddingHorizontal: wp(3),
    height: hp(5.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  searchIcon: {
    marginRight: wp(2),
  },
  searchInput: {
    flex: 1,
    color: darkTextPrimaryColor,
    ...style.fontSizeNormal,
    height: '100%',
  },
  historySummaryText: {
    fontSize: wp(2.5),
    color: darkTextSecondaryColor,
    opacity: 0.95,
  },
  historyLoadingContainer: {
    paddingVertical: hp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryContainer: {
    backgroundColor: '#161B22',
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#30363D',
    paddingVertical: hp(4),
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(1),
  },
  emptyHistoryText: {
    ...style.fontSizeSmall2x,
    color: darkTextPrimaryColor,
    textAlign: 'center',
  },
  tasksSectionCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(2),
    marginBottom: hp(2),
  },
  tasksSectionTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
  },
  tasksSectionSubtitle: {
    fontSize: wp(2.8),
    color: darkTextSecondaryColor,
    marginTop: hp(0.3),
    marginBottom: hp(1.8),
  },
  tasksTabLoader: {
    marginVertical: hp(4),
  },
  tasksEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(5),
    gap: hp(1.2),
  },
  tasksEmptyText: {
    fontSize: wp(2.8),
    color: darkTextSecondaryColor,
    textAlign: 'center',
  },
  tasksListContainer: {
    gap: hp(1.2),
  },
  taskItemCard: {
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.8),
    paddingVertical: hp(1.4),
  },
  activeTaskItemCard: {
    borderColor: 'rgba(52, 152, 219, 0.4)',
    borderWidth: 1.5,
  },
  taskItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: wp(2.5),
  },
  taskItemTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
    flex: 1,
  },
  taskStatusBadge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: wp(1),
  },
  taskStatusText: {
    fontSize: wp(2.5),
    fontWeight: '500',
  },
  taskItemDesc: {
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
    opacity: 0.8,
    marginTop: hp(0.6),
    lineHeight: hp(1.8),
  },
  taskDatesLine: {
    fontSize: wp(2.4),
    color: darkTextSecondaryColor,
    opacity: 0.85,
    marginTop: hp(0.4),
  },
  taskItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(1.4),
    paddingTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  taskFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.8),
    flex: 1,
  },
  taskProjectText: {
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
    maxWidth: wp(30),
  },
  footerBullet: {
    width: wp(1),
    height: wp(1),
    borderRadius: wp(0.5),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  taskPriorityText: {
    fontSize: wp(2.4),
    fontWeight: '500',
  },
  taskTimeTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
  },
  taskTimeText: {
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(1.2),
    marginBottom: hp(1.8),
    gap: wp(1.8),
  },
  modeTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    borderRadius: wp(1.8),
    gap: wp(2),
  },
  activeModeTab: {
    backgroundColor: PURPLE,
  },
  modeTabText: {
    fontSize: wp(2.8),
    fontWeight: '600',
    color: darkTextSecondaryColor,
  },
  activeModeTabText: {
    color: '#ffffff',
  },
  taskModeRowContainer: {
    flexDirection: 'row',
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(3.5),
    gap: wp(3.5),
  },
  taskModeEmpCol: {
    width: wp(24),
    alignItems: 'center',
    gap: hp(0.5),
  },
  taskModeEmpMeta: {
    alignItems: 'center',
    gap: hp(0.3),
  },
  taskModeWorkTime: {
    fontSize: wp(2.5),
    color: '#3DDC84',
    fontWeight: '500',
  },
  taskModeTotalHours: {
    fontSize: wp(2.8),
    fontWeight: '600',
    color: '#3498DB',
  },
  taskModeTasksCol: {
    flex: 1,
    gap: hp(1.6),
  },
  taskModeEmptyTasks: {
    paddingVertical: hp(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskModeEmptyText: {
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
  },
  taskModeTasksList: {
    gap: hp(1.6),
  },
  taskExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(0.8),
    marginTop: hp(0.4),
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.35)',
    backgroundColor: 'rgba(155, 89, 182, 0.08)',
  },
  taskExpandBtnText: {
    fontSize: wp(2.8),
    color: PURPLE,
    ...style.fontWeightMedium,
  },
  taskModeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: hp(1.2),
  },
  taskModeItemContent: {
    flex: 1,
    gap: hp(0.5),
  },
  taskModeItemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: wp(2),
  },
  taskModeItemTitle: {
    fontSize: wp(2.8),
    fontWeight: '600',
    color: darkTextPrimaryColor,
    flex: 1,
  },
  taskModeItemProject: {
    fontSize: wp(2.4),
    color: darkTextSecondaryColor,
    opacity: 0.85,
  },
  taskModeProgressBarWrapper: {
    height: hp(1.6),
    borderRadius: wp(0.8),
    overflow: 'hidden',
    backgroundColor: '#21262D',
  },
  taskModeProgressBar: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  taskModeBarSegment: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskModeBarText: {
    fontSize: wp(2),
    color: '#ffffff',
    fontWeight: '600',
  },
  taskModeItemDetails: {
    fontSize: wp(2.3),
    color: darkTextSecondaryColor,
    opacity: 0.8,
  },
  taskModeStatusBadge: {
    paddingHorizontal: wp(1.8),
    paddingVertical: hp(0.4),
    borderRadius: wp(0.8),
    width: wp(18),
    alignItems: 'center',
  },
  taskModeStatusText: {
    fontSize: wp(2.4),
    fontWeight: '600',
  },
  taskModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(5),
  },
  taskModalContainer: {
    width: '100%',
    maxHeight: hp(75),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    overflow: 'hidden',
  },
  taskModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  taskModalTitleWrap: {
    flex: 1,
    gap: hp(0.2),
  },
  taskModalProject: {
    fontSize: wp(2.6),
    color: '#3498DB',
    fontWeight: '600',
  },
  taskModalTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
    marginTop: hp(0.3),
  },
  taskModalCloseBtn: {
    padding: wp(1.5),
  },
  taskModalBody: {
    padding: wp(5),
  },
  taskModalBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(2),
  },
  taskModalBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(1),
  },
  taskModalBadgeText: {
    fontSize: wp(2.6),
    fontWeight: '500',
  },
  taskModalSection: {
    marginBottom: hp(2.5),
    gap: hp(0.8),
  },
  taskModalSectionLabel: {
    fontSize: wp(2.8),
    fontWeight: '700',
    color: '#8B949E',
    letterSpacing: 0.5,
  },
  taskModalSectionContent: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    lineHeight: hp(2.2),
  },
  taskModalTimeBreakdownList: {
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(3.5),
    gap: hp(1.2),
  },
  taskModalTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskModalTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.2),
  },
  taskModalTimeLabel: {
    fontSize: wp(2.8),
    color: darkTextPrimaryColor,
  },
  taskModalTimeVal: {
    fontSize: wp(2.8),
    fontWeight: '500',
    color: darkTextPrimaryColor,
  },
  taskModalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(1.4),
    paddingHorizontal: wp(3.5),
  },
  taskModalTotalLabel: {
    fontSize: wp(2.8),
    fontWeight: '700',
    color: '#3498DB',
  },
  taskModalTotalVal: {
    fontSize: wp(3),
    fontWeight: '700',
    color: '#3498DB',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusFilterScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  statusFilterScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.4),
    paddingVertical: hp(0.5),
  },
  employeeFilterScroll: {
    flex: 1,
  },
  statusFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.4),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  activeStatusFilterChip: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  statusFilterChipText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    ...style.fontWeightMedium,
  },
  activeStatusFilterChipText: {
    color: '#ffffff',
  },
  scrollDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE,
    borderRadius: wp(4),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: wp(1.5),
  },
  scrollDateChipText: {
    fontSize: wp(2.5),
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollChipDivider: {
    width: 1,
    height: hp(2.5),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: wp(2),
    alignSelf: 'center',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(4),
  },
  calendarCard: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  calendarTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  calendarComponent: {
    borderRadius: wp(3),
    overflow: 'hidden',
  },
  employeeSelectorScroll: {
    flexDirection: 'row',
    gap: wp(1.8),
    paddingVertical: hp(0.3),
  },
  employeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(4),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    gap: wp(1.5),
  },
  activeEmployeeChip: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  employeeChipText: {
    fontSize: wp(2.5),
    fontWeight: '500',
    color: darkTextSecondaryColor,
  },
  activeEmployeeChipText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  allStaffIconBg: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeAllStaffIconBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardActiveTaskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.5),
  },
  idleFooter: {
    backgroundColor: 'rgba(248, 81, 73, 0.02)',
  },
  activeTaskIndicatorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: wp(3),
  },
  pulseDot: {
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(0.9),
    backgroundColor: '#3498DB',
    marginRight: wp(1.5),
  },
  activeTaskPrefix: {
    fontSize: wp(2.6),
    fontWeight: '600',
    color: '#3498DB',
  },
  activeTaskTitle: {
    fontSize: wp(2.6),
    color: darkTextPrimaryColor,
    flex: 1,
  },
  activeTaskTime: {
    fontSize: wp(2.5),
    fontWeight: '600',
    color: '#3498DB',
  },
  activeTaskModeItemRow: {
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    borderColor: 'rgba(52, 152, 219, 0.25)',
    borderWidth: 1,
    borderRadius: wp(1.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
    marginBottom: hp(0.5),
  },
  // Expanded Accordion Styles
  historyItemContainer: {
    backgroundColor: '#161B22',
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#30363D',
    overflow: 'hidden',
  },
  activeHistoryItemContainer: {
    borderColor: 'rgba(52, 152, 219, 0.3)',
  },
  historyItemHeader: {
    flexDirection: 'row',
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3.5),
    alignItems: 'center',
  },
  historySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingRight: wp(2),
  },
  historyTasksDropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderTopWidth: 1,
    borderTopColor: '#30363D',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.5),
  },
  dropdownTitle: {
    fontSize: wp(2.6),
    fontWeight: '700',
    color: '#8B949E',
    letterSpacing: 0.5,
    marginBottom: hp(1),
    textTransform: 'uppercase',
  },
  dropdownEmptyText: {
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
    fontStyle: 'italic',
    paddingVertical: hp(0.5),
  },
  dropdownTasksList: {
    gap: hp(1.2),
  },
  dropdownTaskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: wp(1.5),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  dropdownTaskMain: {
    flex: 1,
    paddingRight: wp(2),
    gap: hp(0.2),
  },
  dropdownTaskTitle: {
    fontSize: wp(2.8),
    fontWeight: '600',
    color: darkTextPrimaryColor,
  },
  dropdownTaskProject: {
    fontSize: wp(2.4),
    color: darkTextSecondaryColor,
    opacity: 0.8,
  },
  dropdownTaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  dropdownStatusBadge: {
    paddingHorizontal: wp(1.8),
    paddingVertical: hp(0.3),
    borderRadius: wp(0.8),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: wp(15),
  },
  dropdownStatusText: {
    fontSize: wp(2.2),
    fontWeight: '600',
  },
  dropdownTaskTime: {
    fontSize: wp(2.6),
    fontWeight: '600',
    color: darkTextPrimaryColor,
    minWidth: wp(10),
    textAlign: 'right',
  },
});
