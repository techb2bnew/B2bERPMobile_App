import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabaseConfig';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export const checkSupabaseConnection = async () => {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      message:
        'Add valid SUPABASE_URL and SUPABASE_ANON_KEY in src/config/supabaseConfig.js',
    };
  }

  try {
    const healthResponse = await fetch(`${SUPABASE_URL.trim()}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });

    if (!healthResponse.ok) {
      return {
        connected: false,
        message: `Health check failed (${healthResponse.status})`,
      };
    }

    const { error } = await getSupabase().auth.getSession();

    if (error) {
      return { connected: false, message: error.message };
    }

    return {
      connected: true,
      message: 'Supabase connected successfully',
      url: SUPABASE_URL,
    };
  } catch (error) {
    return {
      connected: false,
      message: error?.message || 'Unable to reach Supabase',
    };
  }
};
