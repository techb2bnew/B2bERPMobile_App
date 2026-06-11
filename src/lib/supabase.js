import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabaseConfig';

const isValidUrl = url =>
  typeof url === 'string' && /^https?:\/\/.+/i.test(url.trim());

export const isSupabaseConfigured =
  isValidUrl(SUPABASE_URL) &&
  SUPABASE_ANON_KEY &&
  SUPABASE_ANON_KEY !== 'your_supabase_anon_key';

let supabaseClient = null;

export const getSupabase = () => {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Add valid keys in src/config/supabaseConfig.js',
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseClient;
};
