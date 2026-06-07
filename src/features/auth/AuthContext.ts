import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';
import type { Member } from '../../lib/types';

export type AuthContextValue = {
  member: Member | null;
  session: Session | null;
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
  signInWithEmail: (email: string) => Promise<void>;
  startDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
  updateMyProfile: (name: string, affiliation: string | null) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
