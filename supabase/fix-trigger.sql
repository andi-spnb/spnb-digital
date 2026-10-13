-- Fix: Update trigger untuk mendukung email-based signup
-- Jalankan di Supabase SQL Editor

-- Drop trigger lama
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Buat fungsi baru yang lebih fleksibel
CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_phone text;
  user_email text;
BEGIN
  -- Coba ambil phone dari berbagai sumber
  normalized_phone := COALESCE(
    new.phone,
    new.raw_user_meta_data ->> 'phone_e164',
    new.raw_user_meta_data ->> 'phone'
  );
  
  -- Jika tidak ada phone, generate dari email atau random
  IF normalized_phone IS NULL OR normalized_phone = '' THEN
    user_email := COALESCE(new.email, '');
    -- Generate placeholder phone dari user ID
    normalized_phone := '+62800' || SUBSTRING(new.id::text, 1, 10);
    normalized_phone := REGEXP_REPLACE(normalized_phone, '[^0-9+]', '', 'g');
    -- Pastikan format valid
    IF LENGTH(normalized_phone) < 10 THEN
      normalized_phone := '+6280000000000';
    END IF;
  END IF;
  
  -- Normalize phone jika belum ada +
  IF NOT normalized_phone LIKE '+%' THEN
    normalized_phone := '+' || normalized_phone;
  END IF;
  
  -- Validasi format (lebih permisif)
  IF normalized_phone !~ '^\+[0-9]{8,15}$' THEN
    normalized_phone := '+6280000000000';
  END IF;

  -- Insert ke accounts
  INSERT INTO public.accounts (user_id, phone_e164, display_name)
  VALUES (
    new.id, 
    normalized_phone, 
    COALESCE(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'name',
      SPLIT_PART(new.email, '@', 1),
      'User'
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Default role adalah owner
  INSERT INTO public.account_roles (user_id, role)
  VALUES (new.id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Phone sudah dipakai, generate unique
    INSERT INTO public.accounts (user_id, phone_e164, display_name)
    VALUES (
      new.id, 
      '+62' || FLOOR(RANDOM() * 9000000000 + 1000000000)::text,
      COALESCE(SPLIT_PART(new.email, '@', 1), 'User')
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.account_roles (user_id, role)
    VALUES (new.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN new;
  WHEN OTHERS THEN
    -- Log error tapi jangan gagalkan signup
    RAISE WARNING 'Error in handle_new_auth_user: %', SQLERRM;
    RETURN new;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

-- Verifikasi
SELECT 'Trigger updated successfully!' as status;
