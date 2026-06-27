/* global crypto */
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { EMAIL_ALREADY_EXISTS } from '../constants/Constants';
import {
  LOGIN_ROLE_MISMATCH_MESSAGE,
  profileMatchesLoginRole,
} from '../constants/roles';
import { signInWithEmail, signOut, signUpWithEmail } from './authService';
import { normalizeDepartmentName } from './hrmsService';

const EMPLOYEE_PROFILES_TABLE = 'employee_profiles';

const buildLoginPayload = (email, password, selectedRole) => ({
  email: email.trim().toLowerCase(),
  password,
  role: selectedRole?.id || '',
});

const buildRegisterPayload = ({
  workEmail,
  password,
  selectedRole,
  fullName,
  phoneNumber,
  department,
  roleDesignation,
  employeeId,
}) => ({
  email: workEmail.trim().toLowerCase(),
  password,
  role: selectedRole?.id || '',
  data: {
    role: selectedRole?.id || '',
    full_name: fullName.trim(),
    phone: phoneNumber.trim(),
    department: normalizeDepartmentName(department),
    designation: roleDesignation.trim(),
    employee_id: employeeId.trim() || '',
  },
});

const generateProfileId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const isAuthUserExistsError = error => {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user already')
  );
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const buildProfileRow = (payload, profileId) => ({
  id: profileId,
  name: payload.data.full_name,
  role: payload.data.designation || payload.role,
  dept: payload.data.department,
  email: payload.email,
  joined: getTodayDate(),
  phone: payload.data.phone || null,
});

export const createEmployeeProfile = async (payload, profileId) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const profileRow = buildProfileRow(payload, profileId);

  const { data, error } = await getSupabase()
    .from(EMPLOYEE_PROFILES_TABLE)
    .insert(profileRow)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to save employee profile');
  }

  return data;
};

export const fetchAllEmployeeProfiles = async () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await getSupabase()
    .from(EMPLOYEE_PROFILES_TABLE)
    .select('id, name, email, phone, role, app_role, profile_image_url, avatar, dept')
    .order('name');

  if (error) {
    throw new Error(error.message || 'Failed to load employees');
  }

  return data || [];
};

const isValidProfileImageUrl = value => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return (
    /^https?:\/\//i.test(trimmed) ||
    /^data:image\//i.test(trimmed) ||
    /^file:\/\//i.test(trimmed)
  );
};

export const getEmployeeProfileImageUrl = profile => {
  const candidates = [profile?.profile_image_url, profile?.avatar];

  const url = candidates.find(isValidProfileImageUrl);

  return url ? url.trim() : null;
};

export const getEmployeeProfileById = async id => {
  if (!isSupabaseConfigured || !id) {
    return null;
  }

  const { data, error } = await getSupabase()
    .from(EMPLOYEE_PROFILES_TABLE)
    .select('id, name, email, phone, role, dept, profile_image_url, avatar')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export const updateEmployeeFcmToken = async (profileId, fcmToken) => {
  if (!isSupabaseConfigured || !profileId || !fcmToken?.trim()) {
    return null;
  }

  const { data, error } = await getSupabase()
    .from(EMPLOYEE_PROFILES_TABLE)
    .update({ fcm_token: fcmToken.trim() })
    .eq('id', profileId)
    .select('id, fcm_token')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to update FCM token');
  }

  if (__DEV__) {
    console.log('[FCM] Saved to employee_profiles:', profileId);
  }

  return data;
};

export const getEmployeeFcmToken = async profileId => {
  if (!isSupabaseConfigured || !profileId) {
    return null;
  }

  const { data, error } = await getSupabase()
    .from(EMPLOYEE_PROFILES_TABLE)
    .select('fcm_token')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.fcm_token?.trim() || null;
};

export const getEmployeeProfileByEmail = async email => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await getSupabase()
    .from(EMPLOYEE_PROFILES_TABLE)
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const ensureAuthUser = async payload => {
  try {
    const authData = await signUpWithEmail(payload);
    await signOut();
    return authData?.user;
  } catch (authError) {
    if (!isAuthUserExistsError(authError)) {
      throw authError;
    }

    try {
      const authData = await signInWithEmail(payload.email, payload.password);
      await signOut();
      return authData?.user;
    } catch {
      throw new Error(
        'This email already has an account. Please login or reset your password.',
      );
    }
  }
};

export const registerEmployee = async ({
  workEmail,
  password,
  selectedRole,
  fullName,
  phoneNumber,
  department,
  roleDesignation,
  employeeId,
}) => {
  const payload = buildRegisterPayload({
    workEmail,
    password,
    selectedRole,
    fullName,
    phoneNumber,
    department,
    roleDesignation,
    employeeId,
  });

  console.log('Register payload:', payload);

  const existingProfile = await getEmployeeProfileByEmail(payload.email);
  if (existingProfile) {
    throw new Error(EMAIL_ALREADY_EXISTS);
  }

  const authUser = await ensureAuthUser(payload);
  const profileId = authUser?.id || generateProfileId();

  const profile = await createEmployeeProfile(payload, profileId);

  return {
    payload,
    auth: { user: authUser },
    profile,
  };
};

export const loginEmployee = async ({ email, password, selectedRole }) => {
  const payload = buildLoginPayload(email, password, selectedRole);

  console.log('Login payload:', payload);

  const authData = await signInWithEmail(payload.email, payload.password);
  const profile = await getEmployeeProfileByEmail(payload.email);

  if (!profile) {
    await signOut();
    throw new Error('Employee not found in employee_profiles table');
  }

  const selectedRoleId = selectedRole?.id || '';
  if (!profileMatchesLoginRole(profile.app_role, selectedRoleId)) {
    await signOut();
    throw new Error(LOGIN_ROLE_MISMATCH_MESSAGE);
  }

  return {
    payload,
    auth: authData,
    profile,
  };
};

export const updateEmployeeProfile = async (profileId, updateData) => {
  if (!isSupabaseConfigured || !profileId) {
    throw new Error('Supabase is not configured or profileId is missing');
  }

  const { data, error } = await getSupabase()
    .from(EMPLOYEE_PROFILES_TABLE)
    .update(updateData)
    .eq('id', profileId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to update employee profile');
  }

  return data;
};
