import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkTextPrimaryColor,
} from '../constants/Color';
import { style, spacings } from '../constants/Fonts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import ProfileMenu from './Modal/ProfileMenu';
import UserAvatar from './UserAvatar';

const AppHeader = ({ title, actionIcon, onActionPress, actionAccessibilityLabel }) => {
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={openDrawer}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Open menu">
        <Icon name="menu" size={wp(5.5)} color={darkTextPrimaryColor} />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightActions}>
        {actionIcon && onActionPress ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onActionPress}
            activeOpacity={0.75}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={actionAccessibilityLabel || 'Action'}>
            <Icon name={actionIcon} size={wp(5)} color={darkTextPrimaryColor} />
          </TouchableOpacity>
        ) : null}

        {/* <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate(MAIN_ROUTES.NOTIFICATIONS)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="bell" size={wp(5.2)} color={darkTextPrimaryColor} />
          <View style={styles.bellDot} />
        </TouchableOpacity> */}

        <View style={styles.headerDivider} />

        <TouchableOpacity onPress={() => setProfileMenuVisible(true)} activeOpacity={0.8}>
          <UserAvatar name={user?.name} size={wp(8.5)} />
        </TouchableOpacity>
      </View>

      <ProfileMenu
        visible={profileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
      />
    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.6),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    backgroundColor: darkBackgroundColor,
  },
  menuButton: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: 'rgba(155, 89, 182, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    padding: spacings.xsmall,
    position: 'relative',
  },
  actionButton: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    textAlign: 'center',
    marginHorizontal: spacings.small,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacings.small,
  },
  headerDivider: {
    width: 1,
    height: hp(2.8),
    backgroundColor: darkBorderColor,
    marginHorizontal: spacings.xsmall,
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
    backgroundColor: '#F85149',
  },
});
