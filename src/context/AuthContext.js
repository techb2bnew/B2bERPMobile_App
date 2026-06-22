import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { syncSupabaseRealtimeAuth } from '../lib/supabase';
import { signOut } from '../services/authService';
import {
  clearUserSession,
  getUserSession,
  saveUserSession,
} from '../services/authStorage';
import { syncFcmTokenForUser } from '../services/fcmTokenService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    await syncSupabaseRealtimeAuth();
    const session = await getUserSession();
    setUser(session);

    if (session?.id) {
      await syncFcmTokenForUser(session.id, 'session_restore');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(async userData => {
    await syncSupabaseRealtimeAuth();
    await saveUserSession(userData);
    setUser(userData);
    await syncFcmTokenForUser(userData.id, 'login');
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // Session may already be cleared
    }
    await clearUserSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
