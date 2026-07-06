import React, { useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AUTH_ROUTES } from '../navigation/routes';
import Icon from 'react-native-vector-icons/Feather';
import { LOGO_IMAGE } from '../assets/images';
import CommonButton from '../components/CommonButton';
import CommonTextInput from '../components/CommonTextInput';
import CommonModal from '../components/Modal/CommonModal';
import {
  darkAccentBlueColor,
  darkBackgroundColor,
  darkBorderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../constants/Color';
import {
  BACK_TO_LOGIN,
  CONFIRM_PASSWORD_LABEL,
  CONFIRM_PASSWORD_PLACEHOLDER,
  CONTINUE_BUTTON,
  EMAIL_LABEL,
  EMAIL_PLACEHOLDER,
  ERP_APP_NAME,
  FORGOT_PASSWORD_EMAIL_SUBTITLE,
  FORGOT_PASSWORD_NEW_PASSWORD_SUBTITLE,
  FORGOT_PASSWORD_OTP_SENT_PREFIX,
  FORGOT_PASSWORD_OTP_SUBTITLE,
  FORGOT_PASSWORD_TITLE,
  GO_TO_LOGIN_BUTTON,
  NEW_PASSWORD_LABEL,
  NEW_PASSWORD_PLACEHOLDER,
  NEXT_BUTTON,
  OTP_LABEL,
  OTP_PLACEHOLDER,
  OTP_RESEND_SECONDS,
  RESEND_OTP,
  RESEND_OTP_IN,
  RESET_SUCCESS_MESSAGE,
  RESET_SUCCESS_TITLE,
  STEP_OF_TEXT,
} from '../constants/Constants';
import { style, spacings } from '../constants/Fonts';
import { BaseStyle } from '../constants/Style';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import {
  hasFormErrors,
  validateForgotPasswordEmailStep,
  validateForgotPasswordOtpStep,
  validateForgotPasswordResetStep,
} from '../validation';

const STEPS = {
  EMAIL: 1,
  OTP: 2,
  PASSWORD: 3,
};

const TOTAL_STEPS = 3;

const INITIAL_ERRORS = {
  email: '',
  otp: '',
  password: '',
  confirmPassword: '',
};

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (step !== STEPS.OTP) {
      setResendTimer(0);
    }
  }, [step]);

  const clearFieldError = field => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleEmailNext = () => {
    const formErrors = validateForgotPasswordEmailStep({ email });
    setErrors(prev => ({ ...prev, ...formErrors }));

    if (hasFormErrors(formErrors)) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(STEPS.OTP);
    }, 800);
  };

  const handleOtpNext = () => {
    const formErrors = validateForgotPasswordOtpStep({ otp });
    setErrors(prev => ({ ...prev, ...formErrors }));

    if (hasFormErrors(formErrors)) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(STEPS.PASSWORD);
    }, 800);
  };

  const handlePasswordContinue = () => {
    const formErrors = validateForgotPasswordResetStep({
      password,
      confirmPassword,
    });
    setErrors(prev => ({ ...prev, ...formErrors }));

    if (hasFormErrors(formErrors)) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowSuccessModal(true);
    }, 800);
  };

  const goToLogin = () => {
    navigation.goBack();
  };

  const resetToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: AUTH_ROUTES.LOGIN }],
    });
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    resetToLogin();
  };

  const handleResendOtp = () => {
    if (resendTimer > 0) {
      return;
    }

    setResendTimer(OTP_RESEND_SECONDS);
    clearFieldError('otp');
  };

  const getSubtitle = () => {
    if (step === STEPS.EMAIL) {
      return FORGOT_PASSWORD_EMAIL_SUBTITLE;
    }
    if (step === STEPS.OTP) {
      return FORGOT_PASSWORD_OTP_SUBTITLE;
    }
    return FORGOT_PASSWORD_NEW_PASSWORD_SUBTITLE;
  };

  const renderStepContent = () => {
    if (step === STEPS.EMAIL) {
      return (
        <CommonTextInput
          label={EMAIL_LABEL}
          required
          value={email}
          onChangeText={text => {
            setEmail(text.toLowerCase());
            clearFieldError('email');
          }}
          placeholder={EMAIL_PLACEHOLDER}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
      );
    }

    if (step === STEPS.OTP) {
      return (
        <>
          <Text style={styles.otpInfo}>
            {FORGOT_PASSWORD_OTP_SENT_PREFIX}{' '}
            <Text style={styles.otpEmail}>{email}</Text>
          </Text>
          <CommonTextInput
            label={OTP_LABEL}
            required
            value={otp}
            onChangeText={text => {
              setOtp(text.replace(/[^0-9]/g, ''));
              clearFieldError('otp');
            }}
            placeholder={OTP_PLACEHOLDER}
            keyboardType="number-pad"
            maxLength={6}
            error={errors.otp}
            containerStyle={styles.otpInput}
          />
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendOtp}
            disabled={resendTimer > 0}>
            <Text
              style={[
                styles.resendText,
                resendTimer > 0 && styles.resendTextDisabled,
              ]}>
              {resendTimer > 0
                ? `${RESEND_OTP_IN} ${resendTimer}s`
                : RESEND_OTP}
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <CommonTextInput
          label={NEW_PASSWORD_LABEL}
          required
          value={password}
          onChangeText={text => {
            setPassword(text);
            clearFieldError('password');
          }}
          placeholder={NEW_PASSWORD_PLACEHOLDER}
          secureTextEntry
          error={errors.password}
        />
        <CommonTextInput
          label={CONFIRM_PASSWORD_LABEL}
          required
          value={confirmPassword}
          onChangeText={text => {
            setConfirmPassword(text);
            clearFieldError('confirmPassword');
          }}
          placeholder={CONFIRM_PASSWORD_PLACEHOLDER}
          secureTextEntry
          error={errors.confirmPassword}
        />
      </>
    );
  };

  const getButtonTitle = () => {
    if (step === STEPS.PASSWORD) {
      return CONTINUE_BUTTON;
    }
    return NEXT_BUTTON;
  };

  const handleStepSubmit = () => {
    if (step === STEPS.EMAIL) {
      handleEmailNext();
      return;
    }
    if (step === STEPS.OTP) {
      handleOtpNext();
      return;
    }
    handlePasswordContinue();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goToLogin}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon
            name="arrow-left"
            size={wp(5)}
            color={darkTextPrimaryColor}
          />
          <Text style={styles.backText}>{BACK_TO_LOGIN}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={BaseStyle.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.logoSection}>
            <Image
              source={LOGO_IMAGE}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>{ERP_APP_NAME}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{FORGOT_PASSWORD_TITLE}</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>

            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>
                Step {step} {STEP_OF_TEXT} {TOTAL_STEPS}
              </Text>
              <View style={styles.stepDots}>
                {[STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD].map(stepNumber => (
                  <View
                    key={stepNumber}
                    style={[
                      styles.stepDot,
                      stepNumber <= step && styles.stepDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            {renderStepContent()}

            <CommonButton
              title={getButtonTitle()}
              onPress={handleStepSubmit}
              loading={loading}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CommonModal
        visible={showSuccessModal}
        title={RESET_SUCCESS_TITLE}
        message={RESET_SUCCESS_MESSAGE}
        buttonTitle={GO_TO_LOGIN_BUTTON}
        onButtonPress={handleSuccessClose}
        onRequestClose={handleSuccessClose}
        showSuccessIcon
      />
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;

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
  logoSection: {
    alignItems: 'center',
    marginBottom: hp(3),
  },
  logoImage: {
    width: wp(55),
    height: hp(7),
    marginBottom: spacings.normal,
  },
  appName: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightThin1x,
    color: darkTextSecondaryColor,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
    justifyContent: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
  },
  card: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5),
    paddingVertical: hp(3),
  },
  title: {
    ...style.fontSizeLargeX,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: spacings.small,
  },
  subtitle: {
    ...style.fontSizeNormal,
    ...style.fontWeightThin,
    color: darkTextSecondaryColor,
    marginBottom: spacings.xLarge,
    lineHeight: hp(2.5),
  },
  stepIndicator: {
    marginBottom: spacings.xLarge,
  },
  stepText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightThin1x,
    color: darkTextSecondaryColor,
    marginBottom: spacings.normal,
  },
  stepDots: {
    flexDirection: 'row',
    gap: spacings.normal,
  },
  stepDot: {
    flex: 1,
    height: hp(0.5),
    borderRadius: wp(1),
    backgroundColor: darkBorderColor,
  },
  stepDotActive: {
    backgroundColor: darkAccentBlueColor,
  },
  otpInfo: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightThin,
    color: darkTextSecondaryColor,
    marginBottom: spacings.large,
    lineHeight: hp(2.5),
  },
  otpEmail: {
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  otpInput: {
    marginBottom: spacings.normal,
  },
  resendButton: {
    alignSelf: 'flex-end',
    marginBottom: spacings.large,
    paddingVertical: spacings.xsmall,
  },
  resendText: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkAccentBlueColor,
  },
  resendTextDisabled: {
    ...style.fontWeightThin1x,
    color: darkTextSecondaryColor,
  },
  submitButton: {
    marginTop: spacings.normal,
  },
});
