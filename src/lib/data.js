import { requireSupabase } from './supabase';

export const emptyDb = { banks: [], plans: [], users: [], enq: [], adReq: [] };

function throwOnError(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function throwFunctionError(error) {
  const response = error.context;
  if (response instanceof Response) {
    const text = await response.clone().text();
    if (text) {
      let body;
      try {
        body = JSON.parse(text);
      } catch (parseError) {
        if (parseError instanceof SyntaxError) throw new Error(text);
        throw parseError;
      }
      if (typeof body?.error === 'string') throw new Error(body.error);
      if (typeof body?.message === 'string') throw new Error(body.message);
    }
  }
  throw error;
}

export async function getSessionContext(user) {
  const client = requireSupabase();
  const profile = throwOnError(
    await client.from('profiles').select('id, role, full_name').eq('id', user.id).single()
  );
  const session = {
    role: profile.role,
    userId: user.id,
    name: profile.full_name || user.user_metadata?.full_name || user.email,
    email: user.email,
  };
  if (profile.role === 'bank') {
    const bank = throwOnError(
      await client.from('banks').select('id').eq('owner_user_id', user.id).single()
    );
    session.bankId = bank.id;
  }
  return session;
}

export async function loadDb(role) {
  const client = requireSupabase();
  const results = await Promise.all([
    client.from('banks').select('id, name, code, owner_user_id').order('name'),
    client.from('fd_plans').select('id, bank_id, name, rate, tenure_months, min_deposit, status').order('created_at', { ascending: false }),
    client.from('ad_requests').select('id, bank_id, fd_plan_id, headline, budget, duration_days, message, status, created_at').order('created_at', { ascending: false }),
    client.from('enquiries').select('id, plan_id, bank_id, user_id, full_name, phone, amount, aadhaar_path, created_at').order('created_at', { ascending: false }),
  ]);
  const [banks, plans, ads, enquiries] = results.map(throwOnError);

  let bankEmails = new Map();
  if (role === 'admin') {
    const profiles = throwOnError(
      await client.from('profiles').select('id, email').eq('role', 'bank')
    );
    bankEmails = new Map(profiles.map((profile) => [profile.id, profile.email]));
  }

  return {
    banks: banks.map((bank) => ({
      id: bank.id,
      name: bank.name,
      code: bank.code,
      email: bankEmails.get(bank.owner_user_id) || '',
    })),
    plans: plans.map((plan) => ({
      id: plan.id,
      bankId: plan.bank_id,
      name: plan.name,
      rate: Number(plan.rate),
      tenure: plan.tenure_months,
      min: Number(plan.min_deposit),
      status: plan.status,
    })),
    users: [],
    adReq: ads.map((ad) => ({
      id: ad.id,
      bankId: ad.bank_id,
      planId: ad.fd_plan_id,
      headline: ad.headline,
      budget: Number(ad.budget),
      days: ad.duration_days,
      message: ad.message,
      status: ad.status,
      date: new Date(ad.created_at).toLocaleDateString('en-IN'),
    })),
    enq: enquiries.map((enquiry) => ({
      id: enquiry.id,
      planId: enquiry.plan_id,
      bankId: enquiry.bank_id,
      userId: enquiry.user_id,
      name: enquiry.full_name,
      phone: enquiry.phone,
      amount: Number(enquiry.amount),
      aadhaarPath: enquiry.aadhaar_path,
      date: new Date(enquiry.created_at).toLocaleDateString('en-IN'),
    })),
  };
}

export async function registerBank(bank) {
  const client = requireSupabase();
  const result = await client.functions.invoke('admin-manage-bank', {
    body: {
      action: 'create',
      name: bank.name.trim(),
      code: bank.code.trim().toUpperCase(),
      email: bank.email.trim().toLowerCase(),
      password: bank.pass,
    },
  });
  if (result.error) await throwFunctionError(result.error);
}

export async function deleteBank(bankId) {
  const client = requireSupabase();
  const result = await client.functions.invoke('admin-manage-bank', {
    body: { action: 'delete', bankId },
  });
  if (result.error) await throwFunctionError(result.error);
}

export async function createPlan(bankId, plan) {
  const client = requireSupabase();
  throwOnError(await client.from('fd_plans').insert({
    bank_id: bankId,
    name: plan.name.trim(),
    rate: Number(plan.rate),
    tenure_months: Number(plan.tenure),
    min_deposit: Number(plan.min),
    status: 'pending',
  }));
}

export async function deletePlan(planId) {
  const client = requireSupabase();
  throwOnError(await client.from('fd_plans').delete().eq('id', planId));
}

export async function setPlanStatus(planId, status) {
  if (status !== 'approved' && status !== 'rejected') {
    throw new Error('Invalid FD plan decision.');
  }
  const client = requireSupabase();
  throwOnError(
    await client.from('fd_plans').update({ status }).eq('id', planId).select('id').single()
  );
}

export async function createAdRequest(bankId, request) {
  const client = requireSupabase();
  throwOnError(await client.from('ad_requests').insert({
    bank_id: bankId,
    fd_plan_id: request.planId,
    headline: request.headline.trim(),
    budget: Number(request.budget),
    duration_days: Number(request.days),
    message: request.message.trim(),
  }));
}

export async function setAdStatus(requestId, status) {
  const client = requireSupabase();
  throwOnError(await client.from('ad_requests').update({ status }).eq('id', requestId));
}

export async function createEnquiry(enquiry, userId) {
  const client = requireSupabase();
  const id = crypto.randomUUID();
  const file = enquiry.file;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${id}/${safeName}`;

  const upload = await client.storage.from('aadhaar-cards').upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (upload.error) throw upload.error;

  const insert = await client.from('enquiries').insert({
    id,
    plan_id: enquiry.planId,
    bank_id: enquiry.bankId,
    user_id: userId,
    full_name: enquiry.name.trim(),
    phone: `+91${enquiry.phone}`,
    amount: Number(enquiry.amount),
    aadhaar_path: path,
  });
  if (insert.error) {
    const cleanup = await client.storage.from('aadhaar-cards').remove([path]);
    if (cleanup.error) {
      throw new Error(`${insert.error.message}; uploaded document cleanup failed: ${cleanup.error.message}`);
    }
    throw insert.error;
  }
}

export async function deleteEnquiry(enquiry) {
  const client = requireSupabase();
  const storageResult = await client.storage.from('aadhaar-cards').remove([enquiry.aadhaarPath]);
  if (storageResult.error) throw storageResult.error;

  const deleteResult = await client
    .from('enquiries')
    .delete()
    .eq('id', enquiry.id)
    .select('id')
    .single();
  if (deleteResult.error) {
    throw new Error(`Identity document was removed, but the enquiry could not be deleted: ${deleteResult.error.message}`);
  }
}

export async function openEnquiryDocument(path) {
  const client = requireSupabase();
  const documentWindow = window.open('about:blank', '_blank');
  if (!documentWindow) throw new Error('Allow pop-ups to view the private document.');
  documentWindow.opener = null;
  try {
    const result = await client.storage.from('aadhaar-cards').createSignedUrl(path, 60);
    if (result.error) throw result.error;
    documentWindow.location.href = result.data.signedUrl;
  } catch (error) {
    documentWindow.close();
    throw error;
  }
}
