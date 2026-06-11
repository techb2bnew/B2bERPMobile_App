import {
  CONFIRM_PASSWORD_REQUIRED,
  DEPARTMENT_REQUIRED,
  EMAIL_INVALID,
  EMAIL_REQUIRED,
  FULL_NAME_REQUIRED,
  OTP_INVALID,
  OTP_REQUIRED,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH,
  PASSWORD_REQUIRED,
  MAX_PHONE_LENGTH,
  PHONE_INVALID,
  PHONE_REQUIRED,
  ROLE_DESIGNATION_REQUIRED,
} from './constants/Constants';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const OTP_REGEX = /^\d{6}$/;
const MIN_PASSWORD_LENGTH = 6;

export const validateEmail = email => {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return EMAIL_REQUIRED;
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return EMAIL_INVALID;
  }

  return '';
};

export const validatePassword = (password, isRegister = false) => {
  if (!password.trim()) {
    return PASSWORD_REQUIRED;
  }

  if (isRegister && password.length < MIN_PASSWORD_LENGTH) {
    return PASSWORD_MIN_LENGTH;
  }

  return '';
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword.trim()) {
    return CONFIRM_PASSWORD_REQUIRED;
  }

  if (password !== confirmPassword) {
    return PASSWORD_MISMATCH;
  }

  return '';
};

export const validateLoginForm = ({ email, password }) => ({
  email: validateEmail(email),
  password: validatePassword(password),
});

export const validateRegisterForm = ({ email, password, confirmPassword }) => ({
  email: validateEmail(email),
  password: validatePassword(password, true),
  confirmPassword: validateConfirmPassword(password, confirmPassword),
});

export const validateFullName = fullName => {
  if (!fullName.trim()) {
    return FULL_NAME_REQUIRED;
  }
  return '';
};

export const validatePhone = phone => {
  const digitsOnly = phone.replace(/\D/g, '');

  if (!digitsOnly) {
    return PHONE_REQUIRED;
  }

  if (digitsOnly.length > MAX_PHONE_LENGTH) {
    return PHONE_INVALID;
  }

  if (!PHONE_REGEX.test(digitsOnly)) {
    return PHONE_INVALID;
  }

  return '';
};

export const validateRequiredField = (value, errorMessage) => {
  if (!value.trim()) {
    return errorMessage;
  }
  return '';
};

export const validateCreateAccountForm = ({
  fullName,
  workEmail,
  phoneNumber,
  department,
  roleDesignation,
  password,
}) => ({
  fullName: validateFullName(fullName),
  workEmail: validateEmail(workEmail),
  phoneNumber: validatePhone(phoneNumber),
  department: validateRequiredField(department, DEPARTMENT_REQUIRED),
  roleDesignation: validateRequiredField(
    roleDesignation,
    ROLE_DESIGNATION_REQUIRED,
  ),
  password: validatePassword(password, true),
});

export const validateOtp = otp => {
  const trimmedOtp = otp.trim();

  if (!trimmedOtp) {
    return OTP_REQUIRED;
  }

  if (!OTP_REGEX.test(trimmedOtp)) {
    return OTP_INVALID;
  }

  return '';
};

export const validateForgotPasswordEmailStep = ({ email }) => ({
  email: validateEmail(email),
});

export const validateForgotPasswordOtpStep = ({ otp }) => ({
  otp: validateOtp(otp),
});

export const validateForgotPasswordResetStep = ({
  password,
  confirmPassword,
}) => ({
  password: validatePassword(password, true),
  confirmPassword: validateConfirmPassword(password, confirmPassword),
});

export const hasFormErrors = errors =>
  Object.values(errors).some(error => error !== '');
