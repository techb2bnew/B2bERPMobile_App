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
let realtimeChannelCounter = 0;
let authListenerAttached = false;

export const createRealtimeChannelName = prefix => {
  realtimeChannelCounter += 1;
  return `${prefix}-${realtimeChannelCounter}-${Date.now()}`;
};

const attachRealtimeAuthListener = client => {
  if (authListenerAttached) {
    return;
  }

  authListenerAttached = true;

  client.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) {
      client.realtime.setAuth(session.access_token);
      return;
    }

    client.realtime.setAuth(null);
  });
};

export const syncSupabaseRealtimeAuth = async () => {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    await supabase.realtime.setAuth(session.access_token);
    return true;
  }

  await supabase.realtime.setAuth(null);
  return false;
};

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
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });

    attachRealtimeAuthListener(supabaseClient);
    syncSupabaseRealtimeAuth().catch(() => {});
  }

  return supabaseClient;
};
