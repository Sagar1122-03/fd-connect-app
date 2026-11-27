alter table public.fd_plans
  add column if not exists status text not null default 'approved';

alter table public.fd_plans
  alter column status set default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fd_plans_status_check'
      and conrelid = 'public.fd_plans'::regclass
  ) then
    alter table public.fd_plans
      add constraint fd_plans_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.fd_plans to authenticated;

drop policy if exists "Authenticated users can view FD plans" on public.fd_plans;
create policy "Users see approved plans, owners and admins see all"
  on public.fd_plans for select to authenticated
  using (
    status = 'approved'
    or (select public.current_user_is_admin())
    or exists (
      select 1 from public.banks
      where id = bank_id and owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Bank owners and admins can add FD plans" on public.fd_plans;
create policy "Bank owners submit pending FD plans"
  on public.fd_plans for insert to authenticated
  with check (
    (select public.current_user_is_admin())
    or (
      status = 'pending'
      and exists (
        select 1 from public.banks
        where id = bank_id and owner_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Bank owners and admins can update FD plans" on public.fd_plans;
create policy "Admins review FD plans and owners edit pending plans"
  on public.fd_plans for update to authenticated
  using (
    (select public.current_user_is_admin())
    or (
      status = 'pending'
      and exists (
        select 1 from public.banks
        where id = bank_id and owner_user_id = (select auth.uid())
      )
    )
  )
  with check (
    (select public.current_user_is_admin())
    or (
      status = 'pending'
      and exists (
        select 1 from public.banks
        where id = bank_id and owner_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Bank owners can request ads for their plans" on public.ad_requests;
create policy "Bank owners can request ads for approved plans"
  on public.ad_requests for insert to authenticated
  with check (
    exists (
      select 1 from public.banks
      where id = bank_id and owner_user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.fd_plans
      where id = fd_plan_id
        and bank_id = ad_requests.bank_id
        and status = 'approved'
    )
  );
