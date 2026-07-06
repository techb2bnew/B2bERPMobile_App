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
import AnalogClockPickerModal from '../../components/AnalogClockPickerModal';
import { fetchCandidates, addCandidate, updateCandidateStatus } from '../../services/atsService';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
  whiteColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp, capitalizeName } from '../../utils';

const PURPLE = '#9B59B6';
const BLUE = '#3498DB';
const GREEN = '#2ECC71';
const ORANGE = '#E67E22';
const RED = '#E74C3C';

const STAGES = ['Applied', 'Interviewing', 'Selected', 'Rejected'];

const getStageColor = (stage) => {
  switch(stage) {
    case 'Applied': return BLUE;
    case 'Interviewing': return ORANGE;
    case 'Selected': return GREEN;
    case 'Rejected': return RED;
    default: return darkTextSecondaryColor;
  }
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
};

const AtsPipelineScreen = () => {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', role: '', phone: '', email: '', interviewTime: '' });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  
  // Status Update Modal State
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [newInterviewTime, setNewInterviewTime] = useState('');
  
  // Clock Picker state
  const [clockPickerVisible, setClockPickerVisible] = useState(false);
  const [clockPickerTarget, setClockPickerTarget] = useState(''); // 'add' or 'update'

  const loadCandidates = useCallback(async () => {
    try {
      const data = await fetchCandidates();
      setCandidates(data);
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCandidates();
  };

  const handleAddCandidate = async () => {
    setErrorMsg('');
    if (!newCandidate.name.trim() || !newCandidate.role.trim()) {
      setErrorMsg('Please enter both Candidate Name and Job Role (*).');
      return;
    }
    setSaving(true);
    try {
      const added = await addCandidate({
        candidate_name: newCandidate.name,
        job_role: newCandidate.role,
        phone: newCandidate.phone || null,
        email: newCandidate.email || null,
        status: 'Applied',
        interview_time: newCandidate.interviewTime || 'TBD',
        avatar_initials: getInitials(newCandidate.name),
      });
      if (added) {
        setCandidates([added, ...candidates]);
      }
      setModalVisible(false);
      setNewCandidate({ name: '', role: '', phone: '', email: '', interviewTime: '' });
    } catch (err) {
      console.error('Error adding candidate:', err);
    } finally {
      setSaving(false);
    }
  };

  const openStatusModal = (candidate) => {
    setSelectedCandidate(candidate);
    setNewStatus(candidate.status || 'Applied');
    setNewInterviewTime(candidate.interview_time || '');
    setStatusModalVisible(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedCandidate) return;
    setSaving(true);
    try {
      const updated = await updateCandidateStatus(selectedCandidate.id, newStatus, newInterviewTime);
      if (updated) {
        setCandidates(candidates.map(c => c.id === updated.id ? updated : c));
      }
      setStatusModalVisible(false);
      setSelectedCandidate(null);
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredCandidates = candidates.filter(c => activeTab === 'All' || c.status === activeTab);

  const renderCandidateCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => openStatusModal(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.avatar_initials || getInitials(item.candidate_name)}</Text>
        </View>
        <View style={styles.candidateInfo}>
          <Text style={styles.candidateName}>{capitalizeName(item.candidate_name)}</Text>
          <Text style={styles.candidateRole}>{item.job_role}</Text>
          {item.interview_time ? (
            <Text style={styles.candidateTime}>Interview: {item.interview_time}</Text>
          ) : null}
        </View>
        <View style={[styles.stageBadge, { backgroundColor: `${getStageColor(item.status)}20` }]}>
          <Text style={[styles.stageText, { color: getStageColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const tabs = ['All', ...STAGES];

  return (
    <View style={styles.root}>
      
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tabs}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === item && styles.tabBtnActive]}
              onPress={() => setActiveTab(item)}
            >
              <Text style={[styles.tabText, activeTab === item && styles.tabTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.headerArea}>
        <Text style={styles.sectionTitle}>{activeTab} Candidates</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Icon name="plus" size={wp(5)} color={whiteColor} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={PURPLE} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredCandidates}
          keyExtractor={item => item.id}
          renderItem={renderCandidateCard}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={<Text style={styles.emptyText}>No candidates found.</Text>}
        />
      )}

      {/* Add Candidate Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Candidate</Text>
            
            <TextInput style={[styles.input, errorMsg && !newCandidate.name.trim() ? styles.inputError : null]} placeholder="Candidate Name *" placeholderTextColor={darkTextSecondaryColor} value={newCandidate.name} onChangeText={(text) => setNewCandidate(prev => ({ ...prev, name: text }))} />
            <TextInput style={[styles.input, errorMsg && !newCandidate.role.trim() ? styles.inputError : null]} placeholder="Job Role (e.g. Frontend Dev) *" placeholderTextColor={darkTextSecondaryColor} value={newCandidate.role} onChangeText={(text) => setNewCandidate(prev => ({ ...prev, role: text }))} />
            <TextInput style={styles.input} placeholder="Phone Number (Optional)" keyboardType="phone-pad" maxLength={10} placeholderTextColor={darkTextSecondaryColor} value={newCandidate.phone} onChangeText={(text) => setNewCandidate(prev => ({ ...prev, phone: text.replace(/\D/g, '').slice(0, 10) }))} />
            <TextInput style={styles.input} placeholder="Email ID (Optional)" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={darkTextSecondaryColor} value={newCandidate.email} onChangeText={(text) => setNewCandidate(prev => ({ ...prev, email: text.toLowerCase() }))} />
            
            <TouchableOpacity 
              style={[styles.input, { justifyContent: 'center' }]} 
              onPress={() => {
                setClockPickerTarget('add');
                setClockPickerVisible(true);
              }}
            >
              <Text style={{ color: newCandidate.interviewTime ? darkTextPrimaryColor : darkTextSecondaryColor }}>
                {newCandidate.interviewTime || "Select Interview Time (Optional)"}
              </Text>
            </TouchableOpacity>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setErrorMsg(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddCandidate} disabled={saving}>
                {saving ? <ActivityIndicator color={whiteColor} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {clockPickerTarget === 'add' && (
          <AnalogClockPickerModal
            visible={clockPickerVisible}
            onClose={() => setClockPickerVisible(false)}
            initialTime={newCandidate.interviewTime}
            onConfirm={(time) => {
              setNewCandidate(prev => ({ ...prev, interviewTime: time }));
            }}
          />
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal visible={statusModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Status</Text>
            <Text style={{color: darkTextSecondaryColor, marginBottom: hp(2)}}>Candidate: {selectedCandidate?.candidate_name}</Text>

            <View style={styles.statusGrid}>
              {STAGES.map(stage => (
                <TouchableOpacity
                  key={stage}
                  style={[styles.statusBtn, newStatus === stage && { backgroundColor: getStageColor(stage), borderColor: getStageColor(stage) }]}
                  onPress={() => setNewStatus(stage)}
                >
                  <Text style={[styles.statusBtnText, newStatus === stage && { color: whiteColor, ...style.fontWeightBold }]}>
                    {stage}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.input, { marginTop: hp(2), justifyContent: 'center' }]} 
              onPress={() => {
                setClockPickerTarget('update');
                setClockPickerVisible(true);
              }}
            >
              <Text style={{ color: newInterviewTime ? darkTextPrimaryColor : darkTextSecondaryColor }}>
                {newInterviewTime || "Select Interview Time"}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatusModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateStatus} disabled={saving}>
                {saving ? <ActivityIndicator color={whiteColor} size="small" /> : <Text style={styles.saveBtnText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {clockPickerTarget === 'update' && (
          <AnalogClockPickerModal
            visible={clockPickerVisible}
            onClose={() => setClockPickerVisible(false)}
            initialTime={newInterviewTime}
            onConfirm={(time) => {
              setNewInterviewTime(time);
            }}
          />
        )}
      </Modal>
    </View>
  );
};

export default AtsPipelineScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkBackgroundColor },
  tabsContainer: { paddingVertical: hp(1.5), borderBottomWidth: 1, borderBottomColor: darkBorderColor, paddingLeft: wp(5) },
  tabBtn: { paddingHorizontal: wp(4), paddingVertical: hp(0.8), borderRadius: wp(4), backgroundColor: darkSurfaceColor, marginRight: wp(2), borderWidth: 1, borderColor: darkBorderColor },
  tabBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  tabText: { ...style.fontSizeSmall, color: darkTextSecondaryColor },
  tabTextActive: { color: whiteColor, ...style.fontWeightBold },
  headerArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: wp(5) },
  sectionTitle: { ...style.fontSizeLarge, ...style.fontWeightBold, color: darkTextPrimaryColor },
  addBtn: { backgroundColor: PURPLE, width: wp(9), height: wp(9), borderRadius: wp(4.5), alignItems: 'center', justifyContent: 'center' },
  loader: { marginTop: hp(10) },
  listContent: { paddingHorizontal: wp(5), paddingBottom: hp(5) },
  emptyText: { color: darkTextSecondaryColor, textAlign: 'center', marginTop: hp(5) },
  card: { backgroundColor: darkSurfaceColor, padding: wp(4), borderRadius: wp(3), marginBottom: hp(1.5), borderWidth: 1, borderColor: darkBorderColor },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: wp(12), height: wp(12), borderRadius: wp(6), backgroundColor: 'rgba(155, 89, 182, 0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: PURPLE, ...style.fontSizeLarge, ...style.fontWeightBold },
  candidateInfo: { flex: 1, marginLeft: wp(3) },
  candidateName: { ...style.fontSizeNormal2x, ...style.fontWeightMedium, color: darkTextPrimaryColor },
  candidateRole: { ...style.fontSizeSmall, color: darkTextSecondaryColor, marginTop: hp(0.2) },
  candidateTime: { ...style.fontSizeExtraSmall, color: ORANGE, marginTop: hp(0.4) },
  stageBadge: { paddingHorizontal: wp(2), paddingVertical: hp(0.5), borderRadius: wp(1) },
  stageText: { ...style.fontSizeExtraSmall, ...style.fontWeightMedium },
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
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2) },
  statusBtn: { paddingHorizontal: wp(3), paddingVertical: hp(0.8), borderRadius: wp(2), borderWidth: 1, borderColor: darkBorderColor, backgroundColor: darkBackgroundColor },
  statusBtnText: { ...style.fontSizeSmall, color: darkTextSecondaryColor },
});
