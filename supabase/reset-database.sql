-- SPNB DIGITAL - Reset Database Script
-- PERINGATAN: Ini akan menghapus SEMUA data!
-- Jalankan di Supabase SQL Editor

-- Step 1: Drop semua triggers dulu
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS accounts_updated_at ON public.accounts;
DROP TRIGGER IF EXISTS resellers_updated_at ON public.resellers;
DROP TRIGGER IF EXISTS businesses_updated_at ON public.businesses;
DROP TRIGGER IF EXISTS profile_links_updated_at ON public.profile_links;
DROP TRIGGER IF EXISTS batches_updated_at ON public.card_batches;
DROP TRIGGER IF EXISTS cards_updated_at ON public.cards;
DROP TRIGGER IF EXISTS validate_card_provisioning_before_update ON public.cards;

-- Step 2: Drop semua policies
DROP POLICY IF EXISTS accounts_read_self_or_admin ON public.accounts;
DROP POLICY IF EXISTS accounts_update_self ON public.accounts;
DROP POLICY IF EXISTS roles_read_self_or_admin ON public.account_roles;
DROP POLICY IF EXISTS resellers_read_member_or_admin ON public.resellers;
DROP POLICY IF EXISTS reseller_members_read_self_or_admin ON public.reseller_members;
DROP POLICY IF EXISTS businesses_owner_all ON public.businesses;
DROP POLICY IF EXISTS businesses_public_read ON public.businesses;
DROP POLICY IF EXISTS slugs_owner_or_admin ON public.business_slugs;
DROP POLICY IF EXISTS slugs_public_read ON public.business_slugs;
DROP POLICY IF EXISTS links_owner_all ON public.profile_links;
DROP POLICY IF EXISTS links_public_read ON public.profile_links;
DROP POLICY IF EXISTS cards_owner_or_admin_read ON public.cards;
DROP POLICY IF EXISTS batches_admin_read ON public.card_batches;
DROP POLICY IF EXISTS tokens_admin_read ON public.card_tokens;
DROP POLICY IF EXISTS transfers_admin_read ON public.stock_transfers;
DROP POLICY IF EXISTS transfer_items_admin_read ON public.stock_transfer_items;
DROP POLICY IF EXISTS sales_admin_read ON public.card_sales;
DROP POLICY IF EXISTS claims_owner_or_admin_read ON public.card_claims;
DROP POLICY IF EXISTS events_owner_or_admin_read ON public.interaction_events;
DROP POLICY IF EXISTS events_insert_anon ON public.interaction_events;
DROP POLICY IF EXISTS audit_admin_read ON public.audit_log;

-- Step 3: Drop storage policies
DROP POLICY IF EXISTS "Users can upload own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for assets" ON storage.objects;

-- Step 4: Drop functions
DROP FUNCTION IF EXISTS public.get_my_reseller_inventory();
DROP FUNCTION IF EXISTS public.allocate_cards_to_reseller(uuid[], uuid, uuid, text);
DROP FUNCTION IF EXISTS public.mark_card_sold(uuid, uuid);
DROP FUNCTION IF EXISTS public.reverse_unclaimed_sale(uuid, text);
DROP FUNCTION IF EXISTS public.claim_sold_card(text, uuid, text);
DROP FUNCTION IF EXISTS public.configure_owned_card(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.change_business_slug(uuid, text);
DROP FUNCTION IF EXISTS public.get_business_by_slug(text);
DROP FUNCTION IF EXISTS public.get_profile_links(uuid);
DROP FUNCTION IF EXISTS public.record_interaction(text, uuid, uuid, uuid, text, text, text, text);
DROP FUNCTION IF EXISTS private.set_updated_at();
DROP FUNCTION IF EXISTS private.validate_card_provisioning();
DROP FUNCTION IF EXISTS private.handle_new_auth_user();
DROP FUNCTION IF EXISTS private.has_role(text);
DROP FUNCTION IF EXISTS private.is_reseller_member(uuid);

-- Step 5: Drop semua tabel public (urutan penting karena foreign keys)
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.interaction_events CASCADE;
DROP TABLE IF EXISTS public.card_claims CASCADE;
DROP TABLE IF EXISTS public.card_sales CASCADE;
DROP TABLE IF EXISTS public.stock_transfer_items CASCADE;
DROP TABLE IF EXISTS public.stock_transfers CASCADE;
DROP TABLE IF EXISTS public.card_tokens CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.card_batches CASCADE;
DROP TABLE IF EXISTS public.profile_links CASCADE;
DROP TABLE IF EXISTS public.business_slugs CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;
DROP TABLE IF EXISTS public.reseller_members CASCADE;
DROP TABLE IF EXISTS public.resellers CASCADE;
DROP TABLE IF EXISTS public.account_roles CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;

-- Step 6: Drop private tables
DROP TABLE IF EXISTS private.password_reset_requests CASCADE;
DROP TABLE IF EXISTS private.claim_sessions CASCADE;

-- Step 7: Drop private schema dan buat ulang
DROP SCHEMA IF EXISTS private CASCADE;

-- Step 8: Hapus demo users dari auth (jika ada)
DELETE FROM auth.identities WHERE user_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333'
);
DELETE FROM auth.users WHERE id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333'
);

-- Step 9: Hapus storage bucket
DELETE FROM storage.objects WHERE bucket_id = 'business-assets';
DELETE FROM storage.buckets WHERE id = 'business-assets';

-- Done!
SELECT 'Database berhasil di-reset! Sekarang jalankan migration files.' AS status;
