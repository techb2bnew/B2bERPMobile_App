import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { fetchEmployeeHrmsData, getDaysInMonth, calculateSalaryProjection } from '../../services/hrmsService';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../../constants/Color';
import { style, spacings } from '../../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../../utils';
import { MAIN_ROUTES } from '../../navigation/routes';

const PURPLE = '#9B59B6';
const RED = '#F85149';
const GREEN = '#3DDC84';
const YELLOW = '#F39C12';
const BLUE = '#3498DB';

const STATUS_COLORS = {
  'Full Day': GREEN,
  'Short Leave': '#D35400',
  'Half Day': YELLOW,
  'Present': '#1ABC9C',
  'Absent': RED,
  'Leave': BLUE,
  'Weekly Off': '#555555',
};

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS_LIST = [
  { key: '2026-06', label: 'June 2026' },
  { key: '2026-05', label: 'May 2026' },
  { key: '2026-04', label: 'April 2026' },
];

const HrmsEmployeeScreen = ({ userId }) => {
  const navigation = useNavigation();
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEmployeeHrmsData(userId, selectedMonth);
      setData(res);
      
      // Auto select today or first day
      const todayStr = new Date().toISOString().split('T')[0];
      if (res?.dayWise[todayStr]) {
        setSelectedDayDetail({ dateKey: todayStr, ...res.dayWise[todayStr] });
      } else {
        const keys = Object.keys(res?.dayWise || {});
        if (keys.length > 0) {
          setSelectedDayDetail({ dateKey: keys[0], ...res.dayWise[keys[0]] });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate calendar rows
  const getCalendarRows = () => {
    if (!data) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const totalDays = getDaysInMonth(year, month);
    const firstDayIndex = new Date(year, month - 1, 1).getDay();
    
    const cells = [];
    // Pad start of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ isPadding: true, id: `pad-${i}` });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      cells.push({ isPadding: false, dayNum: d, dateKey });
    }

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  };

  const handleDaySelect = (day) => {
    if (day.isPadding || !data) return;
    const dayInfo = data.dayWise[day.dateKey];
    setSelectedDayDetail({ dateKey: day.dateKey, ...dayInfo });
  };

  const handlePrevMonth = () => {
    const idx = MONTHS_LIST.findIndex(m => m.key === selectedMonth);
    if (idx < MONTHS_LIST.length - 1) {
      setSelectedMonth(MONTHS_LIST[idx + 1].key);
    }
  };

  const handleNextMonth = () => {
    const idx = MONTHS_LIST.findIndex(m => m.key === selectedMonth);
    if (idx > 0) {
      setSelectedMonth(MONTHS_LIST[idx - 1].key);
    }
  };

  if (loading || !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={styles.loadingText}>Loading attendance data...</Text>
      </View>
    );
  }

  const { summary, employee } = data;
  const baseSalary = employee?.base_salary || 0;
  
  // Salary math via central engine
  const daysInMonth = Object.keys(data.dayWise).length;
  const salaryResults = calculateSalaryProjection(baseSalary, summary, daysInMonth);
  const dailyRate = salaryResults.dailyRate;
  const estimatedPayout = salaryResults.netPayable;

  const selectedDateObj = selectedDayDetail ? new Date(selectedDayDetail.dateKey) : null;
  const selectedDateLabel = selectedDateObj ? selectedDateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Month Selection Bar */}
      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthNavBtn} onPress={handlePrevMonth} disabled={selectedMonth === MONTHS_LIST[MONTHS_LIST.length - 1].key}>
          <Icon name="chevron-left" size={wp(6)} color={selectedMonth === MONTHS_LIST[MONTHS_LIST.length - 1].key ? '#444' : '#fff'} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTHS_LIST.find(m => m.key === selectedMonth)?.label || selectedMonth}
        </Text>
        <TouchableOpacity style={styles.monthNavBtn} onPress={handleNextMonth} disabled={selectedMonth === MONTHS_LIST[0].key}>
          <Icon name="chevron-right" size={wp(6)} color={selectedMonth === MONTHS_LIST[0].key ? '#444' : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Quick Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{summary.present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: YELLOW }]}>{summary.halfDay}</Text>
          <Text style={styles.statLabel}>Half Day</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: RED }]}>{summary.absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: BLUE }]}>{summary.leave}</Text>
          <Text style={styles.statLabel}>Leaves</Text>
        </View>
      </View>

      {/* Calendar Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Attendance Calendar</Text>
        
        {/* Calendar Weekday Headers */}
        <View style={styles.weekHeaders}>
          {WEEKDAY_NAMES.map(name => (
            <Text key={name} style={styles.weekdayText}>{name}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {getCalendarRows().map((row, rIdx) => (
            <View key={`row-${rIdx}`} style={styles.calendarRow}>
              {row.map((cell, cIdx) => {
                if (cell.isPadding) {
                  return <View key={cell.id} style={styles.calendarCellEmpty} />;
                }

                const dayData = data.dayWise[cell.dateKey];
                const dotColor = STATUS_COLORS[dayData?.status] || '#555';
                const isSelected = selectedDayDetail?.dateKey === cell.dateKey;

                return (
                  <TouchableOpacity
                    key={cell.dateKey}
                    style={[
                      styles.calendarCell,
                      isSelected && styles.calendarCellSelected,
                    ]}
                    onPress={() => handleDaySelect(cell)}>
                    <Text style={[
                      styles.calendarDayNum,
                      isSelected && styles.calendarDayNumSelected,
                    ]}>
                      {cell.dayNum}
                    </Text>
                    <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Selected Day Details Card */}
      {selectedDayDetail && (
        <View style={styles.card}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailDateText}>{selectedDateLabel}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLORS[selectedDayDetail.status] || '#8B949E'}20` }]}>
              <Text style={[styles.statusPillText, { color: STATUS_COLORS[selectedDayDetail.status] || '#8B949E' }]}>
                {selectedDayDetail.status}
              </Text>
            </View>
          </View>
          <View style={styles.detailBody}>
            {/* Clock In */}
            {selectedDayDetail.clockIn && (
              <View style={styles.detailRow}>
                <Icon name="log-in" size={wp(4.5)} color="#3DDC84" />
                <Text style={styles.detailText}>
                  Clock In: <Text style={{ color: '#3DDC84', fontWeight: 'bold' }}>
                    {(() => {
                      try {
                        const d = new Date(selectedDayDetail.clockIn);
                        let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
                        const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
                        return `${h}:${m} ${ap}`;
                      } catch { return '—'; }
                    })()}
                  </Text>
                </Text>
              </View>
            )}
            {/* Clock Out */}
            {(selectedDayDetail.clockOut || selectedDayDetail.clockIn) && (
              <View style={styles.detailRow}>
                <Icon name="log-out" size={wp(4.5)} color={selectedDayDetail.clockOut ? '#F85149' : '#3498DB'} />
                <Text style={styles.detailText}>
                  Clock Out: <Text style={{ color: selectedDayDetail.clockOut ? '#F85149' : '#3498DB', fontWeight: 'bold' }}>
                    {selectedDayDetail.clockOut ? (() => {
                      try {
                        const d = new Date(selectedDayDetail.clockOut);
                        let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
                        const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
                        return `${h}:${m} ${ap}`;
                      } catch { return '—'; }
                    })() : 'Active (not clocked out)'}
                  </Text>
                </Text>
              </View>
            )}
            {/* Break/Lunch */}
            {(selectedDayDetail.lunchMins > 0) && (
              <View style={styles.detailRow}>
                <Icon name="coffee" size={wp(4.5)} color="#F5C542" />
                <Text style={styles.detailText}>
                  Break Time: <Text style={{ color: '#F5C542', fontWeight: 'bold' }}>
                    {(() => {
                      const m = selectedDayDetail.lunchMins;
                      const h = Math.floor(m / 60); const rem = m % 60;
                      return h > 0 ? `${h}h ${rem}m` : `${rem}m`;
                    })()}
                  </Text>
                </Text>
              </View>
            )}
            {/* Work Hours */}
            <View style={styles.detailRow}>
              <Icon name="clock" size={wp(4.5)} color={darkTextSecondaryColor} />
              <Text style={styles.detailText}>
                Net Work Hours: <Text style={{ color: whiteColor, fontWeight: 'bold' }}>{selectedDayDetail.hours.toFixed(2)}h</Text>
                <Text style={{ color: darkTextSecondaryColor }}> / 8h</Text>
              </Text>
            </View>
            {selectedDayDetail.status === 'Leave' && (
              <View style={styles.detailRow}>
                <Icon name="info" size={wp(4.5)} color={BLUE} />
                <Text style={[styles.detailText, { color: BLUE }]}>Approved Leave Day</Text>
              </View>
            )}
            {selectedDayDetail.status === 'Short Leave' && (
              <View style={styles.detailRow}>
                <Icon name="alert-circle" size={wp(4.5)} color="#F39C12" />
                <Text style={[styles.detailText, { color: '#D35400' }]}>Short Leave: worked ≥ 6h but &lt; 8h required</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Projected Salary Card */}
      <View style={[styles.card, styles.salaryCard]}>
        <View style={styles.salaryHeader}>
          <View>
            <Text style={styles.salaryTitle}>Projected Earnings</Text>
            <Text style={styles.salarySub}>Based on attendance & leaves</Text>
          </View>
          <Icon name="trending-up" size={wp(6)} color={GREEN} />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.salaryRow}>
          <Text style={styles.salaryLabel}>Base Monthly Salary</Text>
          <Text style={styles.salaryVal}>₹{baseSalary.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.salaryRow}>
          <Text style={styles.salaryLabel}>Payable Days ({summary.payableDays} / {daysInMonth})</Text>
          <Text style={styles.salaryVal}>₹{estimatedPayout.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.infoBanner}>
          <Icon name="info" size={wp(4)} color={darkTextSecondaryColor} />
          <Text style={styles.infoBannerText}>
            Note: Final salary payout is processed on the 1st of the next month and is subject to verified deductions.
          </Text>
        </View>
      </View>

      {/* Leave Application Quick Link */}
      <TouchableOpacity
        style={styles.applyLeaveBtn}
        onPress={() => navigation.navigate(MAIN_ROUTES.APPLY_LEAVE)}
        activeOpacity={0.8}>
        <Icon name="calendar" size={wp(5)} color={whiteColor} />
        <Text style={styles.applyLeaveBtnText}>Apply Leave / View Leaves</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default HrmsEmployeeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  contentContainer: {
    padding: wp(4),
    paddingBottom: hp(4),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkBackgroundColor,
  },
  loadingText: {
    marginTop: hp(2),
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    marginBottom: hp(2),
  },
  monthNavBtn: {
    padding: wp(1),
  },
  monthLabel: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  statCard: {
    width: wp(21),
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(2.5),
    paddingVertical: hp(1.2),
    alignItems: 'center',
  },
  statVal: {
    ...style.fontSizeLargeX,
    ...style.fontWeightMedium,
    color: GREEN,
    marginBottom: hp(0.2),
  },
  statLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  card: {
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(2),
  },
  cardTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
    marginBottom: hp(2),
  },
  weekHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    paddingBottom: hp(1),
    marginBottom: hp(1.5),
  },
  weekdayText: {
    width: wp(10),
    textAlign: 'center',
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    ...style.fontWeightMedium,
  },
  calendarGrid: {
    gap: hp(1),
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarCell: {
    width: wp(10),
    height: hp(5.2),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: wp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.5),
  },
  calendarCellSelected: {
    backgroundColor: 'rgba(155, 89, 182, 0.25)',
    borderWidth: 1,
    borderColor: PURPLE,
  },
  calendarCellEmpty: {
    width: wp(10),
    height: hp(5.2),
  },
  calendarDayNum: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  calendarDayNumSelected: {
    color: whiteColor,
    ...style.fontWeightMedium,
  },
  statusDot: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.8),
    marginTop: hp(0.5),
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  detailDateText: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  statusPill: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: wp(1.5),
  },
  statusPillText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
  },
  detailBody: {
    gap: hp(1),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  detailText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
  },
  salaryCard: {
    borderColor: 'rgba(61, 220, 132, 0.3)',
  },
  salaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salaryTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  salarySub: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  divider: {
    height: 1,
    backgroundColor: darkBorderColor,
    marginVertical: hp(1.5),
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1.2),
  },
  salaryLabel: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
  },
  salaryVal: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: wp(2),
    padding: wp(3),
    gap: wp(2),
    marginTop: hp(1),
  },
  infoBannerText: {
    flex: 1,
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    lineHeight: hp(1.8),
  },
  applyLeaveBtn: {
    flexDirection: 'row',
    backgroundColor: PURPLE,
    borderRadius: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.6),
    gap: wp(2.5),
    marginTop: hp(1),
  },
  applyLeaveBtnText: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: whiteColor,
  },
});
