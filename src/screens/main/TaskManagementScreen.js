import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import TaskDetailModal from '../../components/Modal/TaskDetailModal';
import TaskFilterModal from '../../components/Modal/TaskFilterModal';
import { useAuth } from '../../context/AuthContext';
import {
  TASK_ADD_CARD,
  TASK_FILTER_ALL_PRIORITIES,
  TASK_FILTER_ALL_STATUSES,
  TASK_FILTER_BUTTON,
  TASK_FILTER_DONE,
  TASK_FILTER_IN_PROGRESS,
  TASK_FILTER_TODO,
  TASK_MANAGEMENT_TITLE,
  TASK_NEW_BUTTON,
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
import { getFirstName, heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const BLUE = '#2D7DD2';

const KANBAN_COLUMNS = [
  TASK_FILTER_TODO,
  TASK_FILTER_IN_PROGRESS,
  TASK_STATUS_REVIEW,
  TASK_FILTER_DONE,
];

const COLUMN_COLORS = {
  [TASK_FILTER_TODO]: darkTextSecondaryColor,
  [TASK_FILTER_IN_PROGRESS]: BLUE,
  [TASK_STATUS_REVIEW]: PURPLE,
  [TASK_FILTER_DONE]: darkAccentGreenColor,
};

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

const PROJECT_TASKS = {
  erp: [],
  jdp: [
    {
      id: '1',
      title: 'Fix issues',
      description: 'Worked on fix filter issue',
      status: TASK_FILTER_IN_PROGRESS,
      priority: 'medium',
      project: 'JDP',
      estimatedHours: '4',
      hoursWorked: '4h worked',
      assignee: 'shubham',
      dueDate: 'Jun 11',
    },
  ],
};

const TaskManagementScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { projectId, projectName } = route.params || {};

  const displayName = getFirstName(user?.name || 'User').toLowerCase();
  const defaultAssignee = displayName;

  const [tasks, setTasks] = useState(PROJECT_TASKS[projectId] || []);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formMode, setFormMode] = useState('edit');
  const [defaultStatus, setDefaultStatus] = useState(TASK_FILTER_TODO);
  const [formVisible, setFormVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeView, setActiveView] = useState(TASK_VIEW_KANBAN);
  const [dragState, setDragState] = useState(null);
  const [hoverColumn, setHoverColumn] = useState(null);

  const columnRefs = useRef({});
  const dragStateRef = useRef(null);
  const cardDragTimers = useRef({});
  const cardTouchStart = useRef({});

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count += 1;
    if (filters.priority !== TASK_FILTER_ALL_PRIORITIES) count += 1;
    if (filters.status !== TASK_FILTER_ALL_STATUSES) count += 1;
    return count;
  }, [filters]);

  const filteredTasks = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return tasks.filter(task => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.assignee.toLowerCase().includes(query) ||
        task.project.toLowerCase().includes(query);

      const matchesPriority =
        filters.priority === TASK_FILTER_ALL_PRIORITIES ||
        task.priority === filters.priority;

      const matchesStatus =
        filters.status === TASK_FILTER_ALL_STATUSES || task.status === filters.status;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [tasks, filters]);

  const tasksByColumn = useMemo(() => {
    return KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column] = filteredTasks.filter(task => task.status === column);
      return acc;
    }, {});
  }, [filteredTasks]);

  const openCreateTask = (status = TASK_FILTER_TODO) => {
    setFormMode('create');
    setSelectedTask({ assignee: defaultAssignee });
    setDefaultStatus(status);
    setFormVisible(true);
  };

  const openEditTask = task => {
    setFormMode('edit');
    setSelectedTask(task);
    setFormVisible(true);
  };

  const moveTaskToColumn = useCallback((taskId, newStatus) => {
    setTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, status: newStatus } : task)),
    );
  }, []);

  const findColumnAtPoint = useCallback((x, y) => {
    return new Promise(resolve => {
      const columns = KANBAN_COLUMNS;
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
  }, []);

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

  const handleSaveTask = (taskData, isCreate) => {
    if (isCreate) {
      const newTask = {
        ...taskData,
        id: Date.now().toString(),
        project: projectName,
      };
      setTasks(prev => [...prev, newTask]);
      return;
    }

    setTasks(prev =>
      prev.map(task => (task.id === taskData.id ? { ...task, ...taskData } : task)),
    );
  };

  const renderTaskCardContent = (task, isDragging = false) => {
    const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;

    return (
      <>
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
            <TouchableOpacity
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
            </TouchableOpacity>
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
          {projectName} · {displayName}'s Sprint #12 · {filteredTasks.length} task · live from Supabase
        </Text>

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
            {KANBAN_COLUMNS.map(column => {
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
        onClose={() => setFormVisible(false)}
        onSave={handleSaveTask}
      />

      <TaskFilterModal
        visible={filterVisible}
        filters={filters}
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
