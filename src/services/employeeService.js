import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { EMAIL_ALREADY_EXISTS } from '../constants/Constants';
import { signInWithEmail, signOut, signUpWithEmail } from './authService';

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
    department: department.trim(),
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
    .select('id, name, email, phone')
    .order('name');

  if (error) {
    throw new Error(error.message || 'Failed to load employees');
  }

  return data || [];
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

  return {
    payload,
    auth: authData,
    profile,
  };
};
