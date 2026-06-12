import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import CommonButton from '../CommonButton';
import {
  CALL_EMPLOYEE_CALL_BUTTON,
  CALL_EMPLOYEE_DIALER_ERROR,
  CALL_EMPLOYEE_EMPTY,
  CALL_EMPLOYEE_LOAD_ERROR,
  CALL_EMPLOYEE_LOADING,
  CALL_EMPLOYEE_NO_PHONE,
  CALL_EMPLOYEE_PHONE_LABEL,
  CALL_EMPLOYEE_SELECT_LABEL,
  CALL_EMPLOYEE_SELECT_PLACEHOLDER,
  CALL_EMPLOYEE_TITLE,
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
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

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

const CallEmployeeModal = ({ visible, onClose }) => {
  const { user } = useAuth();
  const triggerRef = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!visible) {
      setSelectedEmployeeId('');
      setDropdownOpen(false);
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

  const selectedEmployee = useMemo(
    () => employees.find(employee => employee.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );

  const selectedLabel = selectedEmployee?.name || CALL_EMPLOYEE_SELECT_PLACEHOLDER;
  const phoneNumber = selectedEmployee?.phone?.trim() || '';

  const openDropdown = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setMenuLayout({
        top: y + height + hp(0.4),
        left: x,
        width,
      });
      setDropdownOpen(true);
    });
  };

  const handleCall = async () => {
    const digits = phoneNumber.replace(/\D/g, '');

    if (!digits) {
      Alert.alert(CALL_EMPLOYEE_PHONE_LABEL, CALL_EMPLOYEE_NO_PHONE);
      return;
    }

    try {
      await Linking.openURL(`tel:${digits}`);
    } catch {
      Alert.alert(CALL_EMPLOYEE_CALL_BUTTON, CALL_EMPLOYEE_DIALER_ERROR);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.overlay}
        onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>{CALL_EMPLOYEE_TITLE}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="x" size={wp(5)} color={darkTextSecondaryColor} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="small" color={darkAccentGreenColor} />
              <Text style={styles.stateText}>{CALL_EMPLOYEE_LOADING}</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : employees.length === 0 ? (
            <Text style={styles.stateText}>{CALL_EMPLOYEE_EMPTY}</Text>
          ) : (
            <>
              <Text style={styles.label}>{CALL_EMPLOYEE_SELECT_LABEL}</Text>
              <TouchableOpacity
                ref={triggerRef}
                style={styles.select}
                onPress={openDropdown}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.selectText,
                    !selectedEmployee && styles.selectPlaceholder,
                  ]}
                  numberOfLines={1}>
                  {selectedLabel}
                </Text>
                <Icon name="chevron-down" size={wp(4.5)} color={darkTextSecondaryColor} />
              </TouchableOpacity>

              {selectedEmployee ? (
                <View style={styles.phoneBlock}>
                  <Text style={styles.label}>{CALL_EMPLOYEE_PHONE_LABEL}</Text>
                  <Text style={styles.phoneText}>
                    {phoneNumber || CALL_EMPLOYEE_NO_PHONE}
                  </Text>
                </View>
              ) : null}

              <CommonButton
                title={CALL_EMPLOYEE_CALL_BUTTON}
                onPress={handleCall}
                disabled={!selectedEmployee || !phoneNumber}
                style={styles.callButton}
              />
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}>
        <View style={styles.dropdownRoot}>
          <Pressable style={styles.dropdownBackdrop} onPress={() => setDropdownOpen(false)} />
          <View
            style={[
              styles.dropdownMenu,
              {
                top: menuLayout.top,
                left: menuLayout.left,
                width: menuLayout.width,
              },
            ]}>
            {employees.map(employee => {
              const isActive = employee.id === selectedEmployeeId;
              return (
                <TouchableOpacity
                  key={employee.id}
                  style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedEmployeeId(employee.id);
                    setDropdownOpen(false);
                  }}
                  activeOpacity={0.85}>
                  <Text
                    style={[styles.dropdownText, isActive && styles.dropdownTextActive]}
                    numberOfLines={1}>
                    {employee.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default CallEmployeeModal;

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
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    gap: wp(2),
    marginBottom: hp(2),
  },
  selectText: {
    flex: 1,
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  selectPlaceholder: {
    color: darkTextSecondaryColor,
  },
  phoneBlock: {
    marginBottom: hp(2),
  },
  phoneText: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: darkAccentGreenColor,
  },
  callButton: {
    marginTop: hp(0.5),
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
  dropdownRoot: {
    flex: 1,
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    overflow: 'hidden',
    maxHeight: hp(30),
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  dropdownItem: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    backgroundColor: darkInputBgColor,
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(61, 220, 132, 0.15)',
  },
  dropdownText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
  },
  dropdownTextActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
});
