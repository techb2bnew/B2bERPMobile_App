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
  darkAccentGreenColor,
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style, spacings } from '../../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../../utils';

const CommonModal = ({
  visible,
  title,
  message,
  buttonTitle,
  onButtonPress,
  onRequestClose,
  showSuccessIcon = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.overlay}
        onPress={onRequestClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
          {showSuccessIcon ? (
            <View style={styles.successIconWrapper}>
              <View style={styles.successIconCircle}>
                <Icon name="check" size={wp(12)} color={darkBackgroundColor} />
              </View>
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <CommonButton
            title={buttonTitle}
            onPress={onButtonPress}
            style={styles.button}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default CommonModal;

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
  successIconWrapper: {
    marginBottom: spacings.xLarge,
  },
  successIconCircle: {
    width: wp(22),
    height: wp(22),
    borderRadius: wp(11),
    backgroundColor: darkAccentGreenColor,
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
