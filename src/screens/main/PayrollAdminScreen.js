import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AppHeader from '../../components/AppHeader';
import UserAvatar from '../../components/UserAvatar';
import { fetchHrmsMonthlyData } from '../../services/hrmsService';
import { updateEmployeeProfile, getEmployeeProfileImageUrl } from '../../services/employeeService';
import {
  darkBackgroundColor,
  darkSurfaceColor,
  darkBorderColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../../constants/Color';
import { spacings, style } from '../../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp, capitalizeName } from '../../utils';
import { useNavigation } from '@react-navigation/native';

const PURPLE = '#9B59B6';
const RED = '#E74C3C';
const GREEN = '#3DDC84';

const PayrollAdminScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthKey, setMonthKey] = useState('');
  const [payrollData, setPayrollData] = useState([]);
  const [datesList, setDatesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [salaryInputs, setSalaryInputs] = useState({});
  const [savingSalaryId, setSavingSalaryId] = useState(null);

  useEffect(() => {
    const today = new Date();
    setMonthKey(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  const loadData = useCallback(async () => {
    if (!monthKey) return;
    try {
      const data = await fetchHrmsMonthlyData(monthKey);
      setPayrollData(data.employees || []);
      setDatesList(data.datesList || []);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      Alert.alert('Error', 'Failed to load payroll data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthKey]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const changeMonth = (offset) => {
    const [year, month] = monthKey.split('-').map(Number);
    let newDate = new Date(year, month - 1 + offset, 1);
    setMonthKey(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const getDaysInMonth = (monthKeyStr) => {
    if (!monthKeyStr) return 30;
    const [y, m] = monthKeyStr.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  };

  const totalDaysInMonth = getDaysInMonth(monthKey);

  const calculateFinalSalary = (baseSalaryStr, payableDays) => {
    const base = Number(String(baseSalaryStr || '0').replace(/[^0-9]/g, ''));
    if (!base) return 0;
    const dailyRate = base / totalDaysInMonth;
    return Math.round(dailyRate * payableDays);
  };

  const handleSaveSalary = async (employeeId) => {
    const inputVal = salaryInputs[employeeId];
    if (!inputVal || !inputVal.trim()) return;
    setSavingSalaryId(employeeId);
    try {
      await updateEmployeeProfile(employeeId, { salary: `₹${inputVal}` });
      setSalaryInputs(prev => ({ ...prev, [employeeId]: '' }));
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to save base salary');
    } finally {
      setSavingSalaryId(null);
    }
  };

  const filteredPayrollData = payrollData.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.employee.name?.toLowerCase().includes(q) || item.employee.role?.toLowerCase().includes(q);
  });

  const renderBreakdownItem = (date, status, deduction) => (
    <View style={styles.breakdownRow} key={date}>
      <Text style={styles.breakdownDate}>{date.split('-').reverse().join('-')}</Text>
      <Text style={[styles.breakdownStatus, { color: status.includes('Leave') || status === 'Absent' ? RED : '#F5C542' }]}>{status}</Text>
      <Text style={styles.breakdownDeduction}>- {deduction} Day</Text>
    </View>
  );

  const renderPayrollCard = ({ item }) => {
    const emp = item.employee;
    const summary = item.summary;
    const baseSalaryNum = Number(String(emp.base_salary || '0').replace(/[^0-9]/g, ''));
    const isSalaryMissing = baseSalaryNum === 0;
    const finalSalary = calculateFinalSalary(emp.base_salary, summary.payableDays);

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => setSelectedEmployee(item)}
      >
        <View style={styles.cardHeader}>
          <UserAvatar userId={emp.id} name={emp.name} imageUrl={getEmployeeProfileImageUrl(emp)} size={wp(12)} />
          <View style={styles.cardInfo}>
            <Text style={styles.employeeName}>{capitalizeName(emp.name || 'Employee')}</Text>
            <Text style={styles.employeeRole}>{emp.role}</Text>
          </View>
          <View style={styles.salaryBadge}>
            <Text style={styles.salaryLabel}>Net Pay</Text>
            <Text style={[styles.salaryAmount, isSalaryMissing && { color: RED }]}>
              {isSalaryMissing ? 'N/A' : `₹${finalSalary.toLocaleString('en-IN')}`}
            </Text>
          </View>
        </View>

        {isSalaryMissing ? (
          <View style={styles.warningContainer}>
            <View style={styles.warningHeader}>
              <View style={styles.warningIconBox}>
                <Icon name="alert-triangle" size={wp(4.5)} color={RED} />
              </View>
              <Text style={styles.warningText}>Base Salary missing.</Text>
            </View>
            <Text style={styles.warningSubtext}>Please enter the monthly base salary for this employee to generate their payroll.</Text>
            
            <View style={styles.quickFixRow}>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput 
                  style={styles.quickFixInput} 
                  placeholder="e.g. 30000" 
                  placeholderTextColor={darkTextSecondaryColor}
                  keyboardType="numeric"
                  value={salaryInputs[emp.id] || ''}
                  onChangeText={(val) => setSalaryInputs(prev => ({ ...prev, [emp.id]: val }))}
                />
              </View>
              <TouchableOpacity 
                style={[styles.quickFixBtn, savingSalaryId === emp.id && { opacity: 0.7 }]} 
                onPress={() => handleSaveSalary(emp.id)} 
                disabled={savingSalaryId === emp.id}
              >
                {savingSalaryId === emp.id ? (
                  <ActivityIndicator size="small" color={whiteColor} />
                ) : (
                  <>
                    <Icon name="check" size={wp(4)} color={whiteColor} style={{ marginRight: wp(1) }} />
                    <Text style={styles.quickFixBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Base Salary</Text>
              <Text style={styles.statValue}>₹{baseSalaryNum.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Payable Days</Text>
              <Text style={styles.statValue}>{summary.payableDays} / {totalDaysInMonth}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Deductions</Text>
              <Text style={[styles.statValue, { color: RED }]}>{totalDaysInMonth - summary.payableDays} Days</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AppHeader title="Payroll Dashboard" />

      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthArrow} onPress={() => changeMonth(-1)}>
          <Icon name="chevron-left" size={wp(6)} color={whiteColor} />
        </TouchableOpacity>
        <View style={styles.monthTextContainer}>
          <Icon name="calendar" size={wp(4.5)} color={PURPLE} style={{ marginRight: wp(2) }} />
          <Text style={styles.monthText}>
            {new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity style={styles.monthArrow} onPress={() => changeMonth(1)}>
          <Icon name="chevron-right" size={wp(6)} color={whiteColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={wp(4.5)} color={darkTextSecondaryColor} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by employee name or role..."
          placeholderTextColor={darkTextSecondaryColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="x-circle" size={wp(4.5)} color={darkTextSecondaryColor} />
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : (
        <FlatList
          data={filteredPayrollData}
          keyExtractor={(item) => item.employee.id}
          renderItem={renderPayrollCard}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No payroll data found</Text>
            </View>
          }
        />
      )}

      {/* Breakdown Modal */}
      <Modal
        visible={!!selectedEmployee}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEmployee(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payslip Breakdown</Text>
              <TouchableOpacity onPress={() => setSelectedEmployee(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(6)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>
            
            {selectedEmployee && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalProfileRow}>
                  <UserAvatar userId={selectedEmployee.employee.id} name={selectedEmployee.employee.name} imageUrl={getEmployeeProfileImageUrl(selectedEmployee.employee)} size={wp(14)} />
                  <View style={styles.modalProfileInfo}>
                    <Text style={styles.modalProfileName}>{selectedEmployee.employee.name}</Text>
                    <Text style={styles.modalProfileRole}>{selectedEmployee.employee.role}</Text>
                  </View>
                </View>

                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Base Salary (Monthly)</Text>
                    <Text style={styles.summaryValue}>₹{Number(String(selectedEmployee.employee.base_salary || '0').replace(/[^0-9]/g, '')).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Payable Days</Text>
                    <Text style={styles.summaryValue}>{selectedEmployee.summary.payableDays} / {totalDaysInMonth}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Gross Net Pay</Text>
                    <Text style={[styles.summaryValue, { color: GREEN, ...style.fontWeightBold }]}>
                      ₹{calculateFinalSalary(selectedEmployee.employee.base_salary, selectedEmployee.summary.payableDays).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Deduction Breakdown</Text>
                
                {selectedEmployee.summary.payableDays === totalDaysInMonth ? (
                  <Text style={styles.noDeductionsText}>No deductions this month! Perfect attendance.</Text>
                ) : (
                  <View style={styles.breakdownList}>
                    {datesList.map(dateKey => {
                      const status = selectedEmployee.dayWise[dateKey]?.status;
                      if (!status) return null;
                      if (status === 'Absent' || status === 'Unpaid Leave' || status === 'Sandwich Leave') {
                        return renderBreakdownItem(dateKey, status, 1);
                      }
                      if (status === 'Half Day' || status === 'Short Leave') {
                        return renderBreakdownItem(dateKey, status, 0.5);
                      }
                      return null;
                    })}
                  </View>
                )}
                
                <View style={styles.leaveStatsBox}>
                  <Text style={styles.leaveStatsTitle}>Leave Balance Used</Text>
                  <Text style={styles.leaveStatsText}>Paid Leaves This Month: {selectedEmployee.summary.paidLeave}</Text>
                  <Text style={styles.leaveStatsText}>Unpaid (Quota Exceeded): {selectedEmployee.summary.unpaidLeave}</Text>
                  <Text style={styles.leaveStatsText}>Sandwich Penalties: {selectedEmployee.summary.sandwichLeave}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PayrollAdminScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: darkSurfaceColor,
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  monthTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    color: whiteColor,
    ...style.fontSizeLarge,
    ...style.fontWeightBold,
  },
  monthArrow: {
    padding: wp(2),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkSurfaceColor,
    marginHorizontal: wp(5),
    marginTop: hp(2),
    paddingHorizontal: wp(3),
    height: hp(5.5),
    borderRadius: wp(3),
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
  listContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(4),
  },
  emptyContainer: {
    padding: wp(10),
    alignItems: 'center',
  },
  emptyText: {
    color: darkTextSecondaryColor,
    ...style.fontSizeNormal,
  },
  card: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(4),
    marginBottom: hp(2),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  cardInfo: {
    flex: 1,
    marginLeft: wp(3),
  },
  employeeName: {
    ...style.fontSizeNormal,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
  },
  employeeRole: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  salaryBadge: {
    alignItems: 'flex-end',
  },
  salaryLabel: {
    ...style.fontSizeExtraSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.2),
  },
  salaryAmount: {
    ...style.fontSizeNormal,
    ...style.fontWeightBold,
    color: GREEN,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(2),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(3),
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: hp(3),
    backgroundColor: darkBorderColor,
  },
  statLabel: {
    ...style.fontSizeExtraSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.5),
  },
  statValue: {
    ...style.fontSizeSmall,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  warningContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.08)',
    borderRadius: wp(3),
    padding: wp(4),
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
    marginTop: hp(1),
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  warningIconBox: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    padding: wp(1.5),
    borderRadius: wp(2),
    marginRight: wp(2),
  },
  warningText: {
    color: RED,
    ...style.fontSizeNormal,
    ...style.fontWeightBold,
  },
  warningSubtext: {
    color: darkTextSecondaryColor,
    ...style.fontSizeSmall,
    marginBottom: hp(2),
    lineHeight: hp(2.2),
  },
  quickFixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkBackgroundColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3),
    height: hp(5),
  },
  currencySymbol: {
    color: darkTextSecondaryColor,
    ...style.fontSizeNormal,
    marginRight: wp(2),
  },
  quickFixInput: {
    flex: 1,
    color: darkTextPrimaryColor,
    ...style.fontSizeNormal,
    height: '100%',
    padding:spacings.large
  },
  quickFixBtn: {
    flexDirection: 'row',
    backgroundColor: PURPLE,
    borderRadius: wp(2.5),
    height: hp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
    elevation: 2,
  },
  quickFixBtnText: {
    color: whiteColor,
    ...style.fontWeightBold,
    ...style.fontSizeNormal,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: darkSurfaceColor,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
    height: hp(85),
    paddingHorizontal: wp(5),
    paddingTop: hp(3),
    paddingBottom: hp(5),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  modalTitle: {
    ...style.fontSizeLarge,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
  },
  modalScroll: {
    paddingBottom: hp(4),
  },
  modalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  modalProfileInfo: {
    marginLeft: wp(4),
  },
  modalProfileName: {
    ...style.fontSizeLarge,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
  },
  modalProfileRole: {
    ...style.fontSizeNormal,
    color: PURPLE,
    marginTop: hp(0.2),
  },
  summaryContainer: {
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(3),
    padding: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    marginBottom: hp(3),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  summaryLabel: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
  },
  summaryValue: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  sectionTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
    marginBottom: hp(1.5),
  },
  breakdownList: {
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    marginBottom: hp(3),
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  breakdownDate: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    width: wp(25),
  },
  breakdownStatus: {
    ...style.fontSizeSmall,
    flex: 1,
    marginLeft: wp(2),
  },
  breakdownDeduction: {
    ...style.fontSizeSmall,
    color: RED,
    ...style.fontWeightMedium,
  },
  noDeductionsText: {
    color: GREEN,
    ...style.fontSizeNormal,
    marginBottom: hp(3),
    fontStyle: 'italic',
  },
  leaveStatsBox: {
    backgroundColor: 'rgba(155,89,182,0.1)',
    borderRadius: wp(3),
    padding: wp(4),
    borderWidth: 1,
    borderColor: PURPLE,
  },
  leaveStatsTitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightBold,
    color: PURPLE,
    marginBottom: hp(1),
  },
  leaveStatsText: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.5),
  },
});
