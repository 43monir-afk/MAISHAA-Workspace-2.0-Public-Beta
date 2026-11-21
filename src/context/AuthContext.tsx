import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuthUser,
  fetchMe,
  loginAccount,
  logoutAccount,
  redeemLicenseKey,
  registerAccount,
  ApiResult,
} from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  plan: 'free' | 'pro';
  isPro: boolean;
  isAdmin: boolean;
  /** true while the first /api/auth/me request is in flight */
  loading: boolean;
  /** 'device' = Pro through the desktop app licence, no account needed */
  source: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<ApiResult>;
  register: (email: string, password: string, name: string) => Promise<ApiResult>;
  logout: () => Promise<void>;
  redeem: (key: string) => Promise<ApiResult>;
}

const noop = async () => ({ ok: false, status: 0, data: {} } as ApiResult);

/** Safe default so components (and tests) rendered without a provider behave as "signed out, Free". */
const DEFAULT: AuthContextType = {
  user: null,
  plan: 'free',
  isPro: false,
  isAdmin: false,
  loading: false,
  source: 'anonymous',
  refresh: async () => {},
  login: noop,
  register: noop,
  logout: async () => {},
  redeem: noop,
};

const AuthContext = createContext<AuthContextType>(DEFAULT);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [source, setSource] = useState('anonymous');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetchMe();
    if (res.ok) {
      setUser(res.data.user ?? null);
      setPlan(res.data.plan === 'pro' ? 'pro' : 'free');
      setSource(res.data.source || 'anonymous');
    } else {
      setUser(null);
      setPlan('free');
      setSource('anonymous');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const applyUser = (res: ApiResult<{ user: AuthUser }>) => {
    if (res.ok && res.data.user) {
      setUser(res.data.user);
      setPlan(res.data.user.plan);
      setSource(res.data.user.role === 'admin' ? 'admin' : 'account');
    }
    return res;
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      plan,
      isPro: plan === 'pro',
      isAdmin: user?.role === 'admin',
      loading,
      source,
      refresh,
      login: async (email, password) => applyUser(await loginAccount(email, password)),
      register: async (email, password, name) => applyUser(await registerAccount(email, password, name)),
      logout: async () => {
        await logoutAccount();
        await refresh();
      },
      redeem: async (key) => applyUser(await redeemLicenseKey(key)),
    }),
    [user, plan, source, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
