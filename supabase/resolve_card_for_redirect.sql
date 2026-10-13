-- Function untuk resolve kartu saat QR scan / NFC tap (bypass RLS)
-- Untuk kartu yang sudah di-claim, redirect sesuai destination_mode owner
-- Jalankan di Supabase SQL Editor

CREATE OR REPLACE FUNCTION resolve_card_for_redirect(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
DECLARE
  v_card RECORD;
  v_business RECORD;
  v_slug TEXT;
  v_result JSON;
BEGIN
  -- Try to find card by ID (UUID) or serial
  SELECT 
    c.id,
    c.serial,
    c.lifecycle_state,
    c.service_state,
    c.destination_mode,
    c.owner_id,
    c.business_id
  INTO v_card
  FROM cards c
  WHERE c.id::text = p_token OR c.serial = p_token
  LIMIT 1;
  
  -- Card not found
  IF v_card IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'not_found',
      'message', 'Kartu tidak ditemukan.'
    );
  END IF;
  
  -- Check if card is suspended
  IF v_card.service_state = 'suspended' OR v_card.service_state = 'disabled' THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'suspended',
      'message', 'Kartu ini sedang dinonaktifkan.'
    );
  END IF;
  
  -- Check if card is NOT claimed yet - redirect to activation
  IF v_card.lifecycle_state != 'claimed' THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'not_active',
      'message', 'Kartu ini belum diaktifkan.',
      'redirect_to_activation', true,
      'card_id', v_card.id,
      'serial', v_card.serial,
      'lifecycle_state', v_card.lifecycle_state
    );
  END IF;
  
  -- Card is claimed - get business info
  IF v_card.business_id IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'no_destination',
      'message', 'Kartu belum terhubung dengan profil bisnis.'
    );
  END IF;
  
  -- Get business data
  SELECT 
    b.id,
    b.name,
    b.google_review_url,
    b.status
  INTO v_business
  FROM businesses b
  WHERE b.id = v_card.business_id;
  
  IF v_business IS NULL OR v_business.status != 'active' THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'no_destination',
      'message', 'Profil bisnis tidak tersedia.'
    );
  END IF;
  
  -- Get current slug for the business
  SELECT bs.slug INTO v_slug
  FROM business_slugs bs
  WHERE bs.business_id = v_business.id AND bs.is_current = true
  LIMIT 1;
  
  -- Return success with redirect info
  RETURN json_build_object(
    'valid', true,
    'cardId', v_card.id,
    'serial', v_card.serial,
    'businessId', v_business.id,
    'businessName', v_business.name,
    'destinationMode', COALESCE(v_card.destination_mode, 'direct_google'),
    'googleReviewUrl', v_business.google_review_url,
    'slug', v_slug,
    'tokenKind', 'qr'
  );
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION resolve_card_for_redirect(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION resolve_card_for_redirect(TEXT) TO authenticated;
