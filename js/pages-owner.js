// ============ OWNER DASHBOARD PAGES ============

function ownerPage(route) {
  if (route === "/owner/kartu") return ownerCardsPage();
  if (route === "/owner/profil") return ownerProfilePage();
  if (route === "/owner/statistik") return ownerStatsPage();
  if (route === "/owner/akun") return accountPage("owner");
  if (route === "/owner/bantuan") return helpPage("owner");
  
  // Auto-load stats if not loaded yet (for dashboard metrics)
  if (!state.ownerStats && !state.statsLoading && state.ownerData?.businesses?.length > 0) {
    loadOwnerStats(30);
  }
  
  const userName = currentAccount?.display_name || 'Pengguna';
  const firstName = userName.split(' ')[0];
  
  // Use real data from database
  const dbBusiness = state.ownerData?.businesses?.[0];
  const dbCards = state.ownerData?.cards || [];
  
  // Jika belum ada data bisnis atau kartu, tampilkan welcome screen
  if (!dbBusiness && dbCards.length === 0) {
    return ownerEmptyState(firstName);
  }
  
  const p = dbBusiness ? {
    name: dbBusiness.name || 'Bisnis Anda',
    themeColor: dbBusiness.theme_color || '#1769c2'
  } : { name: 'Bisnis Anda', themeColor: '#1769c2' };
  
  // Get primary card info
  const primaryCard = dbCards[0];
  const primaryCardSerial = primaryCard?.serial || 'Belum ada kartu';
  const primaryCardMode = primaryCard?.destination_mode === 'direct_google' ? 'Langsung ke Google Rating' : 'Halaman Profil';
  const primaryCardStatus = primaryCard ? mapCardStatus(primaryCard.lifecycle_state) : 'stock';
  
  // Get stats from ownerStats or use defaults
  const stats = state.ownerStats?.current || {};
  const totalInteractions = stats.totalInteractions || 0;
  const googleClicks = stats.googleClicks || 0;
  const nfcTaps = stats.nfcTaps || 0;
  const qrScans = stats.qrScans || 0;
  const totalScans = nfcTaps + qrScans;
  const nfcPercent = totalScans > 0 ? Math.round(nfcTaps / totalScans * 100) : 0;
  
  // Build activity list from real events
  const recentEvents = state.ownerData?.events || [];
  const activityHtml = recentEvents.length > 0 
    ? recentEvents.slice(0, 4).map(e => {
        const eventIcons = { 'qr_scan': 'qr', 'nfc_tap': 'nfc', 'profile_view': 'eye', 'profile_link_click': 'star' };
        const eventTitles = { 'qr_scan': 'QR dipindai', 'nfc_tap': 'NFC disentuh', 'profile_view': 'Profil dilihat', 'profile_link_click': 'Tombol diklik' };
        return activity(
          eventIcons[e.event_type] || 'chart',
          eventTitles[e.event_type] || e.event_type,
          e.cards?.serial || p.name,
          formatRelativeTime(e.occurred_at)
        );
      }).join('')
    : `<div class="empty-activity"><p class="muted">Belum ada aktivitas. Interaksi akan muncul setelah kartu digunakan.</p></div>`;
  
  // Build card list from real data
  const cardListHtml = dbCards.length > 0
    ? dbCards.slice(0, 3).map(card => {
        const bizName = card.businesses?.name || p.name;
        const initials = bizName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const mode = card.destination_mode === 'direct_google' ? 'Langsung ke Google' : 'Halaman Profil';
        return businessCardReal(initials, bizName, `${card.serial} · ${mode}`, card.id, card.lifecycle_state, p.themeColor);
      }).join('')
    : `<div class="empty-state" style="text-align:center;padding:30px;color:var(--muted)">
        <p>Belum ada kartu yang terhubung.</p>
        <button class="btn btn-primary btn-sm" data-route="/aktivasi" style="margin-top:12px">${icons.scan} Aktivasi Kartu</button>
      </div>`;
  
  const content = `
    <section class="workbench owner-workbench">
      <div>
        <span class="workbench-label">Kartu utama</span>
        <div class="row wrap"><h2>${p.name} · ${primaryCardSerial}</h2>${primaryCard ? statusBadge(primaryCardStatus) : ''}</div>
        <p>Tujuan saat ini: <strong>${primaryCard ? primaryCardMode : 'Belum diatur'}</strong>.</p>
      </div>
      <div class="workbench-actions">
        <button class="btn btn-primary" data-route="/owner/kartu">Ubah tujuan</button>
        <button class="btn btn-secondary" data-route="/owner/profil">Edit profil usaha</button>
      </div>
    </section>
    ${metrics([
      { label: "Total interaksi", value: formatNumber(totalInteractions), trend: "QR dan NFC · 30 hari", icon: "scan" },
      { label: "Klik Google Rating", value: formatNumber(googleClicks), trend: "Bukan jumlah ulasan", icon: "star" },
      { label: "Tap NFC", value: formatNumber(nfcTaps), trend: nfcPercent + "% dari seluruh interaksi", icon: "nfc" },
    ])}
    <div class="dashboard-grid">
      ${chartPanel()}
      <section class="panel">
        <div class="panel-title"><div><h2>Aktivitas terbaru</h2><p>Interaksi profil hari ini</p></div></div>
        <div class="activity-list">
          ${activityHtml}
        </div>
      </section>
    </div>
    <section class="panel" style="margin-top:18px">
      <div class="panel-title">
        <div><h2>Kartu Saya</h2><p>Ringkasan kartu yang terhubung dengan akun</p></div>
        <button class="btn btn-secondary btn-sm" data-route="/owner/kartu">Lihat Semua</button>
      </div>
      <div class="card-list">
        ${cardListHtml}
      </div>
    </section>`;
  return appShell("owner", `Selamat datang, ${firstName}!`, "Pantau perkembangan interaksi bisnis Anda.", content);
}

// Empty state untuk owner baru yang belum punya bisnis/kartu
function ownerEmptyState(firstName) {
  const content = `
    <section class="welcome-empty-state">
      <div class="welcome-icon">${icons.card}</div>
      <h1>Selamat datang, ${firstName}!</h1>
      <p>Anda belum memiliki kartu atau profil bisnis yang terhubung.</p>
      <p class="muted">Aktivasi kartu pertama Anda untuk mulai menerima ulasan dari pelanggan.</p>
      <div class="welcome-actions">
        <button class="btn btn-primary btn-lg" data-route="/aktivasi">${icons.scan} Aktivasi Kartu Baru</button>
        <button class="btn btn-secondary" data-route="/owner/profil">${icons.business} Buat Profil Bisnis</button>
      </div>
      <div class="welcome-help">
        <p>Butuh bantuan? <a href="${whatsappUrl}" target="_blank">Hubungi tim SPNB DIGITAL</a></p>
      </div>
    </section>`;
  return appShell("owner", `Selamat datang, ${firstName}!`, "Mulai dengan mengaktivasi kartu pertama Anda.", content);
}

function activity(icon, title, sub, time) {
  return `<div class="activity-item"><span class="activity-icon">${icons[icon]}</span><div><b>${title}</b><small>${sub}</small></div><small>${time}</small></div>`;
}

function businessCardReal(initial, name, desc, cardId, lifecycleState, themeColor) {
  const bgColor = themeColor || 'var(--blue-800)';
  const status = mapCardStatus(lifecycleState);
  return `<div class="business-card" data-card-id="${cardId}">
    <div class="business-logo" style="background:${bgColor}">${initial}</div>
    <div>
      <h3>${name} ${statusBadge(status)}</h3>
      <p>${desc}</p>
    </div>
    <div class="business-metrics">
      <div><b>—</b><span>SCAN QR</span></div>
      <div><b>—</b><span>TAP NFC</span></div>
    </div>
    <button class="btn btn-secondary btn-sm" data-manage-card="${cardId}">Kelola</button>
  </div>`;
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

// Update card destination mode
async function updateCardDestination(cardId, destinationMode, businessId) {
  if (!USE_REAL_DATA || !currentUser) {
    toast('Pengaturan kartu disimpan (demo).');
    return { error: null };
  }
  
  try {
    const updateData = { destination_mode: destinationMode };
    if (businessId) {
      updateData.business_id = businessId;
    }
    
    const { error } = await supabaseClient
      .from('cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('owner_id', currentUser.id);
    
    if (error) {
      console.error('Update card error:', error);
      toast('Gagal menyimpan: ' + (error.message || 'Terjadi kesalahan'));
      return { error };
    }
    
    // Reload owner data
    state.ownerData = await loadOwnerDashboardData();
    render();
    toast('Pengaturan kartu berhasil disimpan.');
    return { error: null };
  } catch (e) {
    console.error('Update card exception:', e);
    toast('Terjadi kesalahan. Silakan coba lagi.');
    return { error: e };
  }
}

function ownerCardsPage() {
  // Use real data if available
  const dbCards = state.ownerData?.cards || [];
  const dbBusinesses = state.ownerData?.businesses || [];
  const p = dbBusinesses[0] ? {
    name: dbBusinesses[0].name,
    themeColor: dbBusinesses[0].theme_color || '#1769c2'
  } : state.businessProfile;
  
  // Build card list
  const cardListHtml = dbCards.length > 0
    ? dbCards.map(card => {
        const bizName = card.businesses?.name || p.name;
        const initials = bizName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const mode = card.destination_mode === 'direct_google' ? 'Langsung ke Google' : 'Halaman Profil';
        return businessCardReal(initials, bizName, `${card.serial} · ${mode}`, card.id, card.lifecycle_state, p.themeColor);
      }).join('')
    : `<div class="empty-state" style="text-align:center;padding:40px;color:var(--muted)">
        <p>Belum ada kartu yang terhubung.</p>
        <button class="btn btn-primary btn-sm" data-open-scanner style="margin-top:12px">${icons.scan} Aktivasi Kartu Baru</button>
      </div>`;
  
  // Build card options for select
  const cardOptions = dbCards.length > 0 
    ? dbCards.map(c => `<option value="${c.id}" data-mode="${c.destination_mode}">${c.serial}</option>`).join('')
    : '<option value="">Tidak ada kartu</option>';
  
  // Build business options for select  
  const businessOptions = dbBusinesses.length > 0
    ? dbBusinesses.map(b => `<option value="${b.id}">${b.name}</option>`).join('')
    : `<option value="">${p.name}</option>`;
  
  // Get first card's current mode for default selection
  const firstCard = dbCards[0];
  const currentMode = firstCard?.destination_mode || 'direct_google';
  
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box"><input placeholder="Cari kartu atau usaha..." id="card-search" /></div>
        <select class="select" id="card-status-filter"><option value="">Semua status</option><option value="claimed">Aktif</option><option value="sold_unclaimed">Menunggu Aktivasi</option></select>
      </div>
      <button class="btn btn-primary" data-open-scanner>${icons.scan} Aktivasi Kartu Baru</button>
    </div>
    <div class="card-list" id="owner-card-list">
      ${cardListHtml}
    </div>
    ${dbCards.length > 0 ? `
    <div class="panel" style="margin-top:18px">
      <div class="panel-title">
        <div><h2>Pengaturan Kartu</h2><p>Ubah tujuan kartu tanpa mencetak ulang QR atau NFC.</p></div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Pilih kartu</label>
          <select class="input" id="card-select">${cardOptions}</select>
        </div>
        <div class="form-group">
          <label>Profil usaha</label>
          <select class="input" id="business-select">${businessOptions}</select>
        </div>
        <div class="form-group full">
          <label>Tujuan kartu</label>
          <div class="choice-grid" id="destination-choice">
            <div class="choice-card ${currentMode === 'direct_google' ? 'selected' : ''}" data-mode="direct_google">
              <h3>${icons.star} Langsung ke Google</h3>
              <p>Pengunjung langsung menuju link rating.</p>
            </div>
            <div class="choice-card ${currentMode === 'profile_page' ? 'selected' : ''}" data-mode="profile_page">
              <h3>${icons.business} Halaman Profil</h3>
              <p>Pengunjung melihat halaman profil bisnis.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:18px">
        <button class="btn btn-primary" data-save-card-settings>${icons.check} Simpan Perubahan</button>
      </div>
    </div>
    ` : ''}`;
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
