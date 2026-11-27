import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getDefaultKey(variable: string) {
  const value = Deno.env.get(variable);
  if (!value) return undefined;
  const keys: Record<string, unknown> = JSON.parse(value);
  return typeof keys.default === 'string' ? keys.default : undefined;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed.' });

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return respond(401, { error: 'Authentication required.' });

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = getDefaultKey('SUPABASE_PUBLISHABLE_KEYS') ?? Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = getDefaultKey('SUPABASE_SECRET_KEYS') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return respond(500, { error: 'Server configuration is incomplete.' });

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return respond(401, { error: 'Invalid session.' });

  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileError) return respond(500, { error: 'Could not verify admin access.' });
  if (profile?.role !== 'admin') return respond(403, { error: 'Admin access required.' });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(400, { error: 'Invalid request body.' });
  }

  if (payload.action === 'create') {
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const code = typeof payload.code === 'string' ? payload.code.trim().toUpperCase() : '';
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const password = typeof payload.password === 'string' ? payload.password : '';
    if (!name || name.length > 120 || !/^[A-Z0-9-]{2,20}$/.test(code)
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return respond(400, { error: 'Enter a bank name, valid code and email, and a password of at least 8 characters.' });
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (createError || !created.user) {
      return respond(400, { error: createError?.message ?? 'Could not create bank login.' });
    }

    const { error: bankError } = await adminClient.from('banks').insert({
      owner_user_id: created.user.id,
      name,
      code,
    });
    if (bankError) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(created.user.id);
      if (cleanupError) {
        return respond(500, { error: `Bank registration failed and account cleanup failed: ${cleanupError.message}` });
      }
      return respond(400, { error: bankError.message });
    }

    const { error: roleError } = await adminClient
      .from('profiles')
      .update({ role: 'bank' })
      .eq('id', created.user.id);
    if (roleError) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(created.user.id);
      if (cleanupError) {
        return respond(500, { error: `Bank setup failed and account cleanup failed: ${cleanupError.message}` });
      }
      return respond(500, { error: roleError.message });
    }
    return respond(200, { message: 'Bank registered.' });
  }

  if (payload.action === 'delete') {
    const bankId = typeof payload.bankId === 'string' ? payload.bankId : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bankId)) {
      return respond(400, { error: 'Invalid bank id.' });
    }
    const { data: bank, error: bankError } = await adminClient
      .from('banks')
      .select('owner_user_id')
      .eq('id', bankId)
      .maybeSingle();
    if (bankError) return respond(500, { error: bankError.message });
    if (!bank) return respond(404, { error: 'Bank not found.' });

    const { data: enquiries, error: enquiriesError } = await adminClient
      .from('enquiries')
      .select('aadhaar_path')
      .eq('bank_id', bankId);
    if (enquiriesError) return respond(500, { error: enquiriesError.message });
    const paths = enquiries.map((enquiry) => enquiry.aadhaar_path);
    if (paths.length) {
      const { error: storageError } = await adminClient.storage.from('aadhaar-cards').remove(paths);
      if (storageError) return respond(500, { error: `Could not remove identity documents: ${storageError.message}` });
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(bank.owner_user_id);
    if (deleteError) return respond(500, { error: deleteError.message });
    return respond(200, { message: 'Bank deleted.' });
  }

  return respond(400, { error: 'Unsupported action.' });
});
