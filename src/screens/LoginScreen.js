import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { LOGO_IMAGE } from '../assets/images';
import CommonButton from '../components/CommonButton';
import CommonTextInput from '../components/CommonTextInput';
import FormErrorBanner from '../components/FormErrorBanner';
import {
  darkAccentBlueColor,
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import {
  BACK_TO_ROLES,
  EMAIL_LABEL,
  EMAIL_PLACEHOLDER,
  ERP_APP_NAME,
  FORGOT_PASSWORD_TEXT,
  NO_ACCOUNT_TEXT,
  PASSWORD_LABEL,
  PASSWORD_PLACEHOLDER,
  SIGN_IN_BUTTON,
  SIGN_IN_TITLE,
  SIGN_UP_LINK,
  SIGNING_IN_AS,
} from '../constants/Constants';
import { style, spacings } from '../constants/Fonts';
import { BaseStyle } from '../constants/Style';
import { AUTH_ROUTES } from '../navigation/routes';
import {
  capitalizeName,
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from '../utils';
import { hasFormErrors, validateLoginForm } from '../validation';
import { useAuth } from '../context/AuthContext';
import { loginEmployee } from '../services/employeeService';

const INITIAL_ERRORS = {
  email: '',
  password: '',
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { login } = useAuth();
  const selectedRole = route.params?.selectedRole;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedRole) {
      navigation.replace(AUTH_ROUTES.ROLE_SELECTION);
    }
  }, [navigation, selectedRole]);

  useFocusEffect(
    useCallback(() => {
      setEmail('');
      setPassword('');
      setErrors(INITIAL_ERRORS);
      setSubmitError('');
      setLoading(false);
    }, []),
  );

  const clearFieldError = field => {
    setErrors(prev => ({ ...prev, [field]: '' }));
    setSubmitError('');
  };

  const handleSubmit = async () => {
    const formErrors = validateLoginForm({ email, password });
    setErrors(prev => ({ ...prev, ...formErrors }));

    if (hasFormErrors(formErrors)) {
      return;
    }

    setSubmitError('');
    setLoading(true);

    try {
      const response = await loginEmployee({
        email,
        password,
        selectedRole,
      });
      console.log('Login response:', response);

      await login({
        id: response.profile?.id,
        name: capitalizeName(response.profile?.name || ''),
        email: response.profile?.email,
        role: response.profile?.role,
        dept: response.profile?.dept,
        selectedRoleId: selectedRole?.id,
        selectedRoleTitle: selectedRole?.title,
      });
    } catch (error) {
      console.log('Login error:', error);
      setSubmitError(
        error?.message || 'Unable to login. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const navigateWithRole = screen => {
    navigation.navigate(screen, { selectedRole });
  };

  const goToRoles = () => {
    // navigation.navigate(AUTH_ROUTES.ROLE_SELECTION);
    navigation.goBack();
  };

  if (!selectedRole) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goToRoles}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-left" size={wp(5)} color={darkTextPrimaryColor} />
          <Text style={styles.backText}>{BACK_TO_ROLES}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={BaseStyle.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image
              source={LOGO_IMAGE}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>{ERP_APP_NAME}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{SIGN_IN_TITLE}</Text>
            <Text style={styles.roleText}>
              {SIGNING_IN_AS}{' '}
              <Text style={[styles.roleName, { color: selectedRole.bgColor }]}>
                {selectedRole.title}
              </Text>
            </Text>

            <CommonTextInput
              label={EMAIL_LABEL}
              required
              value={email}
              onChangeText={text => {
                setEmail(text);
                clearFieldError('email');
              }}
              placeholder={EMAIL_PLACEHOLDER}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <CommonTextInput
              label={PASSWORD_LABEL}
              required
              value={password}
              onChangeText={text => {
                setPassword(text);
                clearFieldError('password');
              }}
              placeholder={PASSWORD_PLACEHOLDER}
              secureTextEntry
              error={errors.password}
            />

            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => navigateWithRole(AUTH_ROUTES.FORGOT_PASSWORD)}>
              <Text style={styles.forgotText}>{FORGOT_PASSWORD_TEXT}</Text>
            </TouchableOpacity>

            <FormErrorBanner message={submitError} />

            <CommonButton
              title={SIGN_IN_BUTTON}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{NO_ACCOUNT_TEXT}</Text>
            <TouchableOpacity
              onPress={() => navigateWithRole(AUTH_ROUTES.CREATE_ACCOUNT)}>
              <Text style={styles.footerLink}>{SIGN_UP_LINK}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.xLarge,
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    backgroundColor: darkBackgroundColor,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacings.xsmall,
  },
  backText: {
    ...style.fontSizeNormal,
    ...style.fontWeightThin1x,
    color: darkTextPrimaryColor,
    marginLeft: spacings.normal,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: wp(6),
    paddingTop: hp(3),
    paddingBottom: hp(4),
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(3),
  },
  logoImage: {
    width: wp(55),
    height: hp(10),
    marginBottom: spacings.normal,
  },
  appName: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightThin1x,
    color: darkTextSecondaryColor,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5),
    paddingVertical: hp(3.5),
  },
  title: {
    ...style.fontSizeLargeXX,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: spacings.small,
  },
  roleText: {
    ...style.fontSizeNormal,
    ...style.fontWeightThin,
    color: darkTextSecondaryColor,
    marginBottom: spacings.xLarge,
  },
  roleName: {
    ...style.fontWeightMedium,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -spacings.normal,
    marginBottom: spacings.large,
  },
  forgotText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightThin1x,
    color: darkTextSecondaryColor,
  },
  submitButton: {
    marginTop: spacings.normal,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(3),
  },
  footerText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  footerLink: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkAccentBlueColor,
  },
});
