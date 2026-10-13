-- Function untuk validasi kartu saat aktivasi (bypass RLS)
-- Jalankan di Supabase SQL Editor

CREATE OR REPLACE FUNCTION validate_card_for_activation(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
DECLARE
  v_card RECORD;
  v_result JSON;
BEGIN
  -- Try to find card by ID (UUID) or serial
  SELECT id, serial, lifecycle_state, owner_id
  INTO v_card
  FROM cards
  WHERE id::text = p_token OR serial = p_token
  LIMIT 1;
  
  -- Card not found
  IF v_card IS NULL THEN
    RETURN json_build_object(
      'error', 'invalid',
      'message', 'Kartu tidak ditemukan.'
    );
  END IF;
  
  -- Check if already claimed
  IF v_card.lifecycle_state = 'claimed' AND v_card.owner_id IS NOT NULL THEN
    RETURN json_build_object(
      'error', 'already_claimed',
      'message', 'Kartu ini sudah diaktifkan oleh pemilik lain.'
    );
  END IF;
  
  -- Check if still in admin stock
  IF v_card.lifecycle_state = 'admin_stock' THEN
    RETURN json_build_object(
      'error', 'not_sold',
      'message', 'Kartu ini belum tersedia. Hubungi reseller untuk membeli kartu.'
    );
  END IF;
  
  -- Check if still in reseller stock
  IF v_card.lifecycle_state = 'reseller_stock' THEN
    RETURN json_build_object(
      'error', 'not_sold',
      'message', 'Kartu ini belum ditandai terjual oleh reseller.'
    );
  END IF;
  
  -- Card is valid (sold_unclaimed)
  RETURN json_build_object(
    'card_id', v_card.id,
    'serial', v_card.serial,
    'lifecycle_state', v_card.lifecycle_state
  );
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION validate_card_for_activation(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_card_for_activation(TEXT) TO authenticated;


-- Function untuk membuat/update account saat aktivasi (bypass RLS)
CREATE OR REPLACE FUNCTION ensure_account_exists(
  p_user_id UUID,
  p_display_name TEXT,
  p_phone_e164 TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
DECLARE
  v_account RECORD;
BEGIN
  -- Check if account already exists
  SELECT user_id INTO v_account
  FROM accounts
  WHERE user_id = p_user_id;
  
  IF v_account IS NOT NULL THEN
    RETURN json_build_object('status', 'exists', 'user_id', p_user_id);
  END IF;
  
  -- Create new account
  INSERT INTO accounts (user_id, display_name, phone_e164)
  VALUES (p_user_id, p_display_name, p_phone_e164)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create owner role
  INSERT INTO account_roles (user_id, role)
  VALUES (p_user_id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN json_build_object('status', 'created', 'user_id', p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_account_exists(UUID, TEXT, TEXT) TO authenticated;


-- Function untuk claim kartu (bypass RLS)
CREATE OR REPLACE FUNCTION claim_card_for_owner(
  p_card_id UUID,
  p_owner_id UUID,
  p_business_id UUID,
  p_destination_mode TEXT DEFAULT 'direct_google'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
DECLARE
  v_card RECORD;
BEGIN
  -- Get card and check status
  SELECT id, serial, lifecycle_state, owner_id
  INTO v_card
  FROM cards
  WHERE id = p_card_id;
  
  IF v_card IS NULL THEN
    RETURN json_build_object('error', 'not_found', 'message', 'Kartu tidak ditemukan.');
  END IF;
  
  IF v_card.lifecycle_state = 'claimed' THEN
    RETURN json_build_object('error', 'already_claimed', 'message', 'Kartu sudah diaktifkan.');
  END IF;
  
  IF v_card.lifecycle_state NOT IN ('sold_unclaimed') THEN
    RETURN json_build_object('error', 'invalid_state', 'message', 'Kartu tidak dalam status siap aktivasi.');
  END IF;
  
  -- Update card
  UPDATE cards
  SET 
    lifecycle_state = 'claimed',
    owner_id = p_owner_id,
    business_id = p_business_id,
    destination_mode = p_destination_mode,
    claimed_at = NOW()
  WHERE id = p_card_id;
  
  RETURN json_build_object(
    'status', 'success',
    'card_id', v_card.id,
    'serial', v_card.serial
  );
END;
$$;

GRANT EXECUTE ON FUNCTION claim_card_for_owner(UUID, UUID, UUID, TEXT) TO authenticated;


-- Function untuk membuat business (bypass RLS)
CREATE OR REPLACE FUNCTION create_business_for_owner(
  p_owner_id UUID,
  p_name TEXT,
  p_google_review_url TEXT DEFAULT NULL,
  p_theme_color TEXT DEFAULT '#1769c2'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
DECLARE
  v_business_id UUID;
BEGIN
  -- Insert business
  INSERT INTO businesses (owner_id, name, google_review_url, theme_color)
  VALUES (p_owner_id, p_name, p_google_review_url, p_theme_color)
  RETURNING id INTO v_business_id;
  
  RETURN json_build_object(
    'status', 'success',
    'business_id', v_business_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_business_for_owner(UUID, TEXT, TEXT, TEXT) TO authenticated;


-- Function untuk membuat business slug (bypass RLS)
CREATE OR REPLACE FUNCTION create_business_slug(
  p_business_id UUID,
  p_slug TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
BEGIN
  -- Insert slug
  INSERT INTO business_slugs (business_id, slug, is_current)
  VALUES (p_business_id, p_slug, true)
  ON CONFLICT (slug) DO NOTHING;
  
  RETURN json_build_object('status', 'success', 'slug', p_slug);
END;
$$;

GRANT EXECUTE ON FUNCTION create_business_slug(UUID, TEXT) TO authenticated;
