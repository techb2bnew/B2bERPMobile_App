import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { CHAT_NEW_CHAT } from '../constants/Constants';
import { darkTextPrimaryColor } from '../constants/Color';
import { style } from '../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const PURPLE = '#9B59B6';

const NewChatFab = ({ onPress, label = CHAT_NEW_CHAT, accessibilityLabel = CHAT_NEW_CHAT }) => (
  <View style={styles.fabWrap}>
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <Icon name="plus" size={wp(4.8)} color={darkTextPrimaryColor} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  </View>
);

export default NewChatFab;

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: wp(5),
    bottom: hp(3),
    zIndex: 200,
    elevation: 24,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: PURPLE,
    borderRadius: wp(8),
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(1.35),
    elevation: 8,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  label: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
});
