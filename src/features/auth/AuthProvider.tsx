import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { appEnv } from '../../lib/env';
import { supabase } from '../../lib/supabase';
import type { Member } from '../../lib/types';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMember = useCallback(async () => {
    setError(null);
    const profile = await api.claimMemberProfile();
    if (profile.status === 'disabled') {
      throw new Error('このメンバーは無効化されています。');
    }
    setMember(profile);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (!appEnv.isSupabaseConfigured || !supabase) {
        if (localStorage.getItem('tennis-demo-session') === 'active') {
          setMember(api.isDemo ? await api.claimMemberProfile() : null);
        }
        setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      if (data.session) {
        try {
          await refreshMember();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'メンバー確認に失敗しました。');
          setMember(null);
        }
      }
      setIsLoading(false);
    }

    bootstrap();

    const subscription = supabase?.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setMember(null);
        return;
      }

      try {
        await refreshMember();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'メンバー確認に失敗しました。');
      }
    });

    return () => {
      mounted = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, [refreshMember]);

  const signInWithEmail = useCallback(async (email: string) => {
    setError(null);
    if (!supabase) {
      localStorage.setItem('tennis-demo-session', 'active');
      setMember(await api.claimMemberProfile());
      return;
    }

    const redirectTo = `${window.location.origin}${import.meta.env.VITE_APP_BASE_PATH || '/'}events`;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (signInError) throw signInError;
  }, []);

  const startDemo = useCallback(async () => {
    localStorage.setItem('tennis-demo-session', 'active');
    setMember(await api.claimMemberProfile());
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem('tennis-demo-session');
    setMember(null);
    if (supabase) await supabase.auth.signOut();
  }, []);

  const updateMyProfile = useCallback(async (name: string, affiliation: string | null) => {
    const nextMember = await api.updateMyProfile(name, affiliation);
    setMember(nextMember);
  }, []);

  const value = useMemo(
    () => ({
      member,
      session,
      isDemo: api.isDemo,
      isLoading,
      error,
      signInWithEmail,
      startDemo,
      signOut,
      refreshMember,
      updateMyProfile,
    }),
    [error, isLoading, member, refreshMember, session, signInWithEmail, signOut, startDemo, updateMyProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
