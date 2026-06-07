import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type InviteRequest = {
  email?: string;
  name?: string;
  role?: 'member' | 'admin';
  redirectTo?: string;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Supabase Edge Function environment variables are not configured.');
    }

    const authorization = request.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'ログインが必要です。' }, 401);
    }

    const { data: adminMember, error: adminError } = await adminClient
      .from('members')
      .select('id, role, status')
      .eq('auth_user_id', user.id)
      .single();
    if (adminError || adminMember?.role !== 'admin' || adminMember?.status !== 'active') {
      return json({ error: '管理者のみ招待メールを送信できます。' }, 403);
    }

    const body = (await request.json()) as InviteRequest;
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const role = body.role ?? 'member';

    if (!email || !name) {
      return json({ error: 'メールアドレスと表示名が必要です。' }, 400);
    }

    await adminClient.from('members').upsert(
      {
        email,
        name,
        role,
        status: 'invited',
      },
      { onConflict: 'email' },
    );

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: body.redirectTo,
      data: { name, role },
    });

    if (inviteError) {
      throw inviteError;
    }

    return json({ status: 'sent' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '招待メール送信に失敗しました。';
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
