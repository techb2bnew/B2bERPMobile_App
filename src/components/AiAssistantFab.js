import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { darkBackgroundColor, darkTextPrimaryColor } from '../constants/Color';
import { style } from '../constants/Fonts';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

const PURPLE = '#9B59B6';

const AiAssistantFab = ({ onPress, badgeCount = 4 }) => {
  return (
    <View style={styles.fabWrap}>
      <View style={styles.fabGlow} />
      <TouchableOpacity
        style={styles.fab}
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Open AI Assistant">
        <Icon name="cpu" size={wp(6.5)} color={darkTextPrimaryColor} />
        {/* {badgeCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        ) : null} */}
      </TouchableOpacity>
    </View>
  );
};

export default AiAssistantFab;

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: wp(5),
    bottom: hp(3),
    zIndex: 200,
    elevation: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlow: {
    position: 'absolute',
    width: wp(17),
    height: wp(17),
    borderRadius: wp(8.5),
    backgroundColor: 'rgba(155, 89, 182, 0.28)',
  },
  fab: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  badge: {
    position: 'absolute',
    top: -wp(1),
    right: -wp(1),
    minWidth: wp(5.5),
    height: wp(5.5),
    borderRadius: wp(3),
    backgroundColor: '#F85149',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.2),
    borderWidth: 2,
    borderColor: darkBackgroundColor,
  },
  badgeText: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
});
