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
