// ============ AUTH & ACTIVATION PAGES ============

function loginPage() {
  const loginError = state.loginError || '';
  const loginLoading = state.loginLoading || false;
  
  return `
    <div class="login-page">
      <div class="login-container">
        <div class="login-left">
          <div class="login-left-content">
            <div class="login-logo-wrapper">
              <img src="https://spnbdigital.id/assets/img/1.png" alt="SPNB Digital" class="login-logo-img" />
            </div>
            <div class="login-tagline">
              <h1>Kelola Review Google<br/>Bisnis Anda</h1>
              <p>Platform kartu NFC & QR untuk mengumpulkan ulasan pelanggan dengan mudah.</p>
            </div>
            <div class="login-stats">
              <div class="login-stat">
                <span class="login-stat-num">500+</span>
                <span class="login-stat-label">UMKM Aktif</span>
              </div>
              <div class="login-stat">
                <span class="login-stat-num">12K+</span>
                <span class="login-stat-label">Kartu Terbit</span>
              </div>
              <div class="login-stat">
                <span class="login-stat-num">89K+</span>
                <span class="login-stat-label">Review</span>
              </div>
            </div>
          </div>
          <div class="login-left-footer">
            <p>Dipercaya oleh UMKM di seluruh Indonesia</p>
          </div>
        </div>
        
        <div class="login-right">
          <div class="login-right-header">
            <a href="#/" class="login-back-link">← Kembali</a>
          </div>
          
          <div class="login-form-wrapper">
            <div class="login-form-header">
              <h2>Masuk ke Dashboard</h2>
              <p>Masukkan email dan password Anda</p>
            </div>
            
            ${loginError ? `<div class="login-error"><span>!</span>${loginError}</div>` : ''}
            
            <form id="loginForm" class="login-form">
              <div class="login-field">
                <label for="loginEmail">Email</label>
                <input 
                  type="email" 
                  id="loginEmail" 
                  placeholder="nama@email.com" 
                  autocomplete="email"
                  required 
                />
              </div>
              
              <div class="login-field">
                <label for="loginPassword">Password</label>
                <input 
                  type="password" 
                  id="loginPassword" 
                  placeholder="••••••••" 
                  autocomplete="current-password"
                  required 
                />
              </div>
              
              <div class="login-options">
                <label class="login-remember">
                  <input type="checkbox" id="rememberMe" />
                  <span>Ingat saya</span>
                </label>
                <button type="button" class="login-forgot" data-demo-toast="Hubungi admin untuk reset password.">
                  Lupa password?
                </button>
              </div>
              
              <button type="submit" class="login-submit" ${loginLoading ? 'disabled' : ''}>
                ${loginLoading ? '<span class="login-spinner"></span>Memproses...' : 'Masuk'}
              </button>
            </form>
            
            <div class="login-separator">
              <span>atau masuk sebagai demo</span>
            </div>
            
            <div class="login-demo-grid">
              <button class="login-demo-btn" data-quick-login="owner">
                <div class="login-demo-icon" style="background:#10b981">${icons.user}</div>
                <div class="login-demo-info">
                  <span class="login-demo-role">Owner</span>
                  <span class="login-demo-email">owner@spnb.id</span>
                </div>
              </button>
              <button class="login-demo-btn" data-quick-login="reseller">
                <div class="login-demo-icon" style="background:#8b5cf6">${icons.reseller}</div>
                <div class="login-demo-info">
                  <span class="login-demo-role">Reseller</span>
                  <span class="login-demo-email">reseller@spnb.id</span>
                </div>
              </button>
              <button class="login-demo-btn" data-quick-login="admin">
                <div class="login-demo-icon" style="background:#f59e0b">${icons.setting}</div>
                <div class="login-demo-info">
                  <span class="login-demo-role">Admin</span>
                  <span class="login-demo-email">admin@spnb.id</span>
                </div>
              </button>
            </div>
            
            <p class="login-register">
              Belum punya akun? <a href="#/aktivasi">Aktivasi kartu baru</a>
            </p>
          </div>
          
          <div class="login-right-footer">
            <p>© 2026 SPNB Digital. All rights reserved.</p>
          </div>
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
