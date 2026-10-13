-- SPNB DIGITAL - Setup Users & Seed Data
-- Jalankan di SQL Editor: https://supabase.com/dashboard/project/qyegiszroksmbuphpgzx/sql/new

-- Step 1: Temporarily disable the trigger that requires phone
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Create users directly in auth.users
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
  aud,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES 
  (
    'a1111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'admin@spnb.id',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"phone_e164": "+6281234567890", "display_name": "Admin SPNB"}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'reseller@spnb.id',
    crypt('Reseller123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"phone_e164": "+6281234567891", "display_name": "Reseller Bandung"}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'owner@spnb.id',
    crypt('Owner123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"phone_e164": "+6281234567892", "display_name": "Budi Santoso"}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create identities for the users
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
    'a1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'admin@spnb.id',
    '{"sub": "a1111111-1111-1111-1111-111111111111", "email": "admin@spnb.id"}',
    'email',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    'b2222222-2222-2222-2222-222222222222',
    'reseller@spnb.id',
    '{"sub": "b2222222-2222-2222-2222-222222222222", "email": "reseller@spnb.id"}',
    'email',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'c3333333-3333-3333-3333-333333333333',
    'owner@spnb.id',
    '{"sub": "c3333333-3333-3333-3333-333333333333", "email": "owner@spnb.id"}',
    'email',
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create accounts in public schema
INSERT INTO public.accounts (user_id, phone_e164, display_name, status)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', '+6281234567890', 'Admin SPNB', 'active'),
  ('b2222222-2222-2222-2222-222222222222', '+6281234567891', 'Reseller Bandung', 'active'),
  ('c3333333-3333-3333-3333-333333333333', '+6281234567892', 'Budi Santoso', 'active')
ON CONFLICT (user_id) DO NOTHING;

-- Step 5: Assign roles
INSERT INTO public.account_roles (user_id, role)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'admin'),
  ('b2222222-2222-2222-2222-222222222222', 'reseller'),
  ('c3333333-3333-3333-3333-333333333333', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 6: Create reseller entity
INSERT INTO public.resellers (id, name, phone_e164, city, status, created_by)
VALUES (
  'd4444444-4444-4444-4444-444444444444',
  'Reseller Bandung', 
  '+6281234567891', 
  'Bandung', 
  'active', 
  'a1111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO NOTHING;

-- Step 7: Link reseller user to reseller entity
INSERT INTO public.reseller_members (reseller_id, user_id)
VALUES ('d4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222')
ON CONFLICT (reseller_id, user_id) DO NOTHING;

-- Step 8: Create business for owner
INSERT INTO public.businesses (id, owner_id, name, description, google_review_url, whatsapp_e164, address, theme_color)
VALUES (
  'e5555555-5555-5555-5555-555555555555',
  'c3333333-3333-3333-3333-333333333333',
  'Kopi Nusantara',
  'Kopi lokal pilihan dan tempat berkumpul yang nyaman. Buka setiap hari pukul 08.00–22.00.',
  'https://g.page/r/CExample/review',
  '+6281234567892',
  'Jl. Merdeka No. 24, Bandung',
  '#1769c2'
)
ON CONFLICT (id) DO NOTHING;

-- Step 9: Create slug for business
INSERT INTO public.business_slugs (slug, business_id, is_current)
VALUES ('kopi-nusantara', 'e5555555-5555-5555-5555-555555555555', true)
ON CONFLICT (slug) DO NOTHING;

-- Step 10: Create card batch
INSERT INTO public.card_batches (id, batch_code, serial_prefix, starting_number, quantity, status, created_by)
VALUES (
  'f6666666-6666-6666-6666-666666666666',
  'BTH-0001', 
  'KRT', 
  1, 
  10, 
  'ready', 
  'a1111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO NOTHING;

-- Step 11: Create demo cards with tokens
DO $$
DECLARE
  card_ids uuid[] := ARRAY[
    '11111111-0001-0001-0001-000000000001',
    '11111111-0001-0001-0001-000000000002',
    '11111111-0001-0001-0001-000000000003',
    '11111111-0001-0001-0001-000000000004',
    '11111111-0001-0001-0001-000000000005',
    '11111111-0001-0001-0001-000000000006'
  ];
BEGIN
  -- Card 1: Active, owned
  INSERT INTO public.cards (id, serial, batch_id, lifecycle_state, service_state, provisioning_state, assigned_reseller_id, owner_id, business_id, destination_mode, claimed_at)
  VALUES (card_ids[1], 'KRT-000001', 'f6666666-6666-6666-6666-666666666666', 'claimed', 'enabled', 'ready', 'd4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333', 'e5555555-5555-5555-5555-555555555555', 'direct_google', NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Card 2: Active, owned, profile mode
  INSERT INTO public.cards (id, serial, batch_id, lifecycle_state, service_state, provisioning_state, assigned_reseller_id, owner_id, business_id, destination_mode, claimed_at)
  VALUES (card_ids[2], 'KRT-000002', 'f6666666-6666-6666-6666-666666666666', 'claimed', 'enabled', 'ready', 'd4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333', 'e5555555-5555-5555-5555-555555555555', 'profile', NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Card 3: Sold but not claimed
  INSERT INTO public.cards (id, serial, batch_id, lifecycle_state, service_state, provisioning_state, assigned_reseller_id, destination_mode)
  VALUES (card_ids[3], 'KRT-000003', 'f6666666-6666-6666-6666-666666666666', 'sold_unclaimed', 'enabled', 'ready', 'd4444444-4444-4444-4444-444444444444', 'direct_google')
  ON CONFLICT (id) DO NOTHING;
  
  -- Card 4-5: Reseller stock
  INSERT INTO public.cards (id, serial, batch_id, lifecycle_state, service_state, provisioning_state, assigned_reseller_id, destination_mode)
  VALUES (card_ids[4], 'KRT-000004', 'f6666666-6666-6666-6666-666666666666', 'reseller_stock', 'enabled', 'ready', 'd4444444-4444-4444-4444-444444444444', 'direct_google')
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.cards (id, serial, batch_id, lifecycle_state, service_state, provisioning_state, assigned_reseller_id, destination_mode)
  VALUES (card_ids[5], 'KRT-000005', 'f6666666-6666-6666-6666-666666666666', 'reseller_stock', 'enabled', 'ready', 'd4444444-4444-4444-4444-444444444444', 'direct_google')
  ON CONFLICT (id) DO NOTHING;
  
  -- Card 6: Admin stock
  INSERT INTO public.cards (id, serial, batch_id, lifecycle_state, service_state, provisioning_state, destination_mode)
  VALUES (card_ids[6], 'KRT-000006', 'f6666666-6666-6666-6666-666666666666', 'admin_stock', 'enabled', 'ready', 'direct_google')
  ON CONFLICT (id) DO NOTHING;

  -- Create tokens for cards (using SHA256 of simple tokens for demo)
  INSERT INTO public.card_tokens (card_id, kind, token_hash)
  SELECT card_ids[1], 'qr', encode(extensions.digest('qr-token-001', 'sha256'), 'hex')
  WHERE NOT EXISTS (SELECT 1 FROM public.card_tokens WHERE card_id = card_ids[1] AND kind = 'qr');
  
  INSERT INTO public.card_tokens (card_id, kind, token_hash)
  SELECT card_ids[1], 'nfc', encode(extensions.digest('nfc-token-001', 'sha256'), 'hex')
  WHERE NOT EXISTS (SELECT 1 FROM public.card_tokens WHERE card_id = card_ids[1] AND kind = 'nfc');
  
END $$;

-- Step 12: Re-enable the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

-- Step 13: Add some demo interaction events
INSERT INTO public.interaction_events (event_type, card_id, business_id, token_kind, destination_mode)
VALUES 
  ('qr_scan', '11111111-0001-0001-0001-000000000001', 'e5555555-5555-5555-5555-555555555555', 'qr', 'direct_google'),
  ('nfc_tap', '11111111-0001-0001-0001-000000000001', 'e5555555-5555-5555-5555-555555555555', 'nfc', 'direct_google'),
  ('profile_view', '11111111-0001-0001-0001-000000000002', 'e5555555-5555-5555-5555-555555555555', 'qr', 'profile'),
  ('profile_link_click', '11111111-0001-0001-0001-000000000002', 'e5555555-5555-5555-5555-555555555555', 'qr', 'profile')
ON CONFLICT DO NOTHING;

-- Done!
SELECT 'Seed data created successfully!' AS result;

-- Verify data:
SELECT 'Users:' AS info, count(*) FROM auth.users;
SELECT 'Accounts:' AS info, count(*) FROM public.accounts;
SELECT 'Businesses:' AS info, count(*) FROM public.businesses;
SELECT 'Cards:' AS info, count(*) FROM public.cards;
