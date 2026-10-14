// ============ RENDER & ROUTING ============

// Check if URL contains Supabase auth callback parameters
function isAuthCallback() {
  const hash = window.location.hash || '';
  const fullUrl = window.location.href;
  
  // Supabase adds these params after email confirmation
  return hash.includes('access_token=') || 
         hash.includes('refresh_token=') || 
         hash.includes('type=signup') ||
         hash.includes('type=recovery') ||
         hash.includes('type=email') ||
         fullUrl.includes('access_token=') ||
         fullUrl.includes('code=') ||
         fullUrl.includes('type=signup');
}

// Handle Supabase auth callback (email confirmation)
async function handleAuthCallback() {
  console.log('Handling auth callback...');
  
  try {
    // Let Supabase process the tokens in the URL
    const { data, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('Auth callback getSession error:', error);
    }
    
    if (data?.session?.user) {
      console.log('Auth callback successful, user:', data.session.user.email);
      await loadUserData(data.session.user);
      return true;
    }
    
    // If no session yet, try to exchange code/token
    // Supabase should auto-handle this, but let's wait a moment and retry
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: retryData } = await supabaseClient.auth.getSession();
    if (retryData?.session?.user) {
      console.log('Auth callback successful on retry, user:', retryData.session.user.email);
      await loadUserData(retryData.session.user);
      return true;
    }
    
    // Still no session - try to get user from URL params
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userData?.user) {
      console.log('Got user from getUser:', userData.user.email);
      await loadUserData(userData.user);
      return true;
    }
    
    console.log('No user found in auth callback');
    return false;
  } catch (e) {
    console.error('Auth callback exception:', e);
    return false;
  }
}

function render() {
  state.mobileMenu = false;
  const route = getRoute();
  
  // Check for auth callback (email confirmation redirect)
  if (isAuthCallback()) {
    // Show loading while processing auth
    root.innerHTML = `
      <div class="activation-page">
        <div class="activation-wrap">
          <div class="activation-brand">${brand("#/")}</div>
          <div class="activation-card" style="max-width:520px">
            <section class="activation-main" style="text-align:center;padding:48px 40px">
              <div class="loading-spinner"></div>
              <h2 style="margin-top:24px">Memverifikasi Email...</h2>
              <p style="color:var(--muted)">Mohon tunggu sebentar</p>
            </section>
          </div>
        </div>
      </div>`;
    
    handleAuthCallback().then(success => {
      if (success) {
        // Clean URL - remove auth params but keep activation token
        const activationToken = getActivationTokenFromUrl();
        
        // Show email confirmed page
        state.activation.emailConfirmed = true;
        state.activation.emailConfirmationPending = false;
        
        if (activationToken) {
          state.activation.token = activationToken;
          // Redirect to clean URL
          window.history.replaceState(null, '', `#/aktivasi?token=${activationToken}`);
        } else {
          window.history.replaceState(null, '', '#/aktivasi');
        }
        
        render();
      } else {
        // Auth failed, show error or redirect to login
        toast('Gagal memverifikasi email. Silakan coba lagi.');
        go('/login');
      }
    });
    return;
  }
  
  // Initialize activation flow when visiting /aktivasi
  if (route === "/aktivasi" || route.startsWith("/aktivasi?")) {
    const a = state.activation;
    const currentToken = getActivationTokenFromUrl();
    
    // If email just confirmed, don't reinitialize - show confirmed page
    if (a.emailConfirmed) {
      renderPage(route);
      return;
    }
    
    // If waiting for email confirmation and user is now logged in, advance
    if (a.emailConfirmationPending && isLoggedIn()) {
      a.emailConfirmed = true;
      a.emailConfirmationPending = false;
      renderPage(route);
      return;
    }
    
    // Only reinitialize if token changed or not yet initialized
    if (a.token !== currentToken || (!a.cardStatus && !a.isLoading && !a.emailConfirmationPending)) {
      initActivationFlow();
      return; // initActivationFlow will call render when done
    }
    
    // If user just logged in and still on step 2, advance to step 3
    if (isLoggedIn() && a.step === 2 && a.cardStatus === 'valid') {
      loadUserBusinesses().then(() => {
        a.step = 3;
        render();
      });
      return;
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
  else if (route === "/aktivasi" || route.startsWith("/aktivasi?")) root.innerHTML = activationPage();
  else if (route === "/profil") root.innerHTML = publicProfilePage();
  else if (route.startsWith("/p/")) root.innerHTML = dynamicProfilePage(route.replace("/p/", ""));
  else if (route.startsWith("/c/")) { handleCardRedirect(route.replace("/c/", "")); return; }
  else if (route.startsWith("/owner")) root.innerHTML = ownerPage(route);
  else if (route.startsWith("/reseller")) root.innerHTML = resellerPage(route);
  else if (route.startsWith("/admin")) root.innerHTML = adminPage(route);
  else root.innerHTML = homePageV2();
  document.title = route === "/" ? "SPNB DIGITAL — Kartu Google Review" : `${pageTitle(route)} — SPNB DIGITAL`;
}

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

window.addEventListener("hashchange", render);
