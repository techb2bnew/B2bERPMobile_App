import React, { useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import {
  LOGOUT_CANCEL,
  LOGOUT_CONFIRM,
  LOGOUT_CONFIRM_MESSAGE,
  LOGOUT_CONFIRM_TITLE,
  LOGOUT_TEXT,
} from '../../constants/Constants';
import {
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style, spacings } from '../../constants/Fonts';
import {
  capitalizeName,
  heightPercentageToDP,
  widthPercentageToDP as wp,
} from '../../utils';

const ProfileMenu = ({ visible, onClose }) => {
  const { user, logout } = useAuth();
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const handleLogoutPress = () => {
    onClose();
    const showLogoutConfirm = () => setLogoutConfirmVisible(true);
    if (Platform.OS === 'ios') {
      setTimeout(showLogoutConfirm, 300);
    } else {
      showLogoutConfirm();
    }
  };

  const handleConfirmLogout = async () => {
    setLogoutConfirmVisible(false);
    await logout();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.menuCard}>
                <Text style={styles.name}>{capitalizeName(user?.name || 'User')}</Text>
                <Text style={styles.role}>
                  {user?.selectedRoleTitle || user?.role || 'Employee'}
                </Text>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.logoutRow} onPress={handleLogoutPress}>
                  <Icon name="log-out" size={wp(4.5)} color="#F85149" />
                  <Text style={styles.logoutText}>{LOGOUT_TEXT}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ConfirmModal
        visible={logoutConfirmVisible}
        title={LOGOUT_CONFIRM_TITLE}
        message={LOGOUT_CONFIRM_MESSAGE}
        confirmTitle={LOGOUT_CONFIRM}
        cancelTitle={LOGOUT_CANCEL}
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutConfirmVisible(false)}
      />
    </>
  );
};

export default ProfileMenu;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  menuCard: {
    position: 'absolute',
    top: heightPercentageToDP(13),
    right: wp(4),
    width: wp(52),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.large,
  },
  name: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  role: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginTop: spacings.xsmall,
  },
  divider: {
    height: 1,
    backgroundColor: darkBorderColor,
    marginVertical: spacings.normal,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacings.normal,
    paddingVertical: spacings.xsmall,
  },
  logoutText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: '#F85149',
  },
});
