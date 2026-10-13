// ============ RENDER & ROUTING ============

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
