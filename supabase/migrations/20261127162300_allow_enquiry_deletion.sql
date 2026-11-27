grant delete on public.enquiries to authenticated;

drop policy if exists "Users and their banks can delete enquiries" on public.enquiries;
create policy "Users and their banks can delete enquiries"
  on public.enquiries for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.banks
      where id = enquiries.bank_id and owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Bank owners can delete their enquiry documents" on storage.objects;
create policy "Bank owners can delete their enquiry documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'aadhaar-cards'
    and exists (
      select 1
      from public.enquiries e
      join public.banks b on b.id = e.bank_id
      where e.aadhaar_path = name
        and b.owner_user_id = (select auth.uid())
    )
  );
