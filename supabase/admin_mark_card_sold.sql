-- Function untuk admin menandai kartu terjual (bypass validasi reseller)
-- Bisa menandai kartu dari status admin_stock atau reseller_stock
-- Jalankan di Supabase SQL Editor

CREATE OR REPLACE FUNCTION admin_mark_card_sold(
  p_card_id UUID,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card RECORD;
  v_actor_id UUID;
BEGIN
  -- Get current user
  v_actor_id := auth.uid();
  
  -- Get card
  SELECT id, serial, lifecycle_state, service_state
  INTO v_card
  FROM cards
  WHERE id = p_card_id;
  
  IF v_card IS NULL THEN
    RETURN json_build_object('error', 'not_found', 'message', 'Kartu tidak ditemukan.');
  END IF;
  
  -- Check if card can be marked sold (admin_stock or reseller_stock)
  IF v_card.lifecycle_state NOT IN ('admin_stock', 'reseller_stock') THEN
    RETURN json_build_object(
      'error', 'invalid_state', 
      'message', 'Kartu tidak dalam status yang bisa ditandai terjual. Status saat ini: ' || v_card.lifecycle_state
    );
  END IF;
  
  -- Check if card is not suspended
  IF v_card.service_state = 'suspended' THEN
    RETURN json_build_object('error', 'suspended', 'message', 'Kartu sedang dinonaktifkan.');
  END IF;
  
  -- Update card status
  UPDATE cards
  SET 
    lifecycle_state = 'sold_unclaimed',
    sold_at = NOW()
  WHERE id = p_card_id;
  
  -- Log audit (if audit_log table exists)
  BEGIN
    INSERT INTO audit_log (actor_id, actor_role, action, entity_type, entity_id, occurred_at)
    VALUES (v_actor_id, 'admin', 'card_marked_sold', 'card', p_card_id, NOW());
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if audit_log doesn't exist
    NULL;
  END;
  
  RETURN json_build_object(
    'status', 'success',
    'card_id', v_card.id,
    'serial', v_card.serial,
    'new_state', 'sold_unclaimed'
  );
END;
$$;

-- Grant execute permission to authenticated users (admin check is done in app)
GRANT EXECUTE ON FUNCTION admin_mark_card_sold(UUID, UUID) TO authenticated;
