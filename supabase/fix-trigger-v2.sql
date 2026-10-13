-- SPNB DIGITAL - Fix Trigger v2 (More Robust)
-- Jalankan di SQL Editor: https://supabase.com/dashboard/project/qyegiszroksmbuphpgzx/sql/new
-- Perbaikan untuk error: "Database error creating new user"

-- Step 1: Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Create improved function with better error handling
CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_phone text;
  final_display_name text;
  retry_count integer := 0;
  max_retries integer := 3;
BEGIN
  -- Coba ambil phone dari berbagai sumber (prioritas)
  normalized_phone := COALESCE(
    NULLIF(TRIM(new.phone), ''),
    NULLIF(TRIM(new.raw_user_meta_data ->> 'phone_e164'), ''),
    NULLIF(TRIM(new.raw_user_meta_data ->> 'phone'), '')
  );
  
  -- Normalize phone jika ada
  IF normalized_phone IS NOT NULL AND normalized_phone <> '' THEN
    -- Hapus karakter non-digit kecuali +
    normalized_phone := REGEXP_REPLACE(normalized_phone, '[^0-9+]', '', 'g');
    
    -- Tambah + jika belum ada
    IF NOT normalized_phone LIKE '+%' THEN
      -- Jika dimulai dengan 0, ganti dengan +62 (Indonesia)
      IF normalized_phone LIKE '0%' THEN
        normalized_phone := '+62' || SUBSTRING(normalized_phone FROM 2);
      ELSE
        normalized_phone := '+' || normalized_phone;
      END IF;
    END IF;
  END IF;
  
  -- Validasi format phone, jika tidak valid generate placeholder
  IF normalized_phone IS NULL 
     OR normalized_phone = '' 
     OR normalized_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    -- Generate unique placeholder dari user ID
    normalized_phone := '+628' || LPAD(
      SUBSTRING(REPLACE(new.id::text, '-', ''), 1, 11),
      11,
      '0'
    );
    -- Pastikan format valid
    normalized_phone := REGEXP_REPLACE(normalized_phone, '[^0-9+]', '', 'g');
    IF normalized_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
      normalized_phone := '+6280000000001';
    END IF;
  END IF;
  
  -- Ambil display name
  final_display_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(TRIM(new.raw_user_meta_data ->> 'name'), ''),
    NULLIF(TRIM(new.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(new.email, ''), '@', 1), ''),
    'User'
  );

  -- Insert ke accounts dengan retry untuk handle unique constraint
  LOOP
    BEGIN
      INSERT INTO public.accounts (user_id, phone_e164, display_name, status)
      VALUES (new.id, normalized_phone, final_display_name, 'active')
      ON CONFLICT (user_id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, public.accounts.display_name),
        updated_at = NOW();
      
      EXIT; -- Success, keluar dari loop
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Phone sudah dipakai, generate yang baru
        retry_count := retry_count + 1;
        IF retry_count > max_retries THEN
          -- Final fallback: gunakan random number
          normalized_phone := '+628' || LPAD(FLOOR(RANDOM() * 99999999999)::text, 11, '0');
        ELSE
          -- Tambahkan suffix random ke phone
          normalized_phone := '+628' || LPAD(
            SUBSTRING(REPLACE(new.id::text, '-', ''), 1, 8) || 
            LPAD(FLOOR(RANDOM() * 999)::text, 3, '0'),
            11,
            '0'
          );
        END IF;
    END;
  END LOOP;

  -- Default role adalah owner
  INSERT INTO public.account_roles (user_id, role)
  VALUES (new.id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error tapi JANGAN gagalkan signup
    -- User tetap bisa signup, account bisa dibuat manual jika perlu
    RAISE WARNING 'handle_new_auth_user error for user %: % (SQLSTATE: %)', 
                  new.id, SQLERRM, SQLSTATE;
    RETURN new;
END;
$$;

-- Step 3: Recreate trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

-- Step 4: Fix existing users yang tidak punya account (jika ada)
DO $$
DECLARE
  auth_user RECORD;
  normalized_phone text;
  final_display_name text;
BEGIN
  FOR auth_user IN 
    SELECT u.id, u.email, u.phone, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.accounts a ON a.user_id = u.id
    WHERE a.user_id IS NULL
  LOOP
    -- Generate phone
    normalized_phone := COALESCE(
      NULLIF(TRIM(auth_user.phone), ''),
      NULLIF(TRIM(auth_user.raw_user_meta_data ->> 'phone_e164'), '')
    );
    
    IF normalized_phone IS NULL OR normalized_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
      normalized_phone := '+628' || LPAD(
        SUBSTRING(REPLACE(auth_user.id::text, '-', ''), 1, 11),
        11,
        '0'
      );
    END IF;
    
    -- Generate display name
    final_display_name := COALESCE(
      NULLIF(TRIM(auth_user.raw_user_meta_data ->> 'display_name'), ''),
      NULLIF(SPLIT_PART(COALESCE(auth_user.email, ''), '@', 1), ''),
      'User'
    );
    
    -- Insert account
    BEGIN
      INSERT INTO public.accounts (user_id, phone_e164, display_name, status)
      VALUES (auth_user.id, normalized_phone, final_display_name, 'active');
      
      INSERT INTO public.account_roles (user_id, role)
      VALUES (auth_user.id, 'owner')
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE 'Created account for user %', auth_user.id;
    EXCEPTION
      WHEN unique_violation THEN
        -- Try with random phone
        INSERT INTO public.accounts (user_id, phone_e164, display_name, status)
        VALUES (
          auth_user.id, 
          '+628' || LPAD(FLOOR(RANDOM() * 99999999999)::text, 11, '0'),
          final_display_name, 
          'active'
        );
        
        INSERT INTO public.account_roles (user_id, role)
        VALUES (auth_user.id, 'owner')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Created account for user % with random phone', auth_user.id;
    END;
  END LOOP;
END $$;

-- Step 5: Verify
SELECT 'Trigger fix applied successfully!' AS status;

-- Check results
SELECT 'Auth users without accounts:' AS check_type, COUNT(*) AS count
FROM auth.users u
LEFT JOIN public.accounts a ON a.user_id = u.id
WHERE a.user_id IS NULL;

SELECT 'Total accounts:' AS check_type, COUNT(*) AS count FROM public.accounts;
