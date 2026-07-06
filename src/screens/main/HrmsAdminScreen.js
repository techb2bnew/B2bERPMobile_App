import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
  Alert,
  Share,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Feather';
import RNShare from 'react-native-share';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  fetchHrmsMonthlyData,
  getMonthDatesList,
  convertHrmsDataToCsv,
  calculateSalaryProjection,
  normalizeDepartmentName,
  getCurrentHrmsMonthKey,
  getRecentHrmsMonths,
  HRMS_STATUS_DISPLAY,
  getHrmsStatusDisplay,
} from '../../services/hrmsService';
import { getLocalDateKey } from '../../services/clockSessionsService';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../../utils';

const PURPLE = '#9B59B6';
const RED = '#F85149';
const GREEN = '#3DDC84';
const YELLOW = '#F39C12';
const BLUE = '#3498DB';

const HrmsAdminScreen = () => {
  const monthsList = useMemo(() => getRecentHrmsMonths(4), []);
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentHrmsMonthKey());
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'leaves'
  const [loading, setLoading] = useState(true);
  const [hrmsData, setHrmsData] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [actioningLeaveId, setActioningLeaveId] = useState(null);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState(null);
  const [selectedDayCellInfo, setSelectedDayCellInfo] = useState(null); // { employee, dateKey, dayInfo }
  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedDailyDate, setSelectedDailyDate] = useState(() => getLocalDateKey());

  useEffect(() => {
    if (!selectedMonth) return;
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;

    if (todayKey.startsWith(selectedMonth)) {
      setSelectedDailyDate(todayKey);
    } else {
      setSelectedDailyDate(`${selectedMonth}-01`);
    }
  }, [selectedMonth]);

  // Extract unique departments dynamically from employee list and normalize them
  const departments = useMemo(() => {
    if (!hrmsData) return ['All'];
    const depts = new Set(['All']);
    hrmsData.employees.forEach(emp => {
      depts.add(normalizeDepartmentName(emp.employee.dept));
    });
    return Array.from(depts);
  }, [hrmsData]);

  // Filter employee list by name search query and normalized department chip selection
  const filteredEmployees = useMemo(() => {
    if (!hrmsData) return [];
    return hrmsData.employees.filter(item => {
      const matchesSearch = item.employee.name.toLowerCase().includes(searchQuery.toLowerCase());
      const normalizedDept = normalizeDepartmentName(item.employee.dept);
      const matchesDept = selectedDept === 'All' || normalizedDept === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [hrmsData, searchQuery, selectedDept]);

  const loadHrmsData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHrmsMonthlyData(selectedMonth);
      setHrmsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const loadPendingLeaves = useCallback(async () => {
    if (!isSupabaseConfigured) {
      // Mock pending leaves
      setPendingLeaves([
        {
          id: 'leave-1',
          employee_name: 'Kartik',
          leave_type: 'Sick Leave',
          start_date: '2026-06-27',
          end_date: '2026-06-27',
          days: 1,
          reason: 'Fever and cold',
        },
        {
          id: 'leave-2',
          employee_name: 'Abhishek Thakur',
          leave_type: 'Casual Leave',
          start_date: '2026-06-29',
          end_date: '2026-06-30',
          days: 2,
          reason: 'Urgent family work at hometown',
        },
      ]);
      return;
    }

    try {
      const { data, error } = await getSupabase()
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingLeaves(data || []);
    } catch (err) {
      console.error('Error loading pending leaves:', err);
    }
  }, []);

  useEffect(() => {
    loadHrmsData();
  }, [loadHrmsData]);

  useEffect(() => {
    if (activeTab === 'leaves') {
      loadPendingLeaves();
    }
  }, [activeTab, loadPendingLeaves]);

  const handleLeaveAction = async (leaveId, action) => {
    setActioningLeaveId(leaveId);
    const status = action === 'approve' ? 'Approved' : 'Rejected';
    
    if (!isSupabaseConfigured) {
      // Mock action
      setPendingLeaves(prev => prev.filter(l => l.id !== leaveId));
      setActioningLeaveId(null);
      Alert.alert('Success', `Leave request ${status} successfully (offline mode).`);
      return;
    }

    try {
      const { error } = await getSupabase()
        .from('leave_requests')
        .update({ status })
        .eq('id', leaveId);

      if (error) throw error;

      setPendingLeaves(prev => prev.filter(l => l.id !== leaveId));
      Alert.alert('Success', `Leave request has been ${status.toLowerCase()} successfully.`);
    } catch (err) {
      console.error('Error actioning leave request:', err);
      Alert.alert('Error', 'Failed to update leave request. Please try again.');
    } finally {
      setActioningLeaveId(null);
    }
  };

  const handleExportExcel = () => {
    if (!hrmsData || hrmsData.employees.length === 0) {
      Alert.alert('No Data', 'There is no attendance data available to export.');
      return;
    }

    const monthLabel = monthsList.find(m => m.key === selectedMonth)?.label || selectedMonth;

    Alert.alert(
      'Export Attendance',
      `Generate and share monthly attendance spreadsheet (CSV) for ${monthLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              const csvContent = convertHrmsDataToCsv(hrmsData.datesList, hrmsData.employees);
              const fileName = `Attendance_Report_${monthLabel.replace(/\s+/g, '_')}.csv`;
              // Use CachesDirectoryPath instead of DocumentDirectoryPath because react-native-share's
              // FileProvider is configured to expose the cache directory on Android.
              const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
              
              // Write the CSV content to a local file
              await RNFS.writeFile(filePath, csvContent, 'utf8');

              // Share using react-native-share
              await RNShare.open({
                title: `Attendance Report - ${monthLabel}`,
                url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
                type: 'text/csv',
                filename: fileName.replace('.csv', ''),
                showAppsToView: true,
              });
            } catch (err) {
              console.error('Error sharing CSV:', err);
              // rn-share sometimes throws when user dismisses the dialog
              if (err?.message && err.message !== 'User did not share') {
                Alert.alert('Error', 'Failed to share the exported spreadsheet.');
              }
            }
          },
        },
      ]
    );
  };

  // Render month selector dropdown/bar
  const renderHeaderSelector = () => (
    <View style={styles.selectorBar}>
      <View style={styles.monthSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsScroll}>
          {monthsList.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.monthTab, selectedMonth === m.key && styles.monthTabActive]}
              onPress={() => setSelectedMonth(m.key)}>
              <Text style={[styles.monthTabText, selectedMonth === m.key && styles.monthTabTextActive]}>
                {m.label.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <TouchableOpacity style={styles.exportBtn} onPress={handleExportExcel}>
        <Icon name="download" size={wp(4.8)} color={whiteColor} />
      </TouchableOpacity>
    </View>
  );

  // Tab switcher
  const renderTabSwitcher = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'grid' && styles.tabActive]}
        onPress={() => setActiveTab('grid')}>
        <Icon name="grid" size={wp(4.2)} color={activeTab === 'grid' ? whiteColor : darkTextSecondaryColor} />
        <Text style={[styles.tabText, activeTab === 'grid' && styles.tabTextActive]}>Grid</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'daily' && styles.tabActive]}
        onPress={() => setActiveTab('daily')}>
        <Icon name="calendar" size={wp(4.2)} color={activeTab === 'daily' ? whiteColor : darkTextSecondaryColor} />
        <Text style={[styles.tabText, activeTab === 'daily' && styles.tabTextActive]}>Daily</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'leaves' && styles.tabActive]}
        onPress={() => setActiveTab('leaves')}>
        <Icon name="check-square" size={wp(4.2)} color={activeTab === 'leaves' ? whiteColor : darkTextSecondaryColor} />
        <Text style={[styles.tabText, activeTab === 'leaves' && styles.tabTextActive]}>Leaves</Text>
      </TouchableOpacity>
    </View>
  );

  // 1. Render Attendance Grid
  const renderGridContent = () => {
    if (loading || !hrmsData) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      );
    }

    const { datesList, employees } = hrmsData;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Month-wise Register</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} directionalLockEnabled={false}>
          <View>
            {/* Headers row */}
            <View style={[styles.gridRow, styles.gridHeaderRow]}>
              <Text style={[styles.gridCellHeader, styles.gridNameCell, { alignSelf: 'center' }]}>Employee</Text>
              {datesList.map(dateKey => {
                const dateObj = new Date(dateKey);
                const dayNum = dateKey.split('-')[2];
                const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
                return (
                  <View key={dateKey} style={styles.headerDateContainer}>
                    <Text style={styles.gridCellHeaderDay}>{dayName}</Text>
                    <Text style={styles.gridCellHeader}>{dayNum}</Text>
                  </View>
                );
              })}
            </View>

            {/* Grid rows */}
            <FlatList
              data={filteredEmployees}
              keyExtractor={item => item.employee.id}
              renderItem={({ item }) => (
                <View style={styles.gridRow}>
                  {/* Name column */}
                  <TouchableOpacity
                    style={[styles.gridCell, styles.gridNameCell]}
                    onPress={() => setSelectedEmployeeDetail(item)}
                    activeOpacity={0.7}>
                    <Text style={styles.employeeName} numberOfLines={1}>
                      {item.employee.name}
                    </Text>
                    <Text style={styles.employeeDept} numberOfLines={1}>
                      {normalizeDepartmentName(item.employee.dept)}
                    </Text>
                  </TouchableOpacity>

                  {/* Days columns */}
                  {datesList.map(dateKey => {
                    const statusObj = item.dayWise[dateKey];
                    const letterConfig = getHrmsStatusDisplay(statusObj?.status);
                    const isFuture = statusObj?.status === 'Future' || statusObj?.status === 'No Record';

                    return (
                      <TouchableOpacity
                        key={dateKey}
                        style={styles.gridCell}
                        activeOpacity={isFuture ? 1 : 0.7}
                        onPress={() => {
                          if (!isFuture && statusObj) {
                            setSelectedDayCellInfo({
                              employee: item.employee,
                              dateKey,
                              dayInfo: statusObj,
                            });
                          }
                        }}
                      >
                        <View style={[styles.statusBubble, { backgroundColor: `${letterConfig.color}20`, borderColor: letterConfig.color }]}>
                          <Text style={[styles.statusBubbleText, { color: letterConfig.color }]}>
                            {letterConfig.letter}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
          </View>
        </ScrollView>
        {/* Legend row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legend}>
          {Object.values(HRMS_STATUS_DISPLAY)
            .filter(item => item.letter !== '-')
            .map(item => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
        </ScrollView>
      </View>
    );
  };

  // 2. Render Leave Approvals panel
  const renderLeavesContent = () => {
    return (
      <View style={styles.leavesSection}>
        <Text style={styles.sectionHeader}>All Leave Requests ({pendingLeaves.length})</Text>
        {pendingLeaves.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="check-circle" size={wp(10)} color="#555" />
            <Text style={styles.emptyText}>No leave requests found.</Text>
          </View>
        ) : (
          <FlatList
            data={pendingLeaves}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.leaveCard} onPress={() => setSelectedLeaveDetail(item)} activeOpacity={0.7}>
                <View style={styles.leaveCardHeader}>
                  <Text style={styles.leaveEmployeeName}>{item.employee_name}</Text>
                  <View style={styles.leaveTypePill}>
                    <Text style={styles.leaveTypeLabel}>{item.leave_type}</Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'column', marginTop: hp(1.5), gap: hp(0.8) }}>
                   <Text style={{ color: '#8B949E', fontSize: wp(3.2) }}>
                     Reporting To: <Text style={{ color: '#fff', fontWeight: '500' }}>{item.reporting_officer || 'CEO Admin'}</Text>
                   </Text>
                   <Text style={{ color: '#8B949E', fontSize: wp(3.2) }}>
                     Duration: <Text style={{ color: '#fff', fontWeight: '500' }}>{new Date(item.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} 
                     {item.start_date !== item.end_date ? ` - ${new Date(item.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''} 
                     {` (${item.days} ${item.days > 1 ? 'Days' : 'Day'})`}</Text>
                   </Text>
                </View>

                <View style={{ marginTop: hp(2), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <View style={{ paddingHorizontal: wp(3), paddingVertical: hp(0.6), borderRadius: wp(1.5), backgroundColor: item.status === 'Approved' ? 'rgba(46, 204, 113, 0.2)' : item.status === 'Rejected' ? 'rgba(231, 76, 60, 0.2)' : 'rgba(241, 196, 15, 0.2)', borderWidth: 1, borderColor: item.status === 'Approved' ? 'rgba(46, 204, 113, 0.4)' : item.status === 'Rejected' ? 'rgba(231, 76, 60, 0.4)' : 'rgba(241, 196, 15, 0.4)' }}>
                      <Text style={{ fontSize: wp(3.2), fontWeight: '600', color: item.status === 'Approved' ? '#2ECC71' : item.status === 'Rejected' ? '#E74C3C' : '#F1C40F' }}>
                        {item.status || 'Pending'}
                      </Text>
                   </View>
                   <Text style={{ color: '#8B949E', fontSize: wp(3), fontStyle: 'italic' }}>Tap to view full details  →</Text>
                </View>

                {(!item.status || item.status === 'Pending') && (
                  <View style={styles.leaveActionsRow}>
                    <TouchableOpacity
                      style={[styles.leaveActionBtn, styles.rejectBtn]}
                      onPress={() => handleLeaveAction(item.id, 'reject')}
                      disabled={actioningLeaveId === item.id}>
                      <Text style={[styles.leaveActionBtnText, { color: '#E74C3C' }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.leaveActionBtn, styles.approveBtn]}
                      onPress={() => handleLeaveAction(item.id, 'approve')}
                      disabled={actioningLeaveId === item.id}>
                      {actioningLeaveId === item.id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.leaveActionBtnText}>Approve</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  };

  // 5. Render Day Cell Detail Modal (when user taps a day in the grid)
  const renderDayCellModal = () => {
    if (!selectedDayCellInfo) return null;
    const { employee, dateKey, dayInfo } = selectedDayCellInfo;
    const statusConfig = getHrmsStatusDisplay(dayInfo.status);

    const dateObj = new Date(dateKey);
    const displayDate = dateObj.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const formatTime = (isoStr) => {
      if (!isoStr) return '—';
      try {
        const d = new Date(isoStr);
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
      } catch { return '—'; }
    };

    const formatMins = (mins) => {
      if (!mins || mins <= 0) return '—';
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0) return `${m}m`;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const netWorkMins = Math.round((dayInfo.hours || 0) * 60);
    const totalMins = dayInfo.totalMins || 0;
    const lunchMins = dayInfo.lunchMins || 0;     // lunch/tea break (does NOT count as work)
    const meetingMins = dayInfo.meetingMins || 0; // meeting time (COUNTS as work)
    const workingOnlyMins = Math.round((dayInfo.workingHours || dayInfo.hours || 0) * 60); // pure desk work

    const isActive = dayInfo.clockIn && !dayInfo.clockOut;

    return (
      <Modal
        visible={!!selectedDayCellInfo}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedDayCellInfo(null)}
      >
        <View style={styles.dayCellModalOverlay}>
          <View style={styles.dayCellModalSheet}>
            {/* Handle bar */}
            <View style={styles.dayCellModalHandle} />

            {/* Header */}
            <View style={styles.dayCellModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dayCellModalName}>{employee.name}</Text>
                <Text style={styles.dayCellModalDate}>{displayDate}</Text>
              </View>
              <View style={[styles.dayCellStatusBadge, { backgroundColor: `${statusConfig.color}20`, borderColor: statusConfig.color }]}>
                <Text style={[styles.dayCellStatusText, { color: statusConfig.color }]}>
                  {dayInfo.status}
                </Text>
              </View>
            </View>

            <View style={styles.dayCellDivider} />

            {/* Time Details: Clock In / Clock Out */}
            <View style={styles.dayCellTimeGrid}>
              <View style={styles.dayCellTimeCard}>
                <Icon name="log-in" size={wp(4.5)} color="#3DDC84" />
                <Text style={styles.dayCellTimeLabel}>Clock In</Text>
                <Text style={[styles.dayCellTimeVal, { color: '#3DDC84' }]}>
                  {formatTime(dayInfo.clockIn)}
                </Text>
              </View>

              <View style={styles.dayCellTimeCard}>
                <Icon name="log-out" size={wp(4.5)} color={isActive ? '#3498DB' : '#F85149'} />
                <Text style={styles.dayCellTimeLabel}>Clock Out</Text>
                <Text style={[styles.dayCellTimeVal, { color: isActive ? '#3498DB' : '#F85149' }]}>
                  {isActive ? 'Active' : formatTime(dayInfo.clockOut)}
                </Text>
              </View>
            </View>

            <View style={styles.dayCellDivider} />

            {/* Time Breakdown: Work / Meeting / Break / Total */}
            <Text style={styles.dayCellBreakdownTitle}>Time Breakdown</Text>
            <View style={styles.dayCellBreakdownGrid}>
              {/* Pure Working */}
              <View style={[styles.dayCellBreakdownCard, { borderColor: 'rgba(52,152,219,0.4)' }]}>
                <Icon name="monitor" size={wp(3.8)} color="#3498DB" />
                <Text style={styles.dayCellBreakdownLabel}>Working</Text>
                <Text style={[styles.dayCellBreakdownVal, { color: '#3498DB' }]}>
                  {formatMins(workingOnlyMins)}
                </Text>
              </View>

              {/* Meeting (counts as work) */}
              <View style={[styles.dayCellBreakdownCard, { borderColor: 'rgba(155,89,182,0.4)' }]}>
                <Icon name="users" size={wp(3.8)} color={PURPLE} />
                <Text style={styles.dayCellBreakdownLabel}>Meeting</Text>
                <Text style={[styles.dayCellBreakdownVal, { color: PURPLE }]}>
                  {meetingMins > 0 ? formatMins(meetingMins) : '—'}
                </Text>
              </View>

              {/* Break/Lunch (does NOT count) */}
              <View style={[styles.dayCellBreakdownCard, { borderColor: 'rgba(245,197,66,0.4)' }]}>
                <Icon name="coffee" size={wp(3.8)} color="#F5C542" />
                <Text style={styles.dayCellBreakdownLabel}>Break</Text>
                <Text style={[styles.dayCellBreakdownVal, { color: '#F5C542' }]}>
                  {lunchMins > 0 ? formatMins(lunchMins) : '—'}
                </Text>
              </View>

              {/* Total Office Time */}
              <View style={[styles.dayCellBreakdownCard, { borderColor: 'rgba(255,255,255,0.15)' }]}>
                <Icon name="clock" size={wp(3.8)} color={darkTextSecondaryColor} />
                <Text style={styles.dayCellBreakdownLabel}>Total</Text>
                <Text style={[styles.dayCellBreakdownVal, { color: whiteColor }]}>
                  {totalMins > 0 ? formatMins(totalMins) : (dayInfo.hours > 0 ? formatMins(Math.round(dayInfo.hours * 60)) : '—')}
                </Text>
              </View>
            </View>

            {/* Net Working Hours Summary */}
            <View style={styles.dayCellHoursRow}>
              <View style={styles.dayCellHoursStat}>
                <Text style={styles.dayCellHoursLabel}>Net Working Hours</Text>
                <Text style={[styles.dayCellHoursVal, { color: '#3DDC84' }]}>
                  {dayInfo.hours > 0 ? formatMins(Math.round(dayInfo.hours * 60)) : '—'}
                </Text>
                <Text style={[styles.dayCellBreakdownLabel, { marginTop: hp(0.3) }]}>
                  Working + Meeting • breaks excluded
                </Text>
              </View>
              <View style={[styles.dayCellHoursStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)', paddingLeft: wp(4) }]}>
                <Text style={styles.dayCellHoursLabel}>Required</Text>
                <Text style={[styles.dayCellHoursVal, { color: '#8B949E' }]}>8h</Text>
                <Text style={[styles.dayCellBreakdownLabel, { marginTop: hp(0.3) }]}>
                  Minimum for Full Day
                </Text>
              </View>
            </View>

            {/* Status Info Banner */}
            {dayInfo.status === 'Absent' && !dayInfo.clockIn && (
              <View style={[styles.dayCellInfoBanner, { borderColor: RED, backgroundColor: 'rgba(248,81,73,0.08)' }]}>
                <Icon name="x-circle" size={wp(4)} color={RED} />
                <Text style={[styles.dayCellInfoText, { color: RED }]}>No clock session recorded for this day</Text>
              </View>
            )}
            {dayInfo.status === 'Absent' && dayInfo.clockIn && (
              <View style={[styles.dayCellInfoBanner, { borderColor: RED, backgroundColor: 'rgba(248,81,73,0.08)' }]}>
                <Icon name="alert-circle" size={wp(4)} color={RED} />
                <Text style={[styles.dayCellInfoText, { color: RED }]}>Clocked in but never clocked out — marked Absent</Text>
              </View>
            )}
            {dayInfo.status === 'Short Leave' && (
              <View style={[styles.dayCellInfoBanner, { borderColor: '#D35400', backgroundColor: 'rgba(211,84,0,0.08)' }]}>
                <Icon name="clock" size={wp(4)} color="#D35400" />
                <Text style={[styles.dayCellInfoText, { color: '#D35400' }]}>Short Leave: worked ≥ 6h but less than full day (8h)</Text>
              </View>
            )}
            {dayInfo.status === 'Half Day' && (
              <View style={[styles.dayCellInfoBanner, { borderColor: YELLOW, backgroundColor: 'rgba(243,156,18,0.08)' }]}>
                <Icon name="sun" size={wp(4)} color={YELLOW} />
                <Text style={[styles.dayCellInfoText, { color: YELLOW }]}>Half Day: worked 4.5h – 6h out of 8h required</Text>
              </View>
            )}
            {(dayInfo.status === 'Leave' || dayInfo.status === 'Paid Leave') && (
              <View style={[styles.dayCellInfoBanner, { borderColor: BLUE, backgroundColor: 'rgba(52,152,219,0.08)' }]}>
                <Icon name="calendar" size={wp(4)} color={BLUE} />
                <Text style={[styles.dayCellInfoText, { color: BLUE }]}>
                  {dayInfo.status === 'Paid Leave'
                    ? 'Approved leave within quarterly paid quota (salary counted)'
                    : 'Approved leave day'}
                </Text>
              </View>
            )}
            {dayInfo.status === 'Unpaid Leave' && (
              <View style={[styles.dayCellInfoBanner, { borderColor: RED, backgroundColor: 'rgba(248,81,73,0.08)' }]}>
                <Icon name="alert-triangle" size={wp(4)} color={RED} />
                <Text style={[styles.dayCellInfoText, { color: RED }]}>Leave exceeds quarterly paid quota — salary deduction applies</Text>
              </View>
            )}
            {dayInfo.status === 'Sandwich Leave' && (
              <View style={[styles.dayCellInfoBanner, { borderColor: '#E85D5D', backgroundColor: 'rgba(232,93,93,0.08)' }]}>
                <Icon name="alert-circle" size={wp(4)} color="#E85D5D" />
                <Text style={[styles.dayCellInfoText, { color: '#E85D5D' }]}>Weekly off sandwiched between leave/absent days — counted as leave</Text>
              </View>
            )}
            {dayInfo.status === 'Weekly Off' && (
              <View style={[styles.dayCellInfoBanner, { borderColor: '#555555', backgroundColor: 'rgba(85,85,85,0.12)' }]}>
                <Icon name="moon" size={wp(4)} color="#8B949E" />
                <Text style={[styles.dayCellInfoText, { color: '#8B949E' }]}>Weekly off (Saturday / Sunday)</Text>
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.dayCellCloseBtn}
              onPress={() => setSelectedDayCellInfo(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.dayCellCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // 6. Render Leave Detail Modal
  const renderLeaveDetailModal = () => {
    if (!selectedLeaveDetail) return null;
    const leave = selectedLeaveDetail;
    const isApproved = String(leave.status || '').toLowerCase() === 'approved';
    const isRejected = String(leave.status || '').toLowerCase() === 'rejected';
    const statusColor = isApproved ? '#2ECC71' : isRejected ? '#E74C3C' : '#F1C40F';

    return (
      <Modal
        visible={!!selectedLeaveDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLeaveDetail(null)}
      >
        <View style={styles.dayCellModalOverlay}>
          <View style={[styles.dayCellModalSheet, { maxHeight: hp(85), padding: wp(5) }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(3) }}>
              <Text style={{ color: 'white', fontSize: wp(4.5), fontWeight: 'bold' }}>Leave Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedLeaveDetail(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(5.5)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: hp(2) }} showsVerticalScrollIndicator={false}>
              {/* Row 1: Applied By & Category */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(2.5) }}>
                 <View style={{ flex: 1 }}>
                    <Text style={{ color: darkTextSecondaryColor, fontSize: wp(3.2), marginBottom: hp(0.5), textTransform: 'capitalize' }}>Applied By</Text>
                    <Text style={{ color: whiteColor, fontSize: wp(3.8), fontWeight: '500' }}>{leave.employee_name}</Text>
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={{ color: darkTextSecondaryColor, fontSize: wp(3.2), marginBottom: hp(0.5), textTransform: 'capitalize' }}>Category</Text>
                    <Text style={{ color: whiteColor, fontSize: wp(3.8), fontWeight: '500' }}>{leave.leave_type}</Text>
                 </View>
              </View>

              {/* Row 2: Reporting Officer & Status */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(2.5) }}>
                 <View style={{ flex: 1 }}>
                    <Text style={{ color: darkTextSecondaryColor, fontSize: wp(3.2), marginBottom: hp(0.5), textTransform: 'capitalize' }}>Reporting Officer</Text>
                    <Text style={{ color: whiteColor, fontSize: wp(3.8), fontWeight: '500' }}>{leave.reporting_officer || 'CEO Admin'}</Text>
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={{ color: darkTextSecondaryColor, fontSize: wp(3.2), marginBottom: hp(0.5), textTransform: 'capitalize' }}>Status</Text>
                    <View style={{ alignSelf: 'flex-start', paddingHorizontal: wp(3), paddingVertical: hp(0.6), borderRadius: wp(1.5), backgroundColor: `${statusColor}20`, borderWidth: 1, borderColor: `${statusColor}40` }}>
                       <Text style={{ color: statusColor, fontSize: wp(3.2), fontWeight: '600' }}>{leave.status || 'Pending'}</Text>
                    </View>
                 </View>
              </View>

              {/* Row 3: Duration & Time Slot/Total Days */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(2.5) }}>
                 <View style={{ flex: 1 }}>
                    <Text style={{ color: darkTextSecondaryColor, fontSize: wp(3.2), marginBottom: hp(0.5), textTransform: 'capitalize' }}>Duration</Text>
                    <Text style={{ color: whiteColor, fontSize: wp(3.8), fontWeight: '500' }}>
                       {new Date(leave.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} 
                       {leave.start_date !== leave.end_date ? ` - ${new Date(leave.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}` : ''}
                    </Text>
                 </View>
                 {leave.start_time || leave.half_day_type || leave.days > 0 ? (
                   <View style={{ flex: 1 }}>
                      <Text style={{ color: darkTextSecondaryColor, fontSize: wp(3.2), marginBottom: hp(0.5), textTransform: 'capitalize' }}>
                         {leave.start_time ? 'Time Slot' : leave.half_day_type ? 'Half Day Shift' : 'Total Days'}
                      </Text>
                      <Text style={{ color: whiteColor, fontSize: wp(3.8), fontWeight: '500' }}>
                         {leave.start_time ? `${leave.start_time} - ${leave.end_time}` : leave.half_day_type ? (leave.half_day_type === 'first_half' ? 'First Half' : 'Second Half') : `${leave.days} ${leave.days > 1 ? 'Days' : 'Day'}`}
                      </Text>
                   </View>
                 ) : <View style={{ flex: 1 }} />}
              </View>

              {/* Reason */}
              {leave.reason && (
                <View style={{ marginBottom: hp(2.5) }}>
                   <Text style={{ color: darkTextSecondaryColor, fontSize: wp(3.2), marginBottom: hp(0.5), textTransform: 'capitalize' }}>Reason for Leave</Text>
                   <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: wp(3.5), borderRadius: wp(2), marginTop: hp(0.5) }}>
                     <Text style={{ color: '#E1E1E1', fontSize: wp(3.5), lineHeight: wp(5) }}>{leave.reason}</Text>
                   </View>
                </View>
              )}

              {/* Applied On */}
              {leave.created_at && (
                <View style={{ marginBottom: hp(2.5) }}>
                   <Text style={{ color: darkTextSecondaryColor, fontSize: wp(3.2), marginBottom: hp(0.5), textTransform: 'capitalize' }}>Applied On</Text>
                   <Text style={{ color: darkTextSecondaryColor, fontSize: wp(3.8) }}>
                     {new Date(leave.created_at).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                   </Text>
                </View>
              )}
            </ScrollView>

            {(!leave.status || leave.status === 'Pending') && (
              <View style={[styles.leaveActionsRow, { marginTop: hp(2), marginBottom: hp(2) }]}>
                <TouchableOpacity
                  style={[styles.leaveActionBtn, styles.rejectBtn]}
                  onPress={() => {
                     handleLeaveAction(leave.id, 'reject');
                     setSelectedLeaveDetail(null);
                  }}
                  disabled={actioningLeaveId === leave.id}>
                  <Text style={[styles.leaveActionBtnText, { color: '#E74C3C' }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.leaveActionBtn, styles.approveBtn]}
                  onPress={() => {
                     handleLeaveAction(leave.id, 'approve');
                     setSelectedLeaveDetail(null);
                  }}
                  disabled={actioningLeaveId === leave.id}>
                  <Text style={styles.leaveActionBtnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            )}

            {leave.status && leave.status !== 'Pending' && (
              <TouchableOpacity
                style={{ backgroundColor: '#A569BD', padding: hp(1.8), borderRadius: wp(2), alignItems: 'center', marginTop: hp(1) }}
                onPress={() => setSelectedLeaveDetail(null)}
                activeOpacity={0.8}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: wp(4) }}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // 4. Render Employee Detail Modal
  const renderDetailModal = () => {
    if (!selectedEmployeeDetail) return null;

    const { employee, summary, dayWise } = selectedEmployeeDetail;
    const baseSalary = employee.base_salary || 0;
    const daysInMonth = Object.keys(dayWise).length;
    const totalLeaveCount = (summary.paidLeave ?? summary.leave ?? 0) + (summary.unpaidLeave || 0);
    const salaryResults = calculateSalaryProjection(baseSalary, summary, daysInMonth);

    // Sum of total work hours in this month
    const totalHours = Object.values(dayWise).reduce((sum, day) => sum + (day.hours || 0), 0);

    return (
      <Modal
        visible={!!selectedEmployeeDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedEmployeeDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalName}>{employee.name}</Text>
                <Text style={styles.modalRole}>{employee.role} • {normalizeDepartmentName(employee.dept)}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedEmployeeDetail(null)} style={styles.modalCloseBtn}>
                <Icon name="x" size={wp(6)} color={whiteColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Stats Overview */}
              <View style={styles.modalStatsRow}>
                <View style={styles.modalStatCard}>
                  <Text style={styles.modalStatVal}>{totalHours.toFixed(1)}h</Text>
                  <Text style={styles.modalStatLabel}>Work Hours</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={[styles.modalStatVal, { color: BLUE }]}>{totalLeaveCount}d</Text>
                  <Text style={styles.modalStatLabel}>Leaves</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={[styles.modalStatVal, { color: GREEN }]}>{summary.present}d</Text>
                  <Text style={styles.modalStatLabel}>Presents</Text>
                </View>
              </View>

              {/* Attendance Summary */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Attendance Summary</Text>
                <View style={styles.breakdownList}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Present Days (Full)</Text>
                    <Text style={[styles.breakdownVal, { color: GREEN }]}>{summary.present}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Half Days</Text>
                    <Text style={[styles.breakdownVal, { color: YELLOW }]}>{summary.halfDay}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Absent Days</Text>
                    <Text style={[styles.breakdownVal, { color: RED }]}>{summary.absent}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Approved Leaves</Text>
                    <Text style={[styles.breakdownVal, { color: BLUE }]}>{summary.paidLeave ?? summary.leave ?? 0}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Weekly Off / Off Days</Text>
                    <Text style={styles.breakdownVal}>{summary.weeklyOff}</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.breakdownRowHighlight]}>
                    <Text style={[styles.breakdownLabel, { fontWeight: 'bold', color: whiteColor }]}>Total Payable Days</Text>
                    <Text style={[styles.breakdownVal, { fontWeight: 'bold', color: GREEN }]}>{summary.payableDays}</Text>
                  </View>
                </View>
              </View>

              {/* Salary Overview */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Salary Overview</Text>
                <View style={styles.breakdownList}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Base Salary</Text>
                    <Text style={styles.breakdownVal}>₹{baseSalary.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Daily Rate</Text>
                    <Text style={styles.breakdownVal}>₹{salaryResults.dailyRate.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.breakdownRowHighlight]}>
                    <Text style={[styles.breakdownLabel, { fontWeight: 'bold', color: whiteColor }]}>Estimated Salary</Text>
                    <Text style={[styles.breakdownVal, { fontWeight: 'bold', color: GREEN }]}>₹{salaryResults.netPayable.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              </View>

              {/* Daily Log */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Daily Activity Log</Text>
                {Object.entries(dayWise)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([dateKey, dayInfo]) => {
                    const dateObj = new Date(dateKey);
                    const displayDate = dateObj.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      weekday: 'short',
                    });
                    const isFuture = dayInfo.status === 'Future';
                    if (isFuture) return null;

                    const letterConfig = getHrmsStatusDisplay(dayInfo.status);

                    return (
                      <View key={dateKey} style={styles.logRow}>
                        <View style={styles.logDateCol}>
                          <Text style={styles.logDateText}>{displayDate}</Text>
                          <Text style={styles.logHoursText}>{dayInfo.hours.toFixed(2)} hours worked</Text>
                        </View>
                        <View style={[styles.logStatusPill, { backgroundColor: `${letterConfig.color}15`, borderColor: letterConfig.color }]}>
                          <Text style={[styles.logStatusText, { color: letterConfig.color }]}>{dayInfo.status}</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Render search and department chips
  const renderFilters = () => {
    if (activeTab === 'leaves' || !hrmsData) return null;

    return (
      <View style={styles.filterSection}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Icon name="search" size={wp(4.5)} color={darkTextSecondaryColor} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employee..."
            placeholderTextColor={darkTextSecondaryColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="x" size={wp(4.5)} color={darkTextSecondaryColor} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Department chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deptChipsScroll}>
          {departments.map(dept => {
            const isActive = selectedDept === dept;
            return (
              <TouchableOpacity
                key={dept}
                style={[styles.deptChip, isActive && styles.deptChipActive]}
                onPress={() => setSelectedDept(dept)}>
                <Text style={[styles.deptChipText, isActive && styles.deptChipTextActive]}>
                  {dept}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const formatDateFriendly = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const renderDailyContent = () => {
    if (loading || !hrmsData) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      );
    }

    const datesList = hrmsData.datesList;
    const currentIndex = datesList.indexOf(selectedDailyDate);
    const canPrev = currentIndex > 0;
    const canNext = currentIndex < datesList.length - 1;

    const handlePrevDay = () => {
      if (canPrev) setSelectedDailyDate(datesList[currentIndex - 1]);
    };

    const handleNextDay = () => {
      if (canNext) setSelectedDailyDate(datesList[currentIndex + 1]);
    };

    const formatTime = (isoString) => {
      if (!isoString) return '';
      try {
        const date = new Date(isoString);
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
      } catch (e) {
        return '';
      }
    };

    return (
      <View style={styles.dailyContainer}>
        {/* Date Selector Header */}
        <View style={styles.dailyDateSelector}>
          <TouchableOpacity 
            onPress={handlePrevDay} 
            disabled={!canPrev}
            style={[styles.arrowButton, !canPrev && styles.disabledButton]}
          >
            <Icon name="chevron-left" size={wp(6)} color={canPrev ? whiteColor : darkTextSecondaryColor} />
          </TouchableOpacity>
          
          <Text style={styles.dailyDateText}>
            {formatDateFriendly(selectedDailyDate)}
          </Text>

          <TouchableOpacity 
            onPress={handleNextDay} 
            disabled={!canNext}
            style={[styles.arrowButton, !canNext && styles.disabledButton]}
          >
            <Icon name="chevron-right" size={wp(6)} color={canNext ? whiteColor : darkTextSecondaryColor} />
          </TouchableOpacity>
        </View>

        {filteredEmployees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No employees found matching the filters</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            keyExtractor={item => item.employee.id}
            contentContainerStyle={styles.dailyList}
            renderItem={({ item }) => {
              const dayInfo = item.dayWise[selectedDailyDate] || { status: 'Absent', hours: 0, clockIn: null, clockOut: null };
              const statusColor = getHrmsStatusDisplay(dayInfo.status).color;
              const showTimes = dayInfo.status === 'Present' || dayInfo.status === 'Half Day' || (dayInfo.status === 'Absent' && dayInfo.hours > 0);

              return (
                <TouchableOpacity
                  style={styles.dailyEmployeeCard}
                  onPress={() => setSelectedEmployeeDetail(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.dailyCardMain}>
                    <View style={styles.dailyCardHeader}>
                      <View style={{ flex: 1, marginRight: wp(2) }}>
                        <Text style={styles.dailyEmployeeName}>{item.employee.name}</Text>
                        <Text style={styles.dailyEmployeeMeta} numberOfLines={1}>
                          {item.employee.role} • {normalizeDepartmentName(item.employee.dept)}
                        </Text>
                      </View>
                      <View style={[styles.dailyStatusBadge, { backgroundColor: `${statusColor}15`, borderColor: statusColor }]}>
                        <Text style={[styles.dailyStatusText, { color: statusColor }]}>
                          {dayInfo.status}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.dailyCardDivider} />
                    
                    <View style={styles.dailyCardFooter}>
                      {showTimes ? (
                        <View style={styles.dailyTimeContainer}>
                          <Icon name="clock" size={wp(3.8)} color={darkTextSecondaryColor} style={{ marginRight: wp(1.2) }} />
                          <Text style={styles.dailyTimeText}>
                            {formatTime(dayInfo.clockIn) || '—'} - {dayInfo.clockOut ? formatTime(dayInfo.clockOut) : (dayInfo.clockIn ? 'Active' : '—')}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.dailyTimePlaceholder}>No clock sessions recorded</Text>
                      )}
                      
                      {dayInfo.hours > 0 && (
                        <View style={styles.dailyHoursContainer}>
                          <Text style={styles.dailyHoursVal}>{dayInfo.hours.toFixed(1)}</Text>
                          <Text style={styles.dailyHoursLabel}> hrs</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeaderSelector()}
      {renderTabSwitcher()}
      {renderFilters()}
      <View style={styles.mainContent}>
        {activeTab === 'grid' && renderGridContent()}
        {activeTab === 'daily' && renderDailyContent()}
        {activeTab === 'leaves' && renderLeavesContent()}
      </View>
      {renderDetailModal()}
      {renderDayCellModal()}
      {renderLeaveDetailModal()}
    </View>
  );
};

export default HrmsAdminScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
    padding: wp(4),
  },
  gridHeaderRow: {
    paddingVertical: hp(0.5),
  },
  headerDateContainer: {
    width: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellHeaderDay: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: hp(0.2),
  },
  selectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(0.5),
    marginBottom: hp(1.2),
  },
  monthSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthLabel: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  monthsScroll: {
    gap: wp(2),
  },
  monthTab: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: wp(1.5),
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  monthTabActive: {
    backgroundColor: PURPLE,
  },
  monthTabText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  monthTabTextActive: {
    color: whiteColor,
    ...style.fontWeightMedium,
  },
  exportBtn: {
    backgroundColor: PURPLE,
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: wp(2),
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3),
    padding: wp(1),
    marginBottom: hp(2),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    gap: wp(1.5),
    borderRadius: wp(2.5),
  },
  tabActive: {
    backgroundColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  tabText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    fontWeight: '600',
  },
  tabTextActive: {
    color: whiteColor,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: hp(10),
  },
  card: {
    flex: 1,
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3),
    padding: wp(4),
  },
  cardTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
    marginBottom: hp(2),
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    paddingVertical: hp(1.1),
  },
  gridCellHeader: {
    width: wp(10),
    textAlign: 'center',
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    ...style.fontWeightMedium,
  },
  gridCell: {
    width: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridNameCell: {
    width: wp(28),
    alignItems: 'flex-start',
    paddingLeft: wp(1),
  },
  employeeName: {
    ...style.fontSizeSmall2x,
    color: whiteColor,
    ...style.fontWeightMedium,
  },
  employeeDept: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  statusBubble: {
    width: wp(7.5),
    height: wp(7.5),
    borderRadius: wp(1.6),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBubbleText: {
    ...style.fontSizeSmall,
    ...style.fontWeightBold,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: wp(3),
    marginTop: hp(2),
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
    paddingTop: hp(1.5),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  legendDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
  },
  legendText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  leavesSection: {
    flex: 1,
  },
  sectionHeader: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
    marginBottom: hp(1.5),
  },
  emptyContainer: {
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3),
    paddingVertical: hp(8),
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(2),
  },
  emptyText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
  },
  leaveCard: {
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(1.5),
  },
  leaveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  leaveEmployeeName: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  leaveTypePill: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: wp(1.5),
  },
  leaveTypeLabel: {
    ...style.fontSizeSmall,
    color: BLUE,
    ...style.fontWeightMedium,
  },
  leaveCardDates: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.8),
  },
  leaveReasonText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    fontStyle: 'italic',
    lineHeight: hp(2),
    marginBottom: hp(1.5),
  },
  leaveActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: wp(3),
  },
  leaveActionBtn: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: wp(2),
    minWidth: wp(20),
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: 'rgba(248, 81, 73, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.3)',
  },
  approveBtn: {
    backgroundColor: PURPLE,
  },
  leaveActionBtnText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  filterSection: {
    marginBottom: hp(1.5),
    gap: hp(1),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3),
    height: hp(5.2),
  },
  searchInput: {
    flex: 1,
    color: whiteColor,
    ...style.fontSizeNormal,
    paddingLeft: wp(2),
    height: '100%',
  },
  deptChipsScroll: {
    gap: wp(2),
    paddingVertical: hp(0.5),
  },
  deptChip: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: wp(2),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  deptChipActive: {
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    borderColor: PURPLE,
  },
  deptChipText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  deptChipTextActive: {
    color: PURPLE,
    ...style.fontWeightMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: darkBackgroundColor,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    maxHeight: hp(85),
    paddingHorizontal: wp(5),
    paddingTop: hp(2.5),
    paddingBottom: hp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  modalName: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  modalRole: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  modalCloseBtn: {
    padding: wp(1),
  },
  modalScroll: {
    paddingBottom: hp(5),
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  modalStatCard: {
    flex: 1,
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3),
    paddingVertical: hp(1.5),
    alignItems: 'center',
    marginHorizontal: wp(1),
  },
  modalStatVal: {
    ...style.fontSizeLargeXX,
    ...style.fontWeightMedium,
    color: whiteColor,
    marginBottom: hp(0.2),
  },
  modalStatLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  modalSection: {
    marginTop: hp(2.5),
  },
  modalSectionTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextSecondaryColor,
    marginBottom: hp(1),
  },
  breakdownList: {
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3),
    paddingHorizontal: wp(4),
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp(1.2),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  breakdownRowHighlight: {
    borderBottomWidth: 0,
  },
  breakdownLabel: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
  },
  breakdownVal: {
    ...style.fontSizeNormal,
    color: whiteColor,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(2.5),
    padding: wp(3),
    marginBottom: hp(1),
  },
  logDateCol: {
    flex: 1,
  },
  logDateText: {
    ...style.fontSizeNormal,
    color: whiteColor,
    ...style.fontWeightMedium,
  },
  logHoursText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  logStatusPill: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: wp(1.5),
    borderWidth: 1,
  },
  logStatusText: {
    ...style.fontSizeSmall,
    ...style.fontWeightMedium,
  },
  dailyContainer: {
    flex: 1,
    marginTop: hp(1.5),
  },
  dailyDateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(8),
    paddingVertical: hp(0.8),
    marginBottom: hp(1.2),
  },
  arrowButton: {
    padding: wp(2),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: wp(5),
    width: wp(10),
    height: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  disabledButton: {
    opacity: 0.2,
  },
  dailyDateText: {
    ...style.fontSizeNormal2x,
    color: whiteColor,
    fontWeight: 'bold',
    minWidth: wp(40),
    textAlign: 'center',
  },
  dailyList: {
    paddingBottom: hp(5),
  },
  dailyEmployeeCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    marginBottom: hp(1.2),
    overflow: 'hidden',
  },
  dailyCardMain: {
    padding: wp(4),
  },
  dailyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyEmployeeName: {
    ...style.fontSizeNormal2x,
    color: whiteColor,
    fontWeight: '700',
  },
  dailyEmployeeMeta: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.4),
  },
  dailyStatusBadge: {
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(1.5),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyStatusText: {
    ...style.fontSizeSmall,
    fontWeight: 'bold',
  },
  dailyCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: hp(1.2),
  },
  dailyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyTimeText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  dailyTimePlaceholder: {
    ...style.fontSizeSmall,
    color: 'rgba(255, 255, 255, 0.2)',
    fontStyle: 'italic',
  },
  dailyHoursContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dailyHoursVal: {
    ...style.fontSizeNormal2x,
    fontWeight: 'bold',
    color: PURPLE,
  },
  dailyHoursLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  // --- Day Cell Detail Modal Styles ---
  dayCellModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dayCellModalSheet: {
    backgroundColor: darkSurfaceColor,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
  },
  dayCellModalHandle: {
    width: wp(10),
    height: hp(0.5),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: wp(1),
    alignSelf: 'center',
    marginBottom: hp(2),
  },
  dayCellModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  dayCellModalName: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  dayCellModalDate: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginTop: hp(0.3),
  },
  dayCellStatusBadge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: wp(2),
    borderWidth: 1,
    marginLeft: wp(3),
  },
  dayCellStatusText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
  },
  dayCellDivider: {
    height: 1,
    backgroundColor: darkBorderColor,
    marginVertical: hp(1.8),
  },
  dayCellTimeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCellTimeCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: wp(3),
    paddingVertical: hp(1.8),
    marginHorizontal: wp(1),
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  dayCellTimeLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.6),
    marginBottom: hp(0.4),
  },
  dayCellTimeVal: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  dayCellHoursRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(4),
  },
  dayCellHoursStat: {
    flex: 1,
  },
  dayCellHoursLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.5),
  },
  dayCellHoursVal: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  dayCellInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3),
    borderRadius: wp(2),
    borderWidth: 1,
    marginTop: hp(2),
  },
  dayCellInfoText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    marginLeft: wp(2),
    flex: 1,
  },
  dayCellCloseBtn: {
    backgroundColor: PURPLE,
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
    alignItems: 'center',
    marginTop: hp(3),
  },
  dayCellCloseBtnText: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  dayCellBreakdownTitle: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(1),
  },
  dayCellBreakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  dayCellBreakdownCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: wp(2),
    paddingVertical: hp(1.5),
    marginHorizontal: wp(0.5),
    borderWidth: 1,
  },
  dayCellBreakdownLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.5),
    marginBottom: hp(0.2),
    textAlign: 'center',
  },
  dayCellBreakdownVal: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    textAlign: 'center',
  },
});


