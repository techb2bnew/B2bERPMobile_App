import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import CommonButton from '../CommonButton';
import CommonTextInput from '../CommonTextInput';
import {
  CALL_EMPLOYEE_LOAD_ERROR,
  CALL_EMPLOYEE_LOADING,
  CHAT_CANCEL,
  CHAT_DIRECT_TITLE,
  CHAT_GROUP_MEMBERS_REQUIRED,
  CHAT_GROUP_NAME_LABEL,
  CHAT_GROUP_NAME_PLACEHOLDER,
  CHAT_GROUP_NAME_REQUIRED,
  CHAT_GROUP_TITLE,
  CHAT_SELECT_MEMBERS,
  CHAT_SELECT_USER,
  CHAT_SELECT_USER_REQUIRED,
  CHAT_START_CHAT,
} from '../../constants/Constants';
import {
  darkAccentGreenColor,
  darkBorderColor,
  darkInputBgColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { useAuth } from '../../context/AuthContext';
import { fetchAllEmployeeProfiles } from '../../services/employeeService';
import { buildDirectSlug } from '../../services/chatService';
import { capitalizeName, heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';

const isCurrentUser = (employee, user) => {
  if (!user) {
    return false;
  }

  if (user.id && employee.id === user.id) {
    return true;
  }

  const userEmail = user.email?.trim().toLowerCase();
  const employeeEmail = employee.email?.trim().toLowerCase();

  return Boolean(userEmail && employeeEmail && userEmail === employeeEmail);
};

const StartChatModal = ({ visible, mode = 'direct', onClose, onStartChat }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [groupName, setGroupName] = useState('');

  const isDirect = mode === 'direct';
  const title = isDirect ? CHAT_DIRECT_TITLE : CHAT_GROUP_TITLE;

  useEffect(() => {
    if (!visible) {
      setSelectedEmployeeId('');
      setSelectedMemberIds([]);
      setGroupName('');
      setFormError('');
      setError('');
      return;
    }

    let cancelled = false;

    const loadEmployees = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchAllEmployeeProfiles();
        if (!cancelled) {
          setEmployees(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setEmployees([]);
          setError(loadError?.message || CALL_EMPLOYEE_LOAD_ERROR);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const directEmployees = useMemo(
    () => employees.filter(employee => !isCurrentUser(employee, user)),
    [employees, user],
  );

  const groupEmployees = useMemo(
    () => employees.filter(employee => !isCurrentUser(employee, user)),
    [employees, user],
  );

  const toggleMember = employeeId => {
    setSelectedMemberIds(current =>
      current.includes(employeeId)
        ? current.filter(id => id !== employeeId)
        : [...current, employeeId],
    );
    setFormError('');
  };

  const handleStart = () => {
    if (isDirect) {
      const selected = directEmployees.find(employee => employee.id === selectedEmployeeId);
      if (!selected) {
        setFormError(CHAT_SELECT_USER_REQUIRED);
        return;
      }

      const chatId = buildDirectSlug(user?.id, selected.id);
      onStartChat({
        chatType: 'direct',
        chatId,
        chatName: capitalizeName(selected.name),
        peerId: selected.id,
        peerEmail: selected.email,
        members: 2,
      });
      onClose();
      return;
    }

    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setFormError(CHAT_GROUP_NAME_REQUIRED);
      return;
    }

    if (selectedMemberIds.length === 0) {
      setFormError(CHAT_GROUP_MEMBERS_REQUIRED);
      return;
    }

    const selectedMembers = groupEmployees.filter(employee =>
      selectedMemberIds.includes(employee.id),
    );

    onStartChat({
      chatType: 'group',
      chatId: `group-${Date.now()}`,
      chatName: capitalizeName(trimmedName),
      memberIds: selectedMemberIds,
      members: selectedMemberIds.length + 1,
      participants: selectedMembers.map(member => capitalizeName(member.name)),
    });
    onClose();
  };

  const renderEmployeeRow = (employee, isSelected, onPress, multiSelect = false) => (
    <TouchableOpacity
      key={employee.id}
      style={[styles.employeeRow, isSelected && styles.employeeRowSelected]}
      onPress={onPress}
      activeOpacity={0.85}>
      <View style={styles.employeeAvatar}>
        <Text style={styles.employeeInitial}>
          {(employee.name || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{capitalizeName(employee.name)}</Text>
        {employee.email ? (
          <Text style={styles.employeeEmail} numberOfLines={1}>
            {employee.email}
          </Text>
        ) : null}
      </View>
      {multiSelect ? (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected ? <Icon name="check" size={wp(3.5)} color={darkTextPrimaryColor} /> : null}
        </View>
      ) : isSelected ? (
        <Icon name="check-circle" size={wp(5)} color={darkAccentGreenColor} />
      ) : (
        <View style={styles.radio} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="x" size={wp(5)} color={darkTextSecondaryColor} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="small" color={PURPLE} />
              <Text style={styles.stateText}>{CALL_EMPLOYEE_LOADING}</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {!isDirect ? (
                <CommonTextInput
                  label={CHAT_GROUP_NAME_LABEL}
                  required
                  value={groupName}
                  onChangeText={value => {
                    setGroupName(value);
                    setFormError('');
                  }}
                  placeholder={CHAT_GROUP_NAME_PLACEHOLDER}
                  containerStyle={styles.groupNameField}
                />
              ) : null}

              <Text style={styles.sectionLabel}>
                {isDirect ? CHAT_SELECT_USER : CHAT_SELECT_MEMBERS}
              </Text>

              {(isDirect ? directEmployees : groupEmployees).map(employee =>
                renderEmployeeRow(
                  employee,
                  isDirect
                    ? selectedEmployeeId === employee.id
                    : selectedMemberIds.includes(employee.id),
                  () => {
                    if (isDirect) {
                      setSelectedEmployeeId(employee.id);
                    } else {
                      toggleMember(employee.id);
                    }
                    setFormError('');
                  },
                  !isDirect,
                ),
              )}
            </ScrollView>
          )}

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <View style={styles.actions}>
            <CommonButton
              title={CHAT_CANCEL}
              variant="outline"
              onPress={onClose}
              style={styles.actionButton}
            />
            <CommonButton
              title={CHAT_START_CHAT}
              onPress={handleStart}
              disabled={loading || Boolean(error)}
              style={styles.actionButton}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default StartChatModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  card: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingTop: hp(2),
    paddingBottom: hp(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  title: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  scroll: {
    maxHeight: hp(48),
  },
  scrollContent: {
    paddingBottom: hp(1),
  },
  groupNameField: {
    marginBottom: hp(1),
  },
  sectionLabel: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(1),
    marginTop: hp(0.5),
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    backgroundColor: darkInputBgColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    marginBottom: hp(0.8),
  },
  employeeRowSelected: {
    borderColor: PURPLE,
    backgroundColor: 'rgba(155, 89, 182, 0.12)',
  },
  employeeAvatar: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInitial: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  employeeInfo: {
    flex: 1,
    minWidth: 0,
  },
  employeeName: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  employeeEmail: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    marginTop: hp(0.2),
  },
  radio: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: darkBorderColor,
  },
  checkbox: {
    width: wp(5.5),
    height: wp(5.5),
    borderRadius: wp(1.2),
    borderWidth: 1.5,
    borderColor: darkBorderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: PURPLE,
    backgroundColor: PURPLE,
  },
  centerState: {
    alignItems: 'center',
    gap: hp(1),
    paddingVertical: hp(3),
  },
  stateText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
  },
  errorText: {
    ...style.fontSizeNormal,
    color: '#E85D5D',
    textAlign: 'center',
    paddingVertical: hp(2),
  },
  formError: {
    ...style.fontSizeSmall,
    color: '#E85D5D',
    marginTop: hp(0.8),
  },
  actions: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1.5),
  },
  actionButton: {
    flex: 1,
  },
});
