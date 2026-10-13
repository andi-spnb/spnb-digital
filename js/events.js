// ============ EVENT HANDLERS ============

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

  if (event.target.closest("[data-mobile-menu]")) { state.mobileMenu = !state.mobileMenu; root.innerHTML = homePageV2(); return; }
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
  
  // QR Scanner handlers
  if (event.target.closest("[data-open-scanner]")) { openScannerModal(); return; }
  if (event.target.closest("[data-scanner-close]")) { closeScannerModal(); return; }
  if (event.target.closest("#switch-camera-btn")) { switchCamera(); return; }
  
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
    // Close modal if exists
    if (unsell.dataset.modalClose !== undefined || event.target.closest(".modal")) {
      closeModal();
    }
    handleUnsellCard(unsell.dataset.unsellCard, unsell.dataset.serial);
    return;
  }

  // View card detail (reseller)
  const viewCard = event.target.closest("[data-view-card]");
  if (viewCard) {
    const cardId = viewCard.dataset.viewCard;
    const serial = viewCard.dataset.serial || cardId;
    handleViewCardDetail(cardId, serial);
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

  // View reseller detail
  const viewReseller = event.target.closest("[data-view-reseller]");
  if (viewReseller) {
    const resellerId = viewReseller.dataset.viewReseller;
    handleViewReseller(resellerId);
    return;
  }

  // Toggle reseller status
  const toggleResellerStatus = event.target.closest("[data-toggle-reseller-status]");
  if (toggleResellerStatus) {
    const resellerId = toggleResellerStatus.dataset.toggleResellerStatus;
    const newStatus = toggleResellerStatus.dataset.status;
    handleToggleResellerStatus(resellerId, newStatus);
    return;
  }

  // View owner detail
  const viewOwner = event.target.closest("[data-view-owner]");
  if (viewOwner) {
    const ownerId = viewOwner.dataset.viewOwner;
    handleViewOwner(ownerId);
    return;
  }

  // Card action menu
  const cardMenu = event.target.closest("[data-card-menu]");
  if (cardMenu) {
    const cardId = cardMenu.dataset.cardMenu;
    handleCardMenu(cardId);
    return;
  }

  // Block card
  const blockCard = event.target.closest("[data-block-card]");
  if (blockCard) {
    handleBlockCard(blockCard.dataset.blockCard);
    return;
  }

  // Unblock card
  const unblockCard = event.target.closest("[data-unblock-card]");
  if (unblockCard) {
    handleUnblockCard(unblockCard.dataset.unblockCard);
    return;
  }

  // Reset card to admin stock
  const resetCard = event.target.closest("[data-reset-card]");
  if (resetCard) {
    handleResetCard(resetCard.dataset.resetCard);
    return;
  }

  // Save business profile
  if (event.target.closest("[data-save-profile]")) {
    handleSaveBusinessProfile();
    return;
  }

  // Save card settings (destination mode)
  if (event.target.closest("[data-save-card-settings]")) {
    const cardSelect = document.getElementById('card-select');
    const businessSelect = document.getElementById('business-select');
    const selectedMode = document.querySelector('#destination-choice .choice-card.selected');
    
    if (!cardSelect?.value) {
      toast('Pilih kartu terlebih dahulu.');
      return;
    }
    
    const cardId = cardSelect.value;
    const businessId = businessSelect?.value || null;
    const destinationMode = selectedMode?.dataset.mode || 'direct_google';
    
    updateCardDestination(cardId, destinationMode, businessId);
    return;
  }

  // Manage card (show card details)
  const manageCard = event.target.closest("[data-manage-card]");
  if (manageCard) {
    const cardId = manageCard.dataset.manageCard;
    // Find the card and pre-select it in the form
    const cardSelect = document.getElementById('card-select');
    if (cardSelect) {
      cardSelect.value = cardId;
      // Update the destination choice based on selected card
      const selectedOption = cardSelect.querySelector(`option[value="${cardId}"]`);
      if (selectedOption) {
        const mode = selectedOption.dataset.mode || 'direct_google';
        document.querySelectorAll('#destination-choice .choice-card').forEach(c => {
          c.classList.toggle('selected', c.dataset.mode === mode);
        });
      }
      // Scroll to the form
      document.querySelector('.panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // Choice card selection (for destination mode)
  const choiceCard = event.target.closest(".choice-card[data-mode]");
  if (choiceCard) {
    const parent = choiceCard.closest('.choice-grid');
    if (parent) {
      parent.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      choiceCard.classList.add('selected');
    }
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

  // Pagination handlers
  const paginationBtn = event.target.closest("[data-page]");
  if (paginationBtn) {
    const pageType = paginationBtn.dataset.pageType;
    const page = parseInt(paginationBtn.dataset.page);
    if (pageType && page && state.pagination[pageType]) {
      state.pagination[pageType].page = page;
      render();
    }
    return;
  }

  // Bulk selection handlers
  // Select all cards checkbox
  if (event.target.closest("[data-select-all-cards]")) {
    const checkbox = event.target.closest("[data-select-all-cards]");
    const isChecked = checkbox.checked;
    
    // Get current visible card IDs
    const visibleCardIds = Array.from(document.querySelectorAll('[data-select-card]'))
      .map(cb => cb.dataset.selectCard);
    
    if (isChecked) {
      // Add all visible cards to selection
      visibleCardIds.forEach(id => {
        if (!state.selectedCards.includes(id)) {
          state.selectedCards.push(id);
        }
      });
    } else {
      // Remove all visible cards from selection
      state.selectedCards = state.selectedCards.filter(id => !visibleCardIds.includes(id));
    }
    render();
    return;
  }

  // Single card checkbox
  const selectCard = event.target.closest("[data-select-card]");
  if (selectCard) {
    const cardId = selectCard.dataset.selectCard;
    const isChecked = selectCard.checked;
    
    if (isChecked) {
      if (!state.selectedCards.includes(cardId)) {
        state.selectedCards.push(cardId);
      }
    } else {
      state.selectedCards = state.selectedCards.filter(id => id !== cardId);
    }
    render();
    return;
  }

  // Clear selection
  if (event.target.closest("[data-clear-selection]")) {
    state.selectedCards = [];
    render();
    return;
  }

  // Bulk distribute
  if (event.target.closest("[data-bulk-distribute]")) {
    if (state.selectedCards.length === 0) {
      toast('Pilih kartu terlebih dahulu.');
      return;
    }
    bulkDistributeModal();
    return;
  }

  // Bulk block
  if (event.target.closest("[data-bulk-block]")) {
    if (state.selectedCards.length === 0) {
      toast('Pilih kartu terlebih dahulu.');
      return;
    }
    handleBulkBlock();
    return;
  }

  // Confirm bulk distribute
  const confirmBulkDistribute = event.target.closest("[data-confirm-bulk-distribute]");
  if (confirmBulkDistribute) {
    handleBulkDistribute();
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
  
  // Handle search inputs with debounce
  const searchInput = event.target.closest("[data-search]");
  if (searchInput) {
    const filterType = searchInput.dataset.search;
    clearTimeout(window._searchDebounce);
    window._searchDebounce = setTimeout(() => {
      state.filters[filterType].search = searchInput.value.trim().toLowerCase();
      state.pagination[filterType].page = 1; // Reset to page 1
      render();
    }, 300);
    return;
  }
});

// File upload handler
root.addEventListener("change", (event) => {
  // Filter dropdowns
  const filterSelect = event.target.closest("[data-filter]");
  if (filterSelect) {
    const [filterType, filterField] = filterSelect.dataset.filter.split('.');
    state.filters[filterType][filterField] = filterSelect.value;
    state.pagination[filterType].page = 1; // Reset to page 1
    render();
    return;
  }
  
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

// hashchange listener moved to render.js
