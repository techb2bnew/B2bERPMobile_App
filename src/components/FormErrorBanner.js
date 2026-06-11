import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { darkTextPrimaryColor } from '../constants/Color';
import { style, spacings } from '../constants/Fonts';
import { widthPercentageToDP as wp } from '../utils';

const ERROR_COLOR = '#F85149';
const ERROR_BG_COLOR = 'rgba(248, 81, 73, 0.12)';

const FormErrorBanner = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Icon name="alert-circle" size={wp(4.5)} color={ERROR_COLOR} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

export default FormErrorBanner;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacings.normal,
    backgroundColor: ERROR_BG_COLOR,
    borderWidth: 1,
    borderColor: ERROR_COLOR,
    borderRadius: wp(2),
    paddingHorizontal: wp(3.5),
    paddingVertical: spacings.normal,
    marginBottom: spacings.normal,
  },
  message: {
    flex: 1,
    ...style.fontSizeSmall2x,
    ...style.fontWeightThin,
    color: darkTextPrimaryColor,
    lineHeight: wp(5),
  },
});
