/**
 * Activation Flow Functions
 * Handles card activation workflow including token validation,
 * user registration/login, business creation, and card claiming.
 */

// Parse token from URL hash query string
function getActivationTokenFromUrl() {
  // Token is in hash: #/aktivasi?token=xxx
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  
  if (queryIndex === -1) return null;
  
  const queryString = hash.substring(queryIndex + 1);
  const urlParams = new URLSearchParams(queryString);
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
    // Try using RPC function first (bypasses RLS)
    try {
      const { data: rpcData, error: rpcError } = await supabaseClient.rpc('validate_card_for_activation', {
        p_token: token
      });
      
      if (!rpcError && rpcData) {
        console.log('RPC validate_card_for_activation result:', rpcData);
        if (rpcData.error) {
          return {
            valid: false,
            error: rpcData.error,
            message: rpcData.message
          };
        }
        return {
          valid: true,
          cardId: rpcData.card_id,
          serial: rpcData.serial,
          status: rpcData.lifecycle_state,
          claimSessionToken: rpcData.card_id
        };
      }
    } catch (rpcEx) {
      console.log('RPC validate_card_for_activation not available:', rpcEx.message);
    }
    
    // Fallback: Try direct query (works if RLS allows or user is admin)
    let card = null;
    let queryError = null;
    
    // Check if token is a UUID format (card ID)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidPattern.test(token)) {
      // Try to find by card ID
      const { data, error } = await supabaseClient
        .from('cards')
        .select('id, serial, lifecycle_state, owner_id')
        .eq('id', token)
        .maybeSingle();
      
      if (error) {
        console.log('Card query by ID error:', error.message, error.code);
        queryError = error;
      } else if (data) {
        card = data;
      }
    }
    
    // If not found by ID, try by serial
    if (!card && !queryError) {
      const { data, error } = await supabaseClient
        .from('cards')
        .select('id, serial, lifecycle_state, owner_id')
        .eq('serial', token)
        .maybeSingle();
      
      if (error) {
        console.log('Card query by serial error:', error.message, error.code);
        queryError = error;
      } else if (data) {
        card = data;
      }
    }
    
    // If we got RLS/permission error, show appropriate message
    if (queryError && (queryError.code === '42501' || queryError.message.includes('permission') || queryError.message.includes('RLS'))) {
      return {
        valid: false,
        error: 'permission',
        message: 'Tidak dapat memvalidasi kartu. Silakan hubungi admin untuk bantuan.'
      };
    }
    
    if (!card) {
      return {
        valid: false,
        error: 'invalid',
        message: 'Kartu tidak ditemukan. Pastikan link aktivasi benar atau hubungi reseller.'
      };
    }
    
    // Check card status
    if (card.lifecycle_state === 'claimed' && card.owner_id) {
      return {
        valid: false,
        error: 'already_claimed',
        message: 'Kartu ini sudah diaktifkan oleh pemilik lain.'
      };
    }
    
    if (card.lifecycle_state === 'admin_stock') {
      return {
        valid: false,
        error: 'not_sold',
        message: 'Kartu ini belum tersedia. Hubungi reseller untuk membeli kartu.'
      };
    }
    
    if (card.lifecycle_state === 'reseller_stock') {
      return {
        valid: false,
        error: 'not_sold',
        message: 'Kartu ini belum ditandai terjual oleh reseller.'
      };
    }
    
    // Card is valid and ready for activation (sold_unclaimed)
    return {
      valid: true,
      cardId: card.id,
      serial: card.serial,
      status: card.lifecycle_state,
      claimSessionToken: card.id // Use card ID as claim session token for now
    };
    
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
    
    // Use signUpForActivation with activation token in redirect URL
    const { data, error } = await signUpForActivation(a.email, a.password, displayName, a.phone, a.token);
    
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
    // Ensure account exists first (using RPC to bypass RLS)
    await ensureAccountExists();
    
    // Create business using RPC
    const { data: bizResult, error: bizError } = await supabaseClient.rpc('create_business_for_owner', {
      p_owner_id: currentUser.id,
      p_name: a.businessName.trim(),
      p_google_review_url: a.googleReviewUrl.trim(),
      p_theme_color: '#1769c2'
    });
    
    if (bizError) {
      console.error('Create business RPC error:', bizError);
      a.isSubmitting = false;
      toast('Gagal membuat profil usaha: ' + (bizError.message || 'Terjadi kesalahan'));
      render();
      return false;
    }
    
    if (bizResult?.error) {
      console.error('Create business error:', bizResult);
      a.isSubmitting = false;
      toast('Gagal membuat profil usaha: ' + bizResult.message);
      render();
      return false;
    }
    
    const businessId = bizResult.business_id;
    
    // Create slug using RPC
    const slug = a.businessSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { error: slugError } = await supabaseClient.rpc('create_business_slug', {
      p_business_id: businessId,
      p_slug: slug
    });
    
    if (slugError) {
      console.error('Create slug error:', slugError);
      // Continue anyway, slug is optional
    }
    
    a.selectedBusinessId = businessId;
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

// Ensure account record exists for current user (using RPC)
async function ensureAccountExists() {
  if (!currentUser) return;
  
  try {
    const displayName = currentAccount?.display_name || currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'User';
    const phoneE164 = currentAccount?.phone_e164 || currentUser.user_metadata?.phone_e164 || null;
    
    const { data, error } = await supabaseClient.rpc('ensure_account_exists', {
      p_user_id: currentUser.id,
      p_display_name: displayName,
      p_phone_e164: phoneE164
    });
    
    if (error) {
      console.error('ensure_account_exists RPC error:', error);
    } else {
      console.log('ensure_account_exists result:', data);
    }
  } catch (e) {
    console.error('ensureAccountExists exception:', e);
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
