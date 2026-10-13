/**
 * API Functions
 * Business, Card, and Admin API functions for Kartu Rating Google
 */

// ============ BUSINESS FUNCTIONS ============
async function getMyBusinesses() {
  if (!USE_REAL_DATA) return [state.businessProfile];
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await supabaseClient
    .from('businesses')
    .select('*, business_slugs(slug, is_current)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });
  return data || [];
}

async function getBusinessBySlug(slug) {
  const { data } = await supabaseClient
    .from('business_slugs')
    .select('business_id, businesses(*)')
    .eq('slug', slug)
    .eq('is_current', true)
    .single();
  return data?.businesses || null;
}

async function createBusiness(businessData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };
  const { data, error } = await supabaseClient
    .from('businesses')
    .insert({ ...businessData, owner_id: user.id })
    .select()
    .single();
  return { data, error };
}

async function updateBusiness(id, updates) {
  const { data, error } = await supabaseClient
    .from('businesses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

// ============ CARD FUNCTIONS ============
async function getMyCards() {
  if (!USE_REAL_DATA) return state.cards || [];
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await supabaseClient
    .from('cards')
    .select('*, businesses(name)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });
  return data || [];
}

async function getResellerInventory() {
  if (!USE_REAL_DATA) return state.resellerCards || [];
  const { data } = await supabaseClient.rpc('get_my_reseller_inventory');
  return data || [];
}

async function markCardSold(cardId, idempotencyKey) {
  const { data, error } = await supabaseClient.rpc('mark_card_sold', {
    p_card_id: cardId,
    p_idempotency_key: idempotencyKey || crypto.randomUUID()
  });
  return { data, error };
}

async function reverseSale(cardId, reason) {
  const { data, error } = await supabaseClient.rpc('reverse_unclaimed_sale', {
    p_card_id: cardId,
    p_reason: reason || 'Dibatalkan oleh reseller'
  });
  return { data, error };
}

async function claimCard(claimToken, businessId, destinationMode) {
  const { data, error } = await supabaseClient.rpc('claim_sold_card', {
    p_claim_token: claimToken,
    p_business_id: businessId,
    p_destination_mode: destinationMode
  });
  return { data, error };
}

// ============ ADMIN FUNCTIONS ============
async function getAllCards(filters = {}) {
  if (!USE_REAL_DATA) return adminCards.map(c => ({ serial: c[0], status: c[1], reseller: c[2], owner: c[3], activated: c[4], interactions: c[5] }));
  let query = supabaseClient.from('cards').select('*, resellers(name), accounts(display_name)');
  if (filters.status) query = query.eq('lifecycle_state', filters.status);
  const { data } = await query.order('created_at', { ascending: false });
  return data || [];
}

async function getAllResellers() {
  if (!USE_REAL_DATA) return [];
  const { data } = await supabaseClient.from('resellers').select('*').eq('status', 'active').order('name');
  return data || [];
}

async function allocateCardsToReseller(cardIds, resellerId, note) {
  const { data, error } = await supabaseClient.rpc('allocate_cards_to_reseller', {
    p_card_ids: cardIds,
    p_reseller_id: resellerId,
    p_idempotency_key: crypto.randomUUID(),
    p_note: note
  });
  return { data, error };
}
