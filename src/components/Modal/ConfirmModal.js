import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  darkBorderColor,
  darkInputBgColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style, spacings } from '../../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../../utils';

const CONFIRM_RED = '#E85D5D';

const ConfirmModal = ({
  visible,
  title,
  message,
  confirmTitle = 'Yes',
  cancelTitle = 'Cancel',
  iconName = 'log-out',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalCard}>
              {iconName ? (
                <View style={styles.iconWrap}>
                  <View style={styles.iconCircle}>
                    <Icon name={iconName} size={wp(6)} color={CONFIRM_RED} />
                  </View>
                </View>
              ) : null}

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.divider} />

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                  activeOpacity={0.8}>
                  <Text style={styles.cancelText}>{cancelTitle}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={onConfirm}
                  activeOpacity={0.85}>
                  <Text style={styles.confirmText}>{confirmTitle}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ConfirmModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  modalCard: {
    width: '100%',
    maxWidth: wp(85),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(6),
    paddingTop: hp(3),
    paddingBottom: hp(2.5),
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: hp(2),
  },
  iconCircle: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    backgroundColor: 'rgba(232, 93, 93, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 93, 93, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  message: {
    ...style.fontSizeNormal,
    ...style.fontWeightThin,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    lineHeight: hp(2.6),
    paddingHorizontal: wp(2),
  },
  divider: {
    height: 1,
    backgroundColor: darkBorderColor,
    marginTop: hp(2.5),
    marginBottom: hp(2),
  },
  actions: {
    flexDirection: 'row',
    gap: wp(3),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: hp(1.4),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: darkInputBgColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...style.fontSizeNormal,
    ...style.fontWeightThin1x,
    color: darkTextPrimaryColor,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: hp(1.4),
    borderRadius: wp(2.5),
    backgroundColor: CONFIRM_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
});
