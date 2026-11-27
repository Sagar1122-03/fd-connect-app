create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'user' check (role in ('user', 'bank', 'admin')),
  created_at timestamptz not null default now()
);

create table public.banks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.fd_plans (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.banks (id) on delete cascade,
  name text not null,
  rate numeric(6, 3) not null check (rate > 0 and rate <= 100),
  tenure_months integer not null check (tenure_months > 0),
  min_deposit numeric(14, 2) not null check (min_deposit > 0),
  created_at timestamptz not null default now()
);

create table public.ad_requests (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.banks (id) on delete cascade,
  fd_plan_id uuid not null references public.fd_plans (id) on delete cascade,
  headline text not null,
  budget numeric(14, 2) not null check (budget > 0),
  duration_days integer not null check (duration_days > 0),
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.fd_plans (id) on delete set null,
  bank_id uuid not null references public.banks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null,
  amount numeric(14, 2) not null check (amount > 0),
  aadhaar_path text not null,
  created_at timestamptz not null default now()
);

create index fd_plans_bank_id_idx on public.fd_plans (bank_id);
create index ad_requests_bank_id_idx on public.ad_requests (bank_id);
create index enquiries_bank_id_idx on public.enquiries (bank_id);
create index enquiries_user_id_idx on public.enquiries (user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, full_name)
select
  id,
  coalesce(email, ''),
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', '')
from auth.users
on conflict (id) do nothing;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.current_user_has_verified_phone(requested_phone text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid())
      and phone = requested_phone
      and phone_confirmed_at is not null
  );
$$;

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select on public.banks to authenticated;
grant select, insert, update, delete on public.fd_plans to authenticated;
grant select, insert, update on public.ad_requests to authenticated;
grant select, insert on public.enquiries to authenticated;
revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;
revoke all on function public.current_user_has_verified_phone(text) from public;
grant execute on function public.current_user_has_verified_phone(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.banks enable row level security;
alter table public.fd_plans enable row level security;
alter table public.ad_requests enable row level security;
alter table public.enquiries enable row level security;

create policy "Profiles are visible to their owner and admins"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.current_user_is_admin()));

create policy "Authenticated users can view banks"
  on public.banks for select to authenticated
  using (true);

create policy "Authenticated users can view FD plans"
  on public.fd_plans for select to authenticated
  using (true);

create policy "Bank owners and admins can add FD plans"
  on public.fd_plans for insert to authenticated
  with check (
    (select public.current_user_is_admin())
    or exists (
      select 1 from public.banks
      where id = bank_id and owner_user_id = (select auth.uid())
    )
  );

create policy "Bank owners and admins can update FD plans"
  on public.fd_plans for update to authenticated
  using (
    (select public.current_user_is_admin())
    or exists (
      select 1 from public.banks
      where id = bank_id and owner_user_id = (select auth.uid())
    )
  )
  with check (
    (select public.current_user_is_admin())
    or exists (
      select 1 from public.banks
      where id = bank_id and owner_user_id = (select auth.uid())
    )
  );

create policy "Bank owners and admins can delete FD plans"
  on public.fd_plans for delete to authenticated
  using (
    (select public.current_user_is_admin())
    or exists (
      select 1 from public.banks
      where id = bank_id and owner_user_id = (select auth.uid())
    )
  );

create policy "Users see approved ads, their own ads, and admins see all"
  on public.ad_requests for select to authenticated
  using (
    status = 'approved'
    or (select public.current_user_is_admin())
    or exists (
      select 1 from public.banks
      where id = bank_id and owner_user_id = (select auth.uid())
    )
  );

create policy "Bank owners can request ads for their plans"
  on public.ad_requests for insert to authenticated
  with check (
    exists (
      select 1 from public.banks
      where id = bank_id and owner_user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.fd_plans
      where id = fd_plan_id and bank_id = ad_requests.bank_id
    )
  );

create policy "Admins can review ad requests"
  on public.ad_requests for update to authenticated
  using ((select public.current_user_is_admin()))
  with check ((select public.current_user_is_admin()));

create policy "Users, their bank, and admins can view enquiries"
  on public.enquiries for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.current_user_is_admin())
    or exists (
      select 1 from public.banks
      where id = bank_id and owner_user_id = (select auth.uid())
    )
  );

create policy "Users can create enquiries for existing plans"
  on public.enquiries for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.fd_plans
      where id = plan_id and bank_id = enquiries.bank_id
    )
    and (select public.current_user_has_verified_phone(phone))
    and aadhaar_path like (select auth.uid())::text || '/' || id::text || '/%'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aadhaar-cards', 'aadhaar-cards', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf'];

create policy "Users upload their own identity document"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'aadhaar-cards'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users, their bank, and admins can read identity documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'aadhaar-cards'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.current_user_is_admin())
      or exists (
        select 1
        from public.enquiries e
        join public.banks b on b.id = e.bank_id
        where e.aadhaar_path = name and b.owner_user_id = (select auth.uid())
      )
    )
  );

create policy "Users can remove their own identity document uploads"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'aadhaar-cards'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
