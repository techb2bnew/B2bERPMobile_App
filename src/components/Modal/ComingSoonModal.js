import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import CommonButton from '../CommonButton';
import {
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import {
  COMING_SOON_BUTTON,
  COMING_SOON_MESSAGE,
  COMING_SOON_TITLE,
} from '../../constants/roles';
import { style, spacings } from '../../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../../utils';

const ComingSoonModal = ({
  visible,
  onClose,
  title = COMING_SOON_TITLE,
  message = COMING_SOON_MESSAGE,
  buttonTitle = COMING_SOON_BUTTON,
}) => {
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
        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
          <View style={styles.iconWrapper}>
            <View style={styles.iconCircle}>
              <Icon name="clock" size={wp(7)} color="#F47C20" />
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <CommonButton
            title={buttonTitle}
            onPress={onClose}
            style={styles.button}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default ComingSoonModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  modalCard: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(6),
    paddingVertical: hp(3.5),
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: spacings.xLarge,
  },
  iconCircle: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    backgroundColor: 'rgba(244, 124, 32, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 124, 32, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    textAlign: 'center',
    marginBottom: spacings.normal,
  },
  message: {
    ...style.fontSizeNormal,
    ...style.fontWeightThin,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    lineHeight: hp(2.8),
    marginBottom: spacings.xLarge,
  },
  button: {
    marginTop: spacings.small,
  },
});
