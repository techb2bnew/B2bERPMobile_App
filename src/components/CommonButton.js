import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import {
  darkAccentGreenColor,
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  whiteColor,
} from '../constants/Color';
import { style, spacings } from '../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';

const CommonButton = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style: customStyle,
  textStyle,
}) => {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isPrimary && styles.primaryButton,
        isOutline && styles.outlineButton,
        (disabled || loading) && styles.disabledButton,
        customStyle,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? darkBackgroundColor : darkTextPrimaryColor}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.primaryText,
            isOutline && styles.outlineText,
            textStyle,
          ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default CommonButton;

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: hp(5.5),
    borderRadius: wp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacings.large,
  },
  primaryButton: {
    backgroundColor: darkAccentGreenColor,
  },
  outlineButton: {
    backgroundColor: darkSurfaceColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
  },
  primaryText: {
    color: darkBackgroundColor,
  },
  outlineText: {
    color: whiteColor,
  },
});
