const root = document.getElementById("app");
const whatsappNumber = "62895386763040";
const whatsappText = encodeURIComponent("Halo SPNB DIGITAL, saya tertarik membeli kartu Google Review NFC + QR.");
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`;

// ============ SUPABASE CLIENT ============
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Flag untuk menggunakan data real atau mock
let USE_REAL_DATA = false;

// Auth state
let currentUser = null;
let currentAccount = null;
let currentRoles = [];
let authInitialized = false;

// Check koneksi dan set flag
async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabaseClient.from('accounts').select('user_id').limit(1);
    if (!error) {
      USE_REAL_DATA = true;
      console.log('✅ Connected to Supabase');
    } else {
      console.log('⚠️ Supabase tables not ready, using mock data');
    }
  } catch (e) {
    console.log('⚠️ Supabase connection failed, using mock data');
  }
}

// ============ AUTH FUNCTIONS ============

// Initialize auth state on page load
async function initAuth() {
  if (authInitialized) return;
  
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      await loadUserData(session.user);
    }
    authInitialized = true;
    
    // Listen for auth changes
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserData(session.user);
        redirectToDashboard();
      } else if (event === 'SIGNED_OUT') {
        clearUserData();
        go('/login');
      }
    });
  } catch (e) {
    console.error('Auth init error:', e);
  }
}

async function loadUserData(user) {
  currentUser = user;
  
  // Load account data
  const { data: account } = await supabaseClient
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .single();
  currentAccount = account;
  
  // Load roles
  const { data: roles } = await supabaseClient
    .from('account_roles')
    .select('role')
    .eq('user_id', user.id);
  currentRoles = roles?.map(r => r.role) || [];
  
  console.log('User loaded:', currentAccount?.display_name, 'Roles:', currentRoles);
  
  // Load notifications in background
  loadNotifications();
}

function clearUserData() {
  currentUser = null;
  currentAccount = null;
  currentRoles = [];
  // Clear notifications
  state.notifications = [];
  state.unreadCount = 0;
  state.showNotificationPanel = false;
}

function redirectToDashboard() {
  if (currentRoles.includes('admin')) {
    go('/admin');
  } else if (currentRoles.includes('reseller')) {
    go('/reseller');
  } else {
    go('/owner');
  }
}

async function signUp(email, password, displayName, phone) {
  const phoneE164 = phone ? normalizePhone(phone) : null;
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { 
        phone_e164: phoneE164, 
        display_name: displayName 
      }
    }
  });
  return { data, error };
}

async function signInWithEmail(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

async function signInWithPhone(phone, password) {
  const phoneE164 = normalizePhone(phone);
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    phone: phoneE164,
    password
  });
  return { data, error };
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (!error) {
    clearUserData();
    go('/login');
  }
  return { error };
}

async function getCurrentUser() {
  if (currentUser) return currentUser;
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

async function getUserRoles(userId) {
  if (currentRoles.length > 0 && currentUser?.id === userId) {
    return currentRoles;
  }
  const { data } = await supabaseClient.from('account_roles').select('role').eq('user_id', userId);
  return data?.map(r => r.role) || [];
}

function isLoggedIn() {
  return currentUser !== null;
}

function hasRole(role) {
  return currentRoles.includes(role);
}

function requireAuth(allowedRoles = []) {
  if (!isLoggedIn()) {
    go('/login');
    return false;
  }
  if (allowedRoles.length > 0 && !allowedRoles.some(r => currentRoles.includes(r))) {
    toast('Anda tidak memiliki akses ke halaman ini.');
    redirectToDashboard();
    return false;
  }
  return true;
}

// Update account display name
async function updateAccountName(newName) {
  if (!currentUser) {
    toast('Anda harus login terlebih dahulu.');
    return;
  }
  
  try {
    const { error } = await supabaseClient
      .from('accounts')
      .update({ display_name: newName })
      .eq('user_id', currentUser.id);
    
    if (error) {
      console.error('Update name error:', error);
      toast('Gagal menyimpan nama. Silakan coba lagi.');
      return;
    }
    
    // Update local state
    if (currentAccount) {
      currentAccount.display_name = newName;
    }
    
    toast('Nama berhasil diperbarui.');
    render();
  } catch (e) {
    console.error('Update name exception:', e);
    toast('Terjadi kesalahan. Silakan coba lagi.');
  }
}

// Change password
async function changePassword(newPassword) {
  if (!currentUser) {
    toast('Anda harus login terlebih dahulu.');
    return;
  }
  
  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      console.error('Change password error:', error);
      toast('Gagal mengubah password: ' + error.message);
      return;
    }
    
    // Clear password fields
    const newPwField = document.getElementById('new-password');
    const confirmPwField = document.getElementById('confirm-password');
    if (newPwField) newPwField.value = '';
    if (confirmPwField) confirmPwField.value = '';
    
    toast('Password berhasil diperbarui.');
  } catch (e) {
    console.error('Change password exception:', e);
    toast('Terjadi kesalahan. Silakan coba lagi.');
  }
}

// Handle confirm sell card
async function handleConfirmSell(cardId, serial) {
  closeModal();
  
  // Check if using real data
  if (USE_REAL_DATA && cardId && cardId.includes('-')) {
    try {
      toast('Memproses...');
      const { data, error } = await markCardSold(cardId);
      
      if (error) {
        console.error('Mark sold error:', error);
        toast('Gagal menandai kartu: ' + (error.message || 'Terjadi kesalahan'));
        return;
      }
      
      // Reload reseller data
      state.resellerData = await loadResellerDashboardData();
      render();
      toast(`${serial} siap diaktifkan oleh pembeli.`);
    } catch (e) {
      console.error('Mark sold exception:', e);
      toast('Terjadi kesalahan. Silakan coba lagi.');
    }
  } else {
    // Fallback to mock data
    const card = state.resellerCards.find(c => c.serial === serial || c.serial === cardId);
    if (card) {
      card.status = "sold";
      card.date = formatDate(new Date().toISOString());
      card.owner = "Menunggu aktivasi";
    }
    render();
    toast(`${serial} siap diaktifkan oleh pembeli.`);
  }
}

// Handle unsell card (reverse sale)
async function handleUnsellCard(cardId, serial) {
  // Check if using real data
  if (USE_REAL_DATA && cardId && cardId.includes('-')) {
    try {
      toast('Memproses...');
      const { data, error } = await reverseSale(cardId, 'Dibatalkan oleh reseller');
      
      if (error) {
        console.error('Reverse sale error:', error);
        toast('Gagal membatalkan: ' + (error.message || 'Terjadi kesalahan'));
        return;
      }
      
      // Reload reseller data
      state.resellerData = await loadResellerDashboardData();
      render();
      toast('Status terjual berhasil dibatalkan.');
    } catch (e) {
      console.error('Reverse sale exception:', e);
      toast('Terjadi kesalahan. Silakan coba lagi.');
    }
  } else {
    // Fallback to mock data
    const card = state.resellerCards.find(c => c.serial === serial || c.serial === cardId);
    if (card) {
      card.status = "stock";
      card.date = "—";
      card.owner = "—";
    }
    render();
    toast('Status terjual berhasil dibatalkan.');
  }
}

// Handle save business profile
async function handleSaveBusinessProfile() {
  const p = state.businessProfile;
  
  // Get values from form
  const getName = document.getElementById("bp-name");
  const getDesc = document.getElementById("bp-desc");
  const getAddress = document.getElementById("bp-address");
  const getLogo = document.getElementById("bp-logo");
  const getBanner = document.getElementById("bp-banner");
  const getGoogle = document.getElementById("bp-google");
  const getWa = document.getElementById("bp-wa");
  const getMaps = document.getElementById("bp-maps");
  const getIg = document.getElementById("bp-ig");
  const getWeb = document.getElementById("bp-web");
  const getColor = document.getElementById("bp-color");
  
  const newData = {
    name: getName?.value?.trim() || p.name,
    description: getDesc?.value?.trim() || '',
    address: getAddress?.value?.trim() || '',
    logo_url: getLogo?.value?.trim() || '',
    cover_url: getBanner?.value?.trim() || '',
    google_review_url: getGoogle?.value?.trim() || '',
    whatsapp_e164: getWa?.value ? normalizePhone(getWa.value) : null,
    google_maps_url: getMaps?.value?.trim() || '',
    theme_color: getColor?.value || '#1769c2'
  };
  
  // Validate required fields
  if (!newData.name || newData.name.length < 2) {
    toast('Nama usaha harus diisi (minimal 2 karakter).');
    return;
  }
  
  // Update local state first
  p.name = newData.name;
  p.description = newData.description;
  p.address = newData.address;
  p.logoUrl = newData.logo_url;
  p.bannerUrl = newData.cover_url;
  p.googleReviewUrl = newData.google_review_url;
  p.whatsapp = getWa?.value || '';
  p.mapsUrl = newData.google_maps_url;
  p.instagram = getIg?.value || '';
  p.website = getWeb?.value || '';
  p.themeColor = newData.theme_color;
  
  // Save to database if logged in and using real data
  if (USE_REAL_DATA && currentUser) {
    try {
      toast('Menyimpan...');
      
      // Get business ID from ownerData or create new
      let businessId = state.ownerData?.businesses?.[0]?.id;
      
      if (businessId) {
        // Update existing business
        const { error } = await supabaseClient
          .from('businesses')
          .update({
            name: newData.name,
            description: newData.description,
            address: newData.address,
            logo_url: newData.logo_url,
            cover_url: newData.cover_url,
            google_review_url: newData.google_review_url || null,
            whatsapp_e164: newData.whatsapp_e164,
            google_maps_url: newData.google_maps_url || null,
            theme_color: newData.theme_color
          })
          .eq('id', businessId);
        
        if (error) {
          console.error('Update business error:', error);
          toast('Gagal menyimpan: ' + (error.message || 'Terjadi kesalahan'));
          return;
        }
        
        // Reload owner data
        state.ownerData = await loadOwnerDashboardData();
        render();
        toast('Profil usaha berhasil disimpan.');
      } else {
        // Create new business
        const { data, error } = await supabaseClient
          .from('businesses')
          .insert({
            owner_id: currentUser.id,
            name: newData.name,
            description: newData.description,
            address: newData.address,
            logo_url: newData.logo_url,
            cover_url: newData.cover_url,
            google_review_url: newData.google_review_url || null,
            whatsapp_e164: newData.whatsapp_e164,
            google_maps_url: newData.google_maps_url || null,
            theme_color: newData.theme_color
          })
          .select()
          .single();
        
        if (error) {
          console.error('Create business error:', error);
          toast('Gagal membuat profil: ' + (error.message || 'Terjadi kesalahan'));
          return;
        }
        
        // Create slug for new business
        const slug = newData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        await supabaseClient
          .from('business_slugs')
          .insert({
            slug: slug,
            business_id: data.id,
            is_current: true
          });
        
        // Reload owner data
        state.ownerData = await loadOwnerDashboardData();
        render();
        toast('Profil usaha berhasil dibuat.');
      }
    } catch (e) {
      console.error('Save business exception:', e);
      toast('Terjadi kesalahan. Silakan coba lagi.');
    }
  } else {
    // Just update local state
    render();
    toast('Profil usaha berhasil disimpan.');
  }
}

// Handle distribute cards to reseller
async function handleDistributeCards() {
  const cardsSelect = document.getElementById('distribute-cards');
  const resellerSelect = document.getElementById('distribute-reseller');
  const noteInput = document.getElementById('distribute-note');
  
  // Get selected card IDs
  const selectedCards = Array.from(cardsSelect?.selectedOptions || []).map(opt => opt.value);
  const resellerId = resellerSelect?.value;
  const note = noteInput?.value?.trim() || '';
  
  if (selectedCards.length === 0) {
    toast('Pilih minimal satu kartu untuk didistribusikan.');
    return;
  }
  
  if (!resellerId) {
    toast('Pilih reseller tujuan.');
    return;
  }
  
  try {
    toast('Memproses distribusi...');
    
    const { data, error } = await allocateCardsToReseller(selectedCards, resellerId, note);
    
    if (error) {
      console.error('Distribute error:', error);
      toast('Gagal mendistribusikan: ' + (error.message || 'Terjadi kesalahan'));
      return;
    }
    
    // Reload admin data
    state.adminData = await loadAdminDashboardData();
    render();
    toast(`${selectedCards.length} kartu berhasil didistribusikan.`);
  } catch (e) {
    console.error('Distribute exception:', e);
    toast('Terjadi kesalahan. Silakan coba lagi.');
  }
}

// Handle create batch
async function handleCreateBatch() {
  const countInput = document.getElementById('batch-count');
  const prefixInput = document.getElementById('batch-prefix');
  const startInput = document.getElementById('batch-start');
  const codeInput = document.getElementById('batch-code');
  
  const quantity = parseInt(countInput?.value) || 10;
  const prefix = prefixInput?.value?.trim() || 'KRT';
  const startNumber = parseInt(startInput?.value) || 1;
  const batchCode = codeInput?.value?.trim() || `BTH-${Date.now().toString().slice(-6)}`;
  
  if (quantity < 1 || quantity > 100) {
    toast('Jumlah kartu harus antara 1-100.');
    return;
  }
  
  try {
    toast('Membuat batch...');
    
    // Create batch record
    const { data: batch, error: batchError } = await supabaseClient
      .from('card_batches')
      .insert({
        batch_code: batchCode,
        serial_prefix: prefix,
        starting_number: startNumber,
        quantity: quantity,
        status: 'ready',
        created_by: currentUser.id
      })
      .select()
      .single();
    
    if (batchError) {
      console.error('Create batch error:', batchError);
      toast('Gagal membuat batch: ' + (batchError.message || 'Terjadi kesalahan'));
      return;
    }
    
    // Create cards for the batch
    const cards = [];
    for (let i = 0; i < quantity; i++) {
      const serialNum = (startNumber + i).toString().padStart(6, '0');
      cards.push({
        serial: `${prefix}-${serialNum}`,
        batch_id: batch.id,
        lifecycle_state: 'admin_stock',
        service_state: 'enabled',
        provisioning_state: 'ready',
        destination_mode: 'direct_google'
      });
    }
    
    const { error: cardsError } = await supabaseClient
      .from('cards')
      .insert(cards);
    
    if (cardsError) {
      console.error('Create cards error:', cardsError);
      toast('Batch dibuat tapi gagal membuat kartu: ' + cardsError.message);
      return;
    }
    
    closeModal();
    
    // Reload admin data
    state.adminData = await loadAdminDashboardData();
    render();
    toast(`Batch ${batchCode} dengan ${quantity} kartu berhasil dibuat.`);
  } catch (e) {
    console.error('Create batch exception:', e);
    toast('Terjadi kesalahan. Silakan coba lagi.');
  }
}

// Handle create reseller
async function handleCreateReseller() {
  const nameInput = document.getElementById('reseller-name');
  const phoneInput = document.getElementById('reseller-phone');
  const cityInput = document.getElementById('reseller-city');
  
  const name = nameInput?.value?.trim();
  const phone = phoneInput?.value?.trim();
  const city = cityInput?.value?.trim();
  
  if (!name) {
    toast('Nama reseller harus diisi.');
    return;
  }
  
  if (!phone) {
    toast('Nomor HP harus diisi.');
    return;
  }
  
  const phoneE164 = normalizePhone(phone);
  
  try {
    toast('Membuat reseller...');
    
    const { data, error } = await supabaseClient
      .from('resellers')
      .insert({
        name: name,
        phone_e164: phoneE164,
        city: city || null,
        status: 'active',
        created_by: currentUser.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Create reseller error:', error);
      toast('Gagal membuat reseller: ' + (error.message || 'Terjadi kesalahan'));
      return;
    }
    
    closeModal();
    
    // Reload admin data
    state.adminData = await loadAdminDashboardData();
    render();
    toast(`Reseller "${name}" berhasil dibuat.`);
  } catch (e) {
    console.error('Create reseller exception:', e);
    toast('Terjadi kesalahan. Silakan coba lagi.');
  }
}

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

// ============ ACTIVATION FLOW FUNCTIONS ============

// Parse token from URL query string
function getActivationTokenFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('token');
}

// Validate card token and get card info (calls Edge Function or RPC)
async function validateCardToken(token) {
  if (!USE_REAL_DATA) {
    // Demo mode: simulate token validation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Demo tokens for testing
    if (token === 'demo-valid') {
      return {
        valid: true,
        cardId: 'demo-card-id',
        serial: 'KRT-000126',
        status: 'sold_unclaimed',
        claimSessionToken: 'demo-claim-session-token'
      };
    } else if (token === 'demo-claimed') {
      return {
        valid: false,
        error: 'already_claimed',
        message: 'Kartu ini sudah diaktifkan oleh pemilik lain.'
      };
    } else if (token === 'demo-not-sold') {
      return {
        valid: false,
        error: 'not_sold',
        message: 'Kartu ini belum ditandai terjual oleh reseller.'
      };
    }
    
    // Default demo: treat as valid card ready for activation
    return {
      valid: true,
      cardId: 'demo-card-id',
      serial: 'KRT-000126',
      status: 'sold_unclaimed',
      claimSessionToken: 'demo-claim-session-token'
    };
  }
  
  try {
    // In production, this would call an Edge Function that:
    // 1. Validates the token hash
    // 2. Checks the card is in 'sold_unclaimed' state
    // 3. Creates a claim_session with expiry
    // 4. Returns card info and claim session token
    
    const { data, error } = await supabaseClient.functions.invoke('validate-card-token', {
      body: { token }
    });
    
    if (error) {
      console.error('Token validation error:', error);
      return {
        valid: false,
        error: 'invalid',
        message: 'Token tidak valid atau sudah kedaluwarsa.'
      };
    }
    
    return data;
  } catch (e) {
    console.error('Token validation exception:', e);
    return {
      valid: false,
      error: 'error',
      message: 'Terjadi kesalahan saat memvalidasi token.'
    };
  }
}

// Initialize activation flow
async function initActivationFlow() {
  const a = state.activation;
  
  // Get token from URL
  const token = getActivationTokenFromUrl();
  a.token = token;
  
  // If no token, show demo mode
  if (!token) {
    a.cardStatus = 'demo';
    a.cardSerial = 'KRT-000126';
    a.step = 1;
    return;
  }
  
  // Validate the token
  a.isLoading = true;
  a.cardStatus = 'validating';
  render();
  
  const result = await validateCardToken(token);
  a.isLoading = false;
  
  if (result.valid) {
    a.cardId = result.cardId;
    a.cardSerial = result.serial;
    a.cardStatus = 'valid';
    a.claimSessionToken = result.claimSessionToken;
    
    // Check if user is already logged in
    if (isLoggedIn()) {
      // Skip to business selection (step 3)
      await loadUserBusinesses();
      a.step = 3;
    } else {
      a.step = 1;
    }
  } else {
    a.cardStatus = result.error;
    a.errorMessage = result.message;
    a.step = 0; // Error state
  }
  
  render();
}

// Load user's existing businesses for selection
async function loadUserBusinesses() {
  const a = state.activation;
  
  if (!USE_REAL_DATA) {
    // Demo: no existing businesses for new users
    a.existingBusinesses = [];
    a.createNewBusiness = true;
    return;
  }
  
  try {
    const businesses = await getMyBusinesses();
    a.existingBusinesses = businesses || [];
    a.createNewBusiness = businesses.length === 0;
    
    if (businesses.length > 0) {
      a.selectedBusinessId = businesses[0].id;
    }
  } catch (e) {
    console.error('Load businesses error:', e);
    a.existingBusinesses = [];
    a.createNewBusiness = true;
  }
}

// Handle registration during activation
async function handleActivationRegister() {
  const a = state.activation;
  
  // Validate fields
  if (!a.email?.trim()) {
    toast('Email harus diisi.');
    return false;
  }
  if (!a.email.includes('@')) {
    toast('Format email tidak valid.');
    return false;
  }
  if (!a.phone?.trim()) {
    toast('Nomor HP harus diisi.');
    return false;
  }
  if (!a.password || a.password.length < 8) {
    toast('Password harus minimal 8 karakter.');
    return false;
  }
  if (a.password !== a.confirm) {
    toast('Konfirmasi password tidak sama.');
    return false;
  }
  
  a.isSubmitting = true;
  render();
  
  try {
    const displayName = a.displayName?.trim() || a.email.split('@')[0];
    const { data, error } = await signUp(a.email, a.password, displayName, a.phone);
    
    if (error) {
      console.error('Registration error:', error);
      a.isSubmitting = false;
      
      if (error.message.includes('already registered')) {
        toast('Email sudah terdaftar. Silakan login.');
        a.authMode = 'login';
      } else {
        toast('Gagal mendaftar: ' + error.message);
      }
      render();
      return false;
    }
    
    // Auto-login after registration (if email confirmation is disabled)
    if (data?.user && data?.session) {
      await loadUserData(data.user);
      await loadUserBusinesses();
      a.isSubmitting = false;
      a.step = 3;
      render();
      toast('Akun berhasil dibuat!');
      return true;
    } else {
      // Email confirmation required
      a.isSubmitting = false;
      toast('Silakan cek email untuk konfirmasi akun.');
      render();
      return false;
    }
  } catch (e) {
    console.error('Registration exception:', e);
    a.isSubmitting = false;
    toast('Terjadi kesalahan. Silakan coba lagi.');
    render();
    return false;
  }
}

// Handle login during activation
async function handleActivationLogin() {
  const a = state.activation;
  
  if (!a.email?.trim()) {
    toast('Email harus diisi.');
    return false;
  }
  if (!a.password) {
    toast('Password harus diisi.');
    return false;
  }
  
  a.isSubmitting = true;
  render();
  
  try {
    const { data, error } = await signInWithEmail(a.email, a.password);
    
    if (error) {
      console.error('Login error:', error);
      a.isSubmitting = false;
      
      if (error.message.includes('Invalid login credentials')) {
        toast('Email atau password salah.');
      } else {
        toast('Gagal login: ' + error.message);
      }
      render();
      return false;
    }
    
    if (data?.user) {
      await loadUserData(data.user);
      await loadUserBusinesses();
      a.isSubmitting = false;
      a.step = 3;
      render();
      toast('Login berhasil!');
      return true;
    }
  } catch (e) {
    console.error('Login exception:', e);
    a.isSubmitting = false;
    toast('Terjadi kesalahan. Silakan coba lagi.');
    render();
    return false;
  }
  
  return false;
}

// Handle business creation during activation
async function handleCreateActivationBusiness() {
  const a = state.activation;
  
  if (!a.businessName?.trim() || a.businessName.length < 2) {
    toast('Nama usaha harus diisi (minimal 2 karakter).');
    return false;
  }
  if (!a.businessSlug?.trim() || a.businessSlug.length < 3) {
    toast('Alamat halaman harus diisi (minimal 3 karakter).');
    return false;
  }
  if (!a.googleReviewUrl?.trim()) {
    toast('Link Google Rating harus diisi.');
    return false;
  }
  
  // Validate Google URL format
  const googleUrlPattern = /^https:\/\/([^/?#]+\.)?(google\.[a-z.]+|g\.page|maps\.app\.goo\.gl)/i;
  if (!googleUrlPattern.test(a.googleReviewUrl)) {
    toast('Format link Google Rating tidak valid.');
    return false;
  }
  
  if (!USE_REAL_DATA) {
    // Demo mode: simulate business creation
    a.selectedBusinessId = 'demo-business-id';
    return true;
  }
  
  a.isSubmitting = true;
  render();
  
  try {
    // Create business
    const { data: business, error: bizError } = await createBusiness({
      name: a.businessName.trim(),
      google_review_url: a.googleReviewUrl.trim(),
      theme_color: '#1769c2'
    });
    
    if (bizError) {
      console.error('Create business error:', bizError);
      a.isSubmitting = false;
      toast('Gagal membuat profil usaha: ' + bizError.message);
      render();
      return false;
    }
    
    // Create slug
    const slug = a.businessSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { error: slugError } = await supabaseClient
      .from('business_slugs')
      .insert({
        slug: slug,
        business_id: business.id,
        is_current: true
      });
    
    if (slugError) {
      console.error('Create slug error:', slugError);
      // Continue anyway, slug is optional
    }
    
    a.selectedBusinessId = business.id;
    a.isSubmitting = false;
    render();
    return true;
  } catch (e) {
    console.error('Create business exception:', e);
    a.isSubmitting = false;
    toast('Terjadi kesalahan. Silakan coba lagi.');
    render();
    return false;
  }
}

// Final step: claim the card
async function handleClaimCard() {
  const a = state.activation;
  
  if (!a.selectedBusinessId) {
    toast('Pilih profil usaha terlebih dahulu.');
    return false;
  }
  
  if (!USE_REAL_DATA) {
    // Demo mode: simulate card claim
    await new Promise(resolve => setTimeout(resolve, 1000));
    a.step = 5; // Success
    render();
    return true;
  }
  
  a.isSubmitting = true;
  render();
  
  try {
    const { data, error } = await claimCard(
      a.claimSessionToken,
      a.selectedBusinessId,
      a.destinationMode
    );
    
    if (error) {
      console.error('Claim card error:', error);
      a.isSubmitting = false;
      
      if (error.message.includes('invalid or expired')) {
        toast('Sesi aktivasi sudah kedaluwarsa. Silakan scan ulang QR kartu.');
        a.step = 0;
        a.cardStatus = 'expired';
        a.errorMessage = 'Sesi aktivasi sudah kedaluwarsa. Silakan scan ulang QR pada kartu.';
      } else if (error.message.includes('already been claimed')) {
        toast('Kartu sudah diaktifkan oleh orang lain.');
        a.step = 0;
        a.cardStatus = 'already_claimed';
        a.errorMessage = 'Kartu ini sudah diaktifkan oleh pemilik lain.';
      } else {
        toast('Gagal mengaktifkan kartu: ' + error.message);
      }
      render();
      return false;
    }
    
    a.isSubmitting = false;
    a.step = 5; // Success
    
    // Reload owner data
    state.ownerData = await loadOwnerDashboardData();
    
    render();
    toast('Kartu berhasil diaktifkan!');
    return true;
  } catch (e) {
    console.error('Claim card exception:', e);
    a.isSubmitting = false;
    toast('Terjadi kesalahan. Silakan coba lagi.');
    render();
    return false;
  }
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

// ============ STATS FUNCTIONS ============
async function getInteractionStats(cardId, days = 30) {
  if (!USE_REAL_DATA) return { qr: 124, nfc: 86, total: 210 };
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseClient
    .from('interaction_events')
    .select('event_type')
    .eq('card_id', cardId)
    .gte('occurred_at', since);
  
  const stats = { qr: 0, nfc: 0, total: 0 };
  data?.forEach(e => {
    if (e.event_type === 'qr_scan') stats.qr++;
    if (e.event_type === 'nfc_tap') stats.nfc++;
    stats.total++;
  });
  return stats;
}

// Get comprehensive stats for owner dashboard
async function getOwnerStats(businessIds, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const previousStart = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString();
  
  if (!USE_REAL_DATA || !businessIds || businessIds.length === 0) {
    // Return demo data
    return {
      current: {
        profileViews: 892,
        googleClicks: 426,
        whatsappClicks: 164,
        mapsClicks: 98,
        qrScans: 387,
        nfcTaps: 505,
        totalInteractions: 892
      },
      previous: {
        profileViews: 736,
        totalInteractions: 736
      },
      daily: generateDemoDaily(days),
      byCard: [],
      byLinkType: {
        google_review: 426,
        whatsapp: 164,
        google_maps: 98,
        instagram: 45,
        website: 32
      }
    };
  }
  
  try {
    // Get current period stats
    const { data: currentEvents, error: currentError } = await supabaseClient
      .from('interaction_events')
      .select('event_type, card_id, profile_link_id, token_kind, occurred_at')
      .in('business_id', businessIds)
      .gte('occurred_at', since);
    
    if (currentError) {
      console.error('Stats fetch error:', currentError);
      return null;
    }
    
    // Get previous period for comparison
    const { data: previousEvents } = await supabaseClient
      .from('interaction_events')
      .select('event_type')
      .in('business_id', businessIds)
      .gte('occurred_at', previousStart)
      .lt('occurred_at', since);
    
    // Process current period
    const current = {
      profileViews: 0,
      googleClicks: 0,
      whatsappClicks: 0,
      mapsClicks: 0,
      qrScans: 0,
      nfcTaps: 0,
      totalInteractions: 0
    };
    
    const dailyMap = {};
    const cardMap = {};
    const linkTypeMap = {};
    
    currentEvents?.forEach(e => {
      current.totalInteractions++;
      
      // By event type
      if (e.event_type === 'profile_view') current.profileViews++;
      if (e.event_type === 'qr_scan') current.qrScans++;
      if (e.event_type === 'nfc_tap') current.nfcTaps++;
      if (e.event_type === 'profile_link_click') {
        // Would need to join with profile_links to get type
        // For now, count generically
      }
      
      // By token kind
      if (e.token_kind === 'qr') current.qrScans++;
      if (e.token_kind === 'nfc') current.nfcTaps++;
      
      // Daily aggregation
      const day = e.occurred_at.split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + 1;
      
      // By card
      if (e.card_id) {
        cardMap[e.card_id] = (cardMap[e.card_id] || 0) + 1;
      }
    });
    
    // Get link click details
    const { data: linkClicks } = await supabaseClient
      .from('interaction_events')
      .select(`
        profile_link_id,
        profile_links (link_type)
      `)
      .in('business_id', businessIds)
      .eq('event_type', 'profile_link_click')
      .gte('occurred_at', since);
    
    linkClicks?.forEach(e => {
      const linkType = e.profile_links?.link_type || 'unknown';
      linkTypeMap[linkType] = (linkTypeMap[linkType] || 0) + 1;
      
      if (linkType === 'google_review') current.googleClicks++;
      if (linkType === 'whatsapp') current.whatsappClicks++;
      if (linkType === 'google_maps') current.mapsClicks++;
    });
    
    // Process previous period
    const previous = {
      profileViews: 0,
      totalInteractions: previousEvents?.length || 0
    };
    previousEvents?.forEach(e => {
      if (e.event_type === 'profile_view') previous.profileViews++;
    });
    
    // Convert daily map to sorted array
    const daily = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
    
    return {
      current,
      previous,
      daily,
      byCard: Object.entries(cardMap).map(([cardId, count]) => ({ cardId, count })),
      byLinkType: linkTypeMap
    };
  } catch (e) {
    console.error('getOwnerStats exception:', e);
    return null;
  }
}

// Generate demo daily data
function generateDemoDaily(days) {
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    // Random count between 20-50
    const count = Math.floor(Math.random() * 30) + 20;
    daily.push({ date: dateStr, count });
  }
  return daily;
}

// Calculate percentage change
function calcChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

// Format number with thousands separator
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// ============ EXPORT CSV FUNCTIONS ============

// Convert array of objects to CSV string
function arrayToCSV(data, columns) {
  if (!data || data.length === 0) return '';
  
  // Header row
  const headers = columns.map(col => `"${col.label}"`).join(',');
  
  // Data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = col.getValue ? col.getValue(item) : item[col.key];
      if (value === null || value === undefined) value = '';
      // Escape quotes and wrap in quotes
      value = String(value).replace(/"/g, '""');
      return `"${value}"`;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

// Download CSV file
function downloadCSV(csvContent, filename) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export cards data (Admin)
async function exportCardsCSV() {
  toast('Menyiapkan export...');
  
  let cards;
  if (USE_REAL_DATA) {
    const { data } = await supabaseClient
      .from('cards')
      .select(`
        serial,
        lifecycle_state,
        service_state,
        destination_mode,
        created_at,
        claimed_at,
        resellers (name),
        accounts (display_name, phone_e164),
        businesses (name)
      `)
      .order('created_at', { ascending: false });
    cards = data || [];
  } else {
    // Demo data
    cards = [
      { serial: 'KRT-000125', lifecycle_state: 'claimed', resellers: { name: 'Reseller Bandung' }, accounts: { display_name: 'Budi Santoso', phone_e164: '+6281234567890' }, businesses: { name: 'Kopi Nusantara' }, created_at: '2026-10-01', claimed_at: '2026-10-12' },
      { serial: 'KRT-000126', lifecycle_state: 'sold_unclaimed', resellers: { name: 'Reseller Bandung' }, accounts: null, businesses: null, created_at: '2026-10-01', claimed_at: null },
      { serial: 'KRT-000127', lifecycle_state: 'claimed', resellers: { name: 'Reseller Jakarta' }, accounts: { display_name: 'Siti Rahma', phone_e164: '+6285722102210' }, businesses: { name: 'Salon Cantika' }, created_at: '2026-10-02', claimed_at: '2026-10-11' },
    ];
  }
  
  const columns = [
    { key: 'serial', label: 'Serial' },
    { key: 'lifecycle_state', label: 'Status', getValue: (c) => mapCardStatus(c.lifecycle_state) },
    { label: 'Reseller', getValue: (c) => c.resellers?.name || '-' },
    { label: 'Owner', getValue: (c) => c.accounts?.display_name || '-' },
    { label: 'Telepon Owner', getValue: (c) => c.accounts?.phone_e164 || '-' },
    { label: 'Bisnis', getValue: (c) => c.businesses?.name || '-' },
    { key: 'destination_mode', label: 'Mode', getValue: (c) => c.destination_mode === 'direct_google' ? 'Google Rating' : 'Profil' },
    { key: 'created_at', label: 'Dibuat', getValue: (c) => formatDate(c.created_at) },
    { key: 'claimed_at', label: 'Diaktifkan', getValue: (c) => formatDate(c.claimed_at) },
  ];
  
  const csv = arrayToCSV(cards, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `kartu-spnb-${date}.csv`);
  toast(`${cards.length} kartu berhasil diekspor.`);
}

// Export resellers data (Admin)
async function exportResellersCSV() {
  toast('Menyiapkan export...');
  
  let resellers;
  if (USE_REAL_DATA) {
    const { data } = await supabaseClient
      .from('resellers')
      .select('name, phone_e164, city, status, created_at')
      .order('name');
    resellers = data || [];
    
    // Get card counts per reseller
    const { data: cards } = await supabaseClient
      .from('cards')
      .select('assigned_reseller_id, lifecycle_state');
    
    resellers = resellers.map(r => {
      const resellerCards = cards?.filter(c => c.assigned_reseller_id === r.id) || [];
      return {
        ...r,
        stockCount: resellerCards.filter(c => c.lifecycle_state === 'reseller_stock').length,
        soldCount: resellerCards.filter(c => c.lifecycle_state === 'sold_unclaimed').length,
        activeCount: resellerCards.filter(c => c.lifecycle_state === 'claimed').length,
      };
    });
  } else {
    resellers = [
      { name: 'Reseller Bandung', phone_e164: '+6281234567890', city: 'Bandung', status: 'active', stockCount: 24, soldCount: 3, activeCount: 87 },
      { name: 'Reseller Jakarta', phone_e164: '+6285712345678', city: 'Jakarta', status: 'active', stockCount: 31, soldCount: 5, activeCount: 104 },
      { name: 'Reseller Surabaya', phone_e164: '+6287812345678', city: 'Surabaya', status: 'active', stockCount: 18, soldCount: 2, activeCount: 65 },
    ];
  }
  
  const columns = [
    { key: 'name', label: 'Nama Reseller' },
    { key: 'phone_e164', label: 'Telepon' },
    { key: 'city', label: 'Kota' },
    { key: 'status', label: 'Status' },
    { key: 'stockCount', label: 'Stok' },
    { key: 'soldCount', label: 'Terjual' },
    { key: 'activeCount', label: 'Aktif' },
  ];
  
  const csv = arrayToCSV(resellers, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `reseller-spnb-${date}.csv`);
  toast(`${resellers.length} reseller berhasil diekspor.`);
}

// Export interactions/stats data (Admin)
async function exportInteractionsCSV(days = 30) {
  toast('Menyiapkan export...');
  
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  let events;
  if (USE_REAL_DATA) {
    const { data } = await supabaseClient
      .from('interaction_events')
      .select(`
        occurred_at,
        event_type,
        token_kind,
        destination_mode,
        user_agent_class,
        cards (serial),
        businesses (name)
      `)
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
      .limit(5000);
    events = data || [];
  } else {
    events = [
      { occurred_at: '2026-10-13T10:30:00', event_type: 'qr_scan', token_kind: 'qr', cards: { serial: 'KRT-000125' }, businesses: { name: 'Kopi Nusantara' }, user_agent_class: 'mobile' },
      { occurred_at: '2026-10-13T10:28:00', event_type: 'profile_view', token_kind: null, cards: null, businesses: { name: 'Kopi Nusantara' }, user_agent_class: 'mobile' },
      { occurred_at: '2026-10-13T10:25:00', event_type: 'profile_link_click', token_kind: null, cards: null, businesses: { name: 'Kopi Nusantara' }, user_agent_class: 'mobile' },
    ];
  }
  
  const eventLabels = {
    'qr_scan': 'Scan QR',
    'nfc_tap': 'Tap NFC',
    'profile_view': 'Lihat Profil',
    'profile_link_click': 'Klik Tombol'
  };
  
  const columns = [
    { key: 'occurred_at', label: 'Waktu', getValue: (e) => new Date(e.occurred_at).toLocaleString('id-ID') },
    { key: 'event_type', label: 'Tipe Event', getValue: (e) => eventLabels[e.event_type] || e.event_type },
    { label: 'Kartu', getValue: (e) => e.cards?.serial || '-' },
    { label: 'Bisnis', getValue: (e) => e.businesses?.name || '-' },
    { key: 'token_kind', label: 'Sumber', getValue: (e) => e.token_kind === 'qr' ? 'QR' : e.token_kind === 'nfc' ? 'NFC' : '-' },
    { key: 'user_agent_class', label: 'Device', getValue: (e) => e.user_agent_class || '-' },
  ];
  
  const csv = arrayToCSV(events, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `interaksi-spnb-${days}hari-${date}.csv`);
  toast(`${events.length} interaksi berhasil diekspor.`);
}

// Export reseller sales data
async function exportResellerSalesCSV() {
  toast('Menyiapkan export...');
  
  let cards;
  if (USE_REAL_DATA && state.resellerData?.inventory) {
    cards = state.resellerData.inventory;
  } else {
    cards = state.resellerCards || [];
  }
  
  const columns = [
    { key: 'serial', label: 'Serial Kartu' },
    { key: 'status', label: 'Status', getValue: (c) => {
      const status = c.lifecycle_state ? mapCardStatus(c.lifecycle_state) : c.status;
      return status === 'stock' ? 'Stok' : status === 'sold' ? 'Terjual' : status === 'active' ? 'Aktif' : status;
    }},
    { label: 'Tanggal', getValue: (c) => formatDate(c.sold_at || c.claimed_at || c.allocated_at || c.date) },
    { key: 'owner', label: 'Owner', getValue: (c) => {
      if (c.lifecycle_state === 'claimed') return 'Sudah aktif';
      if (c.lifecycle_state === 'sold_unclaimed') return 'Menunggu aktivasi';
      return c.owner || '-';
    }},
  ];
  
  const csv = arrayToCSV(cards, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `penjualan-reseller-${date}.csv`);
  toast(`${cards.length} kartu berhasil diekspor.`);
}

// Export audit log (Admin)
async function exportAuditLogCSV() {
  toast('Menyiapkan export...');
  
  let logs;
  if (USE_REAL_DATA) {
    const { data } = await supabaseClient
      .from('audit_log')
      .select(`
        occurred_at,
        action,
        entity_type,
        entity_id,
        actor_role,
        accounts (display_name)
      `)
      .order('occurred_at', { ascending: false })
      .limit(1000);
    logs = data || [];
  } else {
    logs = [
      { occurred_at: '2026-10-12T10:32:00', accounts: { display_name: 'Admin SPNB' }, action: 'cards_allocated', entity_type: 'stock_transfer', entity_id: '123', actor_role: 'admin' },
      { occurred_at: '2026-10-12T09:48:00', accounts: { display_name: 'Reseller Bandung' }, action: 'card_marked_sold', entity_type: 'card', entity_id: 'KRT-000126', actor_role: 'reseller' },
    ];
  }
  
  const actionLabels = {
    'cards_allocated': 'Distribusi kartu',
    'card_marked_sold': 'Tandai terjual',
    'card_sale_reversed': 'Batalkan penjualan',
    'card_claimed': 'Aktivasi kartu',
    'card_configuration_changed': 'Ubah konfigurasi',
    'business_slug_changed': 'Ubah slug',
  };
  
  const columns = [
    { key: 'occurred_at', label: 'Waktu', getValue: (l) => new Date(l.occurred_at).toLocaleString('id-ID') },
    { label: 'Pengguna', getValue: (l) => l.accounts?.display_name || '-' },
    { key: 'actor_role', label: 'Role' },
    { key: 'action', label: 'Aksi', getValue: (l) => actionLabels[l.action] || l.action },
    { key: 'entity_type', label: 'Tipe' },
    { key: 'entity_id', label: 'ID' },
  ];
  
  const csv = arrayToCSV(logs, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `audit-log-spnb-${date}.csv`);
  toast(`${logs.length} log berhasil diekspor.`);
}

// ============ NOTIFICATION SYSTEM ============

// Notification types and their configs
const notificationConfig = {
  card_activated: {
    icon: 'check',
    color: 'green',
    getTitle: (n) => 'Kartu Diaktifkan',
    getMessage: (n) => `${n.data?.serial || 'Kartu'} telah diaktifkan oleh ${n.data?.ownerName || 'owner baru'}.`
  },
  card_sold: {
    icon: 'card',
    color: 'blue',
    getTitle: (n) => 'Kartu Terjual',
    getMessage: (n) => `${n.data?.serial || 'Kartu'} ditandai terjual.`
  },
  stock_received: {
    icon: 'stock',
    color: 'blue',
    getTitle: (n) => 'Stok Diterima',
    getMessage: (n) => `${n.data?.count || 0} kartu baru diterima dari admin.`
  },
  profile_milestone: {
    icon: 'chart',
    color: 'violet',
    getTitle: (n) => 'Milestone Tercapai',
    getMessage: (n) => `Profil ${n.data?.businessName || 'Anda'} mencapai ${n.data?.count || 0} interaksi!`
  },
  new_review_click: {
    icon: 'star',
    color: 'orange',
    getTitle: (n) => 'Klik Google Rating',
    getMessage: (n) => `Seseorang mengklik tombol rating di ${n.data?.businessName || 'profil Anda'}.`
  },
  system: {
    icon: 'bell',
    color: 'blue',
    getTitle: (n) => n.title || 'Pemberitahuan',
    getMessage: (n) => n.message || ''
  }
};

// Generate demo notifications based on role
function generateDemoNotifications(role) {
  const now = Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  if (role === 'owner') {
    return [
      { id: '1', type: 'new_review_click', data: { businessName: 'Kopi Nusantara' }, read: false, created_at: new Date(now - 5 * minute).toISOString() },
      { id: '2', type: 'profile_milestone', data: { businessName: 'Kopi Nusantara', count: 500 }, read: false, created_at: new Date(now - 2 * hour).toISOString() },
      { id: '3', type: 'new_review_click', data: { businessName: 'Kopi Nusantara' }, read: true, created_at: new Date(now - 5 * hour).toISOString() },
      { id: '4', type: 'system', title: 'Selamat Datang!', message: 'Kartu Anda sudah aktif. Letakkan di kasir untuk mulai mengumpulkan ulasan.', read: true, created_at: new Date(now - 1 * day).toISOString() },
    ];
  }
  
  if (role === 'reseller') {
    return [
      { id: '1', type: 'card_activated', data: { serial: 'KRT-000127', ownerName: 'Siti Rahma' }, read: false, created_at: new Date(now - 10 * minute).toISOString() },
      { id: '2', type: 'card_activated', data: { serial: 'KRT-000125', ownerName: 'Budi Santoso' }, read: false, created_at: new Date(now - 3 * hour).toISOString() },
      { id: '3', type: 'stock_received', data: { count: 20 }, read: true, created_at: new Date(now - 1 * day).toISOString() },
      { id: '4', type: 'card_sold', data: { serial: 'KRT-000126' }, read: true, created_at: new Date(now - 2 * day).toISOString() },
    ];
  }
  
  if (role === 'admin') {
    return [
      { id: '1', type: 'card_activated', data: { serial: 'KRT-000127', ownerName: 'Siti Rahma' }, read: false, created_at: new Date(now - 15 * minute).toISOString() },
      { id: '2', type: 'system', title: 'Batch Selesai', message: 'Batch BTH-0018 (100 kartu) siap didistribusikan.', read: false, created_at: new Date(now - 1 * hour).toISOString() },
      { id: '3', type: 'card_sold', data: { serial: 'KRT-000126' }, read: true, created_at: new Date(now - 4 * hour).toISOString() },
      { id: '4', type: 'stock_received', data: { count: 50, resellerName: 'Reseller Bandung' }, read: true, created_at: new Date(now - 1 * day).toISOString() },
    ];
  }
  
  return [];
}

// Load notifications
async function loadNotifications() {
  state.notificationsLoading = true;
  
  if (!USE_REAL_DATA) {
    // Demo mode
    await new Promise(resolve => setTimeout(resolve, 300));
    const role = currentRoles.includes('admin') ? 'admin' : 
                 currentRoles.includes('reseller') ? 'reseller' : 'owner';
    state.notifications = generateDemoNotifications(role);
    state.unreadCount = state.notifications.filter(n => !n.read).length;
    state.notificationsLoading = false;
    return;
  }
  
  try {
    // In production, fetch from a notifications table
    // For now, we'll generate based on recent audit_log entries
    const { data: logs } = await supabaseClient
      .from('audit_log')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(20);
    
    // Transform audit logs to notifications
    const notifications = (logs || []).map(log => {
      let type = 'system';
      let data = {};
      
      if (log.action === 'card_claimed') {
        type = 'card_activated';
        data = { serial: log.entity_id, ownerName: log.new_values?.owner_name };
      } else if (log.action === 'card_marked_sold') {
        type = 'card_sold';
        data = { serial: log.entity_id };
      } else if (log.action === 'cards_allocated') {
        type = 'stock_received';
        data = { count: log.new_values?.card_count };
      }
      
      return {
        id: log.id?.toString(),
        type,
        data,
        read: false, // Would need a separate read status table
        created_at: log.occurred_at
      };
    });
    
    state.notifications = notifications;
    state.unreadCount = notifications.filter(n => !n.read).length;
  } catch (e) {
    console.error('loadNotifications error:', e);
    state.notifications = [];
  }
  
  state.notificationsLoading = false;
}

// Mark notification as read
async function markNotificationRead(notificationId) {
  const notification = state.notifications.find(n => n.id === notificationId);
  if (notification && !notification.read) {
    notification.read = true;
    state.unreadCount = Math.max(0, state.unreadCount - 1);
    
    // In production, update the database
    // await supabaseClient.from('notifications').update({ read: true }).eq('id', notificationId);
  }
}

// Mark all as read
async function markAllNotificationsRead() {
  state.notifications.forEach(n => n.read = true);
  state.unreadCount = 0;
  
  // In production, update all in database
  toast('Semua notifikasi ditandai sudah dibaca.');
}

// Format relative time
function formatRelativeTime(dateString) {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diff = now - date;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  
  if (diff < minute) return 'Baru saja';
  if (diff < hour) return `${Math.floor(diff / minute)} menit lalu`;
  if (diff < day) return `${Math.floor(diff / hour)} jam lalu`;
  if (diff < week) return `${Math.floor(diff / day)} hari lalu`;
  return formatDate(dateString);
}

// Render notification item
function renderNotificationItem(notification) {
  const config = notificationConfig[notification.type] || notificationConfig.system;
  const title = config.getTitle(notification);
  const message = config.getMessage(notification);
  const time = formatRelativeTime(notification.created_at);
  
  return `
    <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-notification-id="${notification.id}">
      <div class="notification-icon ${config.color}">${icons[config.icon]}</div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        <div class="notification-time">${time}</div>
      </div>
      ${!notification.read ? '<div class="notification-dot"></div>' : ''}
    </div>
  `;
}

// Render notification panel
function renderNotificationPanel() {
  if (!state.showNotificationPanel) return '';
  
  const notifications = state.notifications || [];
  
  return `
    <div class="notification-panel" id="notificationPanel">
      <div class="notification-header">
        <h3>Notifikasi</h3>
        ${state.unreadCount > 0 ? `
          <button class="text-link" data-mark-all-read>Tandai semua dibaca</button>
        ` : ''}
      </div>
      <div class="notification-list">
        ${state.notificationsLoading ? `
          <div class="notification-loading">
            <div class="loading-spinner" style="width:24px;height:24px"></div>
          </div>
        ` : notifications.length === 0 ? `
          <div class="notification-empty">
            <span>${icons.bell}</span>
            <p>Tidak ada notifikasi</p>
          </div>
        ` : notifications.map(n => renderNotificationItem(n)).join('')}
      </div>
    </div>
  `;
}

// Get activity feed for dashboard
async function getActivityFeed(role, limit = 5) {
  if (!USE_REAL_DATA) {
    // Demo activity based on role
    const now = Date.now();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    
    if (role === 'owner') {
      return [
        { icon: 'nfc', title: 'NFC disentuh', subtitle: 'Kartu KRT-000125', time: '2 menit' },
        { icon: 'star', title: 'Google Rating diklik', subtitle: 'Kopi Nusantara', time: '12 menit' },
        { icon: 'qr', title: 'QR dipindai', subtitle: 'Kartu KRT-000127', time: '28 menit' },
        { icon: 'phone', title: 'WhatsApp diklik', subtitle: 'Profil bisnis', time: '1 jam' },
        { icon: 'eye', title: 'Profil dilihat', subtitle: 'Kopi Nusantara', time: '1 jam' },
      ];
    }
    
    if (role === 'reseller') {
      return [
        { icon: 'check', title: 'KRT-000127 diaktifkan', subtitle: 'Owner: 0812••••7890', time: '10 menit' },
        { icon: 'card', title: 'KRT-000126 ditandai terjual', subtitle: 'Menunggu aktivasi', time: '3 jam' },
        { icon: 'stock', title: '10 kartu diterima', subtitle: 'Dari Admin', time: 'Kemarin' },
        { icon: 'check', title: 'KRT-000124 diaktifkan', subtitle: 'Owner: 0857••••2210', time: '2 hari' },
      ];
    }
    
    if (role === 'admin') {
      return [
        { icon: 'card', title: 'Batch BTH-0018 dibuat', subtitle: '100 kartu', time: '10:32' },
        { icon: 'stock', title: '20 kartu ke Reseller Bandung', subtitle: 'Distribusi', time: '09:48' },
        { icon: 'user', title: 'Reset akun Siti Rahma', subtitle: 'Link dibuat', time: 'Kemarin' },
        { icon: 'check', title: 'KRT-000127 diaktifkan', subtitle: 'Owner baru', time: 'Kemarin' },
      ];
    }
    
    return [];
  }
  
  try {
    // Fetch recent activity from appropriate source based on role
    if (role === 'owner') {
      const businessIds = state.ownerData?.businesses?.map(b => b.id) || [];
      if (businessIds.length === 0) return [];
      
      const { data: events } = await supabaseClient
        .from('interaction_events')
        .select('event_type, token_kind, occurred_at, cards(serial), businesses(name)')
        .in('business_id', businessIds)
        .order('occurred_at', { ascending: false })
        .limit(limit);
      
      return (events || []).map(e => {
        const eventIcons = {
          'qr_scan': 'qr',
          'nfc_tap': 'nfc',
          'profile_view': 'eye',
          'profile_link_click': 'star'
        };
        const eventTitles = {
          'qr_scan': 'QR dipindai',
          'nfc_tap': 'NFC disentuh',
          'profile_view': 'Profil dilihat',
          'profile_link_click': 'Tombol diklik'
        };
        return {
          icon: eventIcons[e.event_type] || 'chart',
          title: eventTitles[e.event_type] || e.event_type,
          subtitle: e.cards?.serial || e.businesses?.name || '-',
          time: formatRelativeTime(e.occurred_at)
        };
      });
    }
    
    // For reseller and admin, use audit_log
    const { data: logs } = await supabaseClient
      .from('audit_log')
      .select('action, entity_id, occurred_at, new_values')
      .order('occurred_at', { ascending: false })
      .limit(limit);
    
    const actionConfig = {
      'cards_allocated': { icon: 'stock', title: 'Kartu didistribusikan' },
      'card_marked_sold': { icon: 'card', title: 'Kartu ditandai terjual' },
      'card_claimed': { icon: 'check', title: 'Kartu diaktifkan' },
      'card_sale_reversed': { icon: 'close', title: 'Penjualan dibatalkan' },
    };
    
    return (logs || []).map(l => {
      const config = actionConfig[l.action] || { icon: 'log', title: l.action };
      return {
        icon: config.icon,
        title: config.title,
        subtitle: l.entity_id || '-',
        time: formatRelativeTime(l.occurred_at)
      };
    });
  } catch (e) {
    console.error('getActivityFeed error:', e);
    return [];
  }
}

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
    
    return { cards, resellers, cardStats };
  } catch (e) {
    console.error('Error loading admin data:', e);
    return null;
  }
}

// Initialize connection check
checkSupabaseConnection();

const state = {
  mobileMenu: false,
  loginError: '',
  loginLoading: false,
  // Loaded data from database
  ownerData: null,
  resellerData: null,
  adminData: null,
  // Stats
  ownerStats: null,
  statsLoading: false,
  statsPeriod: 30,
  adminStats: null,
  adminStatsLoading: false,
  adminStatsPeriod: 30,
  // Image upload
  uploadingLogo: false,
  uploadingBanner: false,
  // Notifications
  notifications: [],
  notificationsLoading: false,
  unreadCount: 0,
  showNotificationPanel: false,
  // Activation flow state
  activation: {
    step: 1,
    // Token from QR code
    token: null,
    claimSessionToken: null,
    // Card info from token validation
    cardId: null,
    cardSerial: null,
    cardStatus: null, // 'valid', 'invalid', 'already_claimed', 'not_sold'
    errorMessage: null,
    // Auth mode: 'login' or 'register'
    authMode: 'register',
    // Registration fields
    email: "",
    phone: "",
    password: "",
    confirm: "",
    displayName: "",
    // Business selection
    selectedBusinessId: null,
    existingBusinesses: [],
    createNewBusiness: true,
    // New business fields
    businessName: "",
    businessSlug: "",
    googleReviewUrl: "",
    // Destination mode
    destinationMode: "direct_google",
    // Processing state
    isLoading: false,
    isSubmitting: false,
  },
  resellerCards: [
    { serial: "KRT-000125", status: "stock", date: "—", owner: "—" },
    { serial: "KRT-000126", status: "sold", date: "12 Okt 2026", owner: "Menunggu aktivasi" },
    { serial: "KRT-000127", status: "active", date: "11 Okt 2026", owner: "0812••••7890" },
    { serial: "KRT-000128", status: "stock", date: "—", owner: "—" },
    { serial: "KRT-000129", status: "active", date: "8 Okt 2026", owner: "0857••••2210" },
  ],
  // Demo business profile data
  businessProfile: {
    name: "Kopi Nusantara",
    description: "Kopi lokal pilihan dan tempat berkumpul yang nyaman. Buka setiap hari pukul 08.00–22.00.",
    address: "Jl. Merdeka No. 24, Bandung",
    logoUrl: "",
    bannerUrl: "",
    themeColor: "#1769c2",
    googleReviewUrl: "https://g.page/r/contoh/review",
    whatsapp: "081234567890",
    mapsUrl: "https://maps.app.goo.gl/contoh",
    instagram: "@kopinusantara",
    website: "https://kopinusantara.id",
  },
};

const iconPaths = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>',
  business: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
  chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 3.2 2.3c-.9.4-.9 1.1-.9 1.7"/><path d="M12 17h.01"/>',
  stock: '<path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/>',
  reseller: '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0"/><path d="M14 14a4.5 4.5 0 0 1 7.5 3.4"/>',
  log: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  setting: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
  scan: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><path d="M8 12h8"/>',
  nfc: '<path d="M6.5 7.5a6.4 6.4 0 0 1 0 9M10 9.8a3.2 3.2 0 0 1 0 4.4M14 5a10 10 0 0 1 0 14"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  phone: '<path d="M8.5 3H5.8A2.8 2.8 0 0 0 3 5.8 15.2 15.2 0 0 0 18.2 21a2.8 2.8 0 0 0 2.8-2.8v-2.7l-4-1.2-1.2 2.4a12 12 0 0 1-8.5-8.5L9.7 7l-1.2-4Z"/>',
  map: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  link: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 20h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  share: '<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"/>',
};

function icon(name, className = "") {
  const path = iconPaths[name] || iconPaths.help;
  return `<svg class="svg-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

const icons = new Proxy({}, { get: (_, name) => icon(name) });

function brandLogo() {
  return `<svg class="brand-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="url(#brand-grad)"/>
    <path d="M12 28V12h6.5c1.8 0 3.2.45 4.2 1.35 1 .9 1.5 2.1 1.5 3.6 0 1-.25 1.85-.75 2.55-.5.7-1.2 1.2-2.1 1.5v.1c1.1.2 2 .7 2.65 1.5.65.8.98 1.8.98 3 0 1.7-.55 3-1.65 3.9-1.1.9-2.6 1.35-4.5 1.35H12v.15zm4-10.2h2.2c.8 0 1.4-.18 1.8-.55.4-.37.6-.9.6-1.6 0-.65-.2-1.15-.6-1.5-.4-.35-1-.52-1.8-.52H16v4.17zm0 3.2v4.8h2.7c.85 0 1.5-.2 1.95-.6.45-.4.68-1 .68-1.8 0-.75-.23-1.32-.7-1.7-.47-.38-1.13-.57-2-.57H16v-.13z" fill="#fff"/>
    <circle cx="30" cy="12" r="4" fill="#4AE3B5"/>
    <defs><linearGradient id="brand-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1a6fd1"/><stop offset="1" stop-color="#0f4c8a"/>
    </linearGradient></defs>
  </svg>`;
}

function brand(link = "#/") {
  return `
    <a class="brand" href="${link}" aria-label="SPNB DIGITAL">
      <span class="brand-mark">${brandLogo()}</span>
      <span class="brand-word">SPNB<span>DIGITAL</span></span>
    </a>`;
}

function getRoute() {
  const value = window.location.hash.replace(/^#/, "") || "/";
  return value.startsWith("/") ? value : "/";
}

function go(route) {
  if (getRoute() === route) {
    render();
  } else {
    window.location.hash = route;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function statusBadge(status) {
  const map = {
    active: ["Aktif", "status-active"],
    stock: ["Stok reseller", "status-stock"],
    admin: ["Stok admin", "status-stock"],
    sold: ["Terjual", "status-sold"],
    blocked: ["Diblokir", "status-blocked"],
    replaced: ["Diganti", "status-replaced"],
  };
  const item = map[status] || [status, "status-stock"];
  return `<span class="status ${item[1]}">${item[0]}</span>`;
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function publicHeader() {
  return `
    <header class="site-header">
      <div class="container nav">
        ${brand("#/")}
        <nav class="nav-links" aria-label="Navigasi utama">
          <a href="#/" data-scroll="manfaat">Manfaat</a>
          <a href="#/" data-scroll="cara-kerja">Cara Kerja</a>
          <a href="#/" data-scroll="fitur">Fitur</a>
          <a href="#/" data-scroll="faq">FAQ</a>
        </nav>
        <div class="nav-actions">
          <button class="btn btn-ghost" data-route="/login">Masuk</button>
          <a class="btn btn-primary" href="${whatsappUrl}" target="_blank" rel="noopener">Beli Kartu</a>
          <button class="icon-btn mobile-toggle" data-mobile-menu aria-label="Buka menu">${icons.menu}</button>
        </div>
      </div>
      ${state.mobileMenu ? `
        <nav class="mobile-menu">
          <a href="#/" data-scroll="manfaat">Manfaat</a>
          <a href="#/" data-scroll="cara-kerja">Cara Kerja</a>
          <a href="#/" data-scroll="fitur">Fitur</a>
          <a href="#/" data-scroll="faq">Pertanyaan Umum</a>
          <a href="#/login">Masuk ke Dashboard</a>
        </nav>` : ""}
    </header>`;
}

function homePage() {
  return `
    ${publicHeader()}
    <main>
      <section class="hero">
        <div class="container hero-grid">
          <div class="hero-copy">
            <span class="eyebrow">Solusi digital untuk UMKM</span>
            <h1>Ulasan Google, cukup <span class="blue-text">satu sentuhan.</span></h1>
            <p>Bantu pelanggan menemukan dan memberikan ulasan untuk bisnis Anda. Cukup tempelkan ponsel ke kartu NFC atau pindai QR—cepat, praktis, tanpa aplikasi.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="${whatsappUrl}" target="_blank" rel="noopener">${icons.phone} Beli via WhatsApp</a>
              <button class="btn btn-secondary" data-route="/aktivasi">Lihat Demo Aktivasi ${icons.link}</button>
            </div>
            <div class="hero-note">
              <span>Aktif selamanya</span>
              <span>Tanpa aplikasi</span>
              <span>Bisa diubah kapan saja</span>
            </div>
          </div>
          <div class="hero-visual" aria-label="Mockup kartu Google Review SPNB DIGITAL">
            <div class="visual-blob"></div>
            <img class="product-photo" src="mockup.jpeg" alt="Mockup kartu Google Review NFC dan QR" />
            <div class="float-card float-one">
              <div class="row"><span class="icon-bubble">${icons.nfc}</span><div>NFC siap digunakan<small>Tempel, lalu beri ulasan</small></div></div>
            </div>
            <div class="float-card float-two">
              <div class="row"><span class="icon-bubble">${icons.star}</span><div>4,9 Google Rating<small>Lebih mudah dijangkau</small></div></div>
            </div>
          </div>
        </div>
      </section>

      <div class="logo-strip">
        <div class="container logo-strip-inner">
          <span>Dibuat untuk bisnis yang ingin tumbuh</span>
          <div class="logo-strip-items">
            <span class="mini-pill">Kuliner</span><span class="mini-pill">Salon</span>
            <span class="mini-pill">Retail</span><span class="mini-pill">Jasa</span><span class="mini-pill">Hospitality</span>
          </div>
        </div>
      </div>

      <section class="section" id="manfaat">
        <div class="container">
          <div class="section-heading center">
            <span class="eyebrow">Lebih dari sekadar kartu</span>
            <h2>Cara termudah mendekatkan pelanggan dengan bisnis Anda</h2>
            <p>Satu kartu untuk mengarahkan pelanggan ke Google Rating atau profil digital bisnis yang lengkap.</p>
          </div>
          <div class="grid-3">
            <article class="feature-card">
              <div class="feature-icon">${icons.nfc}</div><h3>Tap atau scan</h3>
              <p>Gunakan NFC dan QR unik. Pelanggan tidak perlu memasang aplikasi tambahan.</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">${icons.star}</div><h3>Ulasan lebih mudah</h3>
              <p>Arahkan pelanggan langsung ke halaman Google Rating dengan langkah sesingkat mungkin.</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">${icons.link}</div><h3>Profil digital bisnis</h3>
              <p>Tampilkan WhatsApp, lokasi, media sosial, website, dan tombol rating dalam satu halaman.</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">${icons.chart}</div><h3>Statistik interaksi</h3>
              <p>Pantau jumlah scan QR, tap NFC, tampilan profil, dan klik tombol bisnis.</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">${icons.setting}</div><h3>Bebas mengganti tujuan</h3>
              <p>Ubah antara Google Rating dan profil bisnis kapan saja tanpa mencetak kartu baru.</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">∞</div><h3>Aktif selamanya</h3>
              <p>Satu kali pembelian. Kartu dan halaman bisnis dapat terus digunakan tanpa masa kedaluwarsa.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section section-soft" id="cara-kerja">
        <div class="container how-grid">
          <div class="how-image"><img src="mockup.jpeg" alt="Kartu NFC SPNB DIGITAL" /></div>
          <div>
            <span class="eyebrow">Cara kerja</span>
            <h2>Siap digunakan hanya dalam beberapa menit</h2>
            <p>Tidak ada proses teknis yang rumit. Aktifkan sekali, lalu gunakan selama bisnis Anda berjalan.</p>
            <div class="step-list">
              <div class="step"><div class="step-no">01</div><div><h3>Beli dan pindai QR</h3><p>Setelah reseller menandai kartu terjual, pindai QR untuk memulai aktivasi.</p></div></div>
              <div class="step"><div class="step-no">02</div><div><h3>Daftarkan bisnis</h3><p>Buat akun dengan nomor HP dan password, lalu masukkan profil serta link Google.</p></div></div>
              <div class="step"><div class="step-no">03</div><div><h3>Pilih tujuan kartu</h3><p>Arahkan pelanggan langsung ke Google Rating atau ke halaman profil bisnis.</p></div></div>
              <div class="step"><div class="step-no">04</div><div><h3>Letakkan dan gunakan</h3><p>Taruh kartu di kasir, meja, atau area pelayanan agar mudah dijangkau pelanggan.</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section" id="fitur">
        <div class="container">
          <div class="section-heading center">
            <span class="eyebrow">Satu kartu, dua pilihan</span>
            <h2>Pilih pengalaman yang paling cocok untuk pelanggan</h2>
            <p>Setiap kartu dapat memiliki mode berbeda dan bisa diganti kapan saja melalui dashboard owner.</p>
          </div>
          <div class="mode-grid">
            <article class="mode-card">
              <span class="mode-tag">Paling cepat</span>
              <div class="feature-icon">${icons.star}</div>
              <h3>Langsung ke Google Rating</h3>
              <p>Pelanggan langsung membuka halaman ulasan Google setelah tap NFC atau scan QR.</p>
              <ul><li>Alur pemberian ulasan lebih singkat</li><li>Cocok ditempatkan di kasir dan meja</li><li>Scan QR dan tap NFC tercatat terpisah</li></ul>
            </article>
            <article class="mode-card">
              <span class="mode-tag">Profil lebih lengkap</span>
              <div class="feature-icon">${icons.link}</div>
              <h3>Halaman Profil Bisnis</h3>
              <p>Bangun halaman mini untuk menghubungkan pelanggan dengan seluruh kanal bisnis Anda.</p>
              <ul><li>Google Rating, WhatsApp, dan lokasi</li><li>Instagram, TikTok, Facebook, website</li><li>Slug nama usaha dan tema yang dapat diatur</li></ul>
            </article>
          </div>
        </div>
      </section>

      <section class="section section-soft">
        <div class="container how-grid">
          <div>
            <span class="eyebrow">Kelola dengan mudah</span>
            <h2>Semua kartu dan interaksi dalam satu dashboard</h2>
            <p>Owner dapat mengelola banyak kartu dan profil usaha. Admin serta reseller juga memiliki akses khusus sesuai kebutuhan masing-masing.</p>
            <div class="hero-actions">
              <button class="btn btn-primary" data-route="/login">Buka Demo Dashboard</button>
              <button class="btn btn-secondary" data-route="/profil">Lihat Contoh Profil</button>
            </div>
          </div>
          <div class="dashboard-preview">
            <div class="preview-window">
              <div class="preview-bar"><i class="dot"></i><i class="dot"></i><i class="dot"></i></div>
              <div class="preview-content">
                <div class="preview-side"><div class="active">Ringkasan</div><div>Kartu Saya</div><div>Profil Usaha</div><div>Statistik</div><div>Akun</div></div>
                <div class="preview-main">
                  <h3>Ringkasan Bisnis</h3>
                  <div class="stat-mini-grid">
                    <div class="stat-mini">Kartu Aktif<b>3</b></div><div class="stat-mini">Interaksi<b>426</b></div><div class="stat-mini">Klik Rating<b>184</b></div>
                  </div>
                  <div class="chart-fake">
                    <i style="height:35%"></i><i style="height:48%"></i><i style="height:43%"></i><i style="height:69%"></i><i style="height:62%"></i><i style="height:88%"></i><i style="height:77%"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section" id="faq">
        <div class="container">
          <div class="section-heading center"><span class="eyebrow">Pertanyaan umum</span><h2>Hal yang sering ditanyakan</h2></div>
          <div class="faq-list">
            ${faq("Apakah pelanggan perlu menginstal aplikasi?", "Tidak. NFC dan QR akan membuka tautan melalui browser ponsel tanpa aplikasi khusus.")}
            ${faq("Apakah kartu memiliki masa aktif?", "Tidak. Kartu aktif selamanya dan dapat terus digunakan setelah proses aktivasi selesai.")}
            ${faq("Bisakah tujuan kartu diganti?", "Bisa. Owner bebas mengganti mode langsung ke Google Rating atau halaman profil bisnis kapan saja.")}
            ${faq("Apakah satu usaha boleh memiliki beberapa kartu?", "Boleh. Beberapa kartu dapat menggunakan satu profil usaha yang sama, tetapi statistik setiap kartu tetap dipisahkan.")}
            ${faq("Apakah SPNB DIGITAL dapat mengetahui siapa yang memberi ulasan?", "Tidak. Sistem mencatat scan, tap, tampilan, dan klik tombol. Hasil ulasan tetap berada di layanan Google.")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="cta-box">
            <div><h2>Siap membuat bisnis Anda lebih mudah ditemukan?</h2><p>Mulai dengan satu kartu Google Review dari SPNB DIGITAL.</p></div>
            <a class="btn btn-white" href="${whatsappUrl}" target="_blank" rel="noopener">${icons.phone} Pesan via WhatsApp</a>
          </div>
        </div>
      </section>
    </main>
    ${footer()}`;
}

function homePageV2() {
  return `
    ${publicHeader()}
    <main class="site-v2">
      <section class="hero-v2">
        <div class="container hero-v2-grid">
          <div class="hero-v2-copy">
            <span class="product-label">Kartu Google Review NFC + QR</span>
            <h1>Permudah pelanggan membuka halaman ulasan Google Anda.</h1>
            <p>Letakkan kartu di meja atau kasir. Pelanggan cukup menempelkan ponsel atau memindai QR untuk membuka Google Rating atau profil bisnis Anda.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="${whatsappUrl}" target="_blank" rel="noopener">Pesan melalui WhatsApp</a>
              <button class="text-link" data-route="/aktivasi">Lihat proses aktivasi ${icons.link}</button>
            </div>
            <p class="purchase-note">Aktif selamanya · Tidak perlu aplikasi · Tujuan kartu dapat diganti</p>
          </div>
          <figure class="product-figure">
            <img src="mockup.jpeg" alt="Kartu Google Review SPNB DIGITAL di atas meja" />
            <figcaption>Kartu siap pakai dengan NFC dan QR unik.</figcaption>
          </figure>
        </div>
      </section>

      <section class="fact-strip" aria-label="Informasi utama produk">
        <div class="container fact-grid">
          <div><strong>NFC + QR</strong><span>Dua cara akses dalam satu kartu</span></div>
          <div><strong>Tanpa aplikasi</strong><span>Terbuka langsung di browser</span></div>
          <div><strong>Dapat diubah</strong><span>Ganti tujuan tanpa cetak ulang</span></div>
          <div><strong>Data terpisah</strong><span>Scan QR dan tap NFC tercatat</span></div>
        </div>
      </section>

      <section class="section-v2" id="manfaat">
        <div class="container">
          <div class="plain-heading"><span class="section-index">01</span><div><h2>Dibuat untuk dipakai di tempat usaha</h2><p>Bukan sekadar tautan digital. Kartu dirancang untuk masuk ke alur pelayanan yang sudah berjalan.</p></div></div>
          <div class="use-case-list">
            <article class="use-case"><span class="use-case-no">A</span><div><h3>Di meja kasir</h3><p>Staf dapat meminta pelanggan membuka halaman rating setelah transaksi selesai.</p></div></article>
            <article class="use-case"><span class="use-case-no">B</span><div><h3>Di meja pelanggan</h3><p>Pelanggan dapat mengakses rating, menu, lokasi, dan WhatsApp tanpa menunggu staf.</p></div></article>
            <article class="use-case"><span class="use-case-no">C</span><div><h3>Untuk beberapa cabang</h3><p>Gunakan profil dan link Google yang berbeda untuk setiap cabang dalam satu akun owner.</p></div></article>
          </div>
        </div>
      </section>

      <section class="section-v2 section-rule" id="cara-kerja">
        <div class="container">
          <div class="plain-heading"><span class="section-index">02</span><div><h2>Dari pembelian sampai kartu aktif</h2><p>Aktivasi dilakukan sendiri oleh pemilik usaha melalui QR pada kartu.</p></div></div>
          <ol class="process-list">
            <li><span>1</span><div><strong>Reseller menandai kartu terjual</strong><p>Kartu belum dapat diklaim sebelum transaksi dikonfirmasi oleh reseller.</p></div></li>
            <li><span>2</span><div><strong>Owner memindai QR dan membuat akun</strong><p>Cukup gunakan nomor HP dan password. Akun yang sama dapat memiliki beberapa kartu.</p></div></li>
            <li><span>3</span><div><strong>Masukkan profil dan link Google</strong><p>Link dapat diuji terlebih dahulu agar tujuan kartu tidak salah.</p></div></li>
            <li><span>4</span><div><strong>Pilih tujuan lalu aktifkan</strong><p>Setelah aktif, QR dan NFC akan menggunakan pengaturan yang dipilih owner.</p></div></li>
          </ol>
        </div>
      </section>

      <section class="section-v2 mode-section" id="fitur">
        <div class="container">
          <div class="plain-heading"><span class="section-index">03</span><div><h2>Satu kartu, dua cara penggunaan</h2><p>Pengaturan dapat diganti kapan saja dari dashboard tanpa mengubah isi NFC atau mencetak QR baru.</p></div></div>
          <div class="mode-table">
            <article>
              <header><span class="mode-symbol">${icons.star}</span><div><h3>Langsung ke Google Rating</h3><p>Untuk alur ulasan yang paling singkat.</p></div></header>
              <dl><div><dt>Setelah tap / scan</dt><dd>Google Rating langsung terbuka</dd></div><div><dt>Cocok digunakan</dt><dd>Kasir, meja pembayaran, resepsionis</dd></div><div><dt>Data yang tercatat</dt><dd>Jumlah tap dan scan, bukan hasil ulasan</dd></div></dl>
            </article>
            <article>
              <header><span class="mode-symbol">${icons.business}</span><div><h3>Halaman Profil Bisnis</h3><p>Untuk menampilkan beberapa tujuan bisnis.</p></div></header>
              <dl><div><dt>Setelah tap / scan</dt><dd>Profil usaha milik owner terbuka</dd></div><div><dt>Isi halaman</dt><dd>Rating, WhatsApp, lokasi, sosial media</dd></div><div><dt>Alamat halaman</dt><dd>Slug nama usaha yang dapat diubah</dd></div></dl>
            </article>
          </div>
          <div class="inline-actions"><button class="btn btn-secondary" data-route="/profil">Lihat contoh profil bisnis</button><button class="btn btn-ghost" data-route="/owner">Lihat dashboard owner</button></div>
        </div>
      </section>

      <section class="section-v2 section-rule">
        <div class="container practical-grid">
          <div>
            <span class="section-index">04</span>
            <h2>Hal yang perlu diketahui sebelum membeli</h2>
            <p>Informasi praktis agar kartu digunakan sesuai fungsinya.</p>
          </div>
          <div class="practical-list">
            <div><strong>Kompatibilitas</strong><p>NFC bekerja pada ponsel yang mendukung NFC. QR dapat digunakan sebagai alternatif pada semua ponsel berkamera.</p></div>
            <div><strong>Statistik</strong><p>Dashboard mencatat interaksi pada kartu dan tombol. Sistem tidak dapat memastikan pelanggan benar-benar mengirim ulasan di Google.</p></div>
            <div><strong>Perubahan link</strong><p>Owner dapat mengganti link Google dan mode tujuan tanpa menulis ulang tag NFC.</p></div>
            <div><strong>Pemulihan akun</strong><p>Karena pendaftaran tidak memakai OTP, reset password dibantu oleh admin SPNB DIGITAL.</p></div>
          </div>
        </div>
      </section>

      <section class="section-v2 faq-v2" id="faq">
        <div class="container faq-v2-grid">
          <div><span class="section-index">05</span><h2>Pertanyaan yang sering muncul</h2><p>Belum menemukan jawaban? Hubungi SPNB DIGITAL melalui WhatsApp.</p></div>
          <div class="faq-list">
            ${faq("Apakah pelanggan harus menginstal aplikasi?", "Tidak. NFC dan QR membuka tautan melalui browser ponsel.")}
            ${faq("Apakah kartu memiliki biaya bulanan?", "Untuk rancangan produk ini, kartu aktif selamanya dan tidak memiliki masa perpanjangan.")}
            ${faq("Bisakah beberapa kartu memakai satu profil?", "Bisa. Statistik setiap kartu tetap dipisahkan walaupun menggunakan profil usaha yang sama.")}
            ${faq("Apakah jumlah klik sama dengan jumlah ulasan?", "Tidak. Klik hanya menunjukkan pelanggan membuka tombol Google Rating. Hasil ulasan tetap berada di Google.")}
          </div>
        </div>
      </section>

      <section class="order-section">
        <div class="container order-inner">
          <div><span class="product-label">Pemesanan</span><h2>Pesan kartu SPNB DIGITAL melalui WhatsApp.</h2><p>Tanyakan ketersediaan, harga, dan proses pengiriman kepada tim kami.</p></div>
          <a class="btn btn-primary" href="${whatsappUrl}" target="_blank" rel="noopener">Hubungi 0895-3867-63040</a>
        </div>
      </section>
    </main>
    ${footer()}`;
}

function faq(question, answer) {
  return `<div class="faq-item"><button class="faq-question"><span>${question}</span><span class="faq-plus">+</span></button><div class="faq-answer"><p>${answer}</p></div></div>`;
}

function footer() {
  return `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">${brand("#/")}<p>Solusi kartu NFC dan QR untuk membantu UMKM membangun reputasi serta profil digital yang mudah diakses.</p></div>
          <div><div class="footer-title">Produk</div><div class="footer-links"><a href="#/" data-scroll="manfaat">Manfaat</a><a href="#/" data-scroll="cara-kerja">Cara Kerja</a><a href="#/profil">Contoh Profil</a><a href="${whatsappUrl}" target="_blank">Beli Kartu</a></div></div>
          <div><div class="footer-title">Akun</div><div class="footer-links"><a href="#/login">Masuk</a><a href="#/aktivasi">Aktivasi Kartu</a><a href="#/login">Dashboard</a><a href="${whatsappUrl}" target="_blank">Bantuan</a></div></div>
        </div>
        <div class="footer-bottom"><span>© 2026 SPNB DIGITAL. Seluruh hak dilindungi.</span><span>Dibuat untuk pertumbuhan UMKM Indonesia.</span></div>
      </div>
    </footer>`;
}

function loginPage() {
  const loginError = state.loginError || '';
  const loginLoading = state.loginLoading || false;
  
  return `
    <div class="activation-page">
      <div class="activation-wrap" style="max-width:900px">
        <div class="activation-brand">${brand("#/")}</div>
        <div class="activation-card login-card">
          <aside class="activation-aside">
            <div class="login-aside-content">
              <h2>Selamat datang di SPNB DIGITAL</h2>
              <p>Platform manajemen kartu Google Review untuk UMKM Indonesia.</p>
              <div class="login-features">
                <div class="login-feature">${icons.card}<span>Kelola kartu NFC & QR</span></div>
                <div class="login-feature">${icons.chart}<span>Pantau statistik interaksi</span></div>
                <div class="login-feature">${icons.business}<span>Buat profil bisnis digital</span></div>
              </div>
            </div>
          </aside>
          <section class="activation-main">
            <div class="activation-head">
              <h1>Masuk ke Dashboard</h1>
              <p>Gunakan email dan password yang telah didaftarkan.</p>
            </div>
            
            ${loginError ? `<div class="error-box">${icons.help} ${loginError}</div>` : ''}
            
            <form id="loginForm" class="stack">
              <div class="form-group">
                <label>Email</label>
                <input class="input" type="email" id="loginEmail" placeholder="contoh@email.com" required />
              </div>
              <div class="form-group">
                <label>Password</label>
                <input class="input" type="password" id="loginPassword" placeholder="Masukkan password" required />
              </div>
              <div class="row-between">
                <label class="checkbox-label"><input type="checkbox" id="rememberMe" /> Ingat saya</label>
                <button type="button" class="text-link" data-demo-toast="Hubungi admin untuk reset password.">Lupa password?</button>
              </div>
              <button type="submit" class="btn btn-primary btn-block" ${loginLoading ? 'disabled' : ''}>
                ${loginLoading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
            
            <div class="login-divider"><span>atau login cepat demo</span></div>
            
            <div class="demo-roles">
              <button class="demo-role-card" data-quick-login="owner">
                <div class="demo-role-icon owner">${icons.user}</div>
                <div>
                  <strong>Owner</strong>
                  <span>owner@spnb.id</span>
                </div>
              </button>
              <button class="demo-role-card" data-quick-login="reseller">
                <div class="demo-role-icon reseller">${icons.reseller}</div>
                <div>
                  <strong>Reseller</strong>
                  <span>reseller@spnb.id</span>
                </div>
              </button>
              <button class="demo-role-card" data-quick-login="admin">
                <div class="demo-role-icon admin">${icons.setting}</div>
                <div>
                  <strong>Admin</strong>
                  <span>admin@spnb.id</span>
                </div>
              </button>
            </div>
            
            <p class="login-footer-text">Belum punya akun? <button class="text-link" data-route="/aktivasi">Aktivasi kartu baru</button></p>
          </section>
        </div>
      </div>
    </div>`;
}

function activationPage() {
  const a = state.activation;
  const steps = ["Verifikasi", "Akun", "Profil Usaha", "Tujuan"];
  
  // Loading state
  if (a.isLoading || a.cardStatus === 'validating') {
    return `
      <div class="activation-page">
        <div class="activation-wrap">
          <div class="activation-brand">${brand("#/")}</div>
          <div class="activation-card" style="text-align:center;padding:60px 40px">
            <div class="loading-spinner"></div>
            <h2 style="margin-top:24px">Memvalidasi Kartu...</h2>
            <p style="color:var(--muted)">Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>`;
  }
  
  // Error states
  if (a.step === 0 || ['invalid', 'already_claimed', 'not_sold', 'expired', 'error'].includes(a.cardStatus)) {
    return `
      <div class="activation-page">
        <div class="activation-wrap">
          <div class="activation-brand">${brand("#/")}</div>
          <div class="activation-card" style="max-width:500px">
            <section class="activation-main" style="text-align:center;padding:40px">
              <div class="error-icon" style="width:80px;height:80px;margin:0 auto 24px;border-radius:50%;background:var(--red-100);color:var(--red-600);display:flex;align-items:center;justify-content:center;font-size:40px">✕</div>
              <h1 style="margin-bottom:12px">${getActivationErrorTitle(a.cardStatus)}</h1>
              <p style="color:var(--muted);margin-bottom:24px">${a.errorMessage || 'Terjadi kesalahan saat memproses kartu.'}</p>
              ${getActivationErrorActions(a.cardStatus)}
            </section>
          </div>
        </div>
      </div>`;
  }
  
  // Get card status badge
  const cardStatusBadge = a.cardStatus === 'valid' || a.cardStatus === 'demo' 
    ? statusBadge("sold") 
    : `<span class="status status-stock">Memverifikasi</span>`;
  
  // Determine which step label to show based on login status
  const currentStepLabel = isLoggedIn() ? 
    (a.step === 3 ? "Langkah 1 dari 2" : "Langkah 2 dari 2") :
    `Langkah ${a.step} dari 4`;
  
  return `
    <div class="activation-page">
      <div class="activation-wrap">
        <div class="activation-brand">${brand("#/")}</div>
        <div class="activation-card">
          <aside class="activation-aside">
            <div class="card-preview">
              <div class="card-preview-visual">${icons.card}</div>
              <span class="card-serial">${a.cardSerial || 'KRT-XXXXXX'}</span>
              <span class="card-status">${a.cardStatus === 'valid' || a.cardStatus === 'demo' ? 'Siap Diaktifkan' : 'Memvalidasi...'}</span>
            </div>
            <h2>Aktivasi Kartu</h2>
            <p>Ikuti langkah berikut untuk mengaktifkan kartu Google Review Anda.</p>
            <div class="progress">
              ${steps.map((name, i) => `<div class="progress-item ${a.step === i + 1 ? "active" : ""} ${a.step > i + 1 ? "done" : ""}"><span class="progress-no">${a.step > i + 1 ? icons.check : i + 1}</span><span>${name}</span></div>`).join("")}
            </div>
            ${a.cardStatus === 'demo' && !a.token ? `
              <div class="info-box" style="margin-top:20px;background:var(--blue-50);border:1px solid var(--blue-200)">
                ${icons.help}
                <div>
                  <strong>Mode Demo</strong>
                  <p style="font-size:11px">Anda sedang melihat demo aktivasi. Untuk aktivasi nyata, scan QR pada kartu.</p>
                </div>
              </div>
            ` : ''}
          </aside>
          <section class="activation-main">${activationStep()}</section>
        </div>
      </div>
    </div>`;
}

function getActivationErrorTitle(status) {
  switch(status) {
    case 'already_claimed': return 'Kartu Sudah Diaktifkan';
    case 'not_sold': return 'Kartu Belum Tersedia';
    case 'expired': return 'Sesi Kedaluwarsa';
    case 'invalid': return 'Token Tidak Valid';
    default: return 'Aktivasi Gagal';
  }
}

function getActivationErrorActions(status) {
  switch(status) {
    case 'already_claimed':
      return `
        <p style="font-size:13px;color:var(--muted);margin-bottom:20px">Jika Anda adalah pemilik kartu ini, silakan login ke dashboard.</p>
        <div class="activation-actions" style="justify-content:center">
          <button class="btn btn-ghost" data-route="/">Kembali</button>
          <button class="btn btn-primary" data-route="/login">Login ke Dashboard</button>
        </div>`;
    case 'not_sold':
      return `
        <p style="font-size:13px;color:var(--muted);margin-bottom:20px">Hubungi reseller untuk menandai kartu sebagai terjual.</p>
        <div class="activation-actions" style="justify-content:center">
          <button class="btn btn-ghost" data-route="/">Kembali</button>
          <a class="btn btn-primary" href="${whatsappUrl}" target="_blank">Hubungi SPNB DIGITAL</a>
        </div>`;
    case 'expired':
      return `
        <p style="font-size:13px;color:var(--muted);margin-bottom:20px">Silakan scan ulang QR code pada kartu Anda.</p>
        <div class="activation-actions" style="justify-content:center">
          <button class="btn btn-primary" data-route="/">Kembali ke Beranda</button>
        </div>`;
    default:
      return `
        <div class="activation-actions" style="justify-content:center">
          <button class="btn btn-ghost" data-route="/">Kembali</button>
          <a class="btn btn-primary" href="${whatsappUrl}" target="_blank">Hubungi Bantuan</a>
        </div>`;
  }
}

function activationStep() {
  const a = state.activation;
  
  // Step 5: Success
  if (a.step === 5) {
    const businessName = a.businessName || a.existingBusinesses?.find(b => b.id === a.selectedBusinessId)?.name || 'Bisnis Anda';
    const businessSlug = a.businessSlug || a.existingBusinesses?.find(b => b.id === a.selectedBusinessId)?.business_slugs?.find(s => s.is_current)?.slug || 'profil';
    
    return `
      <div class="success-state">
        <div class="success-icon">${icons.check}</div>
        <h1>Kartu Berhasil Diaktifkan!</h1>
        <p>${a.cardSerial || 'Kartu'} sekarang terhubung ke <strong>${businessName}</strong></p>
        <div class="activation-result">
          <div><span>Nomor Kartu</span><strong>${a.cardSerial || 'KRT-XXXXXX'}</strong></div>
          <div><span>Profil Usaha</span><strong>${businessName}</strong></div>
          <div><span>Tujuan</span><strong>${a.destinationMode === "direct_google" ? "Google Rating" : "Profil Bisnis"}</strong></div>
          <div><span>Alamat</span><strong>spnb.id/${businessSlug}</strong></div>
        </div>
        <div class="success-actions">
          <button class="btn btn-primary" data-route="/owner">${icons.home} Buka Dashboard</button>
          <button class="btn btn-secondary" data-route="/profil">${icons.eye} Lihat Profil</button>
        </div>
      </div>`;
  }
  
  // Step 1: Verifikasi Kartu
  if (a.step === 1) {
    const isDemo = a.cardStatus === 'demo' && !a.token;
    
    return `
      <div class="activation-head">
        <span class="step-badge">Langkah 1 dari 4</span>
        <h1>Verifikasi Kartu</h1>
        <p>Pastikan nomor serial kartu sudah benar.</p>
      </div>
      <div class="verify-card-box">
        <div class="verify-card-icon">${icons.card}</div>
        <div class="verify-card-info">
          <span>Nomor Serial</span>
          <strong>${a.cardSerial || 'KRT-000126'}</strong>
        </div>
        ${statusBadge("sold")}
      </div>
      ${isDemo ? `
        <div class="info-box" style="background:var(--yellow-50);border:1px solid var(--yellow-200)">
          ${icons.help}
          <div>
            <strong>Ini adalah mode demo</strong>
            <p>Untuk aktivasi kartu asli, scan QR code yang tercetak pada kartu Anda.</p>
          </div>
        </div>
      ` : `
        <div class="info-box">
          ${icons.help}
          <div>
            <strong>Kartu siap diaktifkan</strong>
            <p>Kartu sudah ditandai terjual dan siap untuk diklaim. Lanjutkan untuk membuat akun.</p>
          </div>
        </div>
      `}
      <div class="activation-actions">
        <button class="btn btn-ghost" data-route="/">Batal</button>
        <button class="btn btn-primary" data-activation-next>Lanjutkan ${icons.link}</button>
      </div>`;
  }
  
  // Step 2: Buat Akun atau Login
  if (a.step === 2) {
    // If already logged in, skip to step 3
    if (isLoggedIn()) {
      loadUserBusinesses().then(() => {
        state.activation.step = 3;
        render();
      });
      return `<div style="text-align:center;padding:40px"><div class="loading-spinner"></div><p style="margin-top:16px">Memuat data...</p></div>`;
    }
    
    if (a.authMode === 'login') {
      return `
        <div class="activation-head">
          <span class="step-badge">Langkah 2 dari 4</span>
          <h1>Masuk ke Akun</h1>
          <p>Masuk dengan akun yang sudah terdaftar.</p>
        </div>
        <form id="activationLoginForm" class="stack">
          <div class="form-group">
            <label>Email <span class="required">*</span></label>
            <input class="input" name="email" type="email" value="${a.email}" placeholder="contoh@email.com" required />
          </div>
          <div class="form-group">
            <label>Password <span class="required">*</span></label>
            <input class="input" name="password" type="password" value="${a.password}" placeholder="Masukkan password" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block" ${a.isSubmitting ? 'disabled' : ''}>
            ${a.isSubmitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        <p style="text-align:center;margin-top:16px;font-size:13px">
          Belum punya akun? <button class="text-link" data-auth-mode="register">Daftar baru</button>
        </p>
        <div class="activation-actions" style="margin-top:24px">
          <button class="btn btn-ghost" data-activation-prev>← Kembali</button>
        </div>`;
    }
    
    // Registration form
    return `
      <div class="activation-head">
        <span class="step-badge">Langkah 2 dari 4</span>
        <h1>Buat Akun Owner</h1>
        <p>Akun ini untuk mengelola kartu dan profil bisnis Anda.</p>
      </div>
      <form id="activationRegisterForm" class="stack">
        <div class="form-grid">
          <div class="form-group full">
            <label>Nama Lengkap</label>
            <input class="input" name="displayName" type="text" value="${a.displayName}" placeholder="Nama Anda atau bisnis" />
          </div>
          <div class="form-group full">
            <label>Email <span class="required">*</span></label>
            <input class="input" name="email" type="email" value="${a.email}" placeholder="contoh@email.com" required />
            <span class="input-hint">Email ini akan digunakan untuk login.</span>
          </div>
          <div class="form-group full">
            <label>Nomor HP <span class="required">*</span></label>
            <input class="input" name="phone" type="tel" value="${a.phone}" placeholder="0812 3456 7890" required />
          </div>
          <div class="form-group">
            <label>Password <span class="required">*</span></label>
            <input class="input" name="password" type="password" value="${a.password}" placeholder="Minimal 8 karakter" required />
          </div>
          <div class="form-group">
            <label>Konfirmasi Password <span class="required">*</span></label>
            <input class="input" name="confirm" type="password" value="${a.confirm}" placeholder="Ulangi password" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" ${a.isSubmitting ? 'disabled' : ''}>
          ${a.isSubmitting ? 'Memproses...' : 'Daftar & Lanjutkan'}
        </button>
      </form>
      <p style="text-align:center;margin-top:16px;font-size:13px">
        Sudah punya akun? <button class="text-link" data-auth-mode="login">Masuk</button>
      </p>
      <div class="activation-actions" style="margin-top:24px">
        <button class="btn btn-ghost" data-activation-prev>← Kembali</button>
      </div>`;
  }
  
  // Step 3: Pilih/Buat Profil Usaha
  if (a.step === 3) {
    const hasExistingBusiness = a.existingBusinesses && a.existingBusinesses.length > 0;
    
    return `
      <div class="activation-head">
        <span class="step-badge">${isLoggedIn() && !hasExistingBusiness ? 'Langkah 1 dari 2' : 'Langkah 3 dari 4'}</span>
        <h1>Profil Usaha</h1>
        <p>${hasExistingBusiness ? 'Pilih profil usaha atau buat baru.' : 'Buat profil bisnis untuk kartu Anda.'}</p>
      </div>
      
      ${hasExistingBusiness ? `
        <div class="business-choice-tabs">
          <button class="choice-tab ${!a.createNewBusiness ? 'active' : ''}" data-business-choice="existing">Gunakan Profil Ada</button>
          <button class="choice-tab ${a.createNewBusiness ? 'active' : ''}" data-business-choice="new">Buat Profil Baru</button>
        </div>
        
        ${!a.createNewBusiness ? `
          <div class="existing-business-list">
            ${a.existingBusinesses.map(b => `
              <div class="existing-business-card ${a.selectedBusinessId === b.id ? 'selected' : ''}" data-select-business="${b.id}">
                <div class="existing-business-radio"></div>
                <div class="existing-business-logo" style="background:${b.theme_color || '#1769c2'}">
                  ${b.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div class="existing-business-info">
                  <h4>${b.name}</h4>
                  <p>${b.business_slugs?.find(s => s.is_current)?.slug ? `spnb.id/${b.business_slugs.find(s => s.is_current).slug}` : 'Belum ada slug'}</p>
                </div>
              </div>
            `).join('')}
          </div>
        ` : renderNewBusinessForm()}
      ` : renderNewBusinessForm()}
      
      <div class="activation-actions">
        <button class="btn btn-ghost" data-activation-prev>← Kembali</button>
        <button class="btn btn-primary" data-activation-next ${a.isSubmitting ? 'disabled' : ''}>
          ${a.isSubmitting ? 'Memproses...' : `Lanjutkan ${icons.link}`}
        </button>
      </div>`;
  }
  
  // Step 4: Pilih Tujuan Kartu
  if (a.step === 4) {
    const businessName = a.businessName || a.existingBusinesses?.find(b => b.id === a.selectedBusinessId)?.name || '-';
    const businessSlug = a.businessSlug || a.existingBusinesses?.find(b => b.id === a.selectedBusinessId)?.business_slugs?.find(s => s.is_current)?.slug || '-';
    
    return `
      <div class="activation-head">
        <span class="step-badge">${isLoggedIn() ? 'Langkah 2 dari 2' : 'Langkah 4 dari 4'}</span>
        <h1>Tujuan Kartu</h1>
        <p>Pilih apa yang terjadi saat pelanggan tap/scan kartu.</p>
      </div>
      <div class="destination-options">
        <div class="destination-card ${a.destinationMode === "direct_google" ? "selected" : ""}" data-destination="direct_google">
          <div class="destination-radio"></div>
          <div class="destination-icon">${icons.star}</div>
          <div class="destination-content">
            <h3>Langsung ke Google Rating</h3>
            <p>Pelanggan langsung membuka halaman ulasan Google.</p>
            <span class="destination-recommend">Recommended untuk kasir</span>
          </div>
        </div>
        <div class="destination-card ${a.destinationMode === "profile" ? "selected" : ""}" data-destination="profile">
          <div class="destination-radio"></div>
          <div class="destination-icon">${icons.business}</div>
          <div class="destination-content">
            <h3>Halaman Profil Bisnis</h3>
            <p>Tampilkan profil dengan rating, WhatsApp, lokasi.</p>
            <span class="destination-recommend">Recommended untuk meja</span>
          </div>
        </div>
      </div>
      <div class="summary-box">
        <h4>Ringkasan Aktivasi</h4>
        <div class="summary-row"><span>Kartu</span><strong>${a.cardSerial || 'KRT-000126'}</strong></div>
        <div class="summary-row"><span>Usaha</span><strong>${businessName}</strong></div>
        <div class="summary-row"><span>Halaman</span><strong>spnb.id/${businessSlug}</strong></div>
        <div class="summary-row"><span>Tujuan</span><strong>${a.destinationMode === "direct_google" ? "Google Rating" : "Profil Bisnis"}</strong></div>
      </div>
      <div class="activation-actions">
        <button class="btn btn-ghost" data-activation-prev>← Kembali</button>
        <button class="btn btn-primary" data-activation-submit ${a.isSubmitting ? 'disabled' : ''}>
          ${a.isSubmitting ? 'Mengaktifkan...' : `${icons.check} Aktifkan Kartu`}
        </button>
      </div>`;
  }
  
  return '';
}

function renderNewBusinessForm() {
  const a = state.activation;
  const googleUrlValid = a.googleReviewUrl && /^https:\/\/([^/?#]+\.)?(google\.[a-z.]+|g\.page|maps\.app\.goo\.gl)/i.test(a.googleReviewUrl);
  
  return `
    <div class="form-grid">
      <div class="form-group full">
        <label>Nama Usaha <span class="required">*</span></label>
        <input class="input" name="businessName" value="${a.businessName}" placeholder="Contoh: Kopi Nusantara" />
      </div>
      <div class="form-group full">
        <label>Alamat Halaman <span class="required">*</span></label>
        <div class="input-with-prefix">
          <span class="input-prefix">spnb.id/</span>
          <input class="input" name="businessSlug" value="${a.businessSlug}" placeholder="nama-usaha" style="border-left:0;border-top-left-radius:0;border-bottom-left-radius:0" />
        </div>
        <span class="input-hint">Huruf kecil, angka, dan tanda hubung saja.</span>
      </div>
      <div class="form-group full">
        <label>Link Google Rating <span class="required">*</span></label>
        <input class="input" name="googleReviewUrl" value="${a.googleReviewUrl}" placeholder="https://g.page/r/.../review" />
        <span class="input-hint">Buka Google Maps → Cari bisnis Anda → Bagikan → Salin link ulasan</span>
        ${a.googleReviewUrl ? `
          <div class="validation-row ${googleUrlValid ? 'valid' : 'invalid'}">
            ${googleUrlValid ? icons.check : icons.help}
            <span>${googleUrlValid ? 'Format link valid' : 'Format link tidak sesuai'}</span>
            ${googleUrlValid ? `<a class="text-link" href="${a.googleReviewUrl}" target="_blank" rel="noopener">Uji link</a>` : ''}
          </div>
        ` : ''}
      </div>
    </div>`;
}

const dashboardMenus = {
  owner: [
    ["/owner", "home", "Beranda"], ["/owner/kartu", "card", "Kartu Saya"], ["/owner/profil", "business", "Profil Usaha"],
    ["/owner/statistik", "chart", "Statistik"], ["/owner/akun", "user", "Akun & Keamanan"], ["/owner/bantuan", "help", "Bantuan"],
  ],
  reseller: [
    ["/reseller", "home", "Ringkasan"], ["/reseller/kartu", "card", "Stok Kartu"], ["/reseller/penjualan", "chart", "Penjualan"],
    ["/reseller/akun", "user", "Akun"], ["/reseller/bantuan", "help", "Bantuan"],
  ],
  admin: [
    ["/admin", "home", "Ringkasan"], ["/admin/kartu", "card", "Kartu"], ["/admin/stok", "stock", "Stok & Distribusi"],
    ["/admin/reseller", "reseller", "Reseller"], ["/admin/owner", "user", "Owner"], ["/admin/profil", "business", "Profil Usaha"],
    ["/admin/statistik", "chart", "Statistik"], ["/admin/log", "log", "Riwayat Aktivitas"], ["/admin/pengaturan", "setting", "Pengaturan"],
  ],
};

function appShell(role, title, subtitle, content) {
  const route = getRoute();
  
  // Use real user data if logged in, fallback to demo
  let identity;
  if (currentAccount && currentRoles.length > 0) {
    const displayName = currentAccount.display_name || 'User';
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const roleLabel = currentRoles.includes('admin') ? 'Administrator' : 
                      currentRoles.includes('reseller') ? 'Reseller' : 'Owner';
    identity = [displayName, roleLabel, initials];
  } else {
    identity = {
      owner: ["Budi Santoso", "Owner", "BS"], 
      reseller: ["Reseller Bandung", "Reseller", "RB"], 
      admin: ["Admin SPNB", "Administrator", "AS"],
    }[role];
  }
  
  const isRealUser = currentAccount !== null;
  const badgeText = isRealUser ? '' : '<span class="demo-badge">Data demo</span>';
  const unreadCount = state.unreadCount || 0;
  
  return `
    <div class="app-shell role-${role}">
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      <aside class="sidebar" id="sidebar">
        ${brand("#/")}
        <div class="side-label">Menu ${identity[1]}</div>
        <nav class="side-nav">
          ${dashboardMenus[role].map(([path, ic, label]) => `<button class="side-link ${route === path ? "active" : ""}" data-route="${path}"><span class="side-icon">${icons[ic]}</span>${label}</button>`).join("")}
        </nav>
        <div class="side-user">
          <span class="avatar">${identity[2]}</span>
          <div><b>${identity[0]}</b><span>${identity[1]}</span></div>
          <button class="action-menu" data-logout aria-label="Keluar" title="Keluar">${icons.close}</button>
        </div>
      </aside>
      <main class="main-shell">
        <header class="app-topbar">
          <div class="row">
            <button class="icon-btn mobile-side-toggle" data-sidebar aria-label="Menu">${icons.menu}</button>
            <div>
              <div class="title-line"><h1>${title}</h1>${badgeText}</div>
              <p class="topbar-subtitle">${subtitle}</p>
            </div>
          </div>
          <div class="app-top-actions">
            <div class="notification-wrapper">
              <button class="icon-btn notification-btn ${state.showNotificationPanel ? 'active' : ''}" data-toggle-notifications aria-label="Notifikasi">
                ${icons.bell}
                ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
              </button>
              ${renderNotificationPanel()}
            </div>
            ${isRealUser 
              ? `<button class="btn btn-secondary btn-sm" data-logout>Keluar</button>` 
              : `<button class="btn btn-secondary btn-sm" data-route="/login">Login</button>`}
            <span class="avatar">${identity[2]}</span>
          </div>
        </header>
        <div class="app-content">${content}</div>
      </main>
    </div>`;
}

function metrics(items) {
  return `<div class="metric-grid">${items.map(x => `<div class="metric-card"><div class="metric-head"><span>${x.label}</span><span class="metric-icon">${icons[x.icon] || x.icon}</span></div><div class="metric-value">${x.value}</div><div class="metric-trend">${x.trend}</div></div>`).join("")}</div>`;
}

function chartPanel(title = "Interaksi 7 hari terakhir") {
  const values = [43, 57, 48, 73, 64, 91, 78];
  const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  return `<section class="panel chart-panel"><div class="panel-title"><div><h2>${title}</h2><p>Jumlah pembukaan tautan dari QR dan NFC · data demo</p></div><select class="select"><option>7 hari</option><option>30 hari</option></select></div><div class="chart-scale"><span>100</span><span>50</span><span>0</span></div><div class="chart">${values.map((v, i) => `<div class="chart-bar" style="height:${v}%" title="${v} interaksi"><span>${days[i]}</span></div>`).join("")}</div><p class="chart-note">Angka menunjukkan interaksi pada kartu, bukan jumlah ulasan yang dikirim ke Google.</p></section>`;
}

function ownerPage(route) {
  if (route === "/owner/kartu") return ownerCardsPage();
  if (route === "/owner/profil") return ownerProfilePage();
  if (route === "/owner/statistik") return ownerStatsPage();
  if (route === "/owner/akun") return accountPage("owner");
  if (route === "/owner/bantuan") return helpPage("owner");
  const p = state.businessProfile;
  const userName = currentAccount?.display_name || 'Budi';
  const firstName = userName.split(' ')[0];
  const content = `
    <section class="workbench owner-workbench">
      <div>
        <span class="workbench-label">Kartu utama</span>
        <div class="row wrap"><h2>${p.name} · KRT-000125</h2>${statusBadge("active")}</div>
        <p>Tujuan saat ini: <strong>Langsung ke Google Rating</strong>. Terakhir digunakan 2 menit lalu.</p>
      </div>
      <div class="workbench-actions">
        <button class="btn btn-primary" data-route="/owner/kartu">Ubah tujuan</button>
        <button class="btn btn-secondary" data-route="/owner/profil">Edit profil usaha</button>
      </div>
    </section>
    ${metrics([
      { label: "Pembukaan tautan", value: "1.284", trend: "QR dan NFC · 30 hari", icon: "scan" },
      { label: "Klik tombol Google", value: "426", trend: "Bukan jumlah ulasan", icon: "star" },
      { label: "Tap NFC", value: "518", trend: "40% dari seluruh interaksi", icon: "nfc" },
    ])}
    <div class="dashboard-grid">
      ${chartPanel()}
      <section class="panel">
        <div class="panel-title"><div><h2>Aktivitas terbaru</h2><p>Interaksi profil hari ini</p></div></div>
        <div class="activity-list">
          ${activity("nfc", "NFC disentuh", "Kartu KRT-000125", "2 menit")}
          ${activity("star", "Google Rating diklik", p.name, "12 menit")}
          ${activity("qr", "QR dipindai", "Kartu KRT-000127", "28 menit")}
          ${activity("phone", "WhatsApp diklik", "Profil bisnis", "1 jam")}
        </div>
      </section>
    </div>
    <section class="panel" style="margin-top:18px">
      <div class="panel-title">
        <div><h2>Kartu Saya</h2><p>Ringkasan kartu yang terhubung dengan akun</p></div>
        <button class="btn btn-secondary btn-sm" data-route="/owner/kartu">Lihat Semua</button>
      </div>
      <div class="card-list">
        ${businessCard("KN", p.name, "KRT-000125 · Langsung ke Google", "124", "86")}
        ${businessCard("KC", p.name + " Cabang 2", "KRT-000127 · Halaman Profil", "98", "54")}
      </div>
    </section>`;
  return appShell("owner", `Selamat datang, ${firstName}!`, "Pantau perkembangan interaksi bisnis Anda.", content);
}

function activity(icon, title, sub, time) {
  return `<div class="activity-item"><span class="activity-icon">${icons[icon]}</span><div><b>${title}</b><small>${sub}</small></div><small>${time}</small></div>`;
}

function businessCard(initial, name, desc, scan, tap) {
  const p = state.businessProfile;
  const bgColor = p.themeColor || 'var(--blue-800)';
  return `<div class="business-card">
    <div class="business-logo" style="background:${bgColor}">${initial}</div>
    <div>
      <h3>${name} ${statusBadge("active")}</h3>
      <p>${desc}</p>
    </div>
    <div class="business-metrics">
      <div><b>${scan}</b><span>SCAN QR</span></div>
      <div><b>${tap}</b><span>TAP NFC</span></div>
    </div>
    <button class="btn btn-secondary btn-sm" data-demo-toast="Detail kartu dibuka dalam mode prototype.">Kelola</button>
  </div>`;
}

function ownerCardsPage() {
  const p = state.businessProfile;
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box"><input placeholder="Cari kartu atau usaha..." /></div>
        <select class="select"><option>Semua status</option><option>Aktif</option><option>Diblokir</option></select>
      </div>
      <button class="btn btn-primary" data-demo-toast="Untuk menambah kartu, pindai QR kartu baru yang sudah ditandai terjual.">${icons.plus} Tambah Kartu</button>
    </div>
    <div class="card-list">
      ${businessCard("KN", p.name, "KRT-000125 · Langsung ke Google", "124", "86")}
      ${businessCard("KN", p.name, "KRT-000126 · Halaman Profil", "83", "102")}
      ${businessCard("KC", p.name + " Cabang 2", "KRT-000127 · Halaman Profil", "98", "54")}
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="panel-title">
        <div><h2>Pengaturan cepat kartu</h2><p>Contoh perubahan tujuan tanpa mencetak ulang QR atau NFC.</p></div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Pilih kartu</label>
          <select class="input"><option>KRT-000125</option><option>KRT-000126</option></select>
        </div>
        <div class="form-group">
          <label>Profil usaha</label>
          <select class="input"><option>${p.name}</option><option>${p.name} Cabang 2</option></select>
        </div>
        <div class="form-group full">
          <label>Tujuan kartu</label>
          <div class="choice-grid">
            <div class="choice-card selected"><h3>${icons.star} Langsung ke Google</h3><p>Pengunjung langsung menuju link rating.</p></div>
            <div class="choice-card"><h3>${icons.business} Halaman Profil</h3><p>Pengunjung melihat halaman profil bisnis.</p></div>
          </div>
        </div>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:18px">
        <button class="btn btn-primary" data-demo-toast="Pengaturan kartu berhasil disimpan.">Simpan Perubahan</button>
      </div>
    </div>`;
  return appShell("owner", "Kartu Saya", "Kelola tujuan dan profil untuk setiap kartu.", content);
}

// ============ IMAGE UPLOAD FUNCTIONS ============
// Upload image to Supabase Storage
async function uploadImage(file, folder = 'logos') {
  if (!file) return { url: null, error: 'No file selected' };
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' };
  }
  
  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return { url: null, error: 'Ukuran file maksimal 2MB.' };
  }
  
  if (!USE_REAL_DATA) {
    // Demo mode - return a fake URL
    await new Promise(resolve => setTimeout(resolve, 1000));
    const fakeUrl = URL.createObjectURL(file);
    return { url: fakeUrl, error: null };
  }
  
  try {
    // Generate unique filename
    const ext = file.name.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${currentUser.id}/${folder}/${timestamp}-${randomStr}.${ext}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from('business-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: 'Gagal mengupload gambar: ' + error.message };
    }
    
    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('business-assets')
      .getPublicUrl(fileName);
    
    return { url: urlData.publicUrl, error: null };
  } catch (e) {
    console.error('Upload exception:', e);
    return { url: null, error: 'Terjadi kesalahan saat mengupload.' };
  }
}

// Delete image from storage
async function deleteImage(url) {
  if (!USE_REAL_DATA || !url) return;
  
  try {
    // Extract file path from URL
    const match = url.match(/business-assets\/(.+)$/);
    if (!match) return;
    
    const filePath = match[1];
    await supabaseClient.storage
      .from('business-assets')
      .remove([filePath]);
  } catch (e) {
    console.error('Delete image error:', e);
  }
}

// Handle logo upload
async function handleLogoUpload(file) {
  state.uploadingLogo = true;
  render();
  
  const { url, error } = await uploadImage(file, 'logos');
  
  state.uploadingLogo = false;
  
  if (error) {
    toast(error);
    render();
    return;
  }
  
  // Update the logo URL field
  const logoInput = document.getElementById('bp-logo');
  if (logoInput) {
    logoInput.value = url;
  }
  
  // Update preview
  state.businessProfile.logoUrl = url;
  render();
  toast('Logo berhasil diupload!');
}

// Handle banner upload
async function handleBannerUpload(file) {
  state.uploadingBanner = true;
  render();
  
  const { url, error } = await uploadImage(file, 'banners');
  
  state.uploadingBanner = false;
  
  if (error) {
    toast(error);
    render();
    return;
  }
  
  // Update the banner URL field
  const bannerInput = document.getElementById('bp-banner');
  if (bannerInput) {
    bannerInput.value = url;
  }
  
  // Update preview
  state.businessProfile.bannerUrl = url;
  render();
  toast('Banner berhasil diupload!');
}

function ownerProfilePage() {
  // Use data from database if available
  const dbBusiness = state.ownerData?.businesses?.[0];
  const p = dbBusiness ? {
    name: dbBusiness.name || '',
    description: dbBusiness.description || '',
    address: dbBusiness.address || '',
    logoUrl: dbBusiness.logo_url || '',
    bannerUrl: dbBusiness.cover_url || '',
    googleReviewUrl: dbBusiness.google_review_url || '',
    whatsapp: dbBusiness.whatsapp_e164 ? dbBusiness.whatsapp_e164.replace(/^\+62/, '0') : '',
    mapsUrl: dbBusiness.google_maps_url || '',
    instagram: '',
    website: '',
    themeColor: dbBusiness.theme_color || '#1769c2',
    slug: dbBusiness.business_slugs?.find(s => s.is_current)?.slug || ''
  } : state.businessProfile;
  
  // Update local state with db data
  if (dbBusiness) {
    Object.assign(state.businessProfile, p);
  }
  
  const initials = p.name ? p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'BP';
  const businessId = dbBusiness?.id || null;
  const content = `
    <div class="dashboard-grid" style="grid-template-columns:1.15fr .85fr;align-items:start">
      <section class="panel"><div class="panel-title"><div><h2>Edit Profil Bisnis</h2><p>Perubahan akan langsung diterapkan pada halaman publik.</p></div></div>
        <div class="form-grid">
          <div class="form-group full"><label>Nama usaha <span class="required">*</span></label><input class="input" id="bp-name" value="${p.name}" /></div>
          <div class="form-group full"><label>Deskripsi singkat</label><textarea class="textarea" id="bp-desc">${p.description}</textarea></div>
          <div class="form-group full"><label>Alamat</label><input class="input" id="bp-address" value="${p.address}" /></div>
          <div class="form-group full"><label>Alamat halaman</label><div class="input-with-prefix"><span class="input-prefix">spnb.id/</span><input class="input" id="bp-slug" value="${p.slug || 'nama-usaha'}" style="border:0" /></div></div>
          
          <div class="form-group full" style="margin-top:12px;padding-top:18px;border-top:1px solid var(--line)">
            <label style="font-size:13px;font-weight:700;color:var(--ink)">🖼️ Gambar Profil</label>
            <p style="margin:6px 0 14px;font-size:11px;color:var(--muted)">Upload gambar atau masukkan URL dari hosting eksternal.</p>
          </div>
          
          <div class="form-group full">
            <label>Logo Bisnis</label>
            <div class="image-upload-group">
              <div class="image-preview-box ${p.logoUrl ? 'has-image' : ''}" id="logo-preview">
                ${p.logoUrl ? `<img src="${p.logoUrl}" alt="Logo" />` : `<span class="placeholder">${icons.business}<br>200x200px</span>`}
              </div>
              <div class="image-upload-actions">
                <label class="btn btn-secondary btn-sm upload-btn ${state.uploadingLogo ? 'loading' : ''}">
                  ${state.uploadingLogo ? 'Uploading...' : `${icons.plus} Upload Logo`}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-upload-logo hidden ${state.uploadingLogo ? 'disabled' : ''} />
                </label>
                <span class="or-text">atau</span>
                <input class="input" id="bp-logo" value="${p.logoUrl}" placeholder="https://example.com/logo.png" style="flex:1" />
                ${p.logoUrl ? `<button class="btn btn-ghost btn-sm" data-clear-logo title="Hapus">${icons.close}</button>` : ''}
              </div>
            </div>
            <span class="input-hint">Disarankan: gambar persegi minimal 200x200px (JPG, PNG, WebP, max 2MB)</span>
          </div>
          
          <div class="form-group full">
            <label>Banner / Cover</label>
            <div class="image-upload-group banner">
              <div class="image-preview-box banner ${p.bannerUrl ? 'has-image' : ''}" id="banner-preview">
                ${p.bannerUrl ? `<img src="${p.bannerUrl}" alt="Banner" />` : `<span class="placeholder">${icons.eye}<br>1200x400px</span>`}
              </div>
              <div class="image-upload-actions">
                <label class="btn btn-secondary btn-sm upload-btn ${state.uploadingBanner ? 'loading' : ''}">
                  ${state.uploadingBanner ? 'Uploading...' : `${icons.plus} Upload Banner`}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-upload-banner hidden ${state.uploadingBanner ? 'disabled' : ''} />
                </label>
                <span class="or-text">atau</span>
                <input class="input" id="bp-banner" value="${p.bannerUrl}" placeholder="https://example.com/banner.jpg" style="flex:1" />
                ${p.bannerUrl ? `<button class="btn btn-ghost btn-sm" data-clear-banner title="Hapus">${icons.close}</button>` : ''}
              </div>
            </div>
            <span class="input-hint">Disarankan: rasio 3:1 (1200x400px), JPG atau PNG, max 2MB</span>
          </div>
          
          <div class="form-group full" style="margin-top:12px;padding-top:18px;border-top:1px solid var(--line)">
            <label style="font-size:13px;font-weight:700;color:var(--ink)">🔗 Tautan Bisnis</label>
          </div>
          <div class="form-group"><label>Link Google Rating</label><input class="input" id="bp-google" value="${p.googleReviewUrl}" placeholder="https://g.page/r/.../review" /></div>
          <div class="form-group"><label>WhatsApp</label><input class="input" id="bp-wa" value="${p.whatsapp}" placeholder="08123456789" /></div>
          <div class="form-group"><label>Google Maps</label><input class="input" id="bp-maps" value="${p.mapsUrl}" placeholder="https://maps.app.goo.gl/..." /></div>
          <div class="form-group"><label>Instagram</label><input class="input" id="bp-ig" value="${p.instagram}" placeholder="@username" /></div>
          <div class="form-group"><label>Website</label><input class="input" id="bp-web" value="${p.website}" placeholder="https://..." /></div>
          <div class="form-group"><label>Warna tema</label><input class="input" id="bp-color" type="color" value="${p.themeColor}" style="padding:7px;height:47px" /></div>
        </div>
        <div class="row-between" style="margin-top:20px">
          <button class="btn btn-secondary" data-route="/p/${p.slug || 'demo'}">Lihat Halaman Publik</button>
          <button class="btn btn-primary" data-save-profile>${icons.check} Simpan Perubahan</button>
        </div>
      </section>
      <section class="panel profile-preview-panel">
        <div class="panel-title"><div><h2>Preview</h2><p>Tampilan halaman di ponsel.</p></div></div>
        <div class="phone-preview">
          <div class="phone-preview-banner" id="preview-banner" style="${p.bannerUrl ? `background-image:url('${p.bannerUrl}');background-size:cover;background-position:center` : `background:linear-gradient(135deg,${p.themeColor},${adjustColor(p.themeColor, -30)})`}"></div>
          <div class="phone-preview-body">
            <div class="phone-preview-logo" id="preview-logo" style="background:${p.logoUrl ? '#fff' : p.themeColor};color:${p.logoUrl ? p.themeColor : '#fff'}">
              ${p.logoUrl ? `<img src="${p.logoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" />` : initials}
            </div>
            <h3 id="preview-name">${p.name}</h3>
            <p id="preview-desc">${p.description ? (p.description.slice(0, 60) + (p.description.length > 60 ? '...' : '')) : 'Deskripsi bisnis Anda'}</p>
            <div class="phone-preview-links">
              <div class="phone-preview-link primary" id="preview-btn" style="background:${p.themeColor}">${icons.star} Beri Rating</div>
              <div class="phone-preview-link">${icons.phone} WhatsApp</div>
              <div class="phone-preview-link">${icons.map} Lokasi</div>
            </div>
          </div>
        </div>
      </section>
    </div>`;
  return appShell("owner", "Profil Usaha", "Atur halaman digital bisnis dan seluruh tautannya.", content);
}

function ownerStatsPage() {
  // Get stats from state or load
  const stats = state.ownerStats;
  const selectedPeriod = state.statsPeriod || 30;
  
  // If no stats loaded yet, trigger load
  if (!stats && !state.statsLoading) {
    loadOwnerStats(selectedPeriod);
    return appShell("owner", "Statistik", "Memuat data...", `
      <div style="display:flex;align-items:center;justify-content:center;min-height:400px">
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="margin-top:16px;color:var(--muted)">Memuat statistik...</p>
        </div>
      </div>
    `);
  }
  
  if (state.statsLoading) {
    return appShell("owner", "Statistik", "Memuat data...", `
      <div style="display:flex;align-items:center;justify-content:center;min-height:400px">
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="margin-top:16px;color:var(--muted)">Memuat statistik...</p>
        </div>
      </div>
    `);
  }
  
  const s = stats?.current || {};
  const prev = stats?.previous || {};
  
  // Calculate changes
  const profileChange = calcChange(s.profileViews || 0, prev.profileViews || 0);
  const totalChange = calcChange(s.totalInteractions || 0, prev.totalInteractions || 0);
  
  // Calculate percentages for source breakdown
  const totalScans = (s.qrScans || 0) + (s.nfcTaps || 0);
  const qrPercent = totalScans > 0 ? Math.round((s.qrScans || 0) / totalScans * 100) : 50;
  const nfcPercent = totalScans > 0 ? Math.round((s.nfcTaps || 0) / totalScans * 100) : 50;
  
  // Build chart data
  const chartData = stats?.daily || generateDemoDaily(selectedPeriod);
  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const recentDays = chartData.slice(-7);
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  
  const content = `
    <div class="stats-toolbar">
      <div class="stats-period-selector">
        <button class="period-btn ${selectedPeriod === 7 ? 'active' : ''}" data-stats-period="7">7 Hari</button>
        <button class="period-btn ${selectedPeriod === 30 ? 'active' : ''}" data-stats-period="30">30 Hari</button>
        <button class="period-btn ${selectedPeriod === 90 ? 'active' : ''}" data-stats-period="90">90 Hari</button>
      </div>
      <button class="btn btn-secondary btn-sm" data-refresh-stats>${icons.chart} Refresh</button>
    </div>
    
    ${metrics([
      { 
        label: "Tampilan profil", 
        value: formatNumber(s.profileViews || 0), 
        trend: `${profileChange >= 0 ? '+' : ''}${profileChange}% dari periode sebelumnya`, 
        icon: "eye" 
      },
      { 
        label: "Klik Google Rating", 
        value: formatNumber(s.googleClicks || 0), 
        trend: s.profileViews > 0 ? `${Math.round((s.googleClicks || 0) / s.profileViews * 100)}% rasio klik` : '0% rasio klik', 
        icon: "star" 
      },
      { 
        label: "Klik WhatsApp", 
        value: formatNumber(s.whatsappClicks || 0), 
        trend: "Dari halaman profil", 
        icon: "phone" 
      },
      { 
        label: "Klik Lokasi", 
        value: formatNumber(s.mapsClicks || 0), 
        trend: "Dari halaman profil", 
        icon: "map" 
      },
    ])}
    
    <div class="dashboard-grid" style="margin-top:20px">
      <section class="panel chart-panel">
        <div class="panel-title">
          <div>
            <h2>Interaksi ${selectedPeriod} hari terakhir</h2>
            <p>Total: ${formatNumber(s.totalInteractions || 0)} interaksi ${totalChange >= 0 ? `(+${totalChange}%)` : `(${totalChange}%)`}</p>
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-scale">
            <span>${formatNumber(maxCount)}</span>
            <span>${formatNumber(Math.round(maxCount / 2))}</span>
            <span>0</span>
          </div>
          <div class="chart">
            ${recentDays.map((d, i) => {
              const height = maxCount > 0 ? Math.round(d.count / maxCount * 100) : 0;
              const dayDate = new Date(d.date);
              const dayName = dayNames[dayDate.getDay()];
              return `<div class="chart-bar" style="height:${Math.max(height, 2)}%" title="${d.count} interaksi pada ${d.date}">
                <span>${dayName}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        <p class="chart-note">Angka menunjukkan interaksi pada kartu dan profil, bukan jumlah ulasan yang dikirim ke Google.</p>
      </section>
      
      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>Sumber interaksi</h2>
            <p>Berdasarkan jenis pemindaian</p>
          </div>
        </div>
        <div class="stack" style="gap:20px">
          <div>
            <div class="row-between" style="margin-bottom:8px">
              <span class="row" style="gap:8px">${icons.nfc} Tap NFC</span>
              <b>${nfcPercent}%</b>
            </div>
            <div class="progress-bar">
              <div class="progress-fill nfc" style="width:${nfcPercent}%"></div>
            </div>
            <span class="stat-detail">${formatNumber(s.nfcTaps || 0)} tap</span>
          </div>
          
          <div>
            <div class="row-between" style="margin-bottom:8px">
              <span class="row" style="gap:8px">${icons.qr} Scan QR</span>
              <b>${qrPercent}%</b>
            </div>
            <div class="progress-bar">
              <div class="progress-fill qr" style="width:${qrPercent}%"></div>
            </div>
            <span class="stat-detail">${formatNumber(s.qrScans || 0)} scan</span>
          </div>
        </div>
        
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--line)">
          <h4 style="margin-bottom:12px;font-size:13px">Klik per tombol</h4>
          <div class="link-stats">
            ${renderLinkStats(stats?.byLinkType || {})}
          </div>
        </div>
      </section>
    </div>
    
    <section class="panel" style="margin-top:20px">
      <div class="panel-title">
        <div>
          <h2>Performa per kartu</h2>
          <p>Interaksi pada masing-masing kartu</p>
        </div>
      </div>
      ${renderCardPerformance(stats?.byCard || [], state.ownerData?.cards || [])}
    </section>
  `;
  
  return appShell("owner", "Statistik", "Pahami cara pelanggan berinteraksi dengan kartu dan profil.", content);
}

function renderLinkStats(byLinkType) {
  const linkLabels = {
    google_review: { label: 'Google Rating', icon: 'star', color: 'var(--blue-700)' },
    whatsapp: { label: 'WhatsApp', icon: 'phone', color: 'var(--green)' },
    google_maps: { label: 'Lokasi', icon: 'map', color: 'var(--orange)' },
    instagram: { label: 'Instagram', icon: 'eye', color: 'var(--violet)' },
    website: { label: 'Website', icon: 'link', color: 'var(--blue-500)' },
    tiktok: { label: 'TikTok', icon: 'eye', color: '#000' },
    facebook: { label: 'Facebook', icon: 'eye', color: '#1877f2' },
  };
  
  const entries = Object.entries(byLinkType).sort((a, b) => b[1] - a[1]);
  
  if (entries.length === 0) {
    return `<p class="muted" style="font-size:12px">Belum ada data klik tombol.</p>`;
  }
  
  return entries.map(([type, count]) => {
    const config = linkLabels[type] || { label: type, icon: 'link', color: 'var(--muted)' };
    return `
      <div class="link-stat-row">
        <span class="link-stat-icon" style="color:${config.color}">${icons[config.icon]}</span>
        <span class="link-stat-label">${config.label}</span>
        <span class="link-stat-count">${formatNumber(count)}</span>
      </div>
    `;
  }).join('');
}

function renderCardPerformance(byCard, cards) {
  if (!cards || cards.length === 0) {
    return `
      <div style="text-align:center;padding:40px;color:var(--muted)">
        <p>Belum ada kartu yang terhubung.</p>
        <button class="btn btn-primary btn-sm" data-route="/aktivasi" style="margin-top:12px">Aktivasi Kartu</button>
      </div>
    `;
  }
  
  // Map card stats
  const cardStatsMap = {};
  byCard.forEach(c => {
    cardStatsMap[c.cardId] = c.count;
  });
  
  return `
    <div class="card-performance-grid">
      ${cards.map(card => {
        const interactions = cardStatsMap[card.id] || 0;
        const businessName = card.businesses?.name || 'Bisnis';
        const mode = card.destination_mode === 'direct_google' ? 'Google Rating' : 'Profil';
        
        return `
          <div class="card-performance-item">
            <div class="card-performance-header">
              <strong>${card.serial}</strong>
              <span class="status status-active">Aktif</span>
            </div>
            <p class="card-performance-business">${businessName}</p>
            <p class="card-performance-mode">Mode: ${mode}</p>
            <div class="card-performance-stats">
              <div>
                <b>${formatNumber(interactions)}</b>
                <span>Interaksi</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Load owner stats
async function loadOwnerStats(days = 30) {
  state.statsLoading = true;
  state.statsPeriod = days;
  render();
  
  try {
    const businessIds = state.ownerData?.businesses?.map(b => b.id) || [];
    const stats = await getOwnerStats(businessIds, days);
    state.ownerStats = stats;
  } catch (e) {
    console.error('loadOwnerStats error:', e);
    state.ownerStats = null;
  }
  
  state.statsLoading = false;
  render();
}

function accountPage(role) {
  const title = role === "owner" ? "Akun & Keamanan" : "Pengaturan Akun";
  const userName = currentAccount?.display_name || (role === "owner" ? "Budi Santoso" : "Reseller Bandung");
  const userPhone = currentAccount?.phone_e164 || "0812 3456 7890";
  const userEmail = currentUser?.email || "";
  
  // Format phone for display
  const displayPhone = userPhone.replace(/^\+62/, '0').replace(/(\d{4})(\d{4})(\d+)/, '$1 $2 $3');
  
  const content = `
    <div class="grid-2" style="align-items:start">
      <section class="panel">
        <div class="panel-title"><div><h2>Informasi Akun</h2><p>Data akun yang terdaftar di sistem.</p></div></div>
        <div class="stack">
          <div class="form-group">
            <label>Nama</label>
            <input class="input" id="account-name" value="${userName}" />
          </div>
          ${userEmail ? `
          <div class="form-group">
            <label>Email</label>
            <input class="input" value="${userEmail}" disabled />
            <span class="input-hint">Email tidak dapat diubah.</span>
          </div>` : ''}
          <div class="form-group">
            <label>Nomor HP</label>
            <input class="input" value="${displayPhone}" disabled />
            <span class="input-hint">Hubungi admin untuk mengganti nomor HP.</span>
          </div>
          <button class="btn btn-primary" data-save-account>Simpan Perubahan</button>
        </div>
      </section>
      <section class="panel">
        <div class="panel-title"><div><h2>Ganti Password</h2><p>Gunakan minimal 8 karakter.</p></div></div>
        <div class="stack">
          <div class="form-group">
            <label>Password baru</label>
            <input class="input" type="password" id="new-password" placeholder="Minimal 8 karakter" />
          </div>
          <div class="form-group">
            <label>Konfirmasi password</label>
            <input class="input" type="password" id="confirm-password" placeholder="Ulangi password baru" />
          </div>
          <button class="btn btn-primary" data-change-password>Perbarui Password</button>
        </div>
      </section>
    </div>
    <section class="panel" style="margin-top:18px">
      <div class="panel-title"><div><h2>Sesi & Keamanan</h2><p>Kelola sesi login Anda.</p></div></div>
      <div class="stack">
        <div class="row-between" style="padding:12px 0;border-bottom:1px solid var(--line)">
          <div>
            <strong>Sesi saat ini</strong>
            <p class="muted" style="font-size:12px;margin:4px 0 0">Login sejak ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <span class="status status-active">Aktif</span>
        </div>
        <button class="btn btn-secondary" data-logout style="margin-top:12px">${icons.close} Keluar dari Akun</button>
      </div>
    </section>`;
  return appShell(role, title, "Kelola identitas login dan keamanan akun.", content);
}

function helpPage(role) {
  const content = `<div class="grid-2"><section class="panel"><div class="feature-icon">${icons.help}</div><h2 style="font-size:24px">Butuh bantuan?</h2><p>Tim SPNB DIGITAL siap membantu kendala kartu, aktivasi, profil usaha, dan akun Anda.</p><a class="btn btn-primary" href="${whatsappUrl}" target="_blank">${icons.phone} Hubungi via WhatsApp</a></section><section class="panel"><div class="panel-title"><div><h2>Panduan Singkat</h2><p>Jawaban cepat untuk kebutuhan umum.</p></div></div><div class="faq-list">${faq("Bagaimana mengganti tujuan kartu?", "Buka Kartu Saya, pilih kartu, lalu ubah tujuan dan simpan.")}${faq("Bagaimana jika lupa password?", "Hubungi admin untuk mendapatkan tautan reset sekali pakai.")}${faq("Kartu saya tidak terbaca NFC", "Pastikan NFC ponsel aktif atau gunakan QR sebagai alternatif.")}</div></section></div>`;
  return appShell(role, "Pusat Bantuan", "Temukan panduan atau hubungi tim SPNB DIGITAL.", content);
}

function resellerPage(route) {
  if (route === "/reseller/kartu") return resellerCardsPage();
  if (route === "/reseller/penjualan") return resellerSalesPage();
  if (route === "/reseller/akun") return accountPage("reseller");
  if (route === "/reseller/bantuan") return helpPage("reseller");
  
  const content = `
    <section class="workbench reseller-workbench">
      <div>
        <span class="workbench-label">Perlu tindakan</span>
        <h2>3 kartu menunggu aktivasi</h2>
        <p>Kartu sudah terjual tetapi belum diaktifkan oleh pembeli.</p>
      </div>
      <div class="workbench-actions">
        <button class="btn btn-primary" data-route="/reseller/kartu">${icons.card} Lihat Stok</button>
        <button class="btn btn-secondary" data-demo-toast="Kamera pemindai dibuka.">${icons.qr} Scan Kartu</button>
      </div>
    </section>
    
    ${metrics([
      { label: "Stok Tersedia", value: "24", trend: "Siap dijual", icon: "stock" },
      { label: "Terjual Bulan Ini", value: "15", trend: "12 sudah aktif", icon: "card" },
      { label: "Menunggu Aktivasi", value: "3", trend: "Butuh follow up", icon: "user" },
    ])}
    
    <div class="dashboard-grid" style="margin-top:18px">
      <section class="panel">
        <div class="panel-title">
          <div><h2>Kartu Perlu Diproses</h2><p>Tandai terjual atau cek status aktivasi</p></div>
          <button class="btn btn-secondary btn-sm" data-route="/reseller/kartu">Lihat Semua</button>
        </div>
        ${resellerTable(5)}
      </section>
      
      <section class="panel">
        <div class="panel-title">
          <div><h2>Aktivitas Terbaru</h2><p>Perubahan stok hari ini</p></div>
        </div>
        <div class="activity-list">
          ${activity("card", "KRT-000126 ditandai terjual", "Menunggu aktivasi", "12 menit")}
          ${activity("check", "KRT-000127 telah aktif", "Diklaim owner", "1 jam")}
          ${activity("stock", "10 kartu diterima", "Dari Admin", "Kemarin")}
          ${activity("card", "KRT-000124 ditandai terjual", "Menunggu aktivasi", "2 hari")}
        </div>
      </section>
    </div>
    
    <section class="panel" style="margin-top:18px">
      <div class="quick-stats-grid">
        <div class="quick-stat">
          <div class="quick-stat-icon green">${icons.check}</div>
          <div>
            <strong>80%</strong>
            <span>Tingkat Aktivasi</span>
          </div>
        </div>
        <div class="quick-stat">
          <div class="quick-stat-icon blue">${icons.chart}</div>
          <div>
            <strong>87</strong>
            <span>Total Penjualan</span>
          </div>
        </div>
        <div class="quick-stat">
          <div class="quick-stat-icon orange">${icons.clock}</div>
          <div>
            <strong>2.3 hari</strong>
            <span>Rata-rata Aktivasi</span>
          </div>
        </div>
      </div>
    </section>`;
  
  return appShell("reseller", "Dashboard Reseller", "Kelola stok dan pantau penjualan kartu.", content);
}

function resellerTable(limit) {
  // Use real data if available, otherwise use mock data
  let cards = state.resellerData?.inventory || state.resellerCards;
  
  // Map real data format to display format
  if (state.resellerData?.inventory) {
    cards = state.resellerData.inventory.map(c => ({
      id: c.card_id,
      serial: c.serial,
      status: mapCardStatus(c.lifecycle_state),
      date: formatDate(c.sold_at || c.claimed_at || c.allocated_at),
      owner: c.lifecycle_state === 'claimed' ? 'Sudah aktif' : 
             c.lifecycle_state === 'sold_unclaimed' ? 'Menunggu aktivasi' : '—'
    }));
  }
  
  if (limit) cards = cards.slice(0, limit);
  
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Serial Kartu</th>
            <th>Status</th>
            <th>Owner</th>
            <th>Tanggal</th>
            <th>Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${cards.length === 0 ? `
            <tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">Belum ada kartu yang ditugaskan.</td></tr>
          ` : cards.map(c => `
            <tr>
              <td><strong>${c.serial}</strong></td>
              <td>${statusBadge(c.status)}</td>
              <td>${c.owner}</td>
              <td>${c.date}</td>
              <td>
                ${c.status === "stock" 
                  ? `<button class="btn btn-primary btn-sm" data-sell-card="${c.id || c.serial}" data-serial="${c.serial}">Tandai Terjual</button>` 
                  : c.status === "sold" 
                    ? `<button class="btn btn-ghost btn-sm" data-unsell-card="${c.id || c.serial}" data-serial="${c.serial}">Batalkan</button>` 
                    : `<button class="btn btn-secondary btn-sm" data-view-card="${c.id || c.serial}" data-serial="${c.serial}">Detail</button>`}
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function resellerCardsPage() {
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box"><input placeholder="Cari serial kartu..." /></div>
        <select class="select">
          <option>Semua Status</option>
          <option>Stok Tersedia</option>
          <option>Terjual</option>
          <option>Sudah Aktif</option>
        </select>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-ghost btn-sm" data-export-reseller-sales>${icons.chart} Export</button>
        <button class="btn btn-secondary" data-demo-toast="Kamera pemindai dibuka.">${icons.qr} Scan Kartu</button>
      </div>
    </div>
    
    ${resellerTable()}
    
    <div class="info-box" style="margin-top:16px">
      ${icons.help}
      <div>
        <strong>Cara kerja penjualan kartu</strong>
        <p>Setelah ditandai terjual, kartu dapat diaktifkan oleh pembeli dengan memindai QR. Status dapat dibatalkan selama kartu belum diaktifkan.</p>
      </div>
    </div>`;
  
  return appShell("reseller", "Stok Kartu", "Kelola kartu yang ditugaskan oleh admin.", content);
}

function resellerSalesPage() {
  const content = `
    ${metrics([
      { label: "Penjualan Bulan Ini", value: "15", trend: "+50% dari bulan lalu", icon: "card" },
      { label: "Aktivasi Berhasil", value: "12", trend: "80% tingkat aktivasi", icon: "check" },
      { label: "Menunggu Aktivasi", value: "3", trend: "Perlu follow up", icon: "user" },
    ])}
    
    <div class="dashboard-grid" style="margin-top:18px">
      ${chartPanel("Tren Penjualan")}
      
      <section class="panel">
        <div class="panel-title">
          <div><h2>Status Aktivasi</h2><p>Dari kartu terjual bulan ini</p></div>
        </div>
        <div class="donut-chart">
          <div class="donut-visual" style="background: conic-gradient(var(--green) 0% 80%, var(--line) 80% 100%);">
            <div class="donut-center">
              <strong>80%</strong>
              <span>Aktif</span>
            </div>
          </div>
          <div class="donut-legend">
            <div class="legend-item"><span class="legend-dot green"></span>Sudah Aktif (12)</div>
            <div class="legend-item"><span class="legend-dot gray"></span>Menunggu (3)</div>
          </div>
        </div>
      </section>
    </div>
    
    <section class="panel" style="margin-top:18px">
      <div class="panel-title">
        <div><h2>Riwayat Penjualan</h2><p>Kartu yang dijual bulan ini</p></div>
      </div>
      <div class="activity-list">
        ${activity("check", "KRT-000127 diaktifkan", "Owner: 0812••••7890", "1 jam")}
        ${activity("card", "KRT-000126 terjual", "Menunggu aktivasi", "3 jam")}
        ${activity("check", "KRT-000125 diaktifkan", "Owner: 0857••••2210", "1 hari")}
        ${activity("check", "KRT-000124 diaktifkan", "Owner: 0813••••3021", "2 hari")}
      </div>
    </section>`;
  
  return appShell("reseller", "Penjualan", "Pantau performa penjualan kartu.", content);
}

const adminCards = [
  ["KRT-000125", "active", "Reseller Bandung", "0812••••7890", "12 Okt 2026", "210"],
  ["KRT-000126", "sold", "Reseller Bandung", "—", "—", "0"],
  ["KRT-000127", "active", "Reseller Jakarta", "0857••••2210", "11 Okt 2026", "152"],
  ["KRT-000128", "stock", "Reseller Surabaya", "—", "—", "0"],
  ["KRT-000129", "admin", "—", "—", "—", "0"],
  ["KRT-000130", "blocked", "Reseller Bandung", "0813••••3021", "2 Okt 2026", "34"],
];

function adminPage(route) {
  if (route === "/admin/kartu") return adminCardsPage();
  if (route === "/admin/stok") return adminStockPage();
  if (route === "/admin/reseller") return adminResellerPage();
  if (route === "/admin/owner") return adminOwnerPage();
  if (route === "/admin/statistik") return adminStatsPage();
  if (route === "/admin/log") return adminLogsPage();
  if (route === "/admin/pengaturan") return adminSettingsPage();
  
  const content = `
    <section class="workbench admin-workbench">
      <div>
        <span class="workbench-label">Perlu Ditindaklanjuti</span>
        <h2>6 tugas operasional menunggu</h2>
        <p>2 reset akun, 3 aktivasi tertunda, 1 batch belum selesai.</p>
      </div>
      <div class="workbench-actions">
        <button class="btn btn-primary" data-route="/admin/log">${icons.log} Lihat Log</button>
        <button class="btn btn-secondary" data-batch-modal>${icons.plus} Buat Batch</button>
      </div>
    </section>
    
    <div class="admin-stat-cards">
      <div class="admin-stat-card highlight">
        <strong>412</strong>
        <span>Kartu Aktif</span>
        <small>+24 bulan ini</small>
      </div>
      <div class="admin-stat-card">
        <strong>236</strong>
        <span>Stok Tersedia</span>
        <small>102 admin · 134 reseller</small>
      </div>
      <div class="admin-stat-card">
        <strong>12</strong>
        <span>Reseller Aktif</span>
        <small>6 kota</small>
      </div>
      <div class="admin-stat-card">
        <strong>84.2K</strong>
        <span>Total Interaksi</span>
        <small>+22% bulan ini</small>
      </div>
    </div>
    
    <div class="exception-grid">
      <button data-route="/admin/owner">
        <strong>2</strong>
        <span>Reset Akun</span>
        <small>Permintaan owner</small>
      </button>
      <button data-route="/admin/kartu">
        <strong>3</strong>
        <span>Aktivasi Tertunda</span>
        <small>> 24 jam</small>
      </button>
      <button data-route="/admin/stok">
        <strong>1</strong>
        <span>Batch Pending</span>
        <small>NFC belum ditulis</small>
      </button>
    </div>
    
    <div class="dashboard-grid" style="margin-top:18px">
      <section class="panel">
        <div class="panel-title">
          <div><h2>Kartu Terbaru</h2><p>Aktivitas kartu hari ini</p></div>
          <button class="btn btn-primary btn-sm" data-batch-modal>${icons.plus} Buat Batch</button>
        </div>
        ${adminTable(6)}
      </section>
      
      <section class="panel">
        <div class="panel-title">
          <div><h2>Aktivitas Admin</h2><p>Log terbaru</p></div>
        </div>
        <div class="activity-list">
          ${activity("card", "Batch BTH-0018 dibuat", "100 kartu", "10:32")}
          ${activity("stock", "20 kartu ke Reseller Bandung", "Distribusi", "09:48")}
          ${activity("user", "Reset akun Siti Rahma", "Link dibuat", "Kemarin")}
          ${activity("check", "KRT-000127 diaktifkan", "Owner baru", "Kemarin")}
        </div>
      </section>
    </div>`;
  
  return appShell("admin", "Dashboard Admin", "Kelola operasional SPNB DIGITAL.", content);
}

function adminTable(limit) {
  // Use real data if available
  let cards;
  if (state.adminData?.cards) {
    cards = state.adminData.cards.map(c => ({
      id: c.id,
      serial: c.serial,
      status: mapCardStatus(c.lifecycle_state),
      reseller: c.resellers?.name || '—',
      owner: c.accounts?.display_name ? maskPhone(c.accounts.phone_e164) : '—',
      activated: formatDate(c.claimed_at),
      interactions: '0'
    }));
  } else {
    cards = adminCards.map(c => ({
      serial: c[0],
      status: c[1],
      reseller: c[2],
      owner: c[3],
      activated: c[4],
      interactions: c[5]
    }));
  }
  
  if (limit) cards = cards.slice(0, limit);
  
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Serial</th>
            <th>Status</th>
            <th>Reseller</th>
            <th>Owner</th>
            <th>Aktivasi</th>
            <th>Interaksi</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${cards.length === 0 ? `
            <tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">Belum ada kartu.</td></tr>
          ` : cards.map(c => `
            <tr>
              <td><strong>${c.serial}</strong></td>
              <td>${statusBadge(c.status)}</td>
              <td>${c.reseller}</td>
              <td>${c.owner}</td>
              <td>${c.activated}</td>
              <td>${c.interactions}</td>
              <td><button class="action-menu" data-card-menu="${c.id || c.serial}">⋯</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function adminCardsPage() {
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box"><input placeholder="Cari serial, owner, atau reseller..." /></div>
        <select class="select">
          <option>Semua Status</option>
          <option>Aktif</option>
          <option>Terjual</option>
          <option>Stok Admin</option>
          <option>Stok Reseller</option>
          <option>Diblokir</option>
        </select>
        <select class="select">
          <option>Semua Reseller</option>
          <option>Reseller Bandung</option>
          <option>Reseller Jakarta</option>
          <option>Reseller Surabaya</option>
        </select>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-ghost btn-sm" data-export-cards>${icons.chart} Export</button>
        <button class="btn btn-secondary" data-demo-toast="Form kartu satuan">${icons.plus} Satuan</button>
        <button class="btn btn-primary" data-batch-modal>${icons.plus} Buat Batch</button>
      </div>
    </div>
    
    ${adminTable()}
    
    <div class="table-footer">
      <span class="muted">Menampilkan 6 dari 648 kartu</span>
      <div class="pagination">
        <button class="btn btn-ghost btn-sm">←</button>
        <button class="btn btn-primary btn-sm">1</button>
        <button class="btn btn-ghost btn-sm">2</button>
        <button class="btn btn-ghost btn-sm">3</button>
        <button class="btn btn-ghost btn-sm">→</button>
      </div>
    </div>`;
  
  return appShell("admin", "Semua Kartu", "Kelola seluruh kartu QR dan NFC.", content);
}

function adminStockPage() {
  // Calculate stats from real data
  const cards = state.adminData?.cards || [];
  const resellers = state.adminData?.resellers || [];
  
  const adminStock = cards.filter(c => c.lifecycle_state === 'admin_stock').length;
  const resellerStock = cards.filter(c => c.lifecycle_state === 'reseller_stock').length;
  const soldUnclaimed = cards.filter(c => c.lifecycle_state === 'sold_unclaimed').length;
  
  // Get available cards for distribution (admin_stock only)
  const availableCards = cards.filter(c => c.lifecycle_state === 'admin_stock');
  
  const content = `
    ${metrics([
      { label: "Stok Admin", value: adminStock.toString(), trend: "Belum didistribusikan", icon: "stock" },
      { label: "Stok Reseller", value: resellerStock.toString(), trend: `Di ${resellers.length} reseller`, icon: "reseller" },
      { label: "Menunggu Aktivasi", value: soldUnclaimed.toString(), trend: "Sudah terjual", icon: "user" },
    ])}
    
    <div class="grid-2" style="margin-top:18px;align-items:start">
      <section class="panel">
        <div class="panel-title">
          <div><h2>Distribusi Stok</h2><p>Tugaskan kartu ke reseller</p></div>
        </div>
        <form id="distributeForm" class="stack">
          <div class="form-group">
            <label>Kartu Tersedia</label>
            <select class="input" id="distribute-cards" multiple style="min-height:120px">
              ${availableCards.length === 0 
                ? `<option disabled>Tidak ada kartu di stok admin</option>`
                : availableCards.map(c => `<option value="${c.id}">${c.serial}</option>`).join('')}
            </select>
            <span class="input-hint">Tahan Ctrl/Cmd untuk pilih beberapa kartu</span>
          </div>
          <div class="form-group">
            <label>Reseller Tujuan</label>
            <select class="input" id="distribute-reseller" required>
              <option value="">Pilih reseller...</option>
              ${resellers.map(r => `<option value="${r.id}">${r.name} (${r.city || '-'})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Catatan (opsional)</label>
            <input class="input" id="distribute-note" placeholder="Catatan distribusi..." />
          </div>
          <button type="submit" class="btn btn-primary" ${availableCards.length === 0 ? 'disabled' : ''}>${icons.stock} Distribusikan</button>
        </form>
      </section>
      
      <section class="panel">
        <div class="panel-title">
          <div><h2>Daftar Reseller</h2><p>Reseller aktif</p></div>
          <button class="btn btn-secondary btn-sm" data-reseller-modal>${icons.plus} Tambah</button>
        </div>
        <div class="activity-list">
          ${resellers.length === 0 
            ? `<p style="text-align:center;padding:24px;color:var(--muted)">Belum ada reseller.</p>`
            : resellers.map(r => {
                const stockCount = cards.filter(c => c.assigned_reseller_id === r.id && c.lifecycle_state === 'reseller_stock').length;
                return activity("reseller", r.name, `${r.city || '-'} · ${stockCount} stok`, statusBadge(r.status));
              }).join('')}
        </div>
      </section>
    </div>
    
    <section class="panel" style="margin-top:18px">
      <div class="panel-title">
        <div><h2>Kartu di Stok Admin</h2><p>Kartu yang siap didistribusikan</p></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Serial</th>
              <th>Status</th>
              <th>Batch</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            ${availableCards.length === 0 
              ? `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--muted)">Tidak ada kartu di stok admin.</td></tr>`
              : availableCards.map(c => `
                <tr>
                  <td><strong>${c.serial}</strong></td>
                  <td>${statusBadge('admin')}</td>
                  <td>${c.batch_id ? 'BTH-...' : '—'}</td>
                  <td>${formatDate(c.created_at)}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`;
  
  return appShell("admin", "Stok & Distribusi", "Kelola produksi dan distribusi kartu.", content);
}

function adminResellerPage() {
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box"><input placeholder="Cari reseller..." /></div>
        <select class="select">
          <option>Semua Status</option>
          <option>Aktif</option>
          <option>Nonaktif</option>
        </select>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-ghost btn-sm" data-export-resellers>${icons.chart} Export</button>
        <button class="btn btn-primary" data-reseller-modal>${icons.plus} Tambah Reseller</button>
      </div>
    </div>
    
    <div class="reseller-grid">
      ${resellerCard("RB", "Reseller Bandung", "Bandung", "24", "87")}
      ${resellerCard("RJ", "Reseller Jakarta", "Jakarta", "31", "104")}
      ${resellerCard("RS", "Reseller Surabaya", "Surabaya", "18", "65")}
      ${resellerCard("RY", "Reseller Yogyakarta", "Yogyakarta", "12", "48")}
      ${resellerCard("RM", "Reseller Makassar", "Makassar", "27", "72")}
      ${resellerCard("RSM", "Reseller Semarang", "Semarang", "22", "41")}
    </div>`;
  
  return appShell("admin", "Reseller", "Kelola akun dan pantau performa reseller.", content);
}

function resellerCard(initial, name, city, stock, sold) {
  return `
    <article class="reseller-card">
      <div class="reseller-card-header">
        <div class="reseller-card-avatar">${initial}</div>
        ${statusBadge("active")}
      </div>
      <h3>${name}</h3>
      <p>${city} · Bergabung Jan 2026</p>
      <div class="reseller-card-stats">
        <div>
          <strong>${stock}</strong>
          <span>Stok</span>
        </div>
        <div>
          <strong>${sold}</strong>
          <span>Terjual</span>
        </div>
        <div>
          <strong>${Math.round(sold * 0.8)}</strong>
          <span>Aktif</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-block btn-sm" data-demo-toast="Detail ${name}">Lihat Detail</button>
    </article>`;
}

function adminOwnerPage() {
  const owners = [
    ["Budi Santoso", "0812••••7890", "2", "3", "12 Okt 2026", "active"],
    ["Siti Rahma", "0857••••2210", "1", "2", "11 Okt 2026", "active"],
    ["Deni Kurnia", "0813••••3021", "1", "1", "8 Okt 2026", "active"],
    ["Maya Putri", "0821••••7742", "3", "5", "4 Okt 2026", "active"],
  ];
  
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box"><input placeholder="Cari nama atau nomor HP..." /></div>
        <select class="select">
          <option>Semua Status</option>
          <option>Aktif</option>
          <option>Diblokir</option>
        </select>
      </div>
    </div>
    
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Owner</th>
            <th>Nomor HP</th>
            <th>Profil</th>
            <th>Kartu</th>
            <th>Bergabung</th>
            <th>Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${owners.map(o => `
            <tr>
              <td><strong>${o[0]}</strong></td>
              <td>${o[1]}</td>
              <td>${o[2]} profil</td>
              <td>${o[3]} kartu</td>
              <td>${o[4]}</td>
              <td>
                <div class="btn-group">
                  <button class="btn btn-secondary btn-sm" data-reset-modal="${o[0]}">${icons.refresh} Reset</button>
                  <button class="btn btn-ghost btn-sm" data-demo-toast="Detail ${o[0]}">Detail</button>
                </div>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
  
  return appShell("admin", "Owner", "Kelola akun owner dan pemulihan akses.", content);
}

function adminProfilesPage() {
  const content = `<div class="toolbar"><div class="filters"><div class="search-box"><input placeholder="Cari profil atau slug..." /></div></div></div><div class="grid-3">${profileAdminCard("KN", "Kopi Nusantara", "/kopi-nusantara", "2 kartu", "892")}${profileAdminCard("SC", "Salon Cantika", "/salon-cantika", "1 kartu", "574")}${profileAdminCard("BR", "Bakso Rasa", "/bakso-rasa", "3 kartu", "1.204")}${profileAdminCard("KS", "Klinik Sehat", "/klinik-sehat", "1 kartu", "431")}${profileAdminCard("TB", "Toko Berkah", "/toko-berkah", "2 kartu", "687")}</div>`;
  return appShell("admin", "Profil Usaha", "Pantau halaman publik yang dibuat oleh owner.", content);
}

function profileAdminCard(initial, name, slug, cards, views) {
  return `<article class="feature-card"><div class="row-between"><div class="business-logo">${initial}</div>${statusBadge("active")}</div><h3 style="margin-top:18px">${name}</h3><p style="font-size:11px">spnb.id${slug}</p><div class="row-between"><small class="muted">${cards}</small><small class="muted">${views} tampilan</small></div><button class="btn btn-secondary btn-block btn-sm" style="margin-top:16px" data-route="/profil">Lihat Halaman</button></article>`;
}

// Get admin platform stats
async function getAdminStats(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  if (!USE_REAL_DATA) {
    return {
      totalInteractions: 84284,
      qrScans: 38102,
      nfcTaps: 46182,
      googleClicks: 25647,
      profileViews: 58637,
      activeCards: 412,
      totalCards: 648,
      activeResellers: 12,
      daily: generateDemoDaily(days),
      byCity: [
        { city: 'Jakarta', cards: 128, percentage: 31 },
        { city: 'Bandung', cards: 104, percentage: 25 },
        { city: 'Surabaya', cards: 76, percentage: 18 },
        { city: 'Yogyakarta', cards: 49, percentage: 12 },
        { city: 'Lainnya', cards: 55, percentage: 14 },
      ]
    };
  }
  
  try {
    // Get interaction stats
    const { data: events, error: eventsError } = await supabaseClient
      .from('interaction_events')
      .select('event_type, token_kind, occurred_at')
      .gte('occurred_at', since);
    
    if (eventsError) {
      console.error('Admin stats error:', eventsError);
      return null;
    }
    
    // Get card stats
    const { data: cards } = await supabaseClient
      .from('cards')
      .select('lifecycle_state, assigned_reseller_id');
    
    // Get reseller stats
    const { data: resellers } = await supabaseClient
      .from('resellers')
      .select('id, city, status')
      .eq('status', 'active');
    
    // Process events
    const stats = {
      totalInteractions: events?.length || 0,
      qrScans: 0,
      nfcTaps: 0,
      googleClicks: 0,
      profileViews: 0,
      activeCards: 0,
      totalCards: cards?.length || 0,
      activeResellers: resellers?.length || 0,
      daily: [],
      byCity: []
    };
    
    const dailyMap = {};
    
    events?.forEach(e => {
      if (e.event_type === 'qr_scan' || e.token_kind === 'qr') stats.qrScans++;
      if (e.event_type === 'nfc_tap' || e.token_kind === 'nfc') stats.nfcTaps++;
      if (e.event_type === 'profile_view') stats.profileViews++;
      if (e.event_type === 'profile_link_click') stats.googleClicks++;
      
      const day = e.occurred_at.split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    
    // Count active cards
    stats.activeCards = cards?.filter(c => c.lifecycle_state === 'claimed').length || 0;
    
    // Process daily
    stats.daily = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
    
    // Process by city
    const cityMap = {};
    resellers?.forEach(r => {
      const city = r.city || 'Lainnya';
      const cityCards = cards?.filter(c => c.assigned_reseller_id === r.id && c.lifecycle_state === 'claimed').length || 0;
      cityMap[city] = (cityMap[city] || 0) + cityCards;
    });
    
    const totalCityCards = Object.values(cityMap).reduce((a, b) => a + b, 0) || 1;
    stats.byCity = Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, cards]) => ({
        city,
        cards,
        percentage: Math.round(cards / totalCityCards * 100)
      }));
    
    return stats;
  } catch (e) {
    console.error('getAdminStats exception:', e);
    return null;
  }
}

function adminStatsPage() {
  const stats = state.adminStats;
  const selectedPeriod = state.adminStatsPeriod || 30;
  
  // Load stats if not loaded
  if (!stats && !state.adminStatsLoading) {
    loadAdminStats(selectedPeriod);
    return appShell("admin", "Statistik Platform", "Memuat data...", `
      <div style="display:flex;align-items:center;justify-content:center;min-height:400px">
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="margin-top:16px;color:var(--muted)">Memuat statistik platform...</p>
        </div>
      </div>
    `);
  }
  
  if (state.adminStatsLoading) {
    return appShell("admin", "Statistik Platform", "Memuat data...", `
      <div style="display:flex;align-items:center;justify-content:center;min-height:400px">
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="margin-top:16px;color:var(--muted)">Memuat statistik platform...</p>
        </div>
      </div>
    `);
  }
  
  const s = stats || {};
  
  // Calculate percentages
  const totalScans = (s.qrScans || 0) + (s.nfcTaps || 0);
  const qrPercent = totalScans > 0 ? Math.round((s.qrScans || 0) / totalScans * 100) : 50;
  const nfcPercent = totalScans > 0 ? Math.round((s.nfcTaps || 0) / totalScans * 100) : 50;
  const googlePercent = s.totalInteractions > 0 ? Math.round((s.googleClicks || 0) / s.totalInteractions * 100) : 0;
  
  // Chart data
  const chartData = s.daily || generateDemoDaily(selectedPeriod);
  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const recentDays = chartData.slice(-7);
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  
  const content = `
    <div class="stats-toolbar">
      <div class="stats-period-selector">
        <button class="period-btn ${selectedPeriod === 7 ? 'active' : ''}" data-admin-stats-period="7">7 Hari</button>
        <button class="period-btn ${selectedPeriod === 30 ? 'active' : ''}" data-admin-stats-period="30">30 Hari</button>
        <button class="period-btn ${selectedPeriod === 90 ? 'active' : ''}" data-admin-stats-period="90">90 Hari</button>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-ghost btn-sm" data-export-interactions="${selectedPeriod}">${icons.chart} Export CSV</button>
        <button class="btn btn-secondary btn-sm" data-refresh-admin-stats>${icons.chart} Refresh</button>
      </div>
    </div>
    
    ${metrics([
      { 
        label: "Total interaksi", 
        value: formatNumber(s.totalInteractions || 0), 
        trend: `${selectedPeriod} hari terakhir`, 
        icon: "chart" 
      },
      { 
        label: "Scan QR", 
        value: formatNumber(s.qrScans || 0), 
        trend: `${qrPercent}% dari total scan`, 
        icon: "qr" 
      },
      { 
        label: "Tap NFC", 
        value: formatNumber(s.nfcTaps || 0), 
        trend: `${nfcPercent}% dari total scan`, 
        icon: "nfc" 
      },
      { 
        label: "Klik Google", 
        value: formatNumber(s.googleClicks || 0), 
        trend: `${googlePercent}% dari interaksi`, 
        icon: "star" 
      },
    ])}
    
    <div class="admin-stat-cards" style="margin-top:20px">
      <div class="admin-stat-card">
        <strong>${formatNumber(s.activeCards || 0)}</strong>
        <span>Kartu Aktif</span>
        <small>dari ${formatNumber(s.totalCards || 0)} total</small>
      </div>
      <div class="admin-stat-card">
        <strong>${s.activeResellers || 0}</strong>
        <span>Reseller Aktif</span>
        <small>di ${s.byCity?.length || 0} kota</small>
      </div>
      <div class="admin-stat-card">
        <strong>${formatNumber(s.profileViews || 0)}</strong>
        <span>Tampilan Profil</span>
        <small>${selectedPeriod} hari terakhir</small>
      </div>
    </div>
    
    <div class="dashboard-grid" style="margin-top:20px">
      <section class="panel chart-panel">
        <div class="panel-title">
          <div>
            <h2>Pertumbuhan interaksi platform</h2>
            <p>Total interaksi harian dari semua kartu</p>
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-scale">
            <span>${formatNumber(maxCount)}</span>
            <span>${formatNumber(Math.round(maxCount / 2))}</span>
            <span>0</span>
          </div>
          <div class="chart">
            ${recentDays.map((d, i) => {
              const height = maxCount > 0 ? Math.round(d.count / maxCount * 100) : 0;
              const dayDate = new Date(d.date);
              const dayName = dayNames[dayDate.getDay()];
              return `<div class="chart-bar" style="height:${Math.max(height, 2)}%" title="${d.count} interaksi pada ${d.date}">
                <span>${dayName}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </section>
      
      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>Kota reseller teratas</h2>
            <p>Berdasarkan jumlah kartu aktif</p>
          </div>
        </div>
        <div class="activity-list">
          ${(s.byCity || []).map(c => `
            <div class="activity-item">
              <span class="activity-icon">${icons.map}</span>
              <div>
                <b>${c.city}</b>
                <small>${c.cards} kartu aktif</small>
              </div>
              <small>${c.percentage}%</small>
            </div>
          `).join('') || '<p class="muted" style="text-align:center;padding:20px">Belum ada data.</p>'}
        </div>
      </section>
    </div>
    
    <section class="panel" style="margin-top:20px">
      <div class="panel-title">
        <div>
          <h2>Distribusi sumber interaksi</h2>
          <p>Perbandingan QR scan vs NFC tap</p>
        </div>
      </div>
      <div class="grid-2" style="gap:30px;margin-top:16px">
        <div>
          <div class="row-between" style="margin-bottom:8px">
            <span class="row" style="gap:8px">${icons.nfc} Tap NFC</span>
            <b>${nfcPercent}%</b>
          </div>
          <div class="progress-bar" style="height:16px">
            <div class="progress-fill nfc" style="width:${nfcPercent}%"></div>
          </div>
          <span class="stat-detail">${formatNumber(s.nfcTaps || 0)} tap total</span>
        </div>
        <div>
          <div class="row-between" style="margin-bottom:8px">
            <span class="row" style="gap:8px">${icons.qr} Scan QR</span>
            <b>${qrPercent}%</b>
          </div>
          <div class="progress-bar" style="height:16px">
            <div class="progress-fill qr" style="width:${qrPercent}%"></div>
          </div>
          <span class="stat-detail">${formatNumber(s.qrScans || 0)} scan total</span>
        </div>
      </div>
    </section>
  `;
  
  return appShell("admin", "Statistik Platform", "Analisis performa kartu dan jaringan reseller.", content);
}

async function loadAdminStats(days = 30) {
  state.adminStatsLoading = true;
  state.adminStatsPeriod = days;
  render();
  
  try {
    const stats = await getAdminStats(days);
    state.adminStats = stats;
  } catch (e) {
    console.error('loadAdminStats error:', e);
    state.adminStats = null;
  }
  
  state.adminStatsLoading = false;
  render();
}

function adminLogsPage() {
  const logs = [["Admin SPNB","Membuat batch BTH-0018","100 kartu","12 Okt · 10:32"],["Reseller Bandung","Menandai KRT-000126 terjual","Stok reseller","12 Okt · 09:48"],["Budi Santoso","Mengubah tujuan KRT-000125","Google Rating","12 Okt · 09:14"],["Admin SPNB","Membuat tautan reset akun","Owner: Siti Rahma","11 Okt · 16:20"],["Reseller Jakarta","Menandai KRT-000127 terjual","Stok reseller","11 Okt · 14:08"]];
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box"><input placeholder="Cari aktivitas..." /></div>
        <select class="select">
          <option>Semua pengguna</option>
          <option>Admin</option>
          <option>Reseller</option>
          <option>Owner</option>
        </select>
        <input class="input" type="date" style="width:auto" />
      </div>
      <button class="btn btn-secondary" data-export-audit-log>${icons.chart} Ekspor CSV</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Pengguna</th><th>Aktivitas</th><th>Detail</th><th>Waktu</th></tr>
        </thead>
        <tbody>
          ${logs.map(l => `<tr><td><strong>${l[0]}</strong></td><td>${l[1]}</td><td>${l[2]}</td><td>${l[3]}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>`;
  return appShell("admin", "Riwayat Aktivitas", "Audit perubahan penting yang dilakukan setiap pengguna.", content);
}

function adminSettingsPage() {
  const content = `<div class="grid-2" style="align-items:start"><section class="panel"><div class="panel-title"><div><h2>Identitas Platform</h2><p>Branding yang tampil pada halaman profil.</p></div></div><div class="stack"><div class="form-group"><label>Nama platform</label><input class="input" value="SPNB DIGITAL" /></div><div class="form-group"><label>Domain utama</label><input class="input" value="spnb.id" /></div><div class="form-group"><label>Nomor WhatsApp bantuan</label><input class="input" value="0895386763040" /></div><div class="form-group"><label>Teks branding</label><input class="input" value="Didukung oleh SPNB DIGITAL" /></div><button class="btn btn-primary" data-demo-toast="Pengaturan platform berhasil disimpan.">Simpan Pengaturan</button></div></section><section class="panel"><div class="panel-title"><div><h2>Aturan Sistem</h2><p>Konfigurasi keamanan dan kartu.</p></div></div><div class="stack"><label class="row-between"><span>Reseller wajib menandai kartu terjual</span><input type="checkbox" checked /></label><label class="row-between"><span>Owner dapat mengganti slug</span><input type="checkbox" checked /></label><label class="row-between"><span>Redirect slug lama</span><input type="checkbox" checked /></label><label class="row-between"><span>Kartu aktif selamanya</span><input type="checkbox" checked /></label><label class="row-between"><span>Branding pada profil publik</span><input type="checkbox" checked /></label></div></section></div>`;
  return appShell("admin", "Pengaturan", "Atur identitas dan aturan utama platform.", content);
}

function publicProfilePage() {
  const p = state.businessProfile;
  const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bannerStyle = p.bannerUrl 
    ? `background-image: url('${p.bannerUrl}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, ${p.themeColor}, ${adjustColor(p.themeColor, -30)});`;
  const logoContent = p.logoUrl 
    ? `<img src="${p.logoUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />`
    : initials;
  
  return `<div class="profile-page"><main class="profile-phone">
    <div class="profile-cover" style="${bannerStyle}">
      <button class="icon-btn" data-route="/" style="position:absolute;z-index:2;top:18px;left:18px;color:#fff;border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.15);backdrop-filter:blur(8px)" aria-label="Kembali">←</button>
      <button class="icon-btn" data-demo-toast="Tautan profil siap dibagikan." style="position:absolute;z-index:2;top:18px;right:18px;color:#fff;border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.15);backdrop-filter:blur(8px)" aria-label="Bagikan">${icons.share}</button>
    </div>
    <div class="profile-body">
      <div class="profile-logo" style="background:${p.logoUrl ? '#fff' : p.themeColor};color:${p.logoUrl ? p.themeColor : '#fff'}">${logoContent}</div>
      <h1>${p.name}</h1>
      <p class="profile-desc">${p.description}</p>
      <p class="profile-address">${icons.map} ${p.address}</p>
      <div class="profile-links">
        <a class="profile-link primary" href="${p.googleReviewUrl}" target="_blank" style="background:${p.themeColor}">
          <span class="profile-link-icon" style="color:${p.themeColor}">${icons.star}</span>Beri Rating di Google <span style="margin-left:auto">${icons.link}</span>
        </a>
        <button class="profile-link" data-demo-toast="WhatsApp ${p.name} dibuka.">
          <span class="profile-link-icon">${icons.phone}</span>Hubungi via WhatsApp <span style="margin-left:auto">${icons.link}</span>
        </button>
        <button class="profile-link" data-demo-toast="Lokasi bisnis dibuka di Google Maps.">
          <span class="profile-link-icon">${icons.map}</span>Lihat Lokasi <span style="margin-left:auto">${icons.link}</span>
        </button>
        <button class="profile-link" data-demo-toast="Instagram ${p.instagram} dibuka.">
          <span class="profile-link-icon">${icons.eye}</span>Instagram <span style="margin-left:auto">${icons.link}</span>
        </button>
        <button class="profile-link" data-demo-toast="Website ${p.name} dibuka.">
          <span class="profile-link-icon">${icons.link}</span>Kunjungi Website <span style="margin-left:auto">${icons.link}</span>
        </button>
      </div>
      <footer class="profile-footer">
        <a href="#/" class="profile-footer-brand">
          ${brandLogo()}
          <span>SPNB DIGITAL</span>
        </a>
        <p>Kartu Google Review NFC + QR</p>
      </footer>
    </div>
  </main></div>`;
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

// ============ DYNAMIC PROFILE PAGE ============
// State for dynamic profile
const profileState = {
  slug: null,
  business: null,
  isLoading: false,
  error: null,
  cardId: null, // If accessed via card redirect
  tokenKind: null, // 'qr' or 'nfc'
};

// Fetch business by slug
async function fetchBusinessBySlug(slug) {
  if (!USE_REAL_DATA) {
    // Demo mode - return mock data for known slugs
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (slug === 'kopi-nusantara' || slug === 'demo') {
      return {
        id: 'demo-business-id',
        name: 'Kopi Nusantara',
        description: 'Kopi lokal pilihan dan tempat berkumpul yang nyaman. Buka setiap hari pukul 08.00–22.00.',
        address: 'Jl. Merdeka No. 24, Bandung',
        logo_url: '',
        cover_url: '',
        theme_color: '#1769c2',
        google_review_url: 'https://g.page/r/contoh/review',
        whatsapp_e164: '+6281234567890',
        google_maps_url: 'https://maps.app.goo.gl/contoh',
        status: 'active',
        profile_links: [
          { id: '1', link_type: 'instagram', label: 'Instagram', destination_url: 'https://instagram.com/kopinusantara', sort_order: 0, is_active: true },
          { id: '2', link_type: 'website', label: 'Website', destination_url: 'https://kopinusantara.id', sort_order: 1, is_active: true },
        ]
      };
    }
    
    return null;
  }
  
  try {
    // Use RPC for safer public access
    const { data: businessData, error: bizError } = await supabaseClient
      .rpc('get_business_by_slug', { p_slug: slug });
    
    if (bizError || !businessData || businessData.length === 0) {
      console.error('Business fetch error:', bizError);
      return null;
    }
    
    const business = businessData[0];
    
    // Get profile links
    const { data: links, error: linksError } = await supabaseClient
      .rpc('get_profile_links', { p_business_id: business.id });
    
    if (!linksError && links) {
      business.profile_links = links;
    } else {
      business.profile_links = [];
    }
    
    return business;
  } catch (e) {
    console.error('fetchBusinessBySlug exception:', e);
    return null;
  }
}

// Record interaction event
async function recordInteraction(eventType, businessId, cardId = null, profileLinkId = null, tokenKind = null, destinationMode = null) {
  if (!USE_REAL_DATA) {
    console.log('📊 Interaction recorded (demo):', { eventType, businessId, cardId, profileLinkId, tokenKind });
    return;
  }
  
  try {
    // Generate anonymous session hash for grouping events
    let sessionHash = sessionStorage.getItem('anon_session');
    if (!sessionHash) {
      sessionHash = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
      sessionStorage.setItem('anon_session', sessionHash);
    }
    
    // Detect user agent class
    const ua = navigator.userAgent.toLowerCase();
    let userAgentClass = 'unknown';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      userAgentClass = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      userAgentClass = 'tablet';
    } else {
      userAgentClass = 'desktop';
    }
    
    // Use RPC for safer insertion
    const { error } = await supabaseClient.rpc('record_interaction', {
      p_event_type: eventType,
      p_business_id: businessId,
      p_card_id: cardId,
      p_profile_link_id: profileLinkId,
      p_token_kind: tokenKind,
      p_destination_mode: destinationMode,
      p_anonymous_session_hash: sessionHash,
      p_user_agent_class: userAgentClass
    });
    
    if (error) {
      console.error('Record interaction error:', error);
    }
  } catch (e) {
    console.error('recordInteraction exception:', e);
  }
}

// Dynamic profile page - loads business by slug
function dynamicProfilePage(slug) {
  // If already loading or loaded this slug, show current state
  if (profileState.slug === slug && profileState.business) {
    return renderProfilePage(profileState.business);
  }
  
  if (profileState.slug === slug && profileState.isLoading) {
    return profileLoadingPage();
  }
  
  if (profileState.slug === slug && profileState.error) {
    return profileErrorPage(profileState.error);
  }
  
  // Start loading
  profileState.slug = slug;
  profileState.isLoading = true;
  profileState.error = null;
  profileState.business = null;
  
  // Fetch business data
  fetchBusinessBySlug(slug).then(business => {
    profileState.isLoading = false;
    
    if (business) {
      profileState.business = business;
      
      // Record profile view
      recordInteraction('profile_view', business.id, profileState.cardId, null, profileState.tokenKind, 'profile');
      
      // Clear card context after recording
      profileState.cardId = null;
      profileState.tokenKind = null;
    } else {
      profileState.error = 'not_found';
    }
    
    render();
  });
  
  return profileLoadingPage();
}

function profileLoadingPage() {
  return `
    <div class="profile-page">
      <main class="profile-phone" style="display:flex;align-items:center;justify-content:center">
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="margin-top:16px;color:var(--muted)">Memuat profil...</p>
        </div>
      </main>
    </div>`;
}

function profileErrorPage(error) {
  const isNotFound = error === 'not_found';
  
  return `
    <div class="profile-page">
      <main class="profile-phone" style="display:flex;align-items:center;justify-content:center">
        <div style="text-align:center;padding:40px">
          <div class="error-icon" style="width:80px;height:80px;margin:0 auto 24px;border-radius:50%;background:var(--red-100);color:var(--red-600);display:flex;align-items:center;justify-content:center;font-size:40px">
            ${isNotFound ? '🔍' : '⚠️'}
          </div>
          <h2 style="margin-bottom:12px">${isNotFound ? 'Profil Tidak Ditemukan' : 'Terjadi Kesalahan'}</h2>
          <p style="color:var(--muted);margin-bottom:24px;font-size:14px">
            ${isNotFound ? 'Halaman profil yang Anda cari tidak tersedia atau sudah dihapus.' : 'Gagal memuat profil. Silakan coba lagi.'}
          </p>
          <button class="btn btn-primary" data-route="/">Kembali ke Beranda</button>
        </div>
      </main>
    </div>`;
}

function renderProfilePage(business) {
  const p = business;
  const initials = p.name ? p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'BP';
  const themeColor = p.theme_color || '#1769c2';
  
  const bannerStyle = p.cover_url 
    ? `background-image: url('${p.cover_url}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, ${themeColor}, ${adjustColor(themeColor, -30)});`;
  
  const logoContent = p.logo_url 
    ? `<img src="${p.logo_url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />`
    : initials;
  
  // Build profile links
  const linkIcons = {
    google_review: icons.star,
    whatsapp: icons.phone,
    google_maps: icons.map,
    instagram: icons.eye,
    tiktok: icons.eye,
    facebook: icons.eye,
    website: icons.link,
    custom: icons.link
  };
  
  // Generate WhatsApp URL
  const waUrl = p.whatsapp_e164 ? `https://wa.me/${p.whatsapp_e164.replace('+', '')}` : null;
  
  return `<div class="profile-page"><main class="profile-phone">
    <div class="profile-cover" style="${bannerStyle}">
      <button class="icon-btn" data-route="/" style="position:absolute;z-index:2;top:18px;left:18px;color:#fff;border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.15);backdrop-filter:blur(8px)" aria-label="Kembali">←</button>
      <button class="icon-btn" data-share-profile="${profileState.slug || ''}" style="position:absolute;z-index:2;top:18px;right:18px;color:#fff;border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.15);backdrop-filter:blur(8px)" aria-label="Bagikan">${icons.share}</button>
    </div>
    <div class="profile-body">
      <div class="profile-logo" style="background:${p.logo_url ? '#fff' : themeColor};color:${p.logo_url ? themeColor : '#fff'}">${logoContent}</div>
      <h1>${p.name || 'Bisnis'}</h1>
      ${p.description ? `<p class="profile-desc">${p.description}</p>` : ''}
      ${p.address ? `<p class="profile-address">${icons.map} ${p.address}</p>` : ''}
      <div class="profile-links">
        ${p.google_review_url ? `
          <a class="profile-link primary" href="${p.google_review_url}" target="_blank" rel="noopener" 
             data-track-link="google_review" data-business-id="${p.id}" style="background:${themeColor}">
            <span class="profile-link-icon" style="color:${themeColor}">${icons.star}</span>
            Beri Rating di Google 
            <span style="margin-left:auto">${icons.link}</span>
          </a>
        ` : ''}
        ${waUrl ? `
          <a class="profile-link" href="${waUrl}" target="_blank" rel="noopener"
             data-track-link="whatsapp" data-business-id="${p.id}">
            <span class="profile-link-icon">${icons.phone}</span>
            Hubungi via WhatsApp 
            <span style="margin-left:auto">${icons.link}</span>
          </a>
        ` : ''}
        ${p.google_maps_url ? `
          <a class="profile-link" href="${p.google_maps_url}" target="_blank" rel="noopener"
             data-track-link="google_maps" data-business-id="${p.id}">
            <span class="profile-link-icon">${icons.map}</span>
            Lihat Lokasi 
            <span style="margin-left:auto">${icons.link}</span>
          </a>
        ` : ''}
        ${(p.profile_links || []).map(link => `
          <a class="profile-link" href="${link.destination_url}" target="_blank" rel="noopener"
             data-track-link="${link.link_type}" data-link-id="${link.id}" data-business-id="${p.id}">
            <span class="profile-link-icon">${linkIcons[link.link_type] || icons.link}</span>
            ${link.label}
            <span style="margin-left:auto">${icons.link}</span>
          </a>
        `).join('')}
      </div>
      <footer class="profile-footer">
        <a href="#/" class="profile-footer-brand">
          ${brandLogo()}
          <span>SPNB DIGITAL</span>
        </a>
        <p>Kartu Google Review NFC + QR</p>
      </footer>
    </div>
  </main></div>`;
}

// ============ CARD REDIRECT HANDLER ============
// Handles QR scan and NFC tap redirects

async function handleCardRedirect(token) {
  // Show loading page
  root.innerHTML = cardRedirectLoadingPage();
  
  try {
    const result = await resolveCardToken(token);
    
    if (!result.valid) {
      root.innerHTML = cardRedirectErrorPage(result.error, result.message);
      return;
    }
    
    // Record interaction
    await recordInteraction(
      result.tokenKind === 'nfc' ? 'nfc_tap' : 'qr_scan',
      result.businessId,
      result.cardId,
      null,
      result.tokenKind,
      result.destinationMode
    );
    
    // Redirect based on destination mode
    if (result.destinationMode === 'direct_google' && result.googleReviewUrl) {
      // Direct redirect to Google Review
      window.location.href = result.googleReviewUrl;
    } else if (result.destinationMode === 'profile' && result.slug) {
      // Redirect to profile page
      profileState.cardId = result.cardId;
      profileState.tokenKind = result.tokenKind;
      go(`/p/${result.slug}`);
    } else if (result.googleReviewUrl) {
      // Fallback to Google Review
      window.location.href = result.googleReviewUrl;
    } else {
      // No valid destination
      root.innerHTML = cardRedirectErrorPage('no_destination', 'Kartu belum dikonfigurasi dengan benar.');
    }
  } catch (e) {
    console.error('Card redirect error:', e);
    root.innerHTML = cardRedirectErrorPage('error', 'Terjadi kesalahan saat memproses kartu.');
  }
}

async function resolveCardToken(token) {
  if (!USE_REAL_DATA) {
    // Demo mode
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Demo tokens
    if (token === 'demo-google') {
      return {
        valid: true,
        cardId: 'demo-card-1',
        businessId: 'demo-business-id',
        destinationMode: 'direct_google',
        googleReviewUrl: 'https://g.page/r/demo/review',
        slug: 'kopi-nusantara',
        tokenKind: 'qr'
      };
    }
    
    if (token === 'demo-profile') {
      return {
        valid: true,
        cardId: 'demo-card-2',
        businessId: 'demo-business-id',
        destinationMode: 'profile',
        googleReviewUrl: 'https://g.page/r/demo/review',
        slug: 'kopi-nusantara',
        tokenKind: 'qr'
      };
    }
    
    if (token === 'demo-nfc') {
      return {
        valid: true,
        cardId: 'demo-card-3',
        businessId: 'demo-business-id',
        destinationMode: 'profile',
        googleReviewUrl: 'https://g.page/r/demo/review',
        slug: 'kopi-nusantara',
        tokenKind: 'nfc'
      };
    }
    
    // Default demo - direct to profile
    return {
      valid: true,
      cardId: 'demo-card',
      businessId: 'demo-business-id',
      destinationMode: 'profile',
      googleReviewUrl: 'https://g.page/r/demo/review',
      slug: 'kopi-nusantara',
      tokenKind: 'qr'
    };
  }
  
  try {
    // Call Edge Function to resolve token
    const { data, error } = await supabaseClient.functions.invoke('resolve-card-token', {
      body: { token }
    });
    
    if (error || !data?.valid) {
      return {
        valid: false,
        error: data?.error || 'invalid',
        message: data?.message || 'Token tidak valid.'
      };
    }
    
    return data;
  } catch (e) {
    console.error('resolveCardToken exception:', e);
    return {
      valid: false,
      error: 'error',
      message: 'Gagal memproses token kartu.'
    };
  }
}

function cardRedirectLoadingPage() {
  return `
    <div class="profile-page">
      <main class="profile-phone" style="display:flex;align-items:center;justify-content:center">
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="margin-top:16px;color:var(--muted)">Memproses kartu...</p>
          <p style="margin-top:8px;color:var(--muted);font-size:12px">Anda akan diarahkan sebentar lagi</p>
        </div>
      </main>
    </div>`;
}

function cardRedirectErrorPage(error, message) {
  const errorConfig = {
    'not_found': { icon: '🔍', title: 'Kartu Tidak Ditemukan' },
    'not_active': { icon: '⏸️', title: 'Kartu Belum Aktif' },
    'suspended': { icon: '🚫', title: 'Kartu Dinonaktifkan' },
    'no_destination': { icon: '⚙️', title: 'Kartu Belum Dikonfigurasi' },
    'expired': { icon: '⏰', title: 'Token Kedaluwarsa' },
    'error': { icon: '⚠️', title: 'Terjadi Kesalahan' },
  };
  
  const config = errorConfig[error] || errorConfig['error'];
  
  return `
    <div class="profile-page">
      <main class="profile-phone" style="display:flex;align-items:center;justify-content:center">
        <div style="text-align:center;padding:40px">
          <div style="font-size:64px;margin-bottom:20px">${config.icon}</div>
          <h2 style="margin-bottom:12px">${config.title}</h2>
          <p style="color:var(--muted);margin-bottom:24px;font-size:14px">${message}</p>
          <div style="display:flex;flex-direction:column;gap:12px">
            <button class="btn btn-primary" data-route="/">Kembali ke Beranda</button>
            <a class="btn btn-secondary" href="${whatsappUrl}" target="_blank" rel="noopener">Hubungi Bantuan</a>
          </div>
        </div>
      </main>
    </div>`;
}

// Reset profile state when navigating away
function resetProfileState() {
  profileState.slug = null;
  profileState.business = null;
  profileState.isLoading = false;
  profileState.error = null;
}

function openModal(content) {
  closeModal();
  root.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" id="modal"><div class="modal">${content}</div></div>`);
  document.body.classList.add("no-scroll");
}

function closeModal() {
  document.getElementById("modal")?.remove();
  document.body.classList.remove("no-scroll");
}

function batchModal() {
  openModal(`
    <div class="row-between">
      <div><h2>Buat Batch Kartu</h2><p>Generate kartu baru dengan serial unik.</p></div>
      <button class="icon-btn" data-modal-close>${icons.close}</button>
    </div>
    <form id="batchForm" class="stack">
      <div class="form-group">
        <label>Jumlah kartu <span class="required">*</span></label>
        <input id="batch-count" class="input" type="number" min="1" max="100" value="10" required />
        <span class="input-hint">Maksimal 100 kartu per batch</span>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Awalan serial</label>
          <input id="batch-prefix" class="input" value="KRT" maxlength="12" />
        </div>
        <div class="form-group">
          <label>Nomor awal</label>
          <input id="batch-start" class="input" type="number" value="1" min="1" />
        </div>
      </div>
      <div class="form-group">
        <label>Kode batch</label>
        <input id="batch-code" class="input" placeholder="BTH-0019" />
        <span class="input-hint">Kosongkan untuk auto-generate</span>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-modal-close>Batal</button>
        <button type="submit" class="btn btn-primary">${icons.plus} Buat Batch</button>
      </div>
    </form>
  `);
}

function resellerModal() {
  openModal(`
    <div class="row-between">
      <div><h2>Tambah Reseller</h2><p>Buat akun reseller baru.</p></div>
      <button class="icon-btn" data-modal-close>${icons.close}</button>
    </div>
    <form id="resellerForm" class="stack">
      <div class="form-group">
        <label>Nama reseller <span class="required">*</span></label>
        <input id="reseller-name" class="input" placeholder="Contoh: Reseller Medan" required />
      </div>
      <div class="form-group">
        <label>Nomor HP <span class="required">*</span></label>
        <input id="reseller-phone" class="input" type="tel" placeholder="08xx xxxx xxxx" required />
      </div>
      <div class="form-group">
        <label>Kota</label>
        <input id="reseller-city" class="input" placeholder="Kota reseller" />
      </div>
      <div class="info-box" style="margin-top:8px">
        ${icons.help}
        <div>
          <strong>Catatan</strong>
          <p>Reseller akan dibuat sebagai entitas bisnis. Untuk login, buat akun user terpisah dan hubungkan ke reseller ini.</p>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-modal-close>Batal</button>
        <button type="submit" class="btn btn-primary">${icons.plus} Buat Reseller</button>
      </div>
    </form>
  `);
}

function resetModal(owner) {
  openModal(`<div class="row-between"><div><h2>Buat Tautan Reset</h2><p>Untuk akun milik ${owner}.</p></div><button class="icon-btn" data-modal-close>${icons.close}</button></div><div style="padding:16px;border-radius:13px;background:var(--blue-50);font-size:12px;color:var(--blue-800)">Tautan hanya dapat digunakan satu kali dan akan kedaluwarsa dalam 30 menit. Kirimkan secara manual ke WhatsApp owner.</div><div class="modal-actions"><button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" data-create-reset>Buat & Salin Tautan</button></div>`);
}

function sellModal(cardId, serial) {
  openModal(`<div class="row-between"><div><h2>Tandai Sebagai Terjual?</h2><p>Kartu ${serial} akan dibuka untuk proses aktivasi.</p></div><button class="icon-btn" data-modal-close>${icons.close}</button></div><div style="padding:16px;border:1px solid var(--blue-200);border-radius:13px;background:var(--blue-50);font-size:12px;color:var(--blue-800)"><b>Penting:</b> Setelah dikonfirmasi, kartu dapat diklaim oleh orang pertama yang memindai QR. Tidak ada data pembeli yang perlu diisi.</div><div class="modal-actions"><button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" data-confirm-sell="${cardId}" data-serial="${serial}">Ya, Tandai Terjual</button></div>`);
}

function render() {
  state.mobileMenu = false;
  const route = getRoute();
  
  // Initialize activation flow when visiting /aktivasi
  if (route === "/aktivasi" || route.startsWith("/aktivasi?")) {
    const a = state.activation;
    const currentToken = getActivationTokenFromUrl();
    
    // Only reinitialize if token changed or not yet initialized
    if (a.token !== currentToken || (!a.cardStatus && !a.isLoading)) {
      initActivationFlow();
      return; // initActivationFlow will call render when done
    }
  }
  
  // Load data for dashboards if logged in
  if (USE_REAL_DATA && isLoggedIn()) {
    if (route.startsWith("/reseller") && !state.resellerData) {
      loadResellerDashboardData().then(data => {
        state.resellerData = data;
        renderPage(route);
      });
      // Show loading state
      root.innerHTML = loadingPage("reseller");
      return;
    }
    if (route.startsWith("/owner") && !state.ownerData) {
      loadOwnerDashboardData().then(data => {
        state.ownerData = data;
        renderPage(route);
      });
      root.innerHTML = loadingPage("owner");
      return;
    }
    if (route.startsWith("/admin") && !state.adminData) {
      loadAdminDashboardData().then(data => {
        state.adminData = data;
        renderPage(route);
      });
      root.innerHTML = loadingPage("admin");
      return;
    }
  }
  
  renderPage(route);
}

function renderPage(route) {
  if (route === "/") root.innerHTML = homePageV2();
  else if (route === "/login") root.innerHTML = loginPage();
  else if (route === "/aktivasi") root.innerHTML = activationPage();
  else if (route === "/profil") root.innerHTML = publicProfilePage();
  else if (route.startsWith("/p/")) root.innerHTML = dynamicProfilePage(route.replace("/p/", ""));
  else if (route.startsWith("/c/")) { handleCardRedirect(route.replace("/c/", "")); return; }
  else if (route.startsWith("/owner")) root.innerHTML = ownerPage(route);
  else if (route.startsWith("/reseller")) root.innerHTML = resellerPage(route);
  else if (route.startsWith("/admin")) root.innerHTML = adminPage(route);
  else root.innerHTML = homePageV2();
  document.title = route === "/" ? "SPNB DIGITAL — Kartu Google Review" : `${pageTitle(route)} — SPNB DIGITAL`;
}

function loadingPage(role) {
  const titles = {
    owner: "Dashboard Owner",
    reseller: "Dashboard Reseller", 
    admin: "Dashboard Admin"
  };
  return `
    <div class="app-shell role-${role}">
      <main class="main-shell" style="display:flex;align-items:center;justify-content:center;min-height:100vh">
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="margin-top:16px;color:var(--muted)">Memuat ${titles[role]}...</p>
        </div>
      </main>
    </div>`;
}

function pageTitle(route) {
  if (route === "/aktivasi") return "Aktivasi Kartu";
  if (route === "/profil") return "Kopi Nusantara";
  if (route === "/login") return "Masuk";
  if (route.startsWith("/admin")) return "Dashboard Admin";
  if (route.startsWith("/reseller")) return "Dashboard Reseller";
  return "Dashboard Owner";
}

root.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) { event.preventDefault(); go(routeButton.dataset.route); return; }

  const scrollButton = event.target.closest("[data-scroll]");
  if (scrollButton) {
    event.preventDefault();
    const id = scrollButton.dataset.scroll;
    if (getRoute() !== "/") {
      go("/");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 80);
    } else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    state.mobileMenu = false;
    return;
  }

  if (event.target.closest("[data-mobile-menu]")) { state.mobileMenu = !state.mobileMenu; root.innerHTML = homePage(); return; }
  if (event.target.closest("[data-sidebar]")) { 
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    sidebar?.classList.toggle("open"); 
    overlay?.classList.toggle("show");
    return; 
  }
  
  // Close sidebar when clicking overlay
  if (event.target.id === "sidebarOverlay") {
    document.getElementById("sidebar")?.classList.remove("open");
    event.target.classList.remove("show");
    return;
  }

  const faqButton = event.target.closest(".faq-question");
  if (faqButton) { faqButton.parentElement.classList.toggle("open"); return; }

  const demo = event.target.closest("[data-demo-toast]");
  if (demo) { toast(demo.dataset.demoToast); return; }

  // Track profile link clicks
  const trackLink = event.target.closest("[data-track-link]");
  if (trackLink) {
    const linkType = trackLink.dataset.trackLink;
    const businessId = trackLink.dataset.businessId;
    const linkId = trackLink.dataset.linkId || null;
    
    // Record the click (don't prevent default - let the link open)
    recordInteraction('profile_link_click', businessId, null, linkId, null, null);
    
    // Show toast for feedback
    const linkLabels = {
      'google_review': 'Google Rating',
      'whatsapp': 'WhatsApp',
      'google_maps': 'Google Maps',
      'instagram': 'Instagram',
      'tiktok': 'TikTok',
      'facebook': 'Facebook',
      'website': 'Website'
    };
    console.log(`📊 Link clicked: ${linkLabels[linkType] || linkType}`);
    return; // Let the link proceed
  }

  // Share profile
  const shareProfile = event.target.closest("[data-share-profile]");
  if (shareProfile) {
    const slug = shareProfile.dataset.shareProfile;
    const shareUrl = `${window.location.origin}${window.location.pathname}#/p/${slug}`;
    const shareData = {
      title: profileState.business?.name || 'Profil Bisnis',
      text: `Lihat profil ${profileState.business?.name || 'bisnis ini'} di SPNB DIGITAL`,
      url: shareUrl
    };
    
    // Try native share API first
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData).catch(err => {
        console.log('Share cancelled or failed:', err);
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast('Link profil disalin ke clipboard!');
      }).catch(() => {
        toast('Gagal menyalin link.');
      });
    }
    return;
  }

  // Activation flow handlers
  if (event.target.closest("[data-activation-next]")) {
    const a = state.activation;
    
    // Step 1 → Step 2: Verify card, move to account creation
    if (a.step === 1) {
      a.step = 2;
      render();
      return;
    }
    
    // Step 3 → Step 4: Validate business selection/creation
    if (a.step === 3) {
      if (a.createNewBusiness || !a.existingBusinesses?.length) {
        // Creating new business - validate and create
        handleCreateActivationBusiness().then(success => {
          if (success) {
            a.step = 4;
            render();
          }
        });
      } else {
        // Using existing business
        if (!a.selectedBusinessId) {
          toast('Pilih profil usaha terlebih dahulu.');
          return;
        }
        a.step = 4;
        render();
      }
      return;
    }
    
    return;
  }
  
  // Activation submit (final step)
  if (event.target.closest("[data-activation-submit]")) {
    handleClaimCard();
    return;
  }
  
  if (event.target.closest("[data-activation-prev]")) { 
    const a = state.activation;
    // If logged in and on step 3, go back to step 1 (can't go to step 2)
    if (isLoggedIn() && a.step === 3) {
      a.step = 1;
    } else if (a.step === 4 && isLoggedIn() && (!a.existingBusinesses || a.existingBusinesses.length === 0)) {
      // If logged in with no existing business, step 4 back to step 3
      a.step = 3;
    } else {
      a.step = Math.max(1, a.step - 1);
    }
    render(); 
    return; 
  }

  // Auth mode toggle (login/register)
  const authMode = event.target.closest("[data-auth-mode]");
  if (authMode) {
    state.activation.authMode = authMode.dataset.authMode;
    render();
    return;
  }

  // Destination mode selection
  const destination = event.target.closest("[data-destination]");
  if (destination) { 
    state.activation.destinationMode = destination.dataset.destination; 
    render(); 
    return; 
  }

  // Business choice tabs (existing vs new)
  const businessChoice = event.target.closest("[data-business-choice]");
  if (businessChoice) {
    state.activation.createNewBusiness = businessChoice.dataset.businessChoice === 'new';
    render();
    return;
  }

  // Select existing business
  const selectBusiness = event.target.closest("[data-select-business]");
  if (selectBusiness) {
    state.activation.selectedBusinessId = selectBusiness.dataset.selectBusiness;
    render();
    return;
  }

  // Legacy data-mode for backward compatibility
  const mode = event.target.closest("[data-mode]");
  if (mode) { state.activation.destinationMode = mode.dataset.mode === 'direct' ? 'direct_google' : 'profile'; render(); return; }

  if (event.target.closest("[data-batch-modal]")) { batchModal(); return; }
  if (event.target.closest("[data-reseller-modal]")) { resellerModal(); return; }
  const reset = event.target.closest("[data-reset-modal]");
  if (reset) { resetModal(reset.dataset.resetModal); return; }
  const sell = event.target.closest("[data-sell-card]");
  if (sell) { 
    const cardId = sell.dataset.sellCard;
    const serial = sell.dataset.serial || cardId;
    sellModal(cardId, serial); 
    return; 
  }

  const unsell = event.target.closest("[data-unsell-card]");
  if (unsell) {
    handleUnsellCard(unsell.dataset.unsellCard, unsell.dataset.serial);
    return;
  }

  if (event.target.closest("[data-modal-close]") || (event.target.id === "modal")) { closeModal(); return; }
  if (event.target.closest("[data-create-reset]")) { closeModal(); toast("Tautan reset disalin. Berlaku selama 30 menit."); return; }

  // Save account name
  if (event.target.closest("[data-save-account]")) {
    const newName = document.getElementById("account-name")?.value?.trim();
    if (newName && currentUser) {
      updateAccountName(newName);
    } else {
      toast("Nama tidak boleh kosong.");
    }
    return;
  }

  // Change password
  if (event.target.closest("[data-change-password]")) {
    const newPassword = document.getElementById("new-password")?.value;
    const confirmPassword = document.getElementById("confirm-password")?.value;
    
    if (!newPassword || newPassword.length < 8) {
      toast("Password baru harus minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Konfirmasi password tidak sama.");
      return;
    }
    
    changePassword(newPassword);
    return;
  }

  // Quick login buttons
  const quickLogin = event.target.closest("[data-quick-login]");
  if (quickLogin) {
    const role = quickLogin.dataset.quickLogin;
    const credentials = {
      owner: { email: 'owner@spnb.id', password: 'Owner123!' },
      reseller: { email: 'reseller@spnb.id', password: 'Reseller123!' },
      admin: { email: 'admin@spnb.id', password: 'Admin123!' }
    };
    const cred = credentials[role];
    if (cred) {
      handleLogin(cred.email, cred.password);
    }
    return;
  }

  // Logout button
  if (event.target.closest("[data-logout]")) {
    event.preventDefault();
    handleLogout();
    return;
  }

  const confirmSell = event.target.closest("[data-confirm-sell]");
  if (confirmSell) {
    const cardId = confirmSell.dataset.confirmSell;
    const serial = confirmSell.dataset.serial || cardId;
    handleConfirmSell(cardId, serial);
    return;
  }

  // Save business profile
  if (event.target.closest("[data-save-profile]")) {
    handleSaveBusinessProfile();
    return;
  }

  // Stats period selector
  const statsPeriod = event.target.closest("[data-stats-period]");
  if (statsPeriod) {
    const days = parseInt(statsPeriod.dataset.statsPeriod);
    state.ownerStats = null; // Clear to reload
    loadOwnerStats(days);
    return;
  }

  // Refresh stats
  if (event.target.closest("[data-refresh-stats]")) {
    state.ownerStats = null;
    loadOwnerStats(state.statsPeriod || 30);
    return;
  }

  // Admin stats period selector
  const adminStatsPeriod = event.target.closest("[data-admin-stats-period]");
  if (adminStatsPeriod) {
    const days = parseInt(adminStatsPeriod.dataset.adminStatsPeriod);
    state.adminStats = null;
    loadAdminStats(days);
    return;
  }

  // Refresh admin stats
  if (event.target.closest("[data-refresh-admin-stats]")) {
    state.adminStats = null;
    loadAdminStats(state.adminStatsPeriod || 30);
    return;
  }

  // Clear logo
  if (event.target.closest("[data-clear-logo]")) {
    const logoInput = document.getElementById('bp-logo');
    if (logoInput) logoInput.value = '';
    state.businessProfile.logoUrl = '';
    render();
    return;
  }

  // Clear banner
  if (event.target.closest("[data-clear-banner]")) {
    const bannerInput = document.getElementById('bp-banner');
    if (bannerInput) bannerInput.value = '';
    state.businessProfile.bannerUrl = '';
    render();
    return;
  }

  // Export CSV handlers
  if (event.target.closest("[data-export-cards]")) {
    exportCardsCSV();
    return;
  }
  
  if (event.target.closest("[data-export-resellers]")) {
    exportResellersCSV();
    return;
  }
  
  if (event.target.closest("[data-export-interactions]")) {
    const days = parseInt(event.target.closest("[data-export-interactions]").dataset.exportInteractions) || 30;
    exportInteractionsCSV(days);
    return;
  }
  
  if (event.target.closest("[data-export-reseller-sales]")) {
    exportResellerSalesCSV();
    return;
  }
  
  if (event.target.closest("[data-export-audit-log]")) {
    exportAuditLogCSV();
    return;
  }

  // Notification handlers
  if (event.target.closest("[data-toggle-notifications]")) {
    state.showNotificationPanel = !state.showNotificationPanel;
    if (state.showNotificationPanel && state.notifications.length === 0) {
      loadNotifications();
    }
    render();
    return;
  }

  // Click on notification item
  const notificationItem = event.target.closest("[data-notification-id]");
  if (notificationItem) {
    const notificationId = notificationItem.dataset.notificationId;
    markNotificationRead(notificationId);
    render();
    return;
  }

  // Mark all notifications as read
  if (event.target.closest("[data-mark-all-read]")) {
    markAllNotificationsRead();
    render();
    return;
  }

  // Close notification panel when clicking outside
  if (state.showNotificationPanel && !event.target.closest(".notification-wrapper")) {
    state.showNotificationPanel = false;
    render();
    return;
  }
});

root.addEventListener("input", (event) => {
  const a = state.activation;
  const name = event.target.name;
  
  // Handle activation form fields
  if (name && Object.prototype.hasOwnProperty.call(a, name)) {
    a[name] = event.target.value;
    
    // Auto-generate slug from business name
    if (name === "businessName") {
      if (!a.businessSlug || a.businessSlug === a._lastAutoSlug) {
        a.businessSlug = event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        a._lastAutoSlug = a.businessSlug;
      }
    }
  }
});

// File upload handler
root.addEventListener("change", (event) => {
  // Logo upload
  if (event.target.closest("[data-upload-logo]")) {
    const file = event.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
    event.target.value = ''; // Reset input
    return;
  }
  
  // Banner upload
  if (event.target.closest("[data-upload-banner]")) {
    const file = event.target.files?.[0];
    if (file) {
      handleBannerUpload(file);
    }
    event.target.value = ''; // Reset input
    return;
  }
});

// Login form submit handler
root.addEventListener("submit", async (event) => {
  if (event.target.id === "loginForm") {
    event.preventDefault();
    const email = document.getElementById("loginEmail")?.value?.trim();
    const password = document.getElementById("loginPassword")?.value;
    
    if (!email || !password) {
      state.loginError = "Email dan password harus diisi.";
      render();
      return;
    }
    
    await handleLogin(email, password);
  }
  
  // Activation login form
  if (event.target.id === "activationLoginForm") {
    event.preventDefault();
    await handleActivationLogin();
  }
  
  // Activation register form
  if (event.target.id === "activationRegisterForm") {
    event.preventDefault();
    await handleActivationRegister();
  }
  
  // Distribute cards form
  if (event.target.id === "distributeForm") {
    event.preventDefault();
    await handleDistributeCards();
  }
  
  // Create batch form
  if (event.target.id === "batchForm") {
    event.preventDefault();
    await handleCreateBatch();
  }
  
  // Create reseller form
  if (event.target.id === "resellerForm") {
    event.preventDefault();
    await handleCreateReseller();
  }
});

// Handle login
async function handleLogin(email, password) {
  state.loginError = '';
  state.loginLoading = true;
  render();
  
  try {
    const { data, error } = await signInWithEmail(email, password);
    
    if (error) {
      console.error('Login error:', error);
      state.loginLoading = false;
      
      // Translate common errors to Indonesian
      if (error.message.includes('Invalid login credentials')) {
        state.loginError = 'Email atau password salah.';
      } else if (error.message.includes('Email not confirmed')) {
        state.loginError = 'Email belum dikonfirmasi.';
      } else if (error.message.includes('Too many requests')) {
        state.loginError = 'Terlalu banyak percobaan. Coba lagi nanti.';
      } else {
        state.loginError = error.message || 'Gagal login. Silakan coba lagi.';
      }
      render();
      return;
    }
    
    if (data?.user) {
      await loadUserData(data.user);
      state.loginLoading = false;
      state.loginError = '';
      toast(`Selamat datang, ${currentAccount?.display_name || 'User'}!`);
      redirectToDashboard();
    }
  } catch (e) {
    console.error('Login exception:', e);
    state.loginLoading = false;
    state.loginError = 'Terjadi kesalahan. Silakan coba lagi.';
    render();
  }
}

// Handle logout
async function handleLogout() {
  try {
    await signOut();
    toast('Berhasil keluar.');
  } catch (e) {
    console.error('Logout error:', e);
    toast('Gagal keluar. Silakan coba lagi.');
  }
}

window.addEventListener("hashchange", render);

// Initialize app
async function initApp() {
  await checkSupabaseConnection();
  await initAuth();
  render();
  
  // Check if user is logged in and on login page, redirect to dashboard
  if (isLoggedIn() && getRoute() === '/login') {
    redirectToDashboard();
  }
}

initApp();
