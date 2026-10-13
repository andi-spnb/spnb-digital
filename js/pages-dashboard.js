// ============ DASHBOARD SHELL COMPONENTS ============

const dashboardMenus = {
  owner: [
    ["/owner", "home", "Beranda"], ["/owner/kartu", "card", "Kartu Saya"], ["/owner/profil", "business", "Profil Usaha"],
    ["/owner/statistik", "chart", "Statistik"], ["/owner/akun", "user", "Akun & Keamanan"], ["/owner/bantuan", "help", "Bantuan"],
  ],
  reseller: [
    ["/reseller", "home", "Ringkasan"], ["/reseller/kartu", "card", "Stok Kartu"], ["/reseller/penjualan", "chart", "Penjualan"],
    ["/reseller/akun", "user", "Akun"], ["/reseller/bantuan", "help", "Bantuan"],
  ],
  admin: [
    ["/admin", "home", "Ringkasan"], ["/admin/kartu", "card", "Kartu"], ["/admin/stok", "stock", "Stok & Distribusi"],
    ["/admin/reseller", "reseller", "Reseller"], ["/admin/owner", "user", "Owner"], ["/admin/profil", "business", "Profil Usaha"],
    ["/admin/statistik", "chart", "Statistik"], ["/admin/log", "log", "Riwayat Aktivitas"], ["/admin/pengaturan", "setting", "Pengaturan"],
  ],
};

function appShell(role, title, subtitle, content) {
  const route = getRoute();
  
  // Use real user data if logged in, fallback to demo
  let identity;
  if (currentAccount && currentRoles.length > 0) {
    const displayName = currentAccount.display_name || 'User';
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const roleLabel = currentRoles.includes('admin') ? 'Administrator' : 
                      currentRoles.includes('reseller') ? 'Reseller' : 'Owner';
    identity = [displayName, roleLabel, initials];
  } else {
    identity = {
      owner: ["Budi Santoso", "Owner", "BS"], 
      reseller: ["Reseller Bandung", "Reseller", "RB"], 
      admin: ["Admin SPNB", "Administrator", "AS"],
    }[role];
  }
  
  const isRealUser = currentAccount !== null;
  const badgeText = isRealUser ? '' : '<span class="demo-badge">Data demo</span>';
  const unreadCount = state.unreadCount || 0;
  
  return `
    <div class="app-shell role-${role}">
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      <aside class="sidebar" id="sidebar">
        ${brand("#/")}
        <div class="side-label">Menu ${identity[1]}</div>
        <nav class="side-nav">
          ${dashboardMenus[role].map(([path, ic, label]) => `<button class="side-link ${route === path ? "active" : ""}" data-route="${path}"><span class="side-icon">${icons[ic]}</span>${label}</button>`).join("")}
        </nav>
        <div class="side-user">
          <span class="avatar">${identity[2]}</span>
          <div><b>${identity[0]}</b><span>${identity[1]}</span></div>
          <button class="action-menu" data-logout aria-label="Keluar" title="Keluar">${icons.close}</button>
        </div>
      </aside>
      <main class="main-shell">
        <header class="app-topbar">
          <div class="row">
            <button class="icon-btn mobile-side-toggle" data-sidebar aria-label="Menu">${icons.menu}</button>
            <div>
              <div class="title-line"><h1>${title}</h1>${badgeText}</div>
              <p class="topbar-subtitle">${subtitle}</p>
            </div>
          </div>
          <div class="app-top-actions">
            <div class="notification-wrapper">
              <button class="icon-btn notification-btn ${state.showNotificationPanel ? 'active' : ''}" data-toggle-notifications aria-label="Notifikasi">
                ${icons.bell}
                ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
              </button>
              ${renderNotificationPanel()}
            </div>
            ${isRealUser 
              ? `<button class="btn btn-secondary btn-sm" data-logout>Keluar</button>` 
              : `<button class="btn btn-secondary btn-sm" data-route="/login">Login</button>`}
            <span class="avatar">${identity[2]}</span>
          </div>
        </header>
        <div class="app-content">${content}</div>
      </main>
    </div>`;
}

function metrics(items) {
  return `<div class="metric-grid">${items.map(x => `<div class="metric-card"><div class="metric-head"><span>${x.label}</span><span class="metric-icon">${icons[x.icon] || x.icon}</span></div><div class="metric-value">${x.value}</div><div class="metric-trend">${x.trend}</div></div>`).join("")}</div>`;
}

function chartPanel(title = "Interaksi 7 hari terakhir") {
  const values = [43, 57, 48, 73, 64, 91, 78];
  const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  return `<section class="panel chart-panel"><div class="panel-title"><div><h2>${title}</h2><p>Jumlah pembukaan tautan dari QR dan NFC · data demo</p></div><select class="select"><option>7 hari</option><option>30 hari</option></select></div><div class="chart-scale"><span>100</span><span>50</span><span>0</span></div><div class="chart">${values.map((v, i) => `<div class="chart-bar" style="height:${v}%" title="${v} interaksi"><span>${days[i]}</span></div>`).join("")}</div><p class="chart-note">Angka menunjukkan interaksi pada kartu, bukan jumlah ulasan yang dikirim ke Google.</p></section>`;
}
