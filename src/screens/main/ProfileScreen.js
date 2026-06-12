import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AiAssistant from '../../components/AiAssistant';
import AppHeader from '../../components/AppHeader';
import ConfirmModal from '../../components/Modal/ConfirmModal';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import {
  DEPARTMENT_LABEL,
  EMAIL_LABEL,
  FULL_NAME_LABEL,
  LOGOUT_CANCEL,
  LOGOUT_CONFIRM,
  LOGOUT_CONFIRM_MESSAGE,
  LOGOUT_CONFIRM_TITLE,
  LOGOUT_TEXT,
  PHONE_NUMBER_LABEL,
  PROFILE_ACCESS_ROLE_LABEL,
  PROFILE_LOAD_ERROR,
  PROFILE_NOT_AVAILABLE,
  PROFILE_TITLE,
  ROLE_DESIGNATION_LABEL,
} from '../../constants/Constants';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { refreshEmployeeProfileImage } from '../../hooks/useEmployeeProfileImage';
import { getEmployeeProfileById } from '../../services/employeeService';
import {
  capitalizeName,
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);
const HORIZONTAL_PAD = wp(5);

const ProfileField = ({ icon, label, value }) => (
  <View style={styles.fieldRow}>
    <View style={styles.fieldIconWrap}>
      <Icon name={icon} size={wp(4.2)} color={PURPLE} />
    </View>
    <View style={styles.fieldContent}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || PROFILE_NOT_AVAILABLE}</Text>
    </View>
  </View>
);

const LOGOUT_RED = '#F85149';

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setError('');

    try {
      const data = await getEmployeeProfileById(user.id);
      setProfile(data);
      await refreshEmployeeProfileImage(user.id);
    } catch {
      setError(PROFILE_LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProfile();
    }, [loadProfile]),
  );

  const displayName = capitalizeName(profile?.name || user?.name || 'User');
  const accessRole = user?.selectedRoleTitle || user?.role || PROFILE_NOT_AVAILABLE;

  const handleConfirmLogout = async () => {
    setLogoutConfirmVisible(false);
    await logout();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={PROFILE_TITLE} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <UserAvatar
              name={displayName}
              size={wp(22)}
              textStyle={styles.avatarText}
              style={styles.heroAvatar}
            />
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroRole}>
              {profile?.role || user?.role || PROFILE_NOT_AVAILABLE}
            </Text>
            {profile?.dept || user?.dept ? (
              <View style={styles.deptPill}>
                <Text style={styles.deptPillText}>{profile?.dept || user?.dept}</Text>
              </View>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={PURPLE} />
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadProfile} activeOpacity={0.85}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailsCard}>
              <ProfileField icon="user" label={FULL_NAME_LABEL} value={displayName} />
              <View style={styles.fieldDivider} />
              <ProfileField icon="mail" label={EMAIL_LABEL} value={profile?.email || user?.email} />
              <View style={styles.fieldDivider} />
              <ProfileField icon="phone" label={PHONE_NUMBER_LABEL} value={profile?.phone} />
              <View style={styles.fieldDivider} />
              <ProfileField
                icon="briefcase"
                label={DEPARTMENT_LABEL}
                value={profile?.dept || user?.dept}
              />
              <View style={styles.fieldDivider} />
              <ProfileField
                icon="award"
                label={ROLE_DESIGNATION_LABEL}
                value={profile?.role || user?.role}
              />
              <View style={styles.fieldDivider} />
              <ProfileField
                icon="shield"
                label={PROFILE_ACCESS_ROLE_LABEL}
                value={accessRole}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setLogoutConfirmVisible(true)}
            activeOpacity={0.85}>
            <Icon name="log-out" size={wp(4.8)} color={LOGOUT_RED} />
            <Text style={styles.logoutButtonText}>{LOGOUT_TEXT}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
      <AiAssistant />

      <ConfirmModal
        visible={logoutConfirmVisible}
        title={LOGOUT_CONFIRM_TITLE}
        message={LOGOUT_CONFIRM_MESSAGE}
        confirmTitle={LOGOUT_CONFIRM}
        cancelTitle={LOGOUT_CANCEL}
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutConfirmVisible(false)}
      />
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: hp(2),
    paddingBottom: hp(12),
    gap: hp(2),
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5),
    paddingVertical: hp(3),
  },
  heroAvatar: {
    marginBottom: hp(1.5),
  },
  avatarText: {
    ...style.fontSizeLarge1x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  heroName: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    textAlign: 'center',
  },
  heroRole: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    marginTop: hp(0.5),
    textAlign: 'center',
  },
  deptPill: {
    marginTop: hp(1.2),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(4),
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.3)',
  },
  deptPillText: {
    ...style.fontSizeSmall2x,
    color: PURPLE,
    ...style.fontWeightMedium,
  },
  detailsCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.5),
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(3.5),
    paddingVertical: hp(1.5),
  },
  fieldIconWrap: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: 'rgba(155, 89, 182, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContent: {
    flex: 1,
    gap: hp(0.35),
  },
  fieldLabel: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
  },
  fieldValue: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: darkBorderColor,
  },
  loadingWrap: {
    paddingVertical: hp(4),
    alignItems: 'center',
  },
  errorCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(4),
    alignItems: 'center',
    gap: hp(1.2),
  },
  errorText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(1),
    borderRadius: wp(3),
    backgroundColor: PURPLE,
  },
  retryButtonText: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    ...style.fontWeightMedium,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.5),
    marginTop: hp(0.5),
    paddingVertical: hp(1.6),
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.35)',
    backgroundColor: 'rgba(248, 81, 73, 0.08)',
  },
  logoutButtonText: {
    ...style.fontSizeNormal2x,
    color: LOGOUT_RED,
    ...style.fontWeightMedium1x,
  },
});
