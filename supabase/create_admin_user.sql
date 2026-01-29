-- Create admin user directly in auth schema (bypasses Auth API issues)
do $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  -- Insert into auth.users
  insert into auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  ) values (
    v_user_id,
    'admin@monresto.com',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  on conflict do nothing;

  -- Insert identity (required by GoTrue)
  insert into auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    u.id,
    'email',
    u.email,
    jsonb_build_object('sub', u.id, 'email', u.email),
    now(),
    now(),
    now()
  from auth.users u
  where u.email = 'admin@monresto.com'
  on conflict do nothing;

  -- Ensure profile with admin role
  insert into public.profiles (id, full_name, role, language, active)
  select u.id, 'Admin', 'admin', 'fr', true
  from auth.users u
  where u.email = 'admin@monresto.com'
  on conflict (id) do update set role = excluded.role;
end $$;
