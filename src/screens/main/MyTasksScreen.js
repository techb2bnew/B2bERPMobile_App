import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import { useAuth } from '../../context/AuthContext';
import {
  MY_TASKS_EMPTY,
  MY_TASKS_LABEL,
  MY_TASKS_SUBTITLE,
  MY_TASKS_TL_EMPTY,
  MY_TASKS_TL_SUBTITLE,
  TASK_ASSIGNED_TO_LABEL,
  TASK_FILTER_ALL,
  TASK_FILTER_DONE,
  TASK_FILTER_IN_PROGRESS,
  TASK_FILTER_TODO,
  TASK_STATUS_READY_FOR_TESTING,
} from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { isTeamLeaderUser } from '../../constants/roles';
import { syncSupabaseRealtimeAuth } from '../../lib/supabase';
import { fetchAllEmployeeProfiles } from '../../services/employeeService';
import {
  fetchTeamLeaderTasks,
  fetchTasksForAssignee,
  subscribeToAllProjectTasksChanges,
  subscribeToAssigneeProjectTasksChanges,
} from '../../services/projectTasksService';
import {
  fetchAllProjects,
  fetchProjectsWhereUserIsOnTeam,
} from '../../services/projectsService';
import { buildEmployeeNameMap, formatTaskDate } from '../../utils/projectUtils';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);
const CARD_GAP = hp(1.2);
const LIVE_POLL_INTERVAL_MS = 5000;

const EMPLOYEE_FILTERS = [
  TASK_FILTER_ALL,
  TASK_FILTER_TODO,
  TASK_FILTER_IN_PROGRESS,
  TASK_STATUS_READY_FOR_TESTING,
];

const STATUS_STYLES = {
  [TASK_FILTER_TODO]: { bg: 'rgba(245, 166, 35, 0.15)', color: '#F5A623' },
  [TASK_FILTER_IN_PROGRESS]: { bg: 'rgba(45, 125, 210, 0.15)', color: '#2D7DD2' },
  [TASK_STATUS_READY_FOR_TESTING]: { bg: 'rgba(155, 89, 182, 0.15)', color: '#9B59B6' },
  [TASK_FILTER_DONE]: { bg: 'rgba(61, 220, 132, 0.15)', color: '#3DDC84' },
};

const MyTasksScreen = () => {
  const { user } = useAuth();
  const isTeamLeader = isTeamLeaderUser(user);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(TASK_FILTER_ALL);

  const loadTasks = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.id) {
        setTasks([]);
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
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
        const employeeNameMap = buildEmployeeNameMap(employees);

        if (isTeamLeader) {
          const teamLeaderTasks = await fetchTeamLeaderTasks({
            assigneeId: user.id,
            projectIds: teamProjects.map(project => project.id),
            projectNameById,
            employeeNameMap,
            assigneeName: user?.name || '',
          });
          setTasks(teamLeaderTasks);
        } else {
          const assigneeTasks = await fetchTasksForAssignee(user.id, {
            projectNameById: teamProjects.reduce((map, project) => {
              map[project.id] = project.name;
              return map;
            }, {}),
            assigneeName: user?.name || '',
          });
          setTasks(
            assigneeTasks.filter(
              task => task.status !== TASK_FILTER_DONE,
            ),
          );
        }
      } catch {
        setTasks([]);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [isTeamLeader, user],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refresh = () => {
        if (active) {
          loadTasks({ silent: true });
        }
      };

      loadTasks();
      syncSupabaseRealtimeAuth().catch(() => {});

      const pollTimer = setInterval(refresh, LIVE_POLL_INTERVAL_MS);
      const unsubscribe = isTeamLeader
        ? subscribeToAllProjectTasksChanges(refresh)
        : subscribeToAssigneeProjectTasksChanges(user?.id, refresh);

      return () => {
        active = false;
        clearInterval(pollTimer);
        unsubscribe();
      };
    }, [isTeamLeader, loadTasks, user?.id]),
  );

  const filteredTasks = useMemo(() => {
    if (isTeamLeader || activeFilter === TASK_FILTER_ALL) {
      return tasks;
    }
    return tasks.filter(task => task.status === activeFilter);
  }, [activeFilter, isTeamLeader, tasks]);

  const emptyMessage = isTeamLeader ? MY_TASKS_TL_EMPTY : MY_TASKS_EMPTY;
  const subtitle = isTeamLeader ? MY_TASKS_TL_SUBTITLE : MY_TASKS_SUBTITLE;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={MY_TASKS_LABEL} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {!isTeamLeader ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}>
              {EMPLOYEE_FILTERS.map(filter => {
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveFilter(filter)}
                    activeOpacity={0.8}>
                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {loading ? (
            <ActivityIndicator size="large" color={PURPLE} style={styles.loader} />
          ) : filteredTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="check-square" size={wp(10)} color={darkTextSecondaryColor} />
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            filteredTasks.map(task => {
              const statusStyle = STATUS_STYLES[task.status] || STATUS_STYLES[TASK_FILTER_TODO];
              return (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.color }]}>
                        {task.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.projectText}>{task.project}</Text>
                  {isTeamLeader && task.assignee ? (
                    <View style={styles.assigneeRow}>
                      <Icon name="user" size={wp(3.8)} color={darkTextSecondaryColor} />
                      <Text style={styles.assigneeText}>
                        {TASK_ASSIGNED_TO_LABEL}: {task.assignee}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.taskMeta}>
                    <View style={styles.metaItem}>
                      <Icon name="flag" size={wp(3.8)} color={darkTextSecondaryColor} />
                      <Text style={styles.metaText}>{task.priority}</Text>
                    </View>
                    {task.taskDate ? (
                      <View style={styles.metaItem}>
                        <Icon name="calendar" size={wp(3.8)} color={darkTextSecondaryColor} />
                        <Text style={styles.metaText}>{formatTaskDate(task.taskDate)}</Text>
                      </View>
                    ) : null}
                    {task.dueDate ? (
                      <View style={styles.metaItem}>
                        <Icon name="clock" size={wp(3.8)} color={darkTextSecondaryColor} />
                        <Text style={styles.metaText}>{formatTaskDate(task.dueDate)}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
      <AiAssistant />
    </View>
  );
};

export default MyTasksScreen;

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
    marginBottom: hp(1.8),
  },
  filterRow: {
    gap: wp(2),
    paddingBottom: hp(2),
  },
  filterChip: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.9),
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: darkSurfaceColor,
  },
  filterChipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  filterText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  filterTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  loader: {
    marginTop: hp(4),
  },
  taskCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(1.8),
    marginBottom: CARD_GAP,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: wp(2),
    marginBottom: hp(0.8),
  },
  taskTitle: {
    flex: 1,
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  statusBadge: {
    borderRadius: wp(2),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
  },
  statusText: {
    ...style.fontSizeSmall,
    ...style.fontWeightMedium,
  },
  projectText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.8),
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginBottom: hp(1),
  },
  assigneeText: {
    ...style.fontSizeSmall2x,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: wp(5),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  metaText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  emptyCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingVertical: hp(8),
    alignItems: 'center',
    gap: hp(1.5),
  },
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    paddingHorizontal: wp(8),
  },
});
