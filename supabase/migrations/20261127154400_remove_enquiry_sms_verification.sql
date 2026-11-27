drop policy if exists "Users can create enquiries for existing plans" on public.enquiries;
create policy "Users can create enquiries for existing plans"
  on public.enquiries for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.fd_plans
      where id = plan_id and bank_id = enquiries.bank_id
    )
    and aadhaar_path like (select auth.uid())::text || '/' || id::text || '/%'
  );

drop function if exists public.current_user_has_verified_phone(text);
