const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const inviteEmailEnabled = import.meta.env.VITE_INVITE_EMAIL_ENABLED === 'true';

export const appEnv = {
  supabaseUrl,
  supabaseAnonKey,
  inviteEmailEnabled,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
};
