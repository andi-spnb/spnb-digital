// ============ RESELLER DASHBOARD PAGES ============

function resellerPage(route) {
  if (route === "/reseller/kartu") return resellerCardsPage();
  if (route === "/reseller/penjualan") return resellerSalesPage();
  if (route === "/reseller/akun") return accountPage("reseller");
  if (route === "/reseller/bantuan") return helpPage("reseller");
  
  const content = `
    <section class="workbench reseller-workbench">
      <div>
        <span class="workbench-label">Perlu tindakan</span>
        <h2>3 kartu menunggu aktivasi</h2>
        <p>Kartu sudah terjual tetapi belum diaktifkan oleh pembeli.</p>
      </div>
      <div class="workbench-actions">
        <button class="btn btn-primary" data-route="/reseller/kartu">${icons.card} Lihat Stok</button>
        <button class="btn btn-secondary" data-demo-toast="Kamera pemindai dibuka.">${icons.qr} Scan Kartu</button>
      </div>
    </section>
    
    ${metrics([
      { label: "Stok Tersedia", value: "24", trend: "Siap dijual", icon: "stock" },
      { label: "Terjual Bulan Ini", value: "15", trend: "12 sudah aktif", icon: "card" },
      { label: "Menunggu Aktivasi", value: "3", trend: "Butuh follow up", icon: "user" },
    ])}
    
    <div class="dashboard-grid" style="margin-top:18px">
      <section class="panel">
        <div class="panel-title">
          <div><h2>Kartu Perlu Diproses</h2><p>Tandai terjual atau cek status aktivasi</p></div>
          <button class="btn btn-secondary btn-sm" data-route="/reseller/kartu">Lihat Semua</button>
        </div>
        ${resellerTable(5)}
      </section>
      
      <section class="panel">
        <div class="panel-title">
          <div><h2>Aktivitas Terbaru</h2><p>Perubahan stok hari ini</p></div>
        </div>
        <div class="activity-list">
          ${activity("card", "KRT-000126 ditandai terjual", "Menunggu aktivasi", "12 menit")}
          ${activity("check", "KRT-000127 telah aktif", "Diklaim owner", "1 jam")}
          ${activity("stock", "10 kartu diterima", "Dari Admin", "Kemarin")}
          ${activity("card", "KRT-000124 ditandai terjual", "Menunggu aktivasi", "2 hari")}
        </div>
      </section>
    </div>
    
    <section class="panel" style="margin-top:18px">
      <div class="quick-stats-grid">
        <div class="quick-stat">
          <div class="quick-stat-icon green">${icons.check}</div>
          <div>
            <strong>80%</strong>
            <span>Tingkat Aktivasi</span>
          </div>
        </div>
        <div class="quick-stat">
          <div class="quick-stat-icon blue">${icons.chart}</div>
          <div>
            <strong>87</strong>
            <span>Total Penjualan</span>
          </div>
        </div>
        <div class="quick-stat">
          <div class="quick-stat-icon orange">${icons.clock}</div>
          <div>
            <strong>2.3 hari</strong>
            <span>Rata-rata Aktivasi</span>
          </div>
        </div>
      </div>
    </section>`;
  
  return appShell("reseller", "Dashboard Reseller", "Kelola stok dan pantau penjualan kartu.", content);
}

function resellerTable(limit) {
  // Use real data if available, otherwise use mock data
  let cards = state.resellerData?.inventory || state.resellerCards;
  
  // Map real data format to display format
  if (state.resellerData?.inventory) {
    cards = state.resellerData.inventory.map(c => ({
      id: c.card_id,
      serial: c.serial,
      status: mapCardStatus(c.lifecycle_state),
      date: formatDate(c.sold_at || c.claimed_at || c.allocated_at),
      owner: c.lifecycle_state === 'claimed' ? 'Sudah aktif' : 
             c.lifecycle_state === 'sold_unclaimed' ? 'Menunggu aktivasi' : '—'
    }));
  }
  
  if (limit) cards = cards.slice(0, limit);
  
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Serial Kartu</th>
            <th>Status</th>
            <th>Owner</th>
            <th>Tanggal</th>
            <th>Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${cards.length === 0 ? `
            <tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">Belum ada kartu yang ditugaskan.</td></tr>
          ` : cards.map(c => `
            <tr>
              <td><strong>${c.serial}</strong></td>
              <td>${statusBadge(c.status)}</td>
              <td>${c.owner}</td>
              <td>${c.date}</td>
              <td>
                ${c.status === "stock" 
                  ? `<button class="btn btn-primary btn-sm" data-sell-card="${c.id || c.serial}" data-serial="${c.serial}">Tandai Terjual</button>` 
                  : c.status === "sold" 
                    ? `<button class="btn btn-ghost btn-sm" data-unsell-card="${c.id || c.serial}" data-serial="${c.serial}">Batalkan</button>` 
                    : `<button class="btn btn-secondary btn-sm" data-view-card="${c.id || c.serial}" data-serial="${c.serial}">Detail</button>`}
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function resellerCardsPage() {
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box"><input placeholder="Cari serial kartu..." /></div>
        <select class="select">
          <option>Semua Status</option>
          <option>Stok Tersedia</option>
          <option>Terjual</option>
          <option>Sudah Aktif</option>
        </select>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-ghost btn-sm" data-export-reseller-sales>${icons.chart} Export</button>
        <button class="btn btn-secondary" data-demo-toast="Kamera pemindai dibuka.">${icons.qr} Scan Kartu</button>
      </div>
    </div>
    
    ${resellerTable()}
    
    <div class="info-box" style="margin-top:16px">
      ${icons.help}
      <div>
        <strong>Cara kerja penjualan kartu</strong>
        <p>Setelah ditandai terjual, kartu dapat diaktifkan oleh pembeli dengan memindai QR. Status dapat dibatalkan selama kartu belum diaktifkan.</p>
      </div>
    </div>`;
  
  return appShell("reseller", "Stok Kartu", "Kelola kartu yang ditugaskan oleh admin.", content);
}

function resellerSalesPage() {
  const content = `
    ${metrics([
      { label: "Penjualan Bulan Ini", value: "15", trend: "+50% dari bulan lalu", icon: "card" },
      { label: "Aktivasi Berhasil", value: "12", trend: "80% tingkat aktivasi", icon: "check" },
      { label: "Menunggu Aktivasi", value: "3", trend: "Perlu follow up", icon: "user" },
    ])}
    
    <div class="dashboard-grid" style="margin-top:18px">
      ${chartPanel("Tren Penjualan")}
      
      <section class="panel">
        <div class="panel-title">
          <div><h2>Status Aktivasi</h2><p>Dari kartu terjual bulan ini</p></div>
        </div>
        <div class="donut-chart">
          <div class="donut-visual" style="background: conic-gradient(var(--green) 0% 80%, var(--line) 80% 100%);">
            <div class="donut-center">
              <strong>80%</strong>
              <span>Aktif</span>
            </div>
          </div>
          <div class="donut-legend">
            <div class="legend-item"><span class="legend-dot green"></span>Sudah Aktif (12)</div>
            <div class="legend-item"><span class="legend-dot gray"></span>Menunggu (3)</div>
          </div>
        </div>
      </section>
    </div>
    
    <section class="panel" style="margin-top:18px">
      <div class="panel-title">
        <div><h2>Riwayat Penjualan</h2><p>Kartu yang dijual bulan ini</p></div>
      </div>
      <div class="activity-list">
        ${activity("check", "KRT-000127 diaktifkan", "Owner: 0812••••7890", "1 jam")}
        ${activity("card", "KRT-000126 terjual", "Menunggu aktivasi", "3 jam")}
        ${activity("check", "KRT-000125 diaktifkan", "Owner: 0857••••2210", "1 hari")}
        ${activity("check", "KRT-000124 diaktifkan", "Owner: 0813••••3021", "2 hari")}
      </div>
    </section>`;
  
  return appShell("reseller", "Penjualan", "Pantau performa penjualan kartu.", content);
}
