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
  
  try {
    // Load account data
    const { data: account, error: accountError } = await supabaseClient
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (accountError) {
      console.warn('Could not load account:', accountError.message);
      // Create a basic account object from auth user data
      currentAccount = {
        user_id: user.id,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        phone_e164: user.user_metadata?.phone_e164 || null
      };
    } else if (!account) {
      // Account doesn't exist, create basic one from auth data
      currentAccount = {
        user_id: user.id,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        phone_e164: user.user_metadata?.phone_e164 || null
      };
      console.log('Account not found in database, using auth metadata');
    } else {
      currentAccount = account;
    }
    
    // Load roles
    const { data: roles, error: rolesError } = await supabaseClient
      .from('account_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (rolesError) {
      console.warn('Could not load roles:', rolesError.message);
      currentRoles = ['owner']; // Default to owner role
    } else {
      currentRoles = roles?.map(r => r.role) || ['owner'];
    }
    
    // If no roles, default to owner
    if (currentRoles.length === 0) {
      currentRoles = ['owner'];
    }
    
    console.log('User loaded:', currentAccount?.display_name, 'Roles:', currentRoles);
    
    // Load notifications in background
    loadNotifications();
  } catch (e) {
    console.error('loadUserData error:', e);
    // Fallback to basic data
    currentAccount = {
      user_id: user.id,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
      phone_e164: user.user_metadata?.phone_e164 || null
    };
    currentRoles = ['owner'];
  }
}

function clearUserData() {
  currentUser = null;
  currentAccount = null;
  currentRoles = [];
  // Clear notifications
  state.notifications = [];
  state.unreadCount = 0;
  state.showNotificationPanel = false;
  // Clear user-specific data
  state.ownerData = null;
  state.resellerData = null;
  state.adminData = null;
  state.ownerStats = null;
  state.adminStats = null;
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
  const siteUrl = window.location.origin + window.location.pathname;
  
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { 
        phone_e164: phoneE164, 
        display_name: displayName 
      },
      emailRedirectTo: `${siteUrl}#/login`
    }
  });
  return { data, error };
}

// Sign up specifically for activation flow - redirects back to activation page with token
async function signUpForActivation(email, password, displayName, phone, activationToken) {
  const phoneE164 = phone ? normalizePhone(phone) : null;
  const siteUrl = window.location.origin + window.location.pathname;
  
  // Redirect back to activation page with the same token
  const redirectUrl = activationToken 
    ? `${siteUrl}#/aktivasi?token=${activationToken}`
    : `${siteUrl}#/login`;
  
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { 
        phone_e164: phoneE164, 
        display_name: displayName 
      },
      emailRedirectTo: redirectUrl
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
