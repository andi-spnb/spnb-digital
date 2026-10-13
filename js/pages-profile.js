// ============ PROFILE PAGES & CARD REDIRECT ============

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
