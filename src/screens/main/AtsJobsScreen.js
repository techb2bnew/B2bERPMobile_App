import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AppHeader from '../../components/AppHeader';
import { fetchAllVacancies, createVacancy, updateVacancyStatus } from '../../services/atsService';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const BLUE = '#3498DB';
const GREEN = '#2ECC71';
const RED = '#E74C3C';

const AtsJobsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newJob, setNewJob] = useState({ role: '', dept: '', targetDate: '' });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadJobs = useCallback(async () => {
    try {
      const data = await fetchAllVacancies();
      setJobs(data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const handleSaveJob = async () => {
    setErrorMsg('');
    if (!newJob.role.trim() || !newJob.dept.trim() || !newJob.targetDate.trim()) {
      setErrorMsg('Please fill in all the required fields (*).');
      return;
    }
    setSaving(true);
    try {
      const added = await createVacancy({
        role: newJob.role,
        department: newJob.dept,
        target_date: newJob.targetDate || 'TBD',
        status: 'Open',
        applicants: 0
      });
      if (added) {
        setJobs([added, ...jobs]);
      }
      setModalVisible(false);
      setNewJob({ role: '', dept: '', targetDate: '' });
    } catch (err) {
      console.error('Error adding job:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (job) => {
    const newStatus = job.status === 'Open' ? 'Closed' : 'Open';
    try {
      await updateVacancyStatus(job.id, newStatus);
      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const renderJobCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.role}</Text>
          <Text style={styles.jobDept}>{item.department}</Text>
          <Text style={styles.jobDetails}>Target Date: {item.target_date || 'N/A'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Open' ? `${GREEN}20` : `${RED}20` }]}>
          <Text style={[styles.statusText, { color: item.status === 'Open' ? GREEN : RED }]}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <View style={styles.applicantBadge}>
          <Icon name="users" size={wp(4)} color={darkTextSecondaryColor} />
          <Text style={styles.applicantCount}>{item.applicants || 0} Applicants</Text>
        </View>
        <TouchableOpacity 
          style={[styles.toggleBtn, { borderColor: item.status === 'Open' ? RED : GREEN }]} 
          onPress={() => handleToggleStatus(item)}
        >
          <Text style={[styles.toggleBtnText, { color: item.status === 'Open' ? RED : GREEN }]}>
            {item.status === 'Open' ? 'Close Job' : 'Reopen Job'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.headerArea}>
        <Text style={styles.sectionTitle}>All Active Jobs</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Icon name="plus" size={wp(5)} color={whiteColor} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={PURPLE} style={styles.loader} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={<Text style={styles.emptyText}>No jobs posted yet.</Text>}
        />
      )}

      {/* Add Job Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Job</Text>
            
            <TextInput style={[styles.input, errorMsg && !newJob.role.trim() ? styles.inputError : null]} placeholder="Job Role (e.g. Sales Executive) *" placeholderTextColor={darkTextSecondaryColor} value={newJob.role} onChangeText={(text) => setNewJob(prev => ({ ...prev, role: text }))} />
            <TextInput style={[styles.input, errorMsg && !newJob.dept.trim() ? styles.inputError : null]} placeholder="Department (e.g. Sales) *" placeholderTextColor={darkTextSecondaryColor} value={newJob.dept} onChangeText={(text) => setNewJob(prev => ({ ...prev, dept: text }))} />
            <TextInput style={[styles.input, errorMsg && !newJob.targetDate.trim() ? styles.inputError : null]} placeholder="Target Date (e.g. 2026-07-01) *" placeholderTextColor={darkTextSecondaryColor} value={newJob.targetDate} onChangeText={(text) => setNewJob(prev => ({ ...prev, targetDate: text }))} />
            
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setErrorMsg(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveJob} disabled={saving}>
                {saving ? <ActivityIndicator color={whiteColor} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default AtsJobsScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkBackgroundColor },
  headerArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: wp(5) },
  sectionTitle: { ...style.fontSizeLarge, ...style.fontWeightBold, color: darkTextPrimaryColor },
  addBtn: { backgroundColor: PURPLE, width: wp(9), height: wp(9), borderRadius: wp(4.5), alignItems: 'center', justifyContent: 'center' },
  loader: { marginTop: hp(10) },
  listContent: { paddingHorizontal: wp(5), paddingBottom: hp(5) },
  emptyText: { color: darkTextSecondaryColor, textAlign: 'center', marginTop: hp(5) },
  card: { backgroundColor: darkSurfaceColor, padding: wp(4), borderRadius: wp(3), marginBottom: hp(1.5), borderWidth: 1, borderColor: darkBorderColor },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobTitle: { ...style.fontSizeNormal2x, ...style.fontWeightMedium, color: darkTextPrimaryColor },
  jobDept: { ...style.fontSizeSmall, color: darkTextSecondaryColor, marginTop: hp(0.5) },
  jobDetails: { ...style.fontSizeExtraSmall, color: BLUE, marginTop: hp(0.5) },
  statusBadge: { paddingHorizontal: wp(2), paddingVertical: hp(0.5), borderRadius: wp(1) },
  statusText: { ...style.fontSizeExtraSmall, ...style.fontWeightMedium },
  cardActions: { marginTop: hp(2), borderTopWidth: 1, borderTopColor: darkBorderColor, paddingTop: hp(1.5), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  applicantBadge: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  applicantCount: { ...style.fontSizeSmall, color: darkTextSecondaryColor },
  toggleBtn: { borderWidth: 1, paddingHorizontal: wp(4), paddingVertical: hp(0.8), borderRadius: wp(2) },
  toggleBtnText: { ...style.fontSizeSmall, ...style.fontWeightMedium },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: wp(5) },
  modalContent: { backgroundColor: darkSurfaceColor, padding: wp(5), borderRadius: wp(4), borderWidth: 1, borderColor: darkBorderColor },
  modalTitle: { ...style.fontSizeLarge, color: darkTextPrimaryColor, marginBottom: hp(2), ...style.fontWeightBold },
  input: { backgroundColor: darkBackgroundColor, borderWidth: 1, borderColor: darkBorderColor, borderRadius: wp(2), paddingHorizontal: wp(3), height: hp(5.5), color: darkTextPrimaryColor, marginBottom: hp(2) },
  inputError: { borderColor: '#E74C3C', borderWidth: 1 },
  errorText: { color: '#E74C3C', ...style.fontSizeSmall, marginBottom: hp(1) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: wp(3), marginTop: hp(1) },
  cancelBtn: { paddingHorizontal: wp(4), paddingVertical: hp(1.2), borderWidth: 1, borderColor: darkBorderColor, borderRadius: wp(2) },
  cancelBtnText: { color: darkTextSecondaryColor },
  saveBtn: { paddingHorizontal: wp(6), paddingVertical: hp(1.2), backgroundColor: PURPLE, borderRadius: wp(2), alignItems: 'center' },
  saveBtnText: { color: whiteColor, ...style.fontWeightMedium },
});
