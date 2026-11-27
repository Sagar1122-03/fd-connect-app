# Supabase setup

The frontend uses the publishable key only. Never put a database password or
service-role key in a `VITE_*` variable or browser code.

1. Rotate the database password that was shared in chat. The app does not use a
   database password.
2. The local `.env.local` contains the project's URL and publishable key. It is
   ignored by Git. Copy `.env.example` for another environment and fill it with
   that project's values. Restart Vite after changing environment variables.
3. Apply every SQL file in `supabase/migrations/` in filename order in the
   Supabase SQL Editor. These migrations create the tables and row-level
   security policies, configure the private `aadhaar-cards` storage bucket,
   grant the bank-management function only the table permissions it needs, and
   add admin approval for bank-submitted FD plans and allow users or their
   bank to delete enquiries along with their uploaded document. Existing plans
   remain approved; new plans stay hidden from users until approved.
4. In Supabase Auth, enable email/password and Google providers. Configure the
   Google OAuth credentials and add the local and deployed app URLs to the
   allowed redirect URLs. Enquiries collect a contact number without SMS
   verification.
5. Create the single admin identity through user signup, confirm its email, and
   promote it in the SQL Editor (replace the address):

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'admin@example.com';
   ```

   Only promote the intended administrator account.
6. Deploy `supabase/functions/admin-manage-bank/index.ts` with the Supabase
   CLI (`supabase login`, `supabase link --project-ref yfehylhnbbvwjzrzxfeg`,
   then `supabase functions deploy admin-manage-bank`). Supabase supplies the
   function's `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, and
   `SUPABASE_SECRET_KEYS` environment values. The function uses each key
   dictionary's `default` entry and falls back to the deprecated legacy
   `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` values when necessary.
   Keep secret keys exclusively in Supabase; optionally set `CORS_ORIGIN` to
   the exact deployed frontend origin.
7. Restart the frontend and sign in. The admin can now create bank logins;
   bank users cannot self-register.
