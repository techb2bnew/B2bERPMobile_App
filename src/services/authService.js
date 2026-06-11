import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export const signInWithEmail = async (email, password) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const signUpWithEmail = async payload => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await getSupabase().auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      data: payload.data,
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

export const signOut = async () => {
  const { error } = await getSupabase().auth.signOut();
  if (error) {
    throw error;
  }
};

export const getCurrentSession = async () => {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await getSupabase().auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
};

export const resetPasswordForEmail = async email => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await getSupabase().auth.resetPasswordForEmail(
    email.trim(),
  );
  if (error) {
    throw error;
  }
  return data;
};
