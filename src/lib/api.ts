import { appEnv } from './env';
import { supabase } from './supabase';
import type {
  AdminEvent,
  EventCard,
  EventDetail,
  EventFormValues,
  InviteResult,
  Member,
  MemberRole,
  MembershipApplicationResult,
  MemberStatus,
  ResponseStatusInput,
} from './types';
import { demoStore } from './demoStore';

function assertSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export const api = {
  isDemo: !appEnv.isSupabaseConfigured,

  async claimMemberProfile(): Promise<Member> {
    if (!appEnv.isSupabaseConfigured) return demoStore.getMember();

    const client = assertSupabase();
    const { data, error } = await client.rpc('claim_member_profile').single();
    if (error) throw error;
    return data as Member;
  },

  async updateMyProfile(name: string, affiliation: string | null): Promise<Member> {
    if (!appEnv.isSupabaseConfigured) return demoStore.updateMyProfile(name, affiliation);

    const client = assertSupabase();
    const { data, error } = await client
      .rpc('update_my_profile', {
        p_name: name.trim(),
        p_affiliation: affiliation?.trim() || null,
      })
      .single();
    if (error) throw error;
    return data as Member;
  },

  async requestMembership(email: string, name: string, affiliation: string | null): Promise<MembershipApplicationResult> {
    if (!appEnv.isSupabaseConfigured) return demoStore.requestMembership(email, name, affiliation);

    const client = assertSupabase();
    const { data, error } = await client
      .rpc('request_membership', {
        p_email: email.trim(),
        p_name: name.trim(),
        p_affiliation: affiliation?.trim() || null,
      })
      .single();
    if (error) throw error;
    return data as MembershipApplicationResult;
  },

  async listEventCards(): Promise<EventCard[]> {
    if (!appEnv.isSupabaseConfigured) return demoStore.listEvents();

    const client = assertSupabase();
    const { data, error } = await client.rpc('get_event_cards');
    if (error) throw error;
    return (data ?? []) as EventCard[];
  },

  async getEventDetail(eventId: string): Promise<EventDetail | null> {
    if (!appEnv.isSupabaseConfigured) return demoStore.getEventDetail(eventId);

    const client = assertSupabase();
    const { data, error } = await client.rpc('get_event_detail', { p_event_id: eventId });
    if (error) throw error;
    return data as EventDetail;
  },

  async reserveEvent(eventId: string): Promise<EventCard[]> {
    if (!appEnv.isSupabaseConfigured) return demoStore.reserve(eventId);

    const client = assertSupabase();
    const { error } = await client.rpc('reserve_event', { p_event_id: eventId });
    if (error) throw error;
    return api.listEventCards();
  },

  async cancelReservation(eventId: string): Promise<EventCard[]> {
    if (!appEnv.isSupabaseConfigured) return demoStore.cancel(eventId);

    const client = assertSupabase();
    const { error } = await client.rpc('cancel_reservation', { p_event_id: eventId });
    if (error) throw error;
    return api.listEventCards();
  },

  async setEventResponse(eventId: string, status: ResponseStatusInput, comment: string): Promise<EventCard[]> {
    if (!appEnv.isSupabaseConfigured) return demoStore.setResponse(eventId, status, comment);

    const client = assertSupabase();
    const { error } = await client.rpc('set_event_response', {
      p_event_id: eventId,
      p_status: status,
      p_comment: comment.trim() || null,
    });
    if (error) throw error;
    return api.listEventCards();
  },

  async listAdminEvents(): Promise<AdminEvent[]> {
    if (!appEnv.isSupabaseConfigured) return demoStore.listAdminEvents();

    const client = assertSupabase();
    const { data, error } = await client
      .from('events')
      .select('id,title,starts_at,ends_at,response_deadline,location,court_name,capacity,note,status,deleted_at,deleted_by')
      .order('starts_at', { ascending: true });
    if (error) throw error;
    return data as AdminEvent[];
  },

  async upsertEvent(values: EventFormValues, eventId?: string): Promise<void> {
    if (!appEnv.isSupabaseConfigured) {
      demoStore.upsertEvent(values, eventId);
      return;
    }

    const client = assertSupabase();
    const payload = {
      title: values.title,
      starts_at: values.starts_at,
      ends_at: values.ends_at,
      response_deadline: values.response_deadline || null,
      location: values.location,
      court_name: values.court_name || null,
      capacity: values.capacity,
      note: values.note || null,
      status: values.status,
    };

    const result = eventId
      ? await client.from('events').update(payload).eq('id', eventId)
      : await client.from('events').insert(payload);

    if (result.error) throw result.error;
  },

  async deleteEvent(eventId: string): Promise<void> {
    if (!appEnv.isSupabaseConfigured) {
      demoStore.deleteEvent(eventId);
      return;
    }

    const client = assertSupabase();
    const { error } = await client.rpc('delete_event', { p_event_id: eventId });
    if (error) throw error;
  },

  async listMembers(): Promise<Member[]> {
    if (!appEnv.isSupabaseConfigured) return demoStore.listMembers();

    const client = assertSupabase();
    const { data, error } = await client
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Member[];
  },

  async updateMemberProfile(memberId: string, name: string, affiliation: string | null): Promise<void> {
    if (!appEnv.isSupabaseConfigured) {
      demoStore.updateMemberProfile(memberId, name, affiliation);
      return;
    }

    const client = assertSupabase();
    const { error } = await client
      .from('members')
      .update({
        name: name.trim(),
        affiliation: affiliation?.trim() || null,
      })
      .eq('id', memberId);
    if (error) throw error;
  },

  async updateMemberStatus(memberId: string, status: MemberStatus): Promise<void> {
    if (!appEnv.isSupabaseConfigured) {
      demoStore.updateMemberStatus(memberId, status);
      return;
    }

    const client = assertSupabase();
    const { error } = await client.from('members').update({ status }).eq('id', memberId);
    if (error) throw error;
  },

  async inviteMember(email: string, name: string, role: MemberRole): Promise<InviteResult> {
    if (!appEnv.isSupabaseConfigured) {
      demoStore.inviteMember(email, name, role);
      return {
        email_status: 'skipped',
        message: 'デモ環境のため招待メールは送信されません。メンバーはデモデータへ追加しました。',
      };
    }

    const client = assertSupabase();
    const { error } = await client.from('members').upsert(
      {
      email,
      name,
      affiliation: null,
      role,
      status: 'invited',
      },
      { onConflict: 'email' },
    );
    if (error) throw error;

    if (!appEnv.inviteEmailEnabled) {
      return {
        email_status: 'skipped',
        message: 'メール送信は未設定です。VITE_INVITE_EMAIL_ENABLED=true と Supabase Edge Function を設定すると招待メールを送信できます。',
      };
    }

    const redirectTo = `${window.location.origin}${import.meta.env.VITE_APP_BASE_PATH || '/'}login`;
    const { error: functionError } = await client.functions.invoke('send-invitation', {
      body: { email, name, role, redirectTo },
    });
    if (functionError) throw functionError;

    return {
      email_status: 'sent',
      message: `${email} に招待メールを送信しました。`,
    };
  },
};
