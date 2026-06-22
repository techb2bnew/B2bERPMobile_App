import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import TaskDetailModal from '../../components/Modal/TaskDetailModal';
import TaskFilterModal from '../../components/Modal/TaskFilterModal';
import { useAuth } from '../../context/AuthContext';
import {
  TASK_ADD_CARD,
  TASK_ASSIGNED_TO_LABEL,
  TASK_FILTER_ALL_PRIORITIES,
  TASK_FILTER_ALL_STATUSES,
  TASK_FILTER_BUTTON,
  TASK_FILTER_DONE,
  TASK_FILTER_IN_PROGRESS,
  TASK_FILTER_TODO,
  TASK_MANAGEMENT_TITLE,
  TASK_NEW_BUTTON,
  TASK_STATUS_READY_FOR_TESTING,
  TASK_STATUS_REVIEW,
  TASK_VIEW_KANBAN,
  TASK_VIEW_LIST,
} from '../../constants/Constants';
import {
  darkAccentGreenColor,
  darkBackgroundColor,
  darkBorderColor,
  darkElevatedColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import {
  createProjectTask,
  fetchInProgressTaskForAssignee,
  fetchProjectTasksForProject,
  fetchProjectTasksForUser,
  mapProjectTaskRowToApp,
  subscribeToProjectTasksChanges,
  subscribeToUserProjectTasksChanges,
  updateProjectTask,
  updateProjectTaskStatus,
} from '../../services/projectTasksService';
import { fetchAllEmployeeProfiles } from '../../services/employeeService';
import { fetchAllProjects } from '../../services/projectsService';
import { syncSupabaseRealtimeAuth } from '../../lib/supabase';
import { isEmployeeUser, isTeamLeaderUser } from '../../constants/roles';
import { buildEmployeeNameMap, buildInProgressConflictMessage, normalizeAssigneeIds, rowAssignedToUserId } from '../../utils/projectUtils';
import { getFirstName, heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const TASKS_POLL_INTERVAL_MS = 5000;

const PURPLE = '#9B59B6';
const BLUE = '#2D7DD2';
const ORANGE = '#F47C20';

const EMPLOYEE_KANBAN_COLUMNS = [
  TASK_FILTER_TODO,
  TASK_FILTER_IN_PROGRESS,
  TASK_STATUS_READY_FOR_TESTING,
];

const REVIEWER_KANBAN_COLUMNS = [
  TASK_FILTER_TODO,
  TASK_FILTER_IN_PROGRESS,
  TASK_STATUS_READY_FOR_TESTING,
  TASK_STATUS_REVIEW,
  TASK_FILTER_DONE,
];

const COLUMN_COLORS = {
  [TASK_FILTER_TODO]: darkTextSecondaryColor,
  [TASK_FILTER_IN_PROGRESS]: BLUE,
  [TASK_STATUS_READY_FOR_TESTING]: PURPLE,
  [TASK_STATUS_REVIEW]: ORANGE,
  [TASK_FILTER_DONE]: darkAccentGreenColor,
};

const EMPLOYEE_HIDDEN_STATUSES = [TASK_FILTER_DONE, TASK_STATUS_REVIEW];

const PRIORITY_STYLES = {
  low: { bg: 'rgba(148, 163, 184, 0.2)', color: '#94a3b8' },
  medium: { bg: 'rgba(245, 166, 35, 0.2)', color: '#F5A623' },
  high: { bg: 'rgba(248, 81, 73, 0.2)', color: '#F85149' },
};

const DEFAULT_FILTERS = {
  search: '',
  priority: TASK_FILTER_ALL_PRIORITIES,
  status: TASK_FILTER_ALL_STATUSES,
};

const TaskManagementScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { projectId, projectName } = route.params || {};

  const displayName = getFirstName(user?.name || 'User').toLowerCase();
  const defaultAssignee = user?.name || displayName;
  const defaultAssigneeId = user?.id || '';
  const isEmployee = isEmployeeUser(user);
  const isReviewer = isTeamLeaderUser(user);

  const kanbanColumns = useMemo(() => {
    if (isReviewer) {
      return REVIEWER_KANBAN_COLUMNS;
    }
    return EMPLOYEE_KANBAN_COLUMNS;
  }, [isReviewer]);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formMode, setFormMode] = useState('edit');
  const [defaultStatus, setDefaultStatus] = useState(TASK_FILTER_TODO);
  const [formVisible, setFormVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeView, setActiveView] = useState(TASK_VIEW_KANBAN);
  const [dragState, setDragState] = useState(null);
  const [hoverColumn, setHoverColumn] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  const columnRefs = useRef({});
  const dragStateRef = useRef(null);
  const cardDragTimers = useRef({});
  const cardTouchStart = useRef({});
  const taskMetaRef = useRef({ name: '', assigneeName: '' });
  const employeeNameMapRef = useRef({});
  const projectNameByIdRef = useRef({});
  const isSavingRef = useRef(false);
  const pendingRealtimeRefreshRef = useRef(false);

  const taskMeta = useMemo(
    () => ({
      name: projectName || '',
      assigneeName: defaultAssignee,
    }),
    [defaultAssignee, projectName],
  );

  taskMetaRef.current = taskMeta;

  useEffect(() => {
    isSavingRef.current = saving;
  }, [saving]);

  const loadProjectTasks = useCallback(
    async ({ silent = false } = {}) => {
      if (!projectId || !defaultAssigneeId) {
        setTasks([]);
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const [rows, employees, allProjects] = await Promise.all([
          isReviewer
            ? fetchProjectTasksForProject(projectId)
            : fetchProjectTasksForUser(projectId, defaultAssigneeId),
          fetchAllEmployeeProfiles(),
          fetchAllProjects(),
        ]);
        const employeeNameMap = buildEmployeeNameMap(employees);
        employeeNameMapRef.current = employeeNameMap;
        projectNameByIdRef.current = allProjects.reduce((map, project) => {
          if (project?.id) {
            map[project.id] = project.name || '';
          }
          return map;
        }, {});
        setEmployeeOptions(
          employees
            .filter(employee => employee?.id)
            .map(employee => ({ id: employee.id, name: employee.name || 'Employee' })),
        );

        setTasks(
          rows.map(row =>
            mapProjectTaskRowToApp(row, {
              name: taskMeta.name || projectName || '',
              employeeNameMap,
              assigneeName: employeeNameMap[row.assignee_id] || taskMeta.assigneeName,
            }),
          ),
        );
      } catch (error) {
        Alert.alert('Load Failed', error?.message || 'Unable to load project tasks.');
        setTasks([]);
      } finally {
        setLoading(false);
      }
    },
    [defaultAssigneeId, isReviewer, projectId, taskMeta],
  );

  const flushPendingRealtimeRefresh = useCallback(() => {
    if (pendingRealtimeRefreshRef.current) {
      pendingRealtimeRefreshRef.current = false;
      loadProjectTasks({ silent: true });
    }
  }, [loadProjectTasks]);

  const applyRealtimePayloadRef = useRef(null);

  const applyRealtimePayload = useCallback(
    payload => {
      if (isSavingRef.current) {
        pendingRealtimeRefreshRef.current = true;
        return;
      }

      const eventType = payload?.eventType;
      const deletedId = payload?.old?.id;

      if (eventType === 'DELETE' && deletedId) {
        setTasks(prev => prev.filter(task => task.id !== deletedId));
        return;
      }

      const row = payload?.new;
      if (!row) {
        loadProjectTasks({ silent: true });
        return;
      }

      if (row.project_id !== projectId) {
        setTasks(prev => prev.filter(task => task.id !== row.id));
        return;
      }

      if (!isReviewer && !rowAssignedToUserId(row, defaultAssigneeId)) {
        setTasks(prev => prev.filter(task => task.id !== row.id));
        return;
      }

      const appTask = mapProjectTaskRowToApp(row, {
        name: taskMetaRef.current.name || projectName || '',
        employeeNameMap: employeeNameMapRef.current,
        assigneeName:
          employeeNameMapRef.current[row.assignee_id] || taskMetaRef.current.assigneeName,
      });

      if (isEmployee && EMPLOYEE_HIDDEN_STATUSES.includes(appTask.status)) {
        setTasks(prev => prev.filter(task => task.id !== row.id));
        return;
      }

      setTasks(prev => {
        const exists = prev.some(task => task.id === row.id);

        if (eventType === 'INSERT' && !exists) {
          return [...prev, appTask];
        }

        if (!exists) {
          return [...prev, appTask];
        }

        return prev.map(task => (task.id === row.id ? appTask : task));
      });
    },
    [defaultAssigneeId, isEmployee, isReviewer, loadProjectTasks, projectId],
  );

  applyRealtimePayloadRef.current = applyRealtimePayload;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refreshTasks = () => {
        if (active) {
          loadProjectTasks({ silent: true });
        }
      };

      loadProjectTasks();
      syncSupabaseRealtimeAuth().catch(() => {});

      const pollTimer = setInterval(refreshTasks, TASKS_POLL_INTERVAL_MS);

      const appStateSub = AppState.addEventListener('change', nextState => {
        if (nextState === 'active') {
          syncSupabaseRealtimeAuth().catch(() => {});
          refreshTasks();
        }
      });

      return () => {
        active = false;
        clearInterval(pollTimer);
        appStateSub.remove();
      };
    }, [loadProjectTasks]),
  );

  useEffect(() => {
    if (!projectId || !defaultAssigneeId) {
      return undefined;
    }

    const onRealtimeChange = payload => {
      applyRealtimePayloadRef.current?.(payload);
    };

    const unsubscribe = isReviewer
      ? subscribeToProjectTasksChanges(projectId, onRealtimeChange)
      : subscribeToUserProjectTasksChanges(projectId, defaultAssigneeId, onRealtimeChange);

    return unsubscribe;
  }, [defaultAssigneeId, isReviewer, projectId]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count += 1;
    if (filters.priority !== TASK_FILTER_ALL_PRIORITIES) count += 1;
    if (filters.status !== TASK_FILTER_ALL_STATUSES) count += 1;
    return count;
  }, [filters]);

  const filteredTasks = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const visibleTasks = isEmployee
      ? tasks.filter(task => !EMPLOYEE_HIDDEN_STATUSES.includes(task.status))
      : tasks;

    return visibleTasks.filter(task => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.assignee || '').toLowerCase().includes(query) ||
        (task.project || '').toLowerCase().includes(query);

      const matchesPriority =
        filters.priority === TASK_FILTER_ALL_PRIORITIES ||
        task.priority === filters.priority;

      const matchesStatus =
        filters.status === TASK_FILTER_ALL_STATUSES || task.status === filters.status;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [isEmployee, tasks, filters]);

  const tasksByColumn = useMemo(() => {
    return kanbanColumns.reduce((acc, column) => {
      acc[column] = filteredTasks.filter(task => task.status === column);
      return acc;
    }, {});
  }, [filteredTasks, kanbanColumns]);

  const openCreateTask = (status = TASK_FILTER_TODO) => {
    setFormMode('create');
    setSelectedTask({
      assignee: defaultAssignee,
      assigneeId: defaultAssigneeId,
      assigneeIds: isEmployee && defaultAssigneeId ? [defaultAssigneeId] : [],
    });
    setDefaultStatus(status);
    setFormVisible(true);
  };

  const openEditTask = task => {
    setFormMode('edit');
    setSelectedTask(task);
    setFormVisible(true);
  };

  const showInProgressConflictAlert = useCallback(
    existingTask => {
      const userName = user?.name || 'User';
      Alert.alert(
        '⚠️ Task in Progress',
        buildInProgressConflictMessage({
          userName,
          existingTask,
          isEmployee,
        }),
      );
    },
    [isEmployee, user?.name],
  );

  const findGlobalInProgressConflict = useCallback(
    async (excludeTaskId, assigneeIds) => {
      if (!defaultAssigneeId || !assigneeIds.includes(defaultAssigneeId)) {
        return null;
      }

      return fetchInProgressTaskForAssignee(defaultAssigneeId, {
        excludeTaskId,
        projectNameById: projectNameByIdRef.current,
      });
    },
    [defaultAssigneeId],
  );

  const moveTaskToColumn = useCallback(
    async (taskId, newStatus) => {
      if (isEmployee && EMPLOYEE_HIDDEN_STATUSES.includes(newStatus)) {
        return;
      }

      if (newStatus === TASK_FILTER_IN_PROGRESS) {
        const taskBeingMoved = tasks.find(task => task.id === taskId);
        const assigneeIds = normalizeAssigneeIds(
          taskBeingMoved?.assigneeIds,
          taskBeingMoved?.assigneeId || defaultAssigneeId,
        );

        try {
          const existingTask = await findGlobalInProgressConflict(taskId, assigneeIds);
          if (existingTask) {
            showInProgressConflictAlert(existingTask);
            return;
          }
        } catch (error) {
          Alert.alert('Check Failed', error?.message || 'Unable to verify in-progress tasks.');
          return;
        }
      }

      const previousTasks = tasks;
      setTasks(prev =>
        prev.map(task => (task.id === taskId ? { ...task, status: newStatus } : task)),
      );

      setSaving(true);
      try {
        await updateProjectTaskStatus(taskId, newStatus, {
          movedBy: defaultAssigneeId,
          projectId,
        });
      } catch (error) {
        setTasks(previousTasks);
        Alert.alert('Update Failed', error?.message || 'Unable to update task status.');
      } finally {
        setSaving(false);
        flushPendingRealtimeRefresh();
      }
    },
    [flushPendingRealtimeRefresh, findGlobalInProgressConflict, isEmployee, showInProgressConflictAlert, tasks, defaultAssigneeId, projectId],
  );

  const findColumnAtPoint = useCallback((x, y) => {
    return new Promise(resolve => {
      const columns = kanbanColumns;
      let pending = columns.length;
      let matched = null;

      if (pending === 0) {
        resolve(null);
        return;
      }

      columns.forEach(column => {
        const ref = columnRefs.current[column];
        if (!ref) {
          pending -= 1;
          if (pending === 0) resolve(matched);
          return;
        }

        ref.measureInWindow((left, top, width, height) => {
          if (
            x >= left &&
            x <= left + width &&
            y >= top &&
            y <= top + height
          ) {
            matched = column;
          }
          pending -= 1;
          if (pending === 0) resolve(matched);
        });
      });
    });
  }, [kanbanColumns]);

  const endDrag = useCallback(
    async (x, y) => {
      const current = dragStateRef.current;
      dragStateRef.current = null;
      setDragState(null);
      setHoverColumn(null);

      if (!current?.task) {
        return;
      }

      const targetColumn = await findColumnAtPoint(x, y);
      if (targetColumn && targetColumn !== current.task.status) {
        moveTaskToColumn(current.task.id, targetColumn);
      }
    },
    [findColumnAtPoint, moveTaskToColumn],
  );

  const startDrag = (task, pageX, pageY) => {
    const next = { task, startX: pageX, startY: pageY, x: pageX, y: pageY };
    dragStateRef.current = next;
    setDragState(next);
    setHoverColumn(task.status);
  };

  const handleKanbanTouchStart = (task, event) => {
    const { pageX, pageY } = event.nativeEvent;
    cardTouchStart.current[task.id] = { pageX, pageY, time: Date.now() };
    cardDragTimers.current[task.id] = setTimeout(() => {
      startDrag(task, pageX, pageY);
    }, 350);
  };

  const handleKanbanTouchMove = (task, event) => {
    const { pageX, pageY } = event.nativeEvent;
    const start = cardTouchStart.current[task.id];

    if (!dragStateRef.current && start) {
      const moved = Math.abs(pageX - start.pageX) + Math.abs(pageY - start.pageY);
      if (moved > 12) {
        clearTimeout(cardDragTimers.current[task.id]);
      }
    }

    if (dragStateRef.current?.task?.id !== task.id) {
      return;
    }

    setDragState(prev => (prev ? { ...prev, x: pageX, y: pageY } : null));
    findColumnAtPoint(pageX, pageY).then(column => {
      if (dragStateRef.current?.task?.id === task.id) {
        setHoverColumn(column);
      }
    });
  };

  const handleKanbanTouchEnd = (task, event) => {
    clearTimeout(cardDragTimers.current[task.id]);
    const { pageX, pageY } = event.nativeEvent;

    if (dragStateRef.current?.task?.id === task.id) {
      endDrag(pageX, pageY);
      cardTouchStart.current[task.id] = null;
      return;
    }

    const start = cardTouchStart.current[task.id];
    if (start && Date.now() - start.time < 400) {
      openEditTask(task);
    }
    cardTouchStart.current[task.id] = null;
  };

  const handleKanbanTouchCancel = task => {
    clearTimeout(cardDragTimers.current[task.id]);
    if (dragStateRef.current?.task?.id === task.id) {
      endDrag(dragStateRef.current.x, dragStateRef.current.y);
    }
    cardTouchStart.current[task.id] = null;
  };

  const waitForModalDismiss = () =>
    new Promise(resolve => {
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(resolve);
      });
    });

  const handleSaveTask = async (taskData, isCreate) => {
    if (!projectId || !defaultAssigneeId) {
      Alert.alert('Save Failed', 'User or project information is missing.');
      return false;
    }

    if (!isCreate && !taskData?.id) {
      Alert.alert('Save Failed', 'Task id is missing.');
      return false;
    }

    if (
      isEmployee &&
      (taskData?.status === TASK_FILTER_DONE || taskData?.status === TASK_STATUS_REVIEW)
    ) {
      Alert.alert('Not Allowed', 'Employees can only update tasks up to Ready for Testing.');
      return false;
    }

    const assigneeIds = normalizeAssigneeIds(
      taskData.assigneeIds,
      taskData.assigneeId || defaultAssigneeId,
    );

    if (taskData?.status === TASK_FILTER_IN_PROGRESS && assigneeIds.includes(defaultAssigneeId)) {
      try {
        const existingTask = await findGlobalInProgressConflict(taskData.id, assigneeIds);
        if (existingTask) {
          showInProgressConflictAlert(existingTask);
          return false;
        }
      } catch (error) {
        Alert.alert('Check Failed', error?.message || 'Unable to verify in-progress tasks.');
        return false;
      }
    }

    const payload = {
      ...taskData,
      project: projectName,
      projectId,
      assigneeId: assigneeIds[0] || defaultAssigneeId,
      assigneeIds,
      assignee:
        taskData.assignee ||
        assigneeIds
          .map(id => employeeNameMapRef.current[id] || '')
          .filter(Boolean)
          .join(', ') ||
        defaultAssignee,
    };

    console.log('[TaskSave] handleSaveTask', {
      isCreate,
      projectId,
      defaultAssigneeId,
      taskId: payload.id,
      payload,
    });

    setFormVisible(false);
    await waitForModalDismiss();

    setSaving(true);
    try {
      if (isCreate) {
        const createMeta = {
          projectId,
          assigneeId: payload.assigneeId,
          assigneeIds: payload.assigneeIds,
          movedBy: defaultAssigneeId,
        };
        console.log('[TaskSave] calling createProjectTask', { payload, createMeta });
        const createdRow = await createProjectTask(payload, createMeta);
        console.log('[TaskSave] createProjectTask success', createdRow);
        setTasks(prev => [
          ...prev,
          mapProjectTaskRowToApp(createdRow, {
            name: projectName || '',
            employeeNameMap: employeeNameMapRef.current,
            assigneeName: payload.assignee,
          }),
        ]);
        return true;
      }

      const updatedRow = await updateProjectTask(payload.id, payload, {
        movedBy: defaultAssigneeId,
        projectId,
        assigneeIds: payload.assigneeIds,
      });
      console.log('[TaskSave] updateProjectTask success', updatedRow);
      setTasks(prev =>
        prev.map(task =>
          task.id === payload.id
            ? mapProjectTaskRowToApp(updatedRow, {
                name: projectName || '',
                employeeNameMap: employeeNameMapRef.current,
                assigneeName:
                  payload.assignee ||
                  employeeNameMapRef.current[updatedRow.assignee_id] ||
                  task.assignee,
              })
            : task,
        ),
      );
      return true;
    } catch (error) {
      console.log('[TaskSave] save failed', {
        isCreate,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error,
      });
      setFormMode(isCreate ? 'create' : 'edit');
      setSelectedTask(payload);
      setFormVisible(true);
      Alert.alert('Save Failed', error?.message || 'Unable to save task.');
      loadProjectTasks({ silent: true });
      return false;
    } finally {
      setSaving(false);
      flushPendingRealtimeRefresh();
    }
  };

  const renderTaskCardContent = (task, isDragging = false) => {
    const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;

    return (
      <>
        {isReviewer && task.assignee ? (
          <Text style={styles.assigneeHighlight}>
            {TASK_ASSIGNED_TO_LABEL}: {task.assignee}
          </Text>
        ) : null}
        <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
          <Text style={[styles.priorityText, { color: priorityStyle.color }]}>{task.priority}</Text>
        </View>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskDescription} numberOfLines={2}>
          {task.description}
        </Text>
        <Text style={styles.projectTag}>{task.project}</Text>
        <Text style={styles.hoursWorked}>{task.hoursWorked}</Text>
        <View style={styles.taskFooter}>
          <View style={styles.assigneeRow}>
            <View style={styles.assigneeAvatar}>
              <Text style={styles.assigneeInitial}>
                {(task.assignee || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.assigneeName}>{task.assignee}</Text>
          </View>
          <View style={styles.dueRow}>
            <Icon name="clock" size={wp(3.5)} color={darkTextSecondaryColor} />
            <Text style={styles.dueDate}>{task.dueDate}</Text>
          </View>
        </View>
        {isDragging ? (
          <Text style={styles.dragHint}>Drop on a column to move</Text>
        ) : null}
      </>
    );
  };

  const renderKanbanTaskCard = task => {
    const isBeingDragged = dragState?.task?.id === task.id;

    return (
      <View
        key={task.id}
        style={[styles.taskCard, isBeingDragged && styles.taskCardDragging]}
        onTouchStart={event => handleKanbanTouchStart(task, event)}
        onTouchMove={event => handleKanbanTouchMove(task, event)}
        onTouchEnd={event => handleKanbanTouchEnd(task, event)}
        onTouchCancel={() => handleKanbanTouchCancel(task)}>
        {renderTaskCardContent(task)}
      </View>
    );
  };

  const renderListTaskCard = task => (
    <TouchableOpacity
      key={task.id}
      style={styles.taskCard}
      onPress={() => openEditTask(task)}
      activeOpacity={0.85}>
      {renderTaskCardContent(task)}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="chevron-left" size={wp(6)} color={darkTextPrimaryColor} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{TASK_MANAGEMENT_TITLE}</Text>
          <View style={styles.headerActions}>
            {/* <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFilterVisible(true)}
              activeOpacity={0.8}>
              <Icon name="filter" size={wp(4)} color={BLUE} />
              <Text style={styles.filterText}>{TASK_FILTER_BUTTON}</Text>
              {activeFilterCount > 0 ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity> */}
            <TouchableOpacity
              style={styles.newTaskButton}
              onPress={() => openCreateTask()}
              activeOpacity={0.85}>
              <Icon name="plus" size={wp(4)} color={darkTextPrimaryColor} />
              <Text style={styles.newTaskText}>{TASK_NEW_BUTTON}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.subtitle}>
          {projectName || 'Project'} · {isReviewer ? 'team tasks' : `${displayName}'s tasks`} ·{' '}
          {filteredTasks.length} task
          {filteredTasks.length === 1 ? '' : 's'} 
          {saving ? ' · saving...' : ''}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={styles.loader} />
        ) : (
        <>
        <View style={styles.viewTabs}>
          {[TASK_VIEW_KANBAN, TASK_VIEW_LIST].map(view => {
            const isActive = activeView === view;
            return (
              <TouchableOpacity
                key={view}
                style={[styles.viewTab, isActive && styles.viewTabActive]}
                onPress={() => setActiveView(view)}
                activeOpacity={0.8}>
                <Icon
                  name={view === TASK_VIEW_KANBAN ? 'columns' : 'list'}
                  size={wp(4)}
                  color={isActive ? darkTextPrimaryColor : darkTextSecondaryColor}
                />
                <Text style={[styles.viewTabText, isActive && styles.viewTabTextActive]}>
                  {view}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeView === TASK_VIEW_KANBAN ? (
          <ScrollView
            horizontal
            scrollEnabled={!dragState}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kanbanRow}>
            {kanbanColumns.map(column => {
              const columnTasks = tasksByColumn[column] || [];
              const columnColor = COLUMN_COLORS[column];
              const isDropTarget = dragState && hoverColumn === column;

              return (
                <View
                  key={column}
                  ref={ref => {
                    columnRefs.current[column] = ref;
                  }}
                  collapsable={false}
                  style={[
                    styles.column,
                    isDropTarget && styles.columnDropTarget,
                    isDropTarget && { borderColor: columnColor },
                  ]}>
                  <View style={styles.columnHeader}>
                    <Text style={[styles.columnTitle, { color: columnColor }]}>{column}</Text>
                    <View style={styles.columnCount}>
                      <Text style={styles.columnCountText}>{columnTasks.length}</Text>
                    </View>
                  </View>

                  <ScrollView
                    style={styles.columnBody}
                    contentContainerStyle={styles.columnBodyContent}
                    scrollEnabled={!dragState}
                    showsVerticalScrollIndicator={false}>
                    {columnTasks.map(renderKanbanTaskCard)}
                    <TouchableOpacity
                      style={styles.addCardButton}
                      onPress={() => openCreateTask(column)}
                      activeOpacity={0.8}>
                      <Icon name="plus" size={wp(4)} color={darkTextSecondaryColor} />
                      <Text style={styles.addCardText}>{TASK_ADD_CARD}</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.listView}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}>
            {filteredTasks.length === 0 ? (
              <Text style={styles.emptyText}>No tasks match your filters.</Text>
            ) : (
              filteredTasks.map(renderListTaskCard)
            )}
          </ScrollView>
        )}
        </>
        )}

        {dragState ? (
          <View style={styles.dragOverlay} pointerEvents="none">
            <View
              style={[
                styles.dragGhost,
                {
                  left: dragState.x - wp(34),
                  top: dragState.y - hp(6),
                },
              ]}>
              {renderTaskCardContent(dragState.task, true)}
            </View>
          </View>
        ) : null}
      </SafeAreaView>

      <TaskDetailModal
        visible={formVisible}
        mode={formMode}
        task={selectedTask}
        defaultStatus={defaultStatus}
        hideDoneStatus={isEmployee}
        allowMultipleAssignees={isReviewer}
        employeeOptions={employeeOptions}
        currentUserId={defaultAssigneeId}
        currentUserName={defaultAssignee}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveTask}
      />

      <TaskFilterModal
        visible={filterVisible}
        filters={filters}
        hideDoneStatus={isEmployee}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />

      <AiAssistant />
    </View>
  );
};

export default TaskManagementScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    gap: wp(2),
  },
  backButton: {
    padding: wp(1),
  },
  headerTitle: {
    flex: 1,
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: BLUE,
  },
  filterText: {
    ...style.fontSizeSmall2x,
    color: BLUE,
  },
  filterBadge: {
    minWidth: wp(4.5),
    height: wp(4.5),
    borderRadius: wp(2.5),
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1),
  },
  filterBadgeText: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  newTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
    borderRadius: wp(2.5),
    backgroundColor: PURPLE,
  },
  newTaskText: {
    ...style.fontSizeSmall2x,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  subtitle: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    paddingHorizontal: wp(5),
    marginBottom: hp(1.5),
  },
  loader: {
    marginTop: hp(8),
  },
  viewTabs: {
    flexDirection: 'row',
    marginHorizontal: wp(5),
    marginBottom: hp(1.5),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(1),
    gap: wp(1),
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(1),
    borderRadius: wp(2.5),
  },
  viewTabActive: {
    backgroundColor: PURPLE,
  },
  viewTabText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  viewTabTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  kanbanRow: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(12),
    gap: wp(3),
  },
  column: {
    width: wp(72),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    maxHeight: hp(62),
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.4),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  columnTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
  },
  columnCount: {
    minWidth: wp(5.5),
    height: wp(5.5),
    borderRadius: wp(3),
    backgroundColor: darkElevatedColor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.5),
  },
  columnCountText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  columnBody: {
    flex: 1,
  },
  columnBodyContent: {
    padding: wp(2.5),
    gap: hp(1.2),
  },
  taskCard: {
    backgroundColor: darkElevatedColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(3),
  },
  taskCardDragging: {
    opacity: 0.35,
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 20,
  },
  dragGhost: {
    position: 'absolute',
    width: wp(68),
    backgroundColor: darkElevatedColor,
    borderRadius: wp(3),
    borderWidth: 2,
    borderColor: PURPLE,
    padding: wp(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 24,
  },
  dragHint: {
    ...style.fontSizeSmall,
    color: PURPLE,
    marginTop: hp(0.8),
    ...style.fontWeightMedium,
  },
  columnDropTarget: {
    borderWidth: 2,
    backgroundColor: 'rgba(155, 89, 182, 0.08)',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    borderRadius: wp(2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    marginBottom: hp(0.8),
  },
  priorityText: {
    ...style.fontSizeSmall,
    textTransform: 'capitalize',
    ...style.fontWeightMedium,
  },
  taskTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.5),
  },
  taskDescription: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.8),
  },
  projectTag: {
    ...style.fontSizeSmall,
    color: BLUE,
    marginBottom: hp(0.4),
  },
  hoursWorked: {
    ...style.fontSizeSmall,
    color: darkAccentGreenColor,
    marginBottom: hp(1),
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  assigneeAvatar: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeInitial: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  assigneeName: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  assigneeHighlight: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: ORANGE,
    marginBottom: hp(0.8),
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  dueDate: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: darkBorderColor,
    borderRadius: wp(3),
    paddingVertical: hp(1.2),
  },
  addCardText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  listView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
    gap: hp(1.2),
  },
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginTop: hp(4),
  },
});
