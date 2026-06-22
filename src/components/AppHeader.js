import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkTextPrimaryColor,
} from '../constants/Color';
import { style, spacings } from '../constants/Fonts';
import { useNotificationBadgeContext } from '../context/NotificationBadgeContext';
import { MAIN_ROUTES } from '../navigation/routes';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import ProfileMenu from './Modal/ProfileMenu';
import UserAvatar from './UserAvatar';

const AppHeader = ({ title, actionIcon, onActionPress, actionAccessibilityLabel }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const { unreadCount } = useNotificationBadgeContext();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const badgeLabel =
    unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : null;

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

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate(MAIN_ROUTES.NOTIFICATIONS)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Open notifications">
          <Icon name="bell" size={wp(5.2)} color={darkTextPrimaryColor} />
          {badgeLabel ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{badgeLabel}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <View style={styles.headerDivider} />

        <TouchableOpacity onPress={() => setProfileMenuVisible(true)} activeOpacity={0.8}>
          <UserAvatar userId={user?.id} name={user?.name} size={wp(8.5)} />
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
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: wp(4.2),
    height: wp(4.2),
    borderRadius: wp(2.1),
    backgroundColor: '#F85149',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1),
  },
  bellBadgeText: {
    ...style.fontSizeExtraSmall,
    ...style.fontWeightMedium,
    color: '#FFFFFF',
    fontSize: wp(2.4),
    lineHeight: wp(3),
  },
});
