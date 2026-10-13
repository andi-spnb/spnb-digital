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
