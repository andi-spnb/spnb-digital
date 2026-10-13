// ============ HELPER FUNCTIONS ============

function normalizePhone(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

// Format date untuk display
function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Format phone untuk display (mask)
function maskPhone(phone) {
  if (!phone) return '—';
  const cleaned = phone.replace(/^\+62/, '0');
  if (cleaned.length < 8) return cleaned;
  return cleaned.slice(0, 4) + '••••' + cleaned.slice(-4);
}

// Map lifecycle_state ke status badge
function mapCardStatus(lifecycleState) {
  const map = {
    'admin_stock': 'admin',
    'reseller_stock': 'stock',
    'sold_unclaimed': 'sold',
    'claimed': 'active',
    'retired': 'replaced'
  };
  return map[lifecycleState] || lifecycleState;
}

// ============ DATA LOADING FUNCTIONS ============

// Load data untuk dashboard owner
async function loadOwnerDashboardData() {
  if (!USE_REAL_DATA || !currentUser) return null;
  
  try {
    // Load businesses
    const { data: businesses } = await supabaseClient
      .from('businesses')
      .select('*, business_slugs(slug, is_current)')
      .eq('owner_id', currentUser.id);
    
    // Load cards
    const { data: cards } = await supabaseClient
      .from('cards')
      .select('*, businesses(name)')
      .eq('owner_id', currentUser.id);
    
    // Load recent interactions
    const { data: events } = await supabaseClient
      .from('interaction_events')
      .select('*')
      .in('business_id', (businesses || []).map(b => b.id))
      .order('occurred_at', { ascending: false })
      .limit(10);
    
    return { businesses, cards, events };
  } catch (e) {
    console.error('Error loading owner data:', e);
    return null;
  }
}

// Load data untuk dashboard reseller
async function loadResellerDashboardData() {
  if (!USE_REAL_DATA || !currentUser) return null;
  
  try {
    const { data: inventory } = await supabaseClient.rpc('get_my_reseller_inventory');
    return { inventory: inventory || [] };
  } catch (e) {
    console.error('Error loading reseller data:', e);
    return null;
  }
}

// Load data untuk dashboard admin
async function loadAdminDashboardData() {
  if (!USE_REAL_DATA || !currentUser) return null;
  
  try {
    // Load all cards with relations
    const { data: cards } = await supabaseClient
      .from('cards')
      .select(`
        *,
        resellers(name),
        accounts(display_name, phone_e164),
        businesses(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Load resellers
    const { data: resellers } = await supabaseClient
      .from('resellers')
      .select('*')
      .order('name');
    
    // Load stats
    const { data: cardStats } = await supabaseClient
      .from('cards')
      .select('lifecycle_state');
    
    // Load owners
    const owners = await getAllOwners();
    
    return { cards, resellers, cardStats, owners };
  } catch (e) {
    console.error('Error loading admin data:', e);
    return null;
  }
}

// Generate pagination buttons
function generatePaginationButtons(currentPage, totalPages, pageType) {
  let buttons = [];
  const maxVisible = 5;
  
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  
  for (let i = start; i <= end; i++) {
    const isActive = i === currentPage;
    buttons.push(`<button class="btn ${isActive ? 'btn-primary' : 'btn-ghost'} btn-sm" data-page="${i}" data-page-type="${pageType}">${i}</button>`);
  }
  
  return buttons.join('');
}

// Filter data helper
function filterData(data, filters, searchFields) {
  if (!data) return [];
  
  let filtered = [...data];
  
  // Apply search
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(searchLower);
      })
    );
  }
  
  // Apply status filter
  if (filters.status) {
    filtered = filtered.filter(item => item.status === filters.status);
  }
  
  return filtered;
}

// Paginate data helper
function paginateData(data, pagination) {
  const total = data.length;
  const totalPages = Math.ceil(total / pagination.perPage);
  const startIdx = (pagination.page - 1) * pagination.perPage;
  const paginated = data.slice(startIdx, startIdx + pagination.perPage);
  
  return { paginated, total, totalPages };
}
