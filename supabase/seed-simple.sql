-- SPNB DIGITAL - Simple Seed Data
-- Jalankan di Supabase SQL Editor

-- Step 1: Disable trigger sementara
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Buat users di auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES 
  (
    'a1111111-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin@spnb.id',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"phone_e164": "+6281234567890", "display_name": "Admin SPNB"}'::jsonb,
    false,
    'authenticated',
    'authenticated'
  ),
  (
    'b2222222-2222-2222-2222-222222222222'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'reseller@spnb.id',
    crypt('Reseller123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"phone_e164": "+6281234567891", "display_name": "Reseller Bandung"}'::jsonb,
    false,
    'authenticated',
    'authenticated'
  ),
  (
    'c3333333-3333-3333-3333-333333333333'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'owner@spnb.id',
    crypt('Owner123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"phone_e164": "+6281234567892", "display_name": "Budi Santoso"}'::jsonb,
    false,
    'authenticated',
    'authenticated'
  );

-- Step 3: Buat identities
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES 
  (
    gen_random_uuid(),
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'admin@spnb.id',
    '{"sub": "a1111111-1111-1111-1111-111111111111", "email": "admin@spnb.id"}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'b2222222-2222-2222-2222-222222222222'::uuid,
    'reseller@spnb.id',
    '{"sub": "b2222222-2222-2222-2222-222222222222", "email": "reseller@spnb.id"}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'c3333333-3333-3333-3333-333333333333'::uuid,
    'owner@spnb.id',
    '{"sub": "c3333333-3333-3333-3333-333333333333", "email": "owner@spnb.id"}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

-- Step 4: Buat accounts
INSERT INTO public.accounts (user_id, phone_e164, display_name, status)
VALUES 
  ('a1111111-1111-1111-1111-111111111111'::uuid, '+6281234567890', 'Admin SPNB', 'active'),
  ('b2222222-2222-2222-2222-222222222222'::uuid, '+6281234567891', 'Reseller Bandung', 'active'),
  ('c3333333-3333-3333-3333-333333333333'::uuid, '+6281234567892', 'Budi Santoso', 'active');

-- Step 5: Assign roles
INSERT INTO public.account_roles (user_id, role)
VALUES 
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'admin'),
  ('b2222222-2222-2222-2222-222222222222'::uuid, 'reseller'),
  ('c3333333-3333-3333-3333-333333333333'::uuid, 'owner');

-- Step 6: Buat reseller
INSERT INTO public.resellers (id, name, phone_e164, city, status, created_by)
VALUES (
  'd4444444-4444-4444-4444-444444444444'::uuid,
  'Reseller Bandung', 
  '+6281234567891', 
  'Bandung', 
  'active', 
  'a1111111-1111-1111-1111-111111111111'::uuid
);

-- Step 7: Link reseller member
INSERT INTO public.reseller_members (reseller_id, user_id)
VALUES ('d4444444-4444-4444-4444-444444444444'::uuid, 'b2222222-2222-2222-2222-222222222222'::uuid);

-- Step 8: Buat business
INSERT INTO public.businesses (id, owner_id, name, description, google_review_url, whatsapp_e164, address, theme_color)
VALUES (
  'e5555555-5555-5555-5555-555555555555'::uuid,
  'c3333333-3333-3333-3333-333333333333'::uuid,
  'Kopi Nusantara',
  'Kopi lokal pilihan dan tempat berkumpul yang nyaman. Buka setiap hari pukul 08.00–22.00.',
  'https://g.page/r/CExample/review',
  '+6281234567892',
  'Jl. Merdeka No. 24, Bandung',
  '#1769c2'
);

-- Step 9: Buat slug
INSERT INTO public.business_slugs (slug, business_id, is_current)
VALUES ('kopi-nusantara', 'e5555555-5555-5555-5555-555555555555'::uuid, true);

-- Step 10: Buat batch
INSERT INTO public.card_batches (id, batch_code, serial_prefix, starting_number, quantity, status, created_by)
VALUES (
  'f6666666-6666-6666-6666-666666666666'::uuid,
  'BTH-0001', 
  'KRT', 
  1, 
  10, 
  'ready', 
  'a1111111-1111-1111-1111-111111111111'::uuid
);

-- Step 11: Buat cards (tanpa check provisioning)
INSERT INTO public.cards (id, serial, batch_id, lifecycle_state, service_state, provisioning_state, assigned_reseller_id, owner_id, business_id, destination_mode, claimed_at)
VALUES 
  ('11111111-0001-0001-0001-000000000001'::uuid, 'KRT-000001', 'f6666666-6666-6666-6666-666666666666'::uuid, 'claimed', 'enabled', 'ready', 'd4444444-4444-4444-4444-444444444444'::uuid, 'c3333333-3333-3333-3333-333333333333'::uuid, 'e5555555-5555-5555-5555-555555555555'::uuid, 'direct_google', NOW()),
  ('11111111-0001-0001-0001-000000000002'::uuid, 'KRT-000002', 'f6666666-6666-6666-6666-666666666666'::uuid, 'claimed', 'enabled', 'ready', 'd4444444-4444-4444-4444-444444444444'::uuid, 'c3333333-3333-3333-3333-333333333333'::uuid, 'e5555555-5555-5555-5555-555555555555'::uuid, 'profile', NOW());

INSERT INTO public.cards (id, serial, batch_id, lifecycle_state, service_state, provisioning_state, assigned_reseller_id, destination_mode)
VALUES 
  ('11111111-0001-0001-0001-000000000003'::uuid, 'KRT-000003', 'f6666666-6666-6666-6666-666666666666'::uuid, 'sold_unclaimed', 'enabled', 'ready', 'd4444444-4444-4444-4444-444444444444'::uuid, 'direct_google'),
  ('11111111-0001-0001-0001-000000000004'::uuid, 'KRT-000004', 'f6666666-6666-6666-6666-666666666666'::uuid, 'reseller_stock', 'enabled', 'ready', 'd4444444-4444-4444-4444-444444444444'::uuid, 'direct_google'),
  ('11111111-0001-0001-0001-000000000005'::uuid, 'KRT-000005', 'f6666666-6666-6666-6666-666666666666'::uuid, 'reseller_stock', 'enabled', 'ready', 'd4444444-4444-4444-4444-444444444444'::uuid, 'direct_google');

INSERT INTO public.cards (id, serial, batch_id, lifecycle_state, service_state, provisioning_state, destination_mode)
VALUES 
  ('11111111-0001-0001-0001-000000000006'::uuid, 'KRT-000006', 'f6666666-6666-6666-6666-666666666666'::uuid, 'admin_stock', 'enabled', 'ready', 'direct_google');

-- Step 12: Re-enable trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

-- Done!
SELECT 'Seed berhasil! Coba login dengan admin@spnb.id / Admin123!' AS status;
