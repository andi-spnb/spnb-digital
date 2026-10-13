-- SPNB DIGITAL - Seed Data untuk Demo
-- Jalankan di Supabase SQL Editor setelah migration

-- 1. Buat user admin di auth.users (gunakan Supabase Dashboard > Authentication > Users > Add User)
-- Email: admin@spnb.id, Password: Admin123!

-- 2. Setelah user dibuat, jalankan query berikut untuk setup roles dan data demo:

-- Catatan: Ganti UUID di bawah dengan UUID user yang dibuat dari dashboard

-- ============================================================
-- PENTING: Buat user terlebih dahulu di Authentication > Users
-- dengan data berikut:
-- 
-- Admin:    admin@spnb.id     / Admin123!
-- Reseller: reseller@spnb.id  / Reseller123!  
-- Owner:    owner@spnb.id     / Owner123!
--
-- Setelah itu, copy UUID masing-masing user dan ganti di bawah
-- ============================================================

-- Uncomment dan jalankan setelah mengganti UUID:

/*
-- Set UUID dari user yang dibuat (ganti dengan UUID asli)
DO $$
DECLARE
  admin_uid uuid := 'GANTI_DENGAN_UUID_ADMIN';
  reseller_uid uuid := 'GANTI_DENGAN_UUID_RESELLER';
  owner_uid uuid := 'GANTI_DENGAN_UUID_OWNER';
  reseller_id uuid;
  business_id uuid;
  card_id uuid;
BEGIN
  -- Insert accounts
  INSERT INTO public.accounts (user_id, phone_e164, display_name, status)
  VALUES 
    (admin_uid, '+6281234567890', 'Admin SPNB', 'active'),
    (reseller_uid, '+6281234567891', 'Reseller Bandung', 'active'),
    (owner_uid, '+6281234567892', 'Budi Santoso', 'active');

  -- Insert roles
  INSERT INTO public.account_roles (user_id, role)
  VALUES 
    (admin_uid, 'admin'),
    (reseller_uid, 'reseller'),
    (owner_uid, 'owner');

  -- Create reseller entity
  INSERT INTO public.resellers (name, phone_e164, city, status, created_by)
  VALUES ('Reseller Bandung', '+6281234567891', 'Bandung', 'active', admin_uid)
  RETURNING id INTO reseller_id;

  -- Link reseller user to reseller entity
  INSERT INTO public.reseller_members (reseller_id, user_id)
  VALUES (reseller_id, reseller_uid);

  -- Create business for owner
  INSERT INTO public.businesses (owner_id, name, description, google_review_url, whatsapp_e164, address, theme_color)
  VALUES (
    owner_uid,
    'Kopi Nusantara',
    'Kopi lokal pilihan dan tempat berkumpul yang nyaman. Buka setiap hari pukul 08.00–22.00.',
    'https://g.page/r/CExample/review',
    '+6281234567892',
    'Jl. Merdeka No. 24, Bandung',
    '#1769c2'
  )
  RETURNING id INTO business_id;

  -- Create slug for business
  INSERT INTO public.business_slugs (slug, business_id, is_current)
  VALUES ('kopi-nusantara', business_id, true);

  -- Create card batch
  INSERT INTO public.card_batches (batch_code, serial_prefix, starting_number, quantity, status, created_by)
  VALUES ('BTH-0001', 'KRT', 1, 10, 'ready', admin_uid);

  -- Create some demo cards
  INSERT INTO public.cards (serial, lifecycle_state, service_state, provisioning_state, assigned_reseller_id, owner_id, business_id, destination_mode)
  VALUES 
    ('KRT-000001', 'claimed', 'enabled', 'ready', reseller_id, owner_uid, business_id, 'direct_google'),
    ('KRT-000002', 'claimed', 'enabled', 'ready', reseller_id, owner_uid, business_id, 'profile'),
    ('KRT-000003', 'sold_unclaimed', 'enabled', 'ready', reseller_id, NULL, NULL, 'direct_google'),
    ('KRT-000004', 'reseller_stock', 'enabled', 'ready', reseller_id, NULL, NULL, 'direct_google'),
    ('KRT-000005', 'reseller_stock', 'enabled', 'ready', reseller_id, NULL, NULL, 'direct_google'),
    ('KRT-000006', 'admin_stock', 'enabled', 'ready', NULL, NULL, NULL, 'direct_google');

  RAISE NOTICE 'Seed data created successfully!';
END $$;
*/

-- ============================================================
-- Query untuk melihat data yang sudah dibuat:
-- ============================================================

-- SELECT * FROM public.accounts;
-- SELECT * FROM public.account_roles;
-- SELECT * FROM public.resellers;
-- SELECT * FROM public.businesses;
-- SELECT * FROM public.cards;
