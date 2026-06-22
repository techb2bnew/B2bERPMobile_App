import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import CommonButton from '../CommonButton';
import MultiSelectDropdown from '../MultiSelectDropdown';
import {
  CABIN_ALERT_EMPTY,
  CABIN_ALERT_ERROR,
  CABIN_ALERT_MESSAGE_LABEL,
  CABIN_ALERT_SELECT_LABEL,
  CABIN_ALERT_SELECT_PLACEHOLDER,
  CABIN_ALERT_SEND_BUTTON,
  CABIN_ALERT_SENDING,
  CABIN_ALERT_SHEET_TITLE,
  CABIN_ALERT_SUCCESS,
  CABIN_ALERT_TITLE,
  CALL_EMPLOYEE_LOAD_ERROR,
  CALL_EMPLOYEE_LOADING,
} from '../../constants/Constants';
import {
  darkBorderColor,
  darkInputBgColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { getCabinAlertMessage } from '../../constants/roles';
import { style } from '../../constants/Fonts';
import { useAuth } from '../../context/AuthContext';
import { sendCabinAlertsToEmployees } from '../../services/cabinAlertService';
import { fetchAllEmployeeProfiles } from '../../services/employeeService';
import { capitalizeName, heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PINK = '#E8557A';

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

const CabinAlertModal = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  const alertMessage = useMemo(() => getCabinAlertMessage(user), [user]);

  useEffect(() => {
    if (!visible) {
      setSelectedEmployeeIds([]);
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
          setEmployees(data.filter(employee => !isCurrentUser(employee, user)));
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
  }, [visible, user]);

  const employeeOptions = useMemo(
    () =>
      employees.map(employee => ({
        id: employee.id,
        name: capitalizeName(employee.name),
      })),
    [employees],
  );

  const handleSend = async () => {
    if (!user?.id || selectedEmployeeIds.length === 0) {
      return;
    }

    const recipients = employees.filter(employee => selectedEmployeeIds.includes(employee.id));

    setSending(true);

    try {
      const { sentCount, failedCount } = await sendCabinAlertsToEmployees({
        senderId: user.id,
        senderName: user.name || user.fullName || 'User',
        recipients,
        message: alertMessage,
      });

      if (failedCount > 0) {
        console.log(
          CABIN_ALERT_TITLE,
          `${sentCount} message(s) sent. ${failedCount} could not be delivered.`,
        );
      } else {
        console.log(CABIN_ALERT_TITLE, CABIN_ALERT_SUCCESS);
      }

      onClose();
    } catch (sendError) {
      console.log(CABIN_ALERT_TITLE, sendError?.message || CABIN_ALERT_ERROR);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleIcon}>
                <Icon name="bell" size={wp(4.5)} color={PINK} />
              </View>
              <Text style={styles.title}>{CABIN_ALERT_TITLE}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="x" size={wp(5)} color={darkTextSecondaryColor} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="small" color={PINK} />
              <Text style={styles.stateText}>{CALL_EMPLOYEE_LOADING}</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : employees.length === 0 ? (
            <Text style={styles.stateText}>{CABIN_ALERT_EMPTY}</Text>
          ) : (
            <>
              <Text style={styles.label}>{CABIN_ALERT_MESSAGE_LABEL}</Text>
              <View style={styles.messagePreview}>
                <Text style={styles.messageText}>{alertMessage}</Text>
              </View>

              <MultiSelectDropdown
                label={CABIN_ALERT_SELECT_LABEL}
                options={employeeOptions}
                selectedIds={selectedEmployeeIds}
                onChange={setSelectedEmployeeIds}
                placeholder={CABIN_ALERT_SELECT_PLACEHOLDER}
                sheetTitle={CABIN_ALERT_SHEET_TITLE}
                required
              />

              <CommonButton
                title={sending ? CABIN_ALERT_SENDING : CABIN_ALERT_SEND_BUTTON}
                onPress={handleSend}
                disabled={selectedEmployeeIds.length === 0 || sending}
                loading={sending}
                style={styles.sendButton}
                textStyle={styles.sendButtonText}
              />
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default CabinAlertModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  card: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5),
    paddingVertical: hp(2.5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    flex: 1,
  },
  titleIcon: {
    width: wp(8.5),
    height: wp(8.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 85, 122, 0.12)',
  },
  title: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  label: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.7),
  },
  messagePreview: {
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.4),
    marginBottom: hp(2),
  },
  messageText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: PINK,
  },
  sendButton: {
    marginTop: hp(1),
    backgroundColor: PINK,
  },
  sendButtonText: {
    color: darkTextPrimaryColor,
  },
  centerState: {
    alignItems: 'center',
    gap: hp(1),
    paddingVertical: hp(2),
  },
  stateText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
  },
  errorText: {
    ...style.fontSizeNormal,
    color: '#E85D5D',
    textAlign: 'center',
    paddingVertical: hp(1),
  },
});
