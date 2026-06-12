import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkTextPrimaryColor,
} from '../constants/Color';
import { style, spacings } from '../constants/Fonts';
import { MAIN_ROUTES } from '../navigation/routes';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import ProfileMenu from './Modal/ProfileMenu';

const PURPLE = '#9B59B6';

const AppHeader = ({ title }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const initial = (user?.name || 'U').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={openDrawer}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.hashIcon}>#</Text>
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightActions}>
        {/* <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate(MAIN_ROUTES.NOTIFICATIONS)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="bell" size={wp(5.2)} color={darkTextPrimaryColor} />
          <View style={styles.bellDot} />
        </TouchableOpacity> */}

        <View style={styles.headerDivider} />

        <TouchableOpacity
          style={styles.avatar}
          onPress={() => setProfileMenuVisible(true)}>
          <Text style={styles.avatarText}>{initial}</Text>
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
  iconButton: {
    padding: spacings.xsmall,
    position: 'relative',
  },
  hashIcon: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
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
  avatar: {
    width: wp(8.5),
    height: wp(8.5),
    borderRadius: wp(4.25),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
});
