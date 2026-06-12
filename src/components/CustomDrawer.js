import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import { LOGO_IMAGE } from '../assets/images';
import ConfirmModal from './Modal/ConfirmModal';
import { COMMAND_CENTER_VERSION } from '../constants/roles';
import {
  CHAT_LABEL,
  LOGOUT_CANCEL,
  LOGOUT_CONFIRM,
  LOGOUT_CONFIRM_MESSAGE,
  LOGOUT_CONFIRM_TITLE,
  LOGOUT_TEXT,
  MY_DASHBOARD_LABEL,
  PROJECTS_WORK_LABEL,
  ONLINE_STATUS,
  TIME_SHEET_LABEL,
} from '../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import { style, spacings } from '../constants/Fonts';
import { MAIN_ROUTES } from '../navigation/routes';
import {
  capitalizeName,
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from '../utils';

const PURPLE = '#9B59B6';
const SLIDE_DURATION = 260;
const USE_NATIVE_SLIDE = Platform.OS === 'ios';

const getDrawerWidth = () => Dimensions.get('window').width * 0.75;

const MENU_ITEMS = [
  { route: MAIN_ROUTES.DASHBOARD, label: MY_DASHBOARD_LABEL, icon: 'grid' },
  { route: MAIN_ROUTES.PROJECTS_WORK, label: PROJECTS_WORK_LABEL, icon: 'folder' },
  { route: MAIN_ROUTES.TIME_SHEET, label: TIME_SHEET_LABEL, icon: 'clock' },
  { route: MAIN_ROUTES.CHAT, label: CHAT_LABEL, icon: 'message-circle' },
];

const CustomDrawer = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { isOpen, closeDrawer, activeRoute, setActiveRoute } = useDrawer();

  const drawerWidth = getDrawerWidth();
  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [isRendered, setIsRendered] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const pendingLogoutConfirmRef = useRef(false);

  const initial = (user?.name || 'U').charAt(0).toUpperCase();
  const displayName = capitalizeName(user?.name || 'User');
  const displayRole = user?.selectedRoleTitle || user?.role || 'Employee';

  useEffect(() => {
    if (!isOpen) {
      setProfileExpanded(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      slideAnim.setValue(-drawerWidth);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: SLIDE_DURATION,
          useNativeDriver: USE_NATIVE_SLIDE,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: SLIDE_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!isRendered) {
      return;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -drawerWidth,
        duration: SLIDE_DURATION,
        useNativeDriver: USE_NATIVE_SLIDE,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: SLIDE_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsRendered(false);
      if (pendingLogoutConfirmRef.current) {
        pendingLogoutConfirmRef.current = false;
        const showLogoutConfirm = () => setLogoutConfirmVisible(true);
        if (Platform.OS === 'ios') {
          setTimeout(showLogoutConfirm, 150);
        } else {
          showLogoutConfirm();
        }
      }
    });
  }, [isOpen, isRendered, slideAnim, backdropAnim, drawerWidth]);

  const navigateTo = screen => {
    setProfileExpanded(false);
    setActiveRoute(screen);
    closeDrawer();
    navigation.navigate(screen);
  };

  const toggleProfileMenu = () => {
    setProfileExpanded(prev => !prev);
  };

  const handleLogoutPress = () => {
    setProfileExpanded(false);
    pendingLogoutConfirmRef.current = true;
    closeDrawer();
  };

  const handleConfirmLogout = async () => {
    setLogoutConfirmVisible(false);
    await logout();
  };

  return (
    <>
      <Modal
        visible={isOpen || isRendered}
        transparent
        animationType="none"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={closeDrawer}>
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />

          <Pressable
            style={[styles.backdropPress, { left: drawerWidth }]}
            onPress={closeDrawer}
            accessibilityRole="button"
            accessibilityLabel="Close drawer"
          />

          <Animated.View
            collapsable={false}
            style={[
              styles.drawer,
              { width: drawerWidth },
              USE_NATIVE_SLIDE
                ? { left: 0, transform: [{ translateX: slideAnim }] }
                : { left: slideAnim },
            ]}>
          <View style={styles.drawerTop}>
            <View style={styles.logoSection}>
              <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
              <Text style={styles.version}>{COMMAND_CENTER_VERSION}</Text>
            </View>

            <View style={styles.menuSection}>
              {MENU_ITEMS.map(item => {
                const isActive = activeRoute === item.route;
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => navigateTo(item.route)}
                    activeOpacity={0.85}>
                    <Icon
                      name={item.icon}
                      size={wp(5.2)}
                      color={isActive ? darkTextPrimaryColor : darkTextSecondaryColor}
                    />
                    <Text
                      style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                      {item.label}
                    </Text>
                    {item.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.userSection}>
            {profileExpanded ? (
              <View style={styles.profileDropdown}>
                <Text style={styles.dropdownName}>{displayName}</Text>
                <Text style={styles.dropdownRole}>{displayRole}</Text>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity
                  style={styles.logoutRow}
                  onPress={handleLogoutPress}
                  activeOpacity={0.8}>
                  <Icon name="log-out" size={wp(4.5)} color="#F85149" />
                  <Text style={styles.logoutText}>{LOGOUT_TEXT}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.userRow}
              onPress={toggleProfileMenu}
              activeOpacity={0.85}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{displayName}</Text>
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>{ONLINE_STATUS}</Text>
                </View>
              </View>
              <Icon
                name={profileExpanded ? 'chevron-up' : 'chevron-down'}
                size={wp(4.5)}
                color={darkTextSecondaryColor}
              />
            </TouchableOpacity>
          </View>
          </Animated.View>
        </View>
      </Modal>

      <ConfirmModal
      visible={logoutConfirmVisible}
      title={LOGOUT_CONFIRM_TITLE}
      message={LOGOUT_CONFIRM_MESSAGE}
      confirmTitle={LOGOUT_CONFIRM}
      cancelTitle={LOGOUT_CANCEL}
      onConfirm={handleConfirmLogout}
      onCancel={() => setLogoutConfirmVisible(false)}
      />
    </>
  );
};

export default CustomDrawer;

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdropPress: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: darkBackgroundColor,
    borderRightWidth: 1,
    borderRightColor: darkBorderColor,
    paddingTop: hp(6),
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
    justifyContent: 'space-between',
    zIndex: 10,
    elevation: 24,
  },
  drawerTop: {
    flex: 1,
  },
  logoSection: {
    marginBottom: hp(4),
  },
  logo: {
    width: wp(48),
    height: hp(5.5),
    marginBottom: hp(1),
    alignSelf: 'flex-start',
  },
  version: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    letterSpacing: 1.2,
    opacity: 0.9,
  },
  menuSection: {
    gap: hp(1),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: wp(3),
    gap: wp(3.5),
    minHeight: hp(5.8),
  },
  menuItemActive: {
    backgroundColor: PURPLE,
  },
  menuLabel: {
    flex: 1,
    ...style.fontSizeNormal2x,
    color: darkTextSecondaryColor,
  },
  menuLabelActive: {
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  badge: {
    backgroundColor: 'rgba(155, 89, 182, 0.35)',
    borderRadius: wp(3),
    minWidth: wp(5.5),
    height: wp(5.5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacings.xsmall,
  },
  badgeText: {
    ...style.fontSizeSmall,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  userSection: {
    marginTop: hp(3),
    paddingTop: hp(2),
    gap: hp(1.2),
  },
  profileDropdown: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingTop: hp(2),
    paddingBottom: hp(1.6),
  },
  dropdownName: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  dropdownRole: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginTop: hp(0.4),
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: darkBorderColor,
    marginVertical: hp(1.5),
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    paddingVertical: hp(0.4),
  },
  logoutText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: '#F85149',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.5),
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6),
  },
  avatar: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginTop: hp(0.4),
  },
  onlineDot: {
    width: wp(2.2),
    height: wp(2.2),
    borderRadius: wp(1),
    backgroundColor: '#3DDC84',
  },
  onlineText: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
});
