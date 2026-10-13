// ============ ACTION HANDLERS ============

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

// Handle view reseller detail
async function handleViewReseller(resellerId) {
  if (!resellerId) return;
  
  // Find reseller from state
  let reseller = state.adminData?.resellers?.find(r => r.id === resellerId);
  
  if (!reseller && USE_REAL_DATA) {
    try {
      const { data, error } = await supabaseClient
        .from('resellers')
        .select('*')
        .eq('id', resellerId)
        .single();
      
      if (!error && data) {
        reseller = data;
      }
    } catch (e) {
      console.error('Fetch reseller error:', e);
    }
  }
  
  if (!reseller) {
    // Use mock data
    reseller = {
      id: resellerId,
      name: 'Reseller Demo',
      city: 'Jakarta',
      phone_e164: '+628123456789',
      status: 'active',
      created_at: new Date().toISOString()
    };
  }
  
  // Calculate stats
  const cards = state.adminData?.cards || [];
  reseller.stockCount = cards.filter(c => c.assigned_reseller_id === resellerId && c.lifecycle_state === 'reseller_stock').length;
  reseller.soldCount = cards.filter(c => c.assigned_reseller_id === resellerId && c.lifecycle_state === 'sold_unclaimed').length;
  reseller.activeCount = cards.filter(c => c.assigned_reseller_id === resellerId && c.lifecycle_state === 'claimed').length;
  
  resellerDetailModal(reseller);
}

// Handle toggle reseller status
async function handleToggleResellerStatus(resellerId, newStatus) {
  if (!resellerId) return;
  
  try {
    toast('Memproses...');
    
    if (USE_REAL_DATA) {
      const { error } = await supabaseClient
        .from('resellers')
        .update({ status: newStatus })
        .eq('id', resellerId);
      
      if (error) {
        toast('Gagal mengubah status: ' + error.message);
        return;
      }
    }
    
    closeModal();
    state.adminData = await loadAdminDashboardData();
    render();
    toast(`Status reseller berhasil diubah ke ${newStatus === 'active' ? 'aktif' : 'nonaktif'}.`);
  } catch (e) {
    console.error('Toggle reseller status error:', e);
    toast('Terjadi kesalahan.');
  }
}

// Handle view owner detail
async function handleViewOwner(ownerId) {
  if (!ownerId) return;
  
  let owner = null;
  
  if (USE_REAL_DATA) {
    try {
      // Fetch owner with businesses
      const { data: account, error } = await supabaseClient
        .from('accounts')
        .select(`
          *,
          businesses (id, name, theme_color, business_slugs (slug, is_current))
        `)
        .eq('user_id', ownerId)
        .single();
      
      if (!error && account) {
        owner = account;
        owner.businessCount = account.businesses?.length || 0;
        
        // Count cards
        const { data: cards } = await supabaseClient
          .from('cards')
          .select('id')
          .eq('owner_id', ownerId);
        owner.cardCount = cards?.length || 0;
        
        // Format businesses with slugs
        owner.businesses = account.businesses?.map(b => ({
          ...b,
          slug: b.business_slugs?.find(s => s.is_current)?.slug || '-'
        }));
      }
    } catch (e) {
      console.error('Fetch owner error:', e);
    }
  }
  
  if (!owner) {
    // Use mock data
    owner = {
      user_id: ownerId,
      display_name: 'Owner Demo',
      phone_e164: '+628123456789',
      status: 'active',
      created_at: new Date().toISOString(),
      businessCount: 2,
      cardCount: 3,
      businesses: [
        { name: 'Bisnis Demo 1', theme_color: '#1769c2', slug: 'bisnis-demo-1' },
        { name: 'Bisnis Demo 2', theme_color: '#e91e63', slug: 'bisnis-demo-2' }
      ]
    };
  }
  
  ownerDetailModal(owner);
}

// Handle card menu (show card action modal)
async function handleCardMenu(cardId) {
  if (!cardId) return;
  
  let card = null;
  
  // Find card from state
  if (state.adminData?.cards) {
    card = state.adminData.cards.find(c => c.id === cardId || c.serial === cardId);
  }
  
  if (!card && USE_REAL_DATA) {
    try {
      const { data, error } = await supabaseClient
        .from('cards')
        .select(`
          *,
          resellers (name),
          accounts (display_name)
        `)
        .or(`id.eq.${cardId},serial.eq.${cardId}`)
        .single();
      
      if (!error && data) {
        card = {
          ...data,
          reseller: data.resellers?.name || '-',
          owner: data.accounts?.display_name || '-',
          status: mapCardStatus(data.lifecycle_state)
        };
      }
    } catch (e) {
      console.error('Fetch card error:', e);
    }
  }
  
  if (!card) {
    // Use mock data
    card = {
      id: cardId,
      serial: cardId,
      status: 'stock',
      lifecycle_state: 'admin_stock',
      destination_mode: 'direct_google',
      reseller: '-',
      owner: '-',
      created_at: new Date().toISOString()
    };
  }
  
  cardActionModal(card);
}

// Handle block card
async function handleBlockCard(cardId) {
  if (!cardId) return;
  
  try {
    toast('Memblokir kartu...');
    
    if (USE_REAL_DATA) {
      const { error } = await supabaseClient
        .from('cards')
        .update({ service_state: 'blocked' })
        .eq('id', cardId);
      
      if (error) {
        toast('Gagal memblokir: ' + error.message);
        return;
      }
    }
    
    closeModal();
    state.adminData = await loadAdminDashboardData();
    render();
    toast('Kartu berhasil diblokir.');
  } catch (e) {
    console.error('Block card error:', e);
    toast('Terjadi kesalahan.');
  }
}

// Handle unblock card
async function handleUnblockCard(cardId) {
  if (!cardId) return;
  
  try {
    toast('Mengaktifkan kartu...');
    
    if (USE_REAL_DATA) {
      const { error } = await supabaseClient
        .from('cards')
        .update({ service_state: 'enabled' })
        .eq('id', cardId);
      
      if (error) {
        toast('Gagal mengaktifkan: ' + error.message);
        return;
      }
    }
    
    closeModal();
    state.adminData = await loadAdminDashboardData();
    render();
    toast('Kartu berhasil diaktifkan kembali.');
  } catch (e) {
    console.error('Unblock card error:', e);
    toast('Terjadi kesalahan.');
  }
}

// Handle reset card to admin stock
async function handleResetCard(cardId) {
  if (!cardId) return;
  
  if (!confirm('Yakin ingin mereset kartu ini ke stok admin? Owner akan kehilangan akses ke kartu ini.')) {
    return;
  }
  
  try {
    toast('Mereset kartu...');
    
    if (USE_REAL_DATA) {
      const { error } = await supabaseClient
        .from('cards')
        .update({ 
          lifecycle_state: 'admin_stock',
          owner_id: null,
          assigned_reseller_id: null,
          claimed_at: null,
          business_id: null
        })
        .eq('id', cardId);
      
      if (error) {
        toast('Gagal mereset: ' + error.message);
        return;
      }
    }
    
    closeModal();
    state.adminData = await loadAdminDashboardData();
    render();
    toast('Kartu berhasil direset ke stok admin.');
  } catch (e) {
    console.error('Reset card error:', e);
    toast('Terjadi kesalahan.');
  }
}

// Handle bulk distribute cards
async function handleBulkDistribute() {
  const resellerId = document.getElementById('bulk-distribute-reseller')?.value;
  const note = document.getElementById('bulk-distribute-note')?.value?.trim() || '';
  
  if (!resellerId) {
    toast('Pilih reseller tujuan.');
    return;
  }
  
  if (state.selectedCards.length === 0) {
    toast('Tidak ada kartu yang dipilih.');
    return;
  }
  
  try {
    toast('Mendistribusikan kartu...');
    
    if (USE_REAL_DATA) {
      const { data, error } = await allocateCardsToReseller(state.selectedCards, resellerId, note);
      
      if (error) {
        toast('Gagal mendistribusikan: ' + (error.message || 'Terjadi kesalahan'));
        return;
      }
    }
    
    closeModal();
    const count = state.selectedCards.length;
    state.selectedCards = [];
    state.adminData = await loadAdminDashboardData();
    render();
    toast(`${count} kartu berhasil didistribusikan.`);
  } catch (e) {
    console.error('Bulk distribute error:', e);
    toast('Terjadi kesalahan.');
  }
}

// Handle bulk block cards
async function handleBulkBlock() {
  if (state.selectedCards.length === 0) {
    toast('Tidak ada kartu yang dipilih.');
    return;
  }
  
  if (!confirm(`Yakin ingin memblokir ${state.selectedCards.length} kartu?`)) {
    return;
  }
  
  try {
    toast('Memblokir kartu...');
    
    if (USE_REAL_DATA) {
      const { error } = await supabaseClient
        .from('cards')
        .update({ service_state: 'blocked' })
        .in('id', state.selectedCards);
      
      if (error) {
        toast('Gagal memblokir: ' + error.message);
        return;
      }
    }
    
    const count = state.selectedCards.length;
    state.selectedCards = [];
    state.adminData = await loadAdminDashboardData();
    render();
    toast(`${count} kartu berhasil diblokir.`);
  } catch (e) {
    console.error('Bulk block error:', e);
    toast('Terjadi kesalahan.');
  }
}
