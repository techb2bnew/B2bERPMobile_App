import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  darkBorderColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import { style, spacings } from '../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';

const CommonTextInput = ({
  label,
  required = false,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  containerStyle,
  inputStyle,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const showPasswordToggle = secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.requiredMark}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={darkPlaceholderColor}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, inputStyle]}
          {...rest}
        />
        {showPasswordToggle ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(prev => !prev)}
            style={styles.eyeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? 'Hide password' : 'Show password'
            }>
            <Icon
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={wp(5)}
              color={darkTextSecondaryColor}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

export default CommonTextInput;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacings.large,
  },
  label: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightThin1x,
    color: darkTextSecondaryColor,
    marginBottom: spacings.small,
  },
  requiredMark: {
    color: '#F85149',
    ...style.fontWeightMedium,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkInputBgColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    height: hp(5.5),
    paddingHorizontal: spacings.large,
  },
  inputWrapperFocused: {
    borderColor: darkTextSecondaryColor,
  },
  inputWrapperError: {
    borderColor: '#F85149',
  },
  input: {
    flex: 1,
    ...style.fontSizeNormal2x,
    ...style.fontWeightThin,
    color: darkTextPrimaryColor,
    paddingVertical: 0,
  },
  eyeButton: {
    marginLeft: spacings.normal,
    padding: spacings.xsmall,
  },
  errorText: {
    ...style.fontSizeSmall,
    color: '#F85149',
    marginTop: spacings.xsmall,
  },
});
