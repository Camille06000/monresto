-- Fix or create admin user for MonResto app
-- Usage: run this script in Supabase SQL editor (same project as .env.local)

-- 1) Reset password + confirm email for the target user
update auth.users
set encrypted_password = crypt('Admin123!', gen_salt('bf')),
    email_confirmed_at = now()
where email = 'admin@monresto.com';

-- 2) Ensure the email identity exists
with u as (
  select id, email from auth.users where email = 'admin@monresto.com'
)
insert into auth.identities (
  id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), u.id, 'email', u.email,
       jsonb_build_object('sub', u.id, 'email', u.email),
       now(), now(), now()
from u
on conflict do nothing;

-- 3) Ensure profile exists and is admin
insert into public.profiles (id, full_name, role, language)
select u.id, 'Admin', 'admin', 'fr'
from auth.users u
where u.email = 'admin@monresto.com'
on conflict (id) do update set role = excluded.role;
