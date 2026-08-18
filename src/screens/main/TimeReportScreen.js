import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import AppHeader from '../../components/AppHeader';
import DropdownSelect from '../../components/DropdownSelect';
import TimeSheetDateFilterModal from '../../components/Modal/TimeSheetDateFilterModal';
import UserAvatar from '../../components/UserAvatar';
import { isCeoAdminUser } from '../../constants/roles';
import {
  darkAccentGreenColor,
  darkBackgroundColor,
  darkBorderColor,
  darkInputBgColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { useTimeSheetHours } from '../../hooks/useTimeSheetHours';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  fetchAllEmployeeProfiles,
  getEmployeeProfileImageUrl,
} from '../../services/employeeService';
import {
  formatWorkHours,
  getCurrentWeekRange,
  getDateRangeDisplay,
  getLocalDateKey,
} from '../../services/clockSessionsService';
import { fetchProjectsWhereUserIsOnTeam } from '../../services/projectsService';
import { fetchTasksForAssignee } from '../../services/projectTasksService';
import {
  capitalizeName,
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);

const TABS = {
  OFFICE: 'office',
  PROJECT: 'project',
};

const ALL_PROJECTS_VALUE = '__all__';

const formatDisplayDate = dateKey => {
  if (!dateKey) return '--';
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDayStatus = day => {
  if (!day || day.hours <= 0) {
    return { label: 'No Record', color: darkTextSecondaryColor, bg: 'rgba(148,163,184,0.12)' };
  }
  if (!day.clockOut || day.clockOut === '--') {
    return { label: 'Clocked In', color: darkAccentGreenColor, bg: 'rgba(61,220,132,0.15)' };
  }
  return { label: 'Completed', color: darkAccentGreenColor, bg: 'rgba(61,220,132,0.15)' };
};

const TimeReportScreen = () => {
  const [activeTab, setActiveTab] = useState(TABS.OFFICE);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [dateRange, setDateRange] = useState(() => getCurrentWeekRange());
  const [filterVisible, setFilterVisible] = useState(false);
  const [projectLogs, setProjectLogs] = useState([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [assignedProjectsLoading, setAssignedProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(ALL_PROJECTS_VALUE);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setEmployees([]);
        return;
      }
      const profiles = await fetchAllEmployeeProfiles();
      const list = (profiles || []).filter(p => !isCeoAdminUser({ role: p.role }));
      setEmployees(list);
      setSelectedEmployeeId(prev => prev || list[0]?.id || null);
    } catch (e) {
      console.error('Time Report employees load failed:', e);
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const selectedEmployee = useMemo(
    () => employees.find(e => e.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );

  const employeeOptions = useMemo(
    () => employees.map(e => capitalizeName(e.name || 'Employee')),
    [employees],
  );

  const selectedEmployeeLabel = selectedEmployee
    ? capitalizeName(selectedEmployee.name || 'Employee')
    : 'Select employee';

  const handleEmployeeChange = name => {
    const match = employees.find(
      e => capitalizeName(e.name || 'Employee') === name,
    );
    if (match) {
      setSelectedEmployeeId(match.id);
      setSelectedProjectId(ALL_PROJECTS_VALUE);
      setAssignedProjects([]);
    }
  };

  const loadAssignedProjects = useCallback(async () => {
    if (!selectedEmployeeId || !isSupabaseConfigured) {
      setAssignedProjects([]);
      return [];
    }

    setAssignedProjectsLoading(true);
    try {
      const projects = await fetchProjectsWhereUserIsOnTeam({
        id: selectedEmployeeId,
        name: selectedEmployee?.name || '',
      });
      const list = projects || [];
      setAssignedProjects(list);
      return list;
    } catch (e) {
      console.error('Time Report assigned projects load failed:', e);
      setAssignedProjects([]);
      return [];
    } finally {
      setAssignedProjectsLoading(false);
    }
  }, [selectedEmployee?.name, selectedEmployeeId]);

  useEffect(() => {
    if (activeTab === TABS.PROJECT) {
      loadAssignedProjects();
    }
  }, [activeTab, loadAssignedProjects]);

  const projectOptions = useMemo(
    () => [
      'All projects',
      ...assignedProjects.map(p => p.name || 'Untitled project'),
    ],
    [assignedProjects],
  );

  const selectedProjectLabel = useMemo(() => {
    if (selectedProjectId === ALL_PROJECTS_VALUE) {
      return 'All projects';
    }
    const match = assignedProjects.find(p => p.id === selectedProjectId);
    return match?.name || 'All projects';
  }, [assignedProjects, selectedProjectId]);

  const handleProjectChange = name => {
    if (name === 'All projects') {
      setSelectedProjectId(ALL_PROJECTS_VALUE);
      return;
    }
    const match = assignedProjects.find(p => p.name === name);
    if (match) {
      setSelectedProjectId(match.id);
    }
  };

  const { rangeData, loading: officeLoading, isCurrentWeek } = useTimeSheetHours(
    selectedEmployeeId,
    dateRange,
  );

  const rangeDisplay = useMemo(
    () =>
      getDateRangeDisplay(
        dateRange.startDateKey,
        dateRange.endDateKey,
        isCurrentWeek,
      ),
    [dateRange.endDateKey, dateRange.startDateKey, isCurrentWeek],
  );

  const officeEntries = useMemo(
    () => (rangeData?.days || []).filter(d => d.hours > 0),
    [rangeData?.days],
  );

  const loadProjectLogs = useCallback(async () => {
    if (!selectedEmployeeId || !isSupabaseConfigured) {
      setProjectLogs([]);
      return;
    }

    setProjectLoading(true);
    try {
      const projects =
        assignedProjects.length > 0
          ? assignedProjects
          : await fetchProjectsWhereUserIsOnTeam({
              id: selectedEmployeeId,
              name: selectedEmployee?.name || '',
            });

      if (!assignedProjects.length) {
        setAssignedProjects(projects || []);
      }

      const projectNameById = (projects || []).reduce((map, p) => {
        map[p.id] = p.name;
        return map;
      }, {});

      let tasks = await fetchTasksForAssignee(selectedEmployeeId, {
        projectNameById,
        assigneeName: selectedEmployee?.name || '',
      });

      if (selectedProjectId !== ALL_PROJECTS_VALUE) {
        tasks = tasks.filter(task => task.projectId === selectedProjectId);
      }

      if (!tasks.length) {
        setProjectLogs([]);
        return;
      }

      const taskIds = tasks.map(t => t.id);
      const startMs = new Date(`${dateRange.startDateKey}T00:00:00`).getTime();
      const endMs = new Date(`${dateRange.endDateKey}T23:59:59.999`).getTime();
      const nowMs = Date.now();

      const { data: history, error } = await getSupabase()
        .from('task_status_history')
        .select('*')
        .in('task_id', taskIds);

      if (error) throw error;

      const logs = tasks
        .map(task => {
          let secs = 0;
          (history || [])
            .filter(h => h.task_id === task.id)
            .forEach(h => {
              const status = String(h.to_status || '').toLowerCase();
              if (status !== 'in-progress' && status !== 'doing') return;

              const entered = new Date(h.entered_at).getTime();
              const exited = h.exited_at
                ? new Date(h.exited_at).getTime()
                : nowMs;
              const overlapStart = Math.max(entered, startMs);
              const overlapEnd = Math.min(exited, endMs, nowMs);
              if (overlapStart < overlapEnd) {
                secs += Math.floor((overlapEnd - overlapStart) / 1000);
              } else if (h.duration_seconds && !h.exited_at) {
                // fallback unused
              }
            });

          return {
            id: task.id,
            title: task.title,
            project: task.project || projectNameById[task.project_id] || 'General',
            status: task.status,
            seconds: secs,
            hoursLabel: formatWorkHours(secs / 3600),
          };
        })
        .filter(item => item.seconds > 0)
        .sort((a, b) => b.seconds - a.seconds);

      setProjectLogs(logs);
    } catch (e) {
      console.error('Time Report project logs failed:', e);
      setProjectLogs([]);
    } finally {
      setProjectLoading(false);
    }
  }, [
    dateRange.endDateKey,
    dateRange.startDateKey,
    assignedProjects,
    selectedEmployee?.name,
    selectedEmployeeId,
    selectedProjectId,
  ]);

  useEffect(() => {
    if (activeTab === TABS.PROJECT) {
      loadProjectLogs();
    }
  }, [activeTab, loadProjectLogs]);

  const projectTotalHours = useMemo(() => {
    const totalSecs = projectLogs.reduce((sum, item) => sum + item.seconds, 0);
    return formatWorkHours(totalSecs / 3600);
  }, [projectLogs]);

  const rangeLabel = useMemo(() => {
    if (isCurrentWeek) return 'This week';
    if (rangeDisplay.isSingleDay) return rangeDisplay.title;
    return `${rangeDisplay.fromLabel || dateRange.startDateKey} – ${
      rangeDisplay.toLabel || dateRange.endDateKey
    }`;
  }, [dateRange, isCurrentWeek, rangeDisplay]);

  const clearFilters = () => {
    setDateRange(getCurrentWeekRange());
    setSelectedProjectId(ALL_PROJECTS_VALUE);
    if (employees[0]) {
      setSelectedEmployeeId(employees[0].id);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AppHeader title="Time Report" />

      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={[
            styles.mainTabBtn,
            activeTab === TABS.OFFICE && styles.mainTabBtnActive,
          ]}
          onPress={() => setActiveTab(TABS.OFFICE)}
          activeOpacity={0.85}>
          <Icon
            name="clock"
            size={wp(4)}
            color={activeTab === TABS.OFFICE ? whiteColor : darkTextSecondaryColor}
          />
          <View style={styles.mainTabTextWrap}>
            <Text
              style={[
                styles.mainTabText,
                activeTab === TABS.OFFICE && styles.mainTabTextActive,
              ]}>
              Office Attendance
            </Text>
            <Text style={styles.mainTabMeta}>
              {officeLoading ? '--' : `${rangeData?.totalHoursLabel || '0h'} · ${officeEntries.length}`}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTabBtn,
            activeTab === TABS.PROJECT && styles.mainTabBtnActive,
          ]}
          onPress={() => setActiveTab(TABS.PROJECT)}
          activeOpacity={0.85}>
          <Icon
            name="briefcase"
            size={wp(4)}
            color={activeTab === TABS.PROJECT ? whiteColor : darkTextSecondaryColor}
          />
          <View style={styles.mainTabTextWrap}>
            <Text
              style={[
                styles.mainTabText,
                activeTab === TABS.PROJECT && styles.mainTabTextActive,
              ]}>
              Project Log Time
            </Text>
            <Text style={styles.mainTabMeta}>
              {projectLoading ? '--' : `${projectTotalHours} · ${projectLogs.length}`}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.filterCard}>
          {employeesLoading ? (
            <ActivityIndicator size="small" color={PURPLE} />
          ) : (
            <DropdownSelect
              label="Employee"
              value={selectedEmployeeLabel}
              options={employeeOptions}
              onChange={handleEmployeeChange}
            />
          )}

          {activeTab === TABS.PROJECT && selectedEmployeeId ? (
            assignedProjectsLoading ? (
              <ActivityIndicator size="small" color={PURPLE} />
            ) : (
              <DropdownSelect
                label="Project"
                value={selectedProjectLabel}
                options={projectOptions}
                onChange={handleProjectChange}
              />
            )
          ) : null}

          <TouchableOpacity
            style={styles.dateRangeBtn}
            onPress={() => setFilterVisible(true)}
            activeOpacity={0.85}>
            <View style={styles.dateRangeLeft}>
              <Icon name="calendar" size={wp(4.2)} color={PURPLE} />
              <View>
                <Text style={styles.dateRangeLabel}>Date range</Text>
                <Text style={styles.dateRangeValue}>{rangeLabel}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={wp(4.5)} color={darkTextSecondaryColor} />
          </TouchableOpacity>

          <View style={styles.filterActions}>
            <TouchableOpacity onPress={clearFilters} activeOpacity={0.8}>
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
            <Text style={styles.entriesCount}>
              {activeTab === TABS.OFFICE
                ? `${officeEntries.length} entries`
                : `${projectLogs.length} entries`}
            </Text>
          </View>
        </View>

        {activeTab === TABS.OFFICE ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                OFFICE ATTENDANCE{' '}
                {selectedEmployee
                  ? capitalizeName(selectedEmployee.name)
                  : ''}
                {officeEntries.length ? ` (${officeEntries.length} days)` : ''}
              </Text>
              <Text style={styles.sectionTotal}>
                {officeLoading ? '--' : rangeData?.totalHoursLabel || '0h'} total
              </Text>
            </View>

            {officeLoading ? (
              <ActivityIndicator size="small" color={PURPLE} style={styles.loader} />
            ) : officeEntries.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Icon name="clock" size={wp(10)} color="rgba(255,255,255,0.15)" />
                <Text style={styles.emptyTitle}>No office attendance for this period.</Text>
                <Text style={styles.emptySub}>
                  {selectedEmployeeLabel} · {rangeLabel}
                </Text>
              </View>
            ) : (
              officeEntries.map(day => {
                const status = getDayStatus(day);
                return (
                  <View key={day.dateKey} style={styles.entryCard}>
                    <View style={styles.entryTop}>
                      <Text style={styles.entryDate}>
                        {formatDisplayDate(day.dateKey)}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.entryGrid}>
                      <View style={styles.entryCell}>
                        <Text style={styles.entryLabel}>Hours</Text>
                        <Text style={styles.entryValue}>{day.hoursLabel}</Text>
                      </View>
                      <View style={styles.entryCell}>
                        <Text style={styles.entryLabel}>Clock In</Text>
                        <Text style={styles.entryValue}>{day.clockIn}</Text>
                      </View>
                      <View style={styles.entryCell}>
                        <Text style={styles.entryLabel}>Clock Out</Text>
                        <Text style={styles.entryValue}>
                          {day.clockOut === '--' ? '—' : day.clockOut}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                PROJECT TIME{' '}
                {selectedEmployee
                  ? capitalizeName(selectedEmployee.name)
                  : ''}
              </Text>
              <Text style={styles.sectionTotal}>
                {projectLoading ? '--' : `${projectTotalHours} total`}
              </Text>
            </View>

            {selectedEmployee ? (
              <View style={styles.profileHint}>
                <UserAvatar
                  name={selectedEmployee.name}
                  userId={selectedEmployee.id}
                  imageUrl={getEmployeeProfileImageUrl(selectedEmployee)}
                  size={wp(8)}
                />
                <Text style={styles.profileHintText}>
                  Task time in selected range ({getLocalDateKey(
                    new Date(`${dateRange.startDateKey}T00:00:00`),
                  )}{' '}
                  → {dateRange.endDateKey})
                </Text>
              </View>
            ) : null}

            {projectLoading ? (
              <ActivityIndicator size="small" color={PURPLE} style={styles.loader} />
            ) : projectLogs.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Icon name="briefcase" size={wp(10)} color="rgba(255,255,255,0.15)" />
                <Text style={styles.emptyTitle}>
                  No project time logged for this period.
                </Text>
                <Text style={styles.emptySub}>
                  {selectedEmployeeLabel} · {selectedProjectLabel} · {rangeLabel}
                </Text>
              </View>
            ) : (
              projectLogs.map(item => (
                <View key={item.id} style={styles.entryCard}>
                  <View style={styles.entryTop}>
                    <Text style={styles.entryDate} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.projectHours}>{item.hoursLabel}</Text>
                  </View>
                  <Text style={styles.projectMeta}>
                    {item.project} · {item.status}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <TimeSheetDateFilterModal
        visible={filterVisible}
        initialStartDateKey={dateRange.startDateKey}
        initialEndDateKey={dateRange.endDateKey}
        onClose={() => setFilterVisible(false)}
        onApply={setDateRange}
        onReset={() => setDateRange(getCurrentWeekRange())}
      />
    </SafeAreaView>
  );
};

export default TimeReportScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  mainTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PAD,
    paddingVertical: hp(1.2),
    gap: wp(2.5),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    backgroundColor: darkSurfaceColor,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: darkInputBgColor,
  },
  mainTabBtnActive: {
    backgroundColor: 'rgba(155, 89, 182, 0.2)',
    borderColor: PURPLE,
  },
  mainTabTextWrap: {
    flex: 1,
  },
  mainTabText: {
    ...style.fontSizeSmall,
    ...style.fontWeightMedium,
    color: darkTextSecondaryColor,
  },
  mainTabTextActive: {
    color: whiteColor,
  },
  mainTabMeta: {
    fontSize: wp(2.6),
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: hp(2),
    paddingBottom: hp(4),
  },
  filterCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    marginBottom: hp(2),
  },
  dateRangeBtn: {
    marginTop: hp(1.2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.3),
  },
  dateRangeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    flex: 1,
  },
  dateRangeLabel: {
    fontSize: wp(2.7),
    color: darkTextSecondaryColor,
  },
  dateRangeValue: {
    ...style.fontSizeSmall2x,
    color: darkTextPrimaryColor,
    marginTop: hp(0.2),
  },
  filterActions: {
    marginTop: hp(1.4),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearFiltersText: {
    ...style.fontSizeSmall,
    color: PURPLE,
    fontWeight: '600',
  },
  entriesCount: {
    fontSize: wp(2.8),
    color: darkTextSecondaryColor,
  },
  sectionCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1.5),
    gap: wp(2),
  },
  sectionTitle: {
    flex: 1,
    fontSize: wp(3),
    letterSpacing: 0.4,
    color: darkTextSecondaryColor,
    fontWeight: '600',
  },
  sectionTotal: {
    ...style.fontSizeSmall2x,
    color: darkAccentGreenColor,
    fontWeight: '700',
  },
  loader: {
    marginVertical: hp(3),
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: hp(4),
    gap: hp(0.8),
  },
  emptyTitle: {
    ...style.fontSizeNormal,
    color: whiteColor,
    textAlign: 'center',
  },
  emptySub: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.4),
    marginBottom: hp(1.2),
  },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1),
  },
  entryDate: {
    flex: 1,
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: wp(1.5),
  },
  statusBadgeText: {
    fontSize: wp(2.6),
    fontWeight: '700',
  },
  entryGrid: {
    flexDirection: 'row',
  },
  entryCell: {
    flex: 1,
  },
  entryLabel: {
    fontSize: wp(2.5),
    color: darkTextSecondaryColor,
    marginBottom: hp(0.3),
  },
  entryValue: {
    ...style.fontSizeSmall2x,
    color: darkTextPrimaryColor,
    fontWeight: '500',
  },
  profileHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    marginBottom: hp(1.5),
  },
  profileHintText: {
    flex: 1,
    fontSize: wp(2.7),
    color: darkTextSecondaryColor,
  },
  projectHours: {
    ...style.fontSizeSmall2x,
    color: darkAccentGreenColor,
    fontWeight: '700',
  },
  projectMeta: {
    fontSize: wp(2.7),
    color: darkTextSecondaryColor,
  },
});
