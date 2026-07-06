import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AppHeader from '../../components/AppHeader';
import UserAvatar from '../../components/UserAvatar';
import { fetchAllEmployeeProfiles, updateEmployeeProfile, getEmployeeProfileImageUrl } from '../../services/employeeService';
import { fetchActiveEmployeeStatuses } from '../../services/clockSessionsService';
import { normalizeDepartmentName } from '../../services/hrmsService';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../../constants/Color';
import { style, spacings } from '../../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp, capitalizeName } from '../../utils';

const PURPLE = '#9B59B6';
const GREEN = '#3DDC84';

const HrOverviewScreen = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [employeeStatuses, setEmployeeStatuses] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals State
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editForm, setEditForm] = useState({ 
    name: '', role: '', dept: '', email: '', phone: '', employee_id: '', salary: '' 
  });
  const [saving, setSaving] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      const [data, statusData] = await Promise.all([
        fetchAllEmployeeProfiles(),
        fetchActiveEmployeeStatuses()
      ]);
      setEmployees(data || []);
      setEmployeeStatuses(statusData || {});
    } catch (err) {
      console.error('Error fetching employees:', err);
      Alert.alert('Error', 'Failed to load employee directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadEmployees();
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setEditForm({
      name: employee.name || '',
      role: employee.role || '',
      dept: employee.dept || '',
      email: employee.email || '',
      phone: employee.phone || '',
      employee_id: employee.employee_id || '',
      salary: employee.salary ? String(employee.salary).replace(/[^0-9]/g, '') : '',
    });
  };

  const closeEditModal = () => {
    setEditingEmployee(null);
    setEditForm({ name: '', role: '', dept: '', email: '', phone: '', employee_id: '', salary: '' });
  };

  const saveEmployeeDetails = async () => {
    if (!editForm.name.trim() || !editForm.role.trim() || !editForm.dept.trim()) {
      Alert.alert('Validation Error', 'Name, Role, and Department are required.');
      return;
    }
    
    setSaving(true);
    try {
      const updateData = {
        name: editForm.name.trim(),
        role: editForm.role.trim(),
        dept: editForm.dept.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        salary: editForm.salary.trim() ? `₹${editForm.salary.trim()}` : null,
      };
      
      await updateEmployeeProfile(editingEmployee.id, updateData);
      
      // Update local state
      setEmployees(prev => prev.map(emp => {
        if (emp.id === editingEmployee.id) {
          return { ...emp, ...updateData };
        }
        return emp;
      }));
      
      closeEditModal();
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err) {
      console.error('Error updating profile:', err);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderEmployeeCard = ({ item }) => {
    const activeStatusInfo = employeeStatuses[item.id];
    let statusText = 'Offline';
    let dotColor = darkTextSecondaryColor;

    if (activeStatusInfo) {
      if (activeStatusInfo.status === 'On Lunch' || activeStatusInfo.status === 'On Break') {
        dotColor = '#F5C542'; // Yellow
        statusText = activeStatusInfo.status;
      } else {
        dotColor = GREEN;
        statusText = 'Live';
      }
    }
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <UserAvatar userId={item.id} name={item.name} imageUrl={getEmployeeProfileImageUrl(item)} size={wp(12)} />
          <View style={styles.cardInfo}>
            <Text style={styles.employeeName}>{capitalizeName(item.name || 'User')}</Text>
            <Text style={styles.employeeRole}>{item.role || 'Employee'}</Text>
            <Text style={styles.employeeDept}>{normalizeDepartmentName(item.dept)}</Text>
          </View>
          <View style={styles.statusBadge}>
             <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
             <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.viewProfileBtn} 
            activeOpacity={0.8}
            onPress={() => setViewingEmployee(item)}
          >
            <Text style={styles.viewProfileBtnText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.editBtn} 
            activeOpacity={0.8}
            onPress={() => openEditModal(item)}
          >
            <Icon name="edit-2" size={wp(4.5)} color={darkTextSecondaryColor} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AppHeader title="HR & People Ops" />
      
      <View style={styles.searchContainer}>
        <Icon name="search" size={wp(4.5)} color={darkTextSecondaryColor} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employee..."
          placeholderTextColor={darkTextSecondaryColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Employee Directory</Text>
        <Text style={styles.statsSubtitle}>{employees.length} employees total</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={item => item.id}
          renderItem={renderEmployeeCard}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No employees found</Text>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={!!editingEmployee}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={closeEditModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(6)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: hp(65) }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter full name"
                  placeholderTextColor={darkTextSecondaryColor}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role / Designation</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.role}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, role: text }))}
                  placeholder="Enter role (e.g. Frontend Developer)"
                  placeholderTextColor={darkTextSecondaryColor}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.dept}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, dept: text }))}
                  placeholder="Enter department (e.g. Development)"
                  placeholderTextColor={darkTextSecondaryColor}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.email}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text.toLowerCase() }))}
                  placeholder="Enter email address"
                  placeholderTextColor={darkTextSecondaryColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="Enter phone number"
                  placeholderTextColor={darkTextSecondaryColor}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Base Monthly Salary (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.salary}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, salary: text.replace(/[^0-9]/g, '') }))}
                  placeholder="Enter base salary (e.g. 30000)"
                  placeholderTextColor={darkTextSecondaryColor}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEditModal} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEmployeeDetails} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={whiteColor} />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* View Profile Modal */}
      <Modal
        visible={!!viewingEmployee}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingEmployee(null)}
      >
        <View style={styles.viewModalOverlay}>
          <View style={styles.viewModalContent}>
            <View style={styles.viewModalHeader}>
              <Text style={styles.modalTitle}>Employee Profile</Text>
              <TouchableOpacity onPress={() => setViewingEmployee(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(6)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>
            
            {viewingEmployee && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.viewModalScroll}>
                <View style={styles.viewProfileAvatarSection}>
                  <UserAvatar 
                    userId={viewingEmployee.id} 
                    name={viewingEmployee.name} 
                    imageUrl={getEmployeeProfileImageUrl(viewingEmployee)} 
                    size={wp(24)} 
                  />
                  <Text style={styles.viewProfileName}>{capitalizeName(viewingEmployee.name || 'User')}</Text>
                  <Text style={styles.viewProfileRole}>{viewingEmployee.role || 'Employee'}</Text>
                </View>

                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Icon name="briefcase" size={wp(4.5)} color={PURPLE} />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Department</Text>
                      <Text style={styles.detailValue}>{normalizeDepartmentName(viewingEmployee.dept)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Icon name="mail" size={wp(4.5)} color={PURPLE} />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Email Address</Text>
                      <Text style={styles.detailValue}>{viewingEmployee.email || 'Not available'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Icon name="phone" size={wp(4.5)} color={PURPLE} />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Phone Number</Text>
                      <Text style={styles.detailValue}>{viewingEmployee.phone || 'Not available'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Icon name="award" size={wp(4.5)} color={PURPLE} />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>App Role</Text>
                      <Text style={styles.detailValue}>
                        {viewingEmployee.app_role ? capitalizeName(viewingEmployee.app_role.replace('_', ' ')) : 'Not available'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Icon name="dollar-sign" size={wp(4.5)} color={PURPLE} />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Base Monthly Salary</Text>
                      <Text style={styles.detailValue}>
                        {viewingEmployee.salary || 'Not set'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.viewEditBtn}
                  onPress={() => {
                    const emp = viewingEmployee;
                    setViewingEmployee(null);
                    openEditModal(emp);
                  }}
                >
                  <Icon name="edit-2" size={wp(4.5)} color={whiteColor} />
                  <Text style={styles.viewEditBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HrOverviewScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkSurfaceColor,
    marginHorizontal: wp(5),
    marginTop: hp(2),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3),
  },
  searchIcon: {
    marginRight: wp(2),
  },
  searchInput: {
    flex: 1,
    height: hp(5.5),
    color: darkTextPrimaryColor,
    ...style.fontSizeNormal,
  },
  statsContainer: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2.5),
    paddingBottom: hp(1),
  },
  sectionTitle: {
    ...style.fontSizeLarge,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
  },
  statsSubtitle: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.5),
  },
  listContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
    paddingTop: hp(1),
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginLeft: wp(3),
  },
  employeeName: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.3),
  },
  employeeRole: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  employeeDept: {
    ...style.fontSizeExtraSmall,
    color: PURPLE,
    marginTop: hp(0.3),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: wp(1),
  },
  statusDot: {
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(0.9),
    marginRight: wp(1.5),
  },
  statusText: {
    ...style.fontSizeExtraSmall,
    color: darkTextPrimaryColor,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2.5),
    gap: wp(3),
  },
  viewProfileBtn: {
    flex: 1,
    backgroundColor: '#D92D53',
    paddingVertical: hp(1.2),
    borderRadius: wp(2),
    alignItems: 'center',
  },
  viewProfileBtnText: {
    color: whiteColor,
    ...style.fontWeightMedium,
    ...style.fontSizeNormal,
  },
  editBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: darkBorderColor,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(5),
  },
  modalContent: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(5),
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
  inputGroup: {
    marginBottom: hp(2),
  },
  inputLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(1),
  },
  input: {
    backgroundColor: darkBackgroundColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    height: hp(5.5),
    color: darkTextPrimaryColor,
    ...style.fontSizeNormal,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: hp(2),
    paddingTop: hp(2),
    borderTopWidth: 1,
    borderTopColor: darkBorderColor,
    gap: wp(3),
  },
  cancelBtn: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  cancelBtnText: {
    color: darkTextSecondaryColor,
    ...style.fontWeightMedium,
  },
  saveBtn: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.2),
    borderRadius: wp(2),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: wp(25),
  },
  saveBtnText: {
    color: whiteColor,
    ...style.fontWeightMedium,
  },
  
  // View Profile Modal Styles
  viewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  viewModalContent: {
    backgroundColor: darkSurfaceColor,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
    height: hp(85),
    paddingHorizontal: wp(5),
    paddingTop: hp(3),
    paddingBottom: hp(5),
  },
  viewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  viewModalScroll: {
    paddingBottom: hp(4),
  },
  viewProfileAvatarSection: {
    alignItems: 'center',
    marginBottom: hp(4),
  },
  viewProfileName: {
    ...style.fontSizeLarge,
    ...style.fontWeightBold,
    color: darkTextPrimaryColor,
    marginTop: hp(2),
  },
  viewProfileRole: {
    ...style.fontSizeNormal,
    color: PURPLE,
    marginTop: hp(0.5),
  },
  detailsContainer: {
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(4),
    padding: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2.5),
  },
  detailIconBox: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: 'rgba(155,89,182,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(4),
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.3),
  },
  detailValue: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  viewEditBtn: {
    flexDirection: 'row',
    backgroundColor: PURPLE,
    borderRadius: wp(3),
    paddingVertical: hp(1.6),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(4),
    gap: wp(2),
  },
  viewEditBtnText: {
    color: whiteColor,
    ...style.fontSizeNormal,
    ...style.fontWeightBold,
  },
});
