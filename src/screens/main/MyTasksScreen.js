import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import {
  MY_TASKS_EMPTY,
  MY_TASKS_LABEL,
  MY_TASKS_SUBTITLE,
  TASK_FILTER_ALL,
  TASK_FILTER_DONE,
  TASK_FILTER_IN_PROGRESS,
  TASK_FILTER_TODO,
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
const CARD_GAP = hp(1.2);

const FILTERS = [TASK_FILTER_ALL, TASK_FILTER_TODO, TASK_FILTER_IN_PROGRESS, TASK_FILTER_DONE];

const STATUS_STYLES = {
  [TASK_FILTER_TODO]: { bg: 'rgba(245, 166, 35, 0.15)', color: '#F5A623' },
  [TASK_FILTER_IN_PROGRESS]: { bg: 'rgba(45, 125, 210, 0.15)', color: '#2D7DD2' },
  [TASK_FILTER_DONE]: { bg: 'rgba(61, 220, 132, 0.15)', color: '#3DDC84' },
};

const TASKS = [
  {
    id: '1',
    title: 'API integration for employee module',
    project: 'B2B ERP',
    status: TASK_FILTER_IN_PROGRESS,
    priority: 'High',
    due: 'Today',
  },
  {
    id: '2',
    title: 'Fix login validation on Android',
    project: 'B2B ERP',
    status: TASK_FILTER_TODO,
    priority: 'Medium',
    due: 'Tomorrow',
  },
  {
    id: '3',
    title: 'Design review — dashboard cards',
    project: 'B2B ERP',
    status: TASK_FILTER_TODO,
    priority: 'Low',
    due: 'Fri',
  },
  {
    id: '4',
    title: 'Update Supabase RLS policies',
    project: 'B2B ERP',
    status: TASK_FILTER_DONE,
    priority: 'High',
    due: 'Mon',
  },
];

const MyTasksScreen = () => {
  const [activeFilter, setActiveFilter] = useState(TASK_FILTER_ALL);

  const filteredTasks = useMemo(() => {
    if (activeFilter === TASK_FILTER_ALL) {
      return TASKS;
    }
    return TASKS.filter(task => task.status === activeFilter);
  }, [activeFilter]);

  return (
    <View style={styles.root}>
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader title={MY_TASKS_LABEL} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{MY_TASKS_SUBTITLE}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {FILTERS.map(filter => {
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

        {filteredTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="check-square" size={wp(10)} color={darkTextSecondaryColor} />
            <Text style={styles.emptyText}>{MY_TASKS_EMPTY}</Text>
          </View>
        ) : (
          filteredTasks.map(task => {
            const statusStyle = STATUS_STYLES[task.status];
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
                <View style={styles.taskMeta}>
                  <View style={styles.metaItem}>
                    <Icon name="flag" size={wp(3.8)} color={darkTextSecondaryColor} />
                    <Text style={styles.metaText}>{task.priority}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Icon name="calendar" size={wp(3.8)} color={darkTextSecondaryColor} />
                    <Text style={styles.metaText}>{task.due}</Text>
                  </View>
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
    marginBottom: hp(1.2),
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
