import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AppHeader from '../../components/AppHeader';
import AiAssistant from '../../components/AiAssistant';
import UserAvatar from '../../components/UserAvatar';
import PerformanceMeterBar from '../../components/PerformanceMeterBar';
import PerformanceEmployeeCard from '../../components/PerformanceEmployeeCard';
import { useAuth } from '../../context/AuthContext';
import { isCeoAdminUser, isHrManagerUser, isTeamLeaderUser } from '../../constants/roles';
import {
  PERFORMANCE_ATTENDANCE_LABEL,
  PERFORMANCE_BACK,
  PERFORMANCE_DONE_SUFFIX,
  PERFORMANCE_EMPTY_SEARCH,
  PERFORMANCE_EMPTY_TEAM,
  PERFORMANCE_NO_SHIFT_CAPTION,
  PERFORMANCE_NO_TASKS_CAPTION,
  PERFORMANCE_PAYABLE_DAYS_SUFFIX,
  PERFORMANCE_PROFILE_NOT_FOUND,
  PERFORMANCE_SEARCH_PLACEHOLDER,
  PERFORMANCE_SHIFT_LABEL,
  PERFORMANCE_SUBTITLE,
  PERFORMANCE_TASK_LABEL,
  PERFORMANCE_TEAM_SUFFIX,
  PERFORMANCE_TITLE,
} from '../../constants/Constants';
import {
  darkBorderColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { fetchEmployeeHrmsData, fetchHrmsMonthlyData, normalizeDepartmentName } from '../../services/hrmsService';
import { fetchAllProjectTasks, mapProjectTaskRowToApp } from '../../services/projectTasksService';
import {
  buildDailyShiftPoints,
  buildMonthKey,
  computeAttendanceMeter,
  computeShiftMeter,
  computeTaskCompletionMeter,
  monthLabel,
} from '../../utils/performanceUtils';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const SHIFT_TARGET_HOURS = 8;

const DailyShiftChart = ({ points }) => {
  const maxValue = Math.max(SHIFT_TARGET_HOURS, ...points.map(point => point.value));

  return (
    <View>
      <View style={styles.chartBars}>
        {points.map(point => (
          <View key={point.date} style={styles.chartBarSlot}>
            <View
              style={[
                styles.chartBarFill,
                { height: `${Math.max(2, (point.value / maxValue) * 100)}%` },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.chartTargetLine} />
    </View>
  );
};

const EmployeeDetail = ({ row, dailyShiftPoints, onBack }) => {
  const { employee, attendanceMeter, taskMeter, shiftMeter } = row;

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeaderRow}>
        {onBack ? (
          <TouchableOpacity style={styles.backButtonInline} onPress={onBack} activeOpacity={0.8}>
            <Icon name="arrow-left" size={wp(4)} color={darkTextSecondaryColor} />
            <Text style={styles.backButtonInlineText}>{PERFORMANCE_BACK}</Text>
          </TouchableOpacity>
        ) : null}
        <UserAvatar userId={employee.id} name={employee.name} size={wp(11)} />
        <View style={styles.detailHeaderText}>
          <Text style={styles.detailName} numberOfLines={1}>
            {employee.name}
          </Text>
          <Text style={styles.detailRole} numberOfLines={1}>
            {employee.role}{employee.dept ? ` · ${employee.dept}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.detailMeters}>
        <PerformanceMeterBar
          label={PERFORMANCE_ATTENDANCE_LABEL}
          percent={attendanceMeter.percent}
          caption={`${attendanceMeter.payableDays} of ${attendanceMeter.daysInMonth} ${PERFORMANCE_PAYABLE_DAYS_SUFFIX}`}
        />
        <PerformanceMeterBar
          label={PERFORMANCE_TASK_LABEL}
          percent={taskMeter.percent}
          caption={taskMeter.total > 0 ? `${taskMeter.done}/${taskMeter.total} ${PERFORMANCE_DONE_SUFFIX}` : PERFORMANCE_NO_TASKS_CAPTION}
        />
        <PerformanceMeterBar
          label={PERFORMANCE_SHIFT_LABEL}
          percent={shiftMeter.percent}
          caption={
            shiftMeter.totalDays > 0
              ? `${shiftMeter.totalHours.toFixed(1)}h of ${shiftMeter.expectedHours}h (8h/day × ${shiftMeter.totalDays} days)`
              : PERFORMANCE_NO_SHIFT_CAPTION
          }
        />
      </View>

      {dailyShiftPoints && dailyShiftPoints.length > 0 ? (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>{PERFORMANCE_SHIFT_LABEL}</Text>
          <DailyShiftChart points={dailyShiftPoints} />
        </View>
      ) : null}
    </View>
  );
};

const PerformanceScreen = () => {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), monthIndex: today.getMonth() });
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selfRow, setSelfRow] = useState(null);
  const [selfDailyShiftPoints, setSelfDailyShiftPoints] = useState([]);
  const [gridRows, setGridRows] = useState([]);
  const [gridDatesList, setGridDatesList] = useState([]);

  const isTeamLead = isTeamLeaderUser(user);
  const isCompanyWide = isCeoAdminUser(user) || isHrManagerUser(user);
  const isSelfOnly = !isTeamLead && !isCompanyWide;

  const isCurrentMonth = cursor.year === today.getFullYear() && cursor.monthIndex === today.getMonth();

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const monthKey = buildMonthKey(cursor.year, cursor.monthIndex);
      const taskRows = await fetchAllProjectTasks();
      const tasks = taskRows.map(row => mapProjectTaskRowToApp(row));

      if (isSelfOnly) {
        const hrmsData = await fetchEmployeeHrmsData(user.id, monthKey);
        const daysInMonth = hrmsData.datesList.length;
        const employee = hrmsData.employee || { id: user.id, name: user.name, role: user.role, dept: user.dept };

        setSelfRow({
          employee,
          attendanceMeter: computeAttendanceMeter(hrmsData.summary, daysInMonth),
          taskMeter: computeTaskCompletionMeter(tasks, user.id, monthKey),
          shiftMeter: computeShiftMeter(hrmsData.dayWise),
        });
        setSelfDailyShiftPoints(buildDailyShiftPoints(hrmsData.dayWise, hrmsData.datesList));
      } else {
        const hrmsAll = await fetchHrmsMonthlyData(monthKey);
        const daysInMonth = hrmsAll.datesList.length;

        let entries = hrmsAll.employees;
        if (isTeamLead) {
          const viewerDept = normalizeDepartmentName(user?.dept);
          entries = entries.filter(entry => normalizeDepartmentName(entry.employee?.dept) === viewerDept);
        }

        const rows = entries
          .map(({ employee, dayWise, summary }) => ({
            employee,
            dayWise,
            attendanceMeter: computeAttendanceMeter(summary, daysInMonth),
            taskMeter: computeTaskCompletionMeter(tasks, employee.id, monthKey),
            shiftMeter: computeShiftMeter(dayWise),
          }))
          .sort((a, b) => a.employee.name.localeCompare(b.employee.name));

        setGridRows(rows);
        setGridDatesList(hrmsAll.datesList);
      }
    } catch (error) {
      setErrorMessage(error?.message || 'Unable to load performance data.');
    } finally {
      setLoading(false);
    }
  }, [cursor, isSelfOnly, isTeamLead, user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const shiftMonth = delta => {
    setCursor(prev => {
      const next = new Date(prev.year, prev.monthIndex + delta, 1);
      return { year: next.getFullYear(), monthIndex: next.getMonth() };
    });
    setSelectedEmployeeId(null);
  };

  const filteredGridRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return gridRows;
    return gridRows.filter(
      row =>
        row.employee.name?.toLowerCase().includes(query) ||
        row.employee.role?.toLowerCase().includes(query),
    );
  }, [gridRows, search]);

  const selectedRow = selectedEmployeeId
    ? gridRows.find(row => row.employee.id === selectedEmployeeId)
    : null;

  const selectedDailyShiftPoints = useMemo(() => {
    if (!selectedRow) return [];
    return buildDailyShiftPoints(selectedRow.dayWise, gridDatesList);
  }, [selectedRow, gridDatesList]);

  useEffect(() => {
    if (errorMessage) {
      Alert.alert('Load Failed', errorMessage);
    }
  }, [errorMessage]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={PERFORMANCE_TITLE} />

        <View style={styles.topBar}>
          <View style={styles.topBarText}>
            <Text style={styles.subtitle}>
              {isTeamLead ? `${user?.dept || ''} ${PERFORMANCE_TEAM_SUFFIX} · ` : ''}
              {PERFORMANCE_SUBTITLE}
            </Text>
          </View>

          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="chevron-left" size={wp(5)} color={darkTextPrimaryColor} />
            </TouchableOpacity>
            <View style={styles.monthLabelWrap}>
              <Icon name="calendar" size={wp(3.6)} color={PURPLE} />
              <Text style={styles.monthLabel}>{monthLabel(cursor.year, cursor.monthIndex)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => shiftMonth(1)}
              disabled={isCurrentMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={isCurrentMonth && styles.monthNavDisabled}>
              <Icon name="chevron-right" size={wp(5)} color={darkTextPrimaryColor} />
            </TouchableOpacity>
          </View>
        </View>

        {!isSelfOnly && !selectedRow ? (
          <View style={styles.searchRow}>
            <Icon name="search" size={wp(4)} color={darkTextSecondaryColor} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={PERFORMANCE_SEARCH_PLACEHOLDER}
              placeholderTextColor={darkPlaceholderColor}
            />
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={styles.loader} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {isSelfOnly ? (
              selfRow ? (
                <EmployeeDetail row={selfRow} dailyShiftPoints={selfDailyShiftPoints} />
              ) : (
                <Text style={styles.emptyText}>{PERFORMANCE_PROFILE_NOT_FOUND}</Text>
              )
            ) : selectedRow ? (
              <EmployeeDetail
                row={selectedRow}
                dailyShiftPoints={selectedDailyShiftPoints}
                onBack={() => setSelectedEmployeeId(null)}
              />
            ) : filteredGridRows.length === 0 ? (
              <Text style={styles.emptyText}>
                {search.trim() ? PERFORMANCE_EMPTY_SEARCH : PERFORMANCE_EMPTY_TEAM}
              </Text>
            ) : (
              <View style={styles.grid}>
                {filteredGridRows.map(row => (
                  <PerformanceEmployeeCard
                    key={row.employee.id}
                    row={row}
                    onPress={() => setSelectedEmployeeId(row.employee.id)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <AiAssistant />
    </View>
  );
};

export default PerformanceScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#06091a',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    marginTop: hp(1.5),
    marginBottom: hp(1.2),
    gap: wp(3),
  },
  topBarText: {
    flex: 1,
  },
  subtitle: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.3)',
    borderRadius: wp(2.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
  },
  monthNavDisabled: {
    opacity: 0.3,
  },
  monthLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  monthLabel: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginHorizontal: wp(5),
    marginBottom: hp(1.2),
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    height: hp(5),
  },
  searchInput: {
    flex: 1,
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  loader: {
    marginTop: hp(8),
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
  },
  grid: {
    gap: hp(1.5),
  },
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginTop: hp(6),
  },
  detailCard: {
    gap: hp(2),
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3.5),
    padding: wp(3.5),
  },
  backButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  backButtonInlineText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  detailHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  detailName: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  detailRole: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  detailMeters: {
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3.5),
    padding: wp(4),
    gap: hp(2),
  },
  chartSection: {
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3.5),
    padding: wp(4),
  },
  chartTitle: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
    marginBottom: hp(1.5),
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: hp(14),
    gap: wp(0.6),
  },
  chartBarSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: wp(1),
    backgroundColor: PURPLE,
    minHeight: 2,
  },
  chartTargetLine: {
    height: 1,
    backgroundColor: 'rgba(245, 166, 35, 0.5)',
    marginTop: hp(0.5),
  },
});
