// ============ ADMIN DASHBOARD PAGES ============

const adminCards = [
  ["KRT-000125", "active", "Reseller Bandung", "0812••••7890", "12 Okt 2026", "210"],
  ["KRT-000126", "sold", "Reseller Bandung", "—", "—", "0"],
  ["KRT-000127", "active", "Reseller Jakarta", "0857••••2210", "11 Okt 2026", "152"],
  ["KRT-000128", "stock", "Reseller Surabaya", "—", "—", "0"],
  ["KRT-000129", "admin", "—", "—", "—", "0"],
  ["KRT-000130", "blocked", "Reseller Bandung", "0813••••3021", "2 Okt 2026", "34"],
];

function adminPage(route) {
  if (route === "/admin/kartu") return adminCardsPage();
  if (route === "/admin/stok") return adminStockPage();
  if (route === "/admin/reseller") return adminResellerPage();
  if (route === "/admin/owner") return adminOwnerPage();
  if (route === "/admin/statistik") return adminStatsPage();
  if (route === "/admin/log") return adminLogsPage();
  if (route === "/admin/pengaturan") return adminSettingsPage();
  
  // Calculate dashboard stats from real data
  const cards = state.adminData?.cards || [];
  const resellers = state.adminData?.resellers || [];
  const cardStats = state.adminData?.cardStats || [];
  
  // Count by lifecycle state
  const activeCards = cardStats.filter(c => c.lifecycle_state === 'claimed').length;
  const adminStock = cardStats.filter(c => c.lifecycle_state === 'admin_stock').length;
  const resellerStock = cardStats.filter(c => c.lifecycle_state === 'reseller_stock').length;
  const soldUnclaimed = cardStats.filter(c => c.lifecycle_state === 'sold_unclaimed').length;
  const totalStock = adminStock + resellerStock;
  
  // Count active resellers
  const activeResellers = resellers.filter(r => r.status === 'active').length;
  const uniqueCities = [...new Set(resellers.map(r => r.city).filter(Boolean))].length;
  
  // Calculate pending tasks
  const pendingActivations = soldUnclaimed; // Cards sold but not yet claimed
  const pendingBatches = 0; // Would need batch data
  const pendingResets = 0; // Would need reset requests data
  const totalPending = pendingActivations + pendingBatches + pendingResets;
  
  // Get recent cards for table
  const recentCards = cards.slice(0, 6);
  
  const content = `
    <section class="workbench admin-workbench">
      <div>
        <span class="workbench-label">Perlu Ditindaklanjuti</span>
        <h2>${totalPending > 0 ? `${totalPending} tugas operasional menunggu` : 'Tidak ada tugas menunggu'}</h2>
        <p>${totalPending > 0 ? `${pendingResets > 0 ? pendingResets + ' reset akun, ' : ''}${pendingActivations > 0 ? pendingActivations + ' aktivasi tertunda' : ''}${pendingBatches > 0 ? ', ' + pendingBatches + ' batch pending' : ''}` : 'Semua operasional berjalan lancar.'}</p>
      </div>
      <div class="workbench-actions">
        <button class="btn btn-primary" data-route="/admin/log">${icons.log} Lihat Log</button>
        <button class="btn btn-secondary" data-batch-modal>${icons.plus} Buat Batch</button>
      </div>
    </section>
    
    <div class="admin-stat-cards">
      <div class="admin-stat-card highlight">
        <strong>${formatNumber(activeCards)}</strong>
        <span>Kartu Aktif</span>
        <small>Sudah diklaim owner</small>
      </div>
      <div class="admin-stat-card">
        <strong>${formatNumber(totalStock)}</strong>
        <span>Stok Tersedia</span>
        <small>${adminStock} admin · ${resellerStock} reseller</small>
      </div>
      <div class="admin-stat-card">
        <strong>${activeResellers}</strong>
        <span>Reseller Aktif</span>
        <small>${uniqueCities} kota</small>
      </div>
      <div class="admin-stat-card">
        <strong>${formatNumber(cardStats.length)}</strong>
        <span>Total Kartu</span>
        <small>Semua status</small>
      </div>
    </div>
    
    <div class="exception-grid">
      <button data-route="/admin/owner" class="${pendingResets > 0 ? 'has-alert' : ''}">
        <strong>${pendingResets}</strong>
        <span>Reset Akun</span>
        <small>Permintaan owner</small>
      </button>
      <button data-route="/admin/kartu" class="${pendingActivations > 0 ? 'has-alert' : ''}">
        <strong>${pendingActivations}</strong>
        <span>Aktivasi Tertunda</span>
        <small>Menunggu owner</small>
      </button>
      <button data-route="/admin/stok" class="${pendingBatches > 0 ? 'has-alert' : ''}">
        <strong>${pendingBatches}</strong>
        <span>Batch Pending</span>
        <small>NFC belum ditulis</small>
      </button>
    </div>
    
    <div class="dashboard-grid" style="margin-top:18px">
      <section class="panel">
        <div class="panel-title">
          <div><h2>Kartu Terbaru</h2><p>Aktivitas kartu terkini</p></div>
          <button class="btn btn-primary btn-sm" data-batch-modal>${icons.plus} Buat Batch</button>
        </div>
        ${adminTableFromData(recentCards)}
      </section>
      
      <section class="panel">
        <div class="panel-title">
          <div><h2>Aktivitas Admin</h2><p>Log terbaru</p></div>
          <button class="btn btn-ghost btn-sm" data-route="/admin/log">Lihat Semua</button>
        </div>
        <div class="activity-list">
          ${getRecentActivities()}
        </div>
      </section>
    </div>`;
  
  return appShell("admin", "Dashboard Admin", "Kelola operasional SPNB DIGITAL.", content);
}

// Helper function to render table from card data
function adminTableFromData(cards) {
  const tableCards = cards.map(c => ({
    id: c.id,
    serial: c.serial,
    status: mapCardStatus(c.lifecycle_state),
    reseller: c.resellers?.name || '—',
    owner: c.accounts?.display_name ? maskPhone(c.accounts.phone_e164) : '—',
    activated: formatDate(c.claimed_at),
    interactions: '0'
  }));
  
  return `
    <div class="table-wrap table-responsive">
      <table>
        <thead>
          <tr>
            <th>Serial</th>
            <th>Status</th>
            <th>Reseller</th>
            <th>Owner</th>
            <th>Aktivasi</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${tableCards.length === 0 ? `
            <tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">Belum ada kartu.</td></tr>
          ` : tableCards.map(c => `
            <tr>
              <td data-label="Serial"><strong>${c.serial}</strong></td>
              <td data-label="Status">${statusBadge(c.status)}</td>
              <td data-label="Reseller">${c.reseller}</td>
              <td data-label="Owner">${c.owner}</td>
              <td data-label="Aktivasi">${c.activated}</td>
              <td data-label=""><button class="action-menu" data-card-menu="${c.id || c.serial}">⋯</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

// Get recent activities for dashboard
function getRecentActivities() {
  // This would ideally come from an audit log table
  // For now, generate from recent card changes
  const cards = state.adminData?.cards || [];
  const activities = [];
  
  // Get recently claimed cards
  const recentClaimed = cards
    .filter(c => c.lifecycle_state === 'claimed' && c.claimed_at)
    .sort((a, b) => new Date(b.claimed_at) - new Date(a.claimed_at))
    .slice(0, 2);
  
  recentClaimed.forEach(c => {
    activities.push({
      icon: 'check',
      title: `${c.serial} diaktifkan`,
      detail: c.accounts?.display_name || 'Owner baru',
      time: formatRelativeTime(c.claimed_at)
    });
  });
  
  // Get recently sold cards
  const recentSold = cards
    .filter(c => c.lifecycle_state === 'sold_unclaimed')
    .slice(0, 2);
  
  recentSold.forEach(c => {
    activities.push({
      icon: 'card',
      title: `${c.serial} ditandai terjual`,
      detail: c.resellers?.name || 'Reseller',
      time: 'Baru-baru ini'
    });
  });
  
  // Add some default activities if empty
  if (activities.length === 0) {
    activities.push(
      { icon: 'card', title: 'Tidak ada aktivitas terbaru', detail: 'Mulai dengan membuat batch kartu', time: '-' }
    );
  }
  
  return activities.slice(0, 4).map(a => activity(a.icon, a.title, a.detail, a.time)).join('');
}

// Format relative time
function formatRelativeTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(dateStr);
}

function adminTable(limit) {
  // Use real data if available
  let cards;
  if (state.adminData?.cards) {
    cards = state.adminData.cards.map(c => ({
      id: c.id,
      serial: c.serial,
      status: mapCardStatus(c.lifecycle_state),
      reseller: c.resellers?.name || '—',
      owner: c.accounts?.display_name ? maskPhone(c.accounts.phone_e164) : '—',
      activated: formatDate(c.claimed_at),
      interactions: '0'
    }));
  } else {
    cards = adminCards.map(c => ({
      serial: c[0],
      status: c[1],
      reseller: c[2],
      owner: c[3],
      activated: c[4],
      interactions: c[5]
    }));
  }
  
  if (limit) cards = cards.slice(0, limit);
  
  return `
    <div class="table-wrap table-responsive">
      <table>
        <thead>
          <tr>
            <th>Serial</th>
            <th>Status</th>
            <th>Reseller</th>
            <th>Owner</th>
            <th>Aktivasi</th>
            <th>Interaksi</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${cards.length === 0 ? `
            <tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">Belum ada kartu.</td></tr>
          ` : cards.map(c => `
            <tr>
              <td data-label="Serial"><strong>${c.serial}</strong></td>
              <td data-label="Status">${statusBadge(c.status)}</td>
              <td data-label="Reseller">${c.reseller}</td>
              <td data-label="Owner">${c.owner}</td>
              <td data-label="Aktivasi">${c.activated}</td>
              <td data-label="Interaksi">${c.interactions}</td>
              <td data-label=""><button class="action-menu" data-card-menu="${c.id || c.serial}">⋯</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function adminCardsPage() {
  const filters = state.filters.cards;
  const pagination = state.pagination.cards;
  const resellers = state.adminData?.resellers || [];
  const selectedCards = state.selectedCards || [];
  
  // Get and filter cards
  let cards = [];
  if (state.adminData?.cards) {
    cards = state.adminData.cards.map(c => ({
      id: c.id,
      serial: c.serial,
      status: mapCardStatus(c.lifecycle_state),
      lifecycle_state: c.lifecycle_state,
      reseller: c.resellers?.name || '—',
      resellerId: c.assigned_reseller_id,
      owner: c.accounts?.display_name ? maskPhone(c.accounts.phone_e164) : '—',
      activated: formatDate(c.claimed_at),
      interactions: '0'
    }));
  } else {
    cards = adminCards.map(c => ({
      serial: c[0],
      status: c[1],
      reseller: c[2],
      owner: c[3],
      activated: c[4],
      interactions: c[5]
    }));
  }
  
  // Apply filters
  if (filters.search) {
    cards = cards.filter(c => 
      c.serial?.toLowerCase().includes(filters.search) ||
      c.reseller?.toLowerCase().includes(filters.search) ||
      c.owner?.toLowerCase().includes(filters.search)
    );
  }
  if (filters.status) {
    cards = cards.filter(c => c.status === filters.status || c.lifecycle_state === filters.status);
  }
  if (filters.reseller) {
    cards = cards.filter(c => c.resellerId === filters.reseller);
  }
  
  // Pagination
  const totalCards = cards.length;
  const totalPages = Math.ceil(totalCards / pagination.perPage);
  const startIdx = (pagination.page - 1) * pagination.perPage;
  const paginatedCards = cards.slice(startIdx, startIdx + pagination.perPage);
  
  // Check if all visible cards are selected
  const allVisibleSelected = paginatedCards.length > 0 && paginatedCards.every(c => selectedCards.includes(c.id || c.serial));
  
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box">
          <input placeholder="Cari serial, owner, atau reseller..." data-search="cards" value="${filters.search}" />
        </div>
        <select class="select" data-filter="cards.status">
          <option value="">Semua Status</option>
          <option value="active" ${filters.status === 'active' ? 'selected' : ''}>Aktif</option>
          <option value="sold" ${filters.status === 'sold' ? 'selected' : ''}>Terjual</option>
          <option value="admin" ${filters.status === 'admin' ? 'selected' : ''}>Stok Admin</option>
          <option value="stock" ${filters.status === 'stock' ? 'selected' : ''}>Stok Reseller</option>
          <option value="blocked" ${filters.status === 'blocked' ? 'selected' : ''}>Diblokir</option>
        </select>
        <select class="select" data-filter="cards.reseller">
          <option value="">Semua Reseller</option>
          ${resellers.map(r => `<option value="${r.id}" ${filters.reseller === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
        </select>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-ghost btn-sm" data-export-cards>${icons.chart} Export</button>
        <button class="btn btn-secondary" data-demo-toast="Form kartu satuan">${icons.plus} Satuan</button>
        <button class="btn btn-primary" data-batch-modal>${icons.plus} Buat Batch</button>
      </div>
    </div>
    
    ${selectedCards.length > 0 ? `
      <div class="bulk-action-bar">
        <span>${selectedCards.length} kartu dipilih</span>
        <div class="bulk-actions">
          <button class="btn btn-ghost btn-sm" data-clear-selection>Batal</button>
          <button class="btn btn-secondary btn-sm" data-bulk-distribute>Distribusikan</button>
          <button class="btn btn-secondary btn-sm" data-bulk-block>Blokir</button>
        </div>
      </div>
    ` : ''}
    
    <div class="table-wrap table-responsive">
      <table>
        <thead>
          <tr>
            <th style="width:40px"><input type="checkbox" data-select-all-cards ${allVisibleSelected ? 'checked' : ''} /></th>
            <th>Serial</th>
            <th>Status</th>
            <th>Reseller</th>
            <th>Owner</th>
            <th>Aktivasi</th>
            <th>Interaksi</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${paginatedCards.length === 0 ? `
            <tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">
              ${filters.search || filters.status || filters.reseller ? 'Tidak ada kartu yang cocok dengan filter.' : 'Belum ada kartu.'}
            </td></tr>
          ` : paginatedCards.map(c => {
            const isSelected = selectedCards.includes(c.id || c.serial);
            return `
            <tr class="${isSelected ? 'selected-row' : ''}">
              <td data-label=""><input type="checkbox" data-select-card="${c.id || c.serial}" ${isSelected ? 'checked' : ''} /></td>
              <td data-label="Serial"><strong>${c.serial}</strong></td>
              <td data-label="Status">${statusBadge(c.status)}</td>
              <td data-label="Reseller">${c.reseller}</td>
              <td data-label="Owner">${c.owner}</td>
              <td data-label="Aktivasi">${c.activated}</td>
              <td data-label="Interaksi">${c.interactions}</td>
              <td data-label=""><button class="action-menu" data-card-menu="${c.id || c.serial}">⋯</button></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    
    <div class="table-footer">
      <span class="muted">Menampilkan ${paginatedCards.length} dari ${totalCards} kartu</span>
      ${totalPages > 1 ? `
        <div class="pagination">
          <button class="btn btn-ghost btn-sm" data-page="${Math.max(1, pagination.page - 1)}" data-page-type="cards" ${pagination.page <= 1 ? 'disabled' : ''}>←</button>
          ${generatePaginationButtons(pagination.page, totalPages, 'cards')}
          <button class="btn btn-ghost btn-sm" data-page="${Math.min(totalPages, pagination.page + 1)}" data-page-type="cards" ${pagination.page >= totalPages ? 'disabled' : ''}>→</button>
        </div>
      ` : ''}
    </div>`;
  
  return appShell("admin", "Semua Kartu", "Kelola seluruh kartu QR dan NFC.", content);
}

function adminStockPage() {
  // Calculate stats from real data
  const cards = state.adminData?.cards || [];
  const resellers = state.adminData?.resellers || [];
  
  const adminStock = cards.filter(c => c.lifecycle_state === 'admin_stock').length;
  const resellerStock = cards.filter(c => c.lifecycle_state === 'reseller_stock').length;
  const soldUnclaimed = cards.filter(c => c.lifecycle_state === 'sold_unclaimed').length;
  
  // Get available cards for distribution (admin_stock only)
  const availableCards = cards.filter(c => c.lifecycle_state === 'admin_stock');
  
  const content = `
    ${metrics([
      { label: "Stok Admin", value: adminStock.toString(), trend: "Belum didistribusikan", icon: "stock" },
      { label: "Stok Reseller", value: resellerStock.toString(), trend: `Di ${resellers.length} reseller`, icon: "reseller" },
      { label: "Menunggu Aktivasi", value: soldUnclaimed.toString(), trend: "Sudah terjual", icon: "user" },
    ])}
    
    <div class="grid-2" style="margin-top:18px;align-items:start">
      <section class="panel">
        <div class="panel-title">
          <div><h2>Distribusi Stok</h2><p>Tugaskan kartu ke reseller</p></div>
        </div>
        <form id="distributeForm" class="stack">
          <div class="form-group">
            <label>Kartu Tersedia</label>
            <select class="input" id="distribute-cards" multiple style="min-height:120px">
              ${availableCards.length === 0 
                ? `<option disabled>Tidak ada kartu di stok admin</option>`
                : availableCards.map(c => `<option value="${c.id}">${c.serial}</option>`).join('')}
            </select>
            <span class="input-hint">Tahan Ctrl/Cmd untuk pilih beberapa kartu</span>
          </div>
          <div class="form-group">
            <label>Reseller Tujuan</label>
            <select class="input" id="distribute-reseller" required>
              <option value="">Pilih reseller...</option>
              ${resellers.map(r => `<option value="${r.id}">${r.name} (${r.city || '-'})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Catatan (opsional)</label>
            <input class="input" id="distribute-note" placeholder="Catatan distribusi..." />
          </div>
          <button type="submit" class="btn btn-primary" ${availableCards.length === 0 ? 'disabled' : ''}>${icons.stock} Distribusikan</button>
        </form>
      </section>
      
      <section class="panel">
        <div class="panel-title">
          <div><h2>Daftar Reseller</h2><p>Reseller aktif</p></div>
          <button class="btn btn-secondary btn-sm" data-reseller-modal>${icons.plus} Tambah</button>
        </div>
        <div class="activity-list">
          ${resellers.length === 0 
            ? `<p style="text-align:center;padding:24px;color:var(--muted)">Belum ada reseller.</p>`
            : resellers.map(r => {
                const stockCount = cards.filter(c => c.assigned_reseller_id === r.id && c.lifecycle_state === 'reseller_stock').length;
                return activity("reseller", r.name, `${r.city || '-'} · ${stockCount} stok`, statusBadge(r.status));
              }).join('')}
        </div>
      </section>
    </div>
    
    <section class="panel" style="margin-top:18px">
      <div class="panel-title">
        <div><h2>Kartu di Stok Admin</h2><p>Kartu yang siap didistribusikan</p></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Serial</th>
              <th>Status</th>
              <th>Batch</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            ${availableCards.length === 0 
              ? `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--muted)">Tidak ada kartu di stok admin.</td></tr>`
              : availableCards.map(c => `
                <tr>
                  <td><strong>${c.serial}</strong></td>
                  <td>${statusBadge('admin')}</td>
                  <td>${c.batch_id ? 'BTH-...' : '—'}</td>
                  <td>${formatDate(c.created_at)}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`;
  
  return appShell("admin", "Stok & Distribusi", "Kelola produksi dan distribusi kartu.", content);
}

function adminResellerPage() {
  const filters = state.filters.resellers;
  const cards = state.adminData?.cards || [];
  
  // Get and filter resellers
  let resellers = state.adminData?.resellers || [];
  
  // Apply filters
  if (filters.search) {
    resellers = resellers.filter(r => 
      r.name?.toLowerCase().includes(filters.search) ||
      r.city?.toLowerCase().includes(filters.search) ||
      r.phone_e164?.includes(filters.search)
    );
  }
  if (filters.status) {
    resellers = resellers.filter(r => r.status === filters.status);
  }
  
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box">
          <input placeholder="Cari reseller..." data-search="resellers" value="${filters.search}" />
        </div>
        <select class="select" data-filter="resellers.status">
          <option value="">Semua Status</option>
          <option value="active" ${filters.status === 'active' ? 'selected' : ''}>Aktif</option>
          <option value="inactive" ${filters.status === 'inactive' ? 'selected' : ''}>Nonaktif</option>
        </select>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-ghost btn-sm" data-export-resellers>${icons.chart} Export</button>
        <button class="btn btn-primary" data-reseller-modal>${icons.plus} Tambah Reseller</button>
      </div>
    </div>
    
    <div class="reseller-grid">
      ${resellers.length === 0 ? `
        <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">
          <p>${filters.search || filters.status ? 'Tidak ada reseller yang cocok dengan filter.' : 'Belum ada reseller.'}</p>
          ${!filters.search && !filters.status ? `<button class="btn btn-primary" style="margin-top:16px" data-reseller-modal>${icons.plus} Tambah Reseller Pertama</button>` : ''}
        </div>
      ` : resellers.map(r => {
        const stockCount = cards.filter(c => c.assigned_reseller_id === r.id && c.lifecycle_state === 'reseller_stock').length;
        const soldCount = cards.filter(c => c.assigned_reseller_id === r.id && c.lifecycle_state === 'sold_unclaimed').length;
        const activeCount = cards.filter(c => c.assigned_reseller_id === r.id && c.lifecycle_state === 'claimed').length;
        const initial = r.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return resellerCard(initial, r.name, r.city || '-', stockCount, soldCount + activeCount, r.id);
      }).join('')}
    </div>`;
  
  return appShell("admin", "Reseller", "Kelola akun dan pantau performa reseller.", content);
}

function resellerCard(initial, name, city, stock, sold, resellerId) {
  return `
    <article class="reseller-card">
      <div class="reseller-card-header">
        <div class="reseller-card-avatar">${initial}</div>
        ${statusBadge("active")}
      </div>
      <h3>${name}</h3>
      <p>${city} · Bergabung Jan 2026</p>
      <div class="reseller-card-stats">
        <div>
          <strong>${stock}</strong>
          <span>Stok</span>
        </div>
        <div>
          <strong>${sold}</strong>
          <span>Terjual</span>
        </div>
        <div>
          <strong>${Math.round(sold * 0.8)}</strong>
          <span>Aktif</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-block btn-sm" data-view-reseller="${resellerId || name}">Lihat Detail</button>
    </article>`;
}

function adminOwnerPage() {
  const filters = state.filters.owners;
  const pagination = state.pagination.owners;
  
  // Get owners from real data or use mock
  let owners = [];
  
  if (state.adminData?.owners) {
    owners = state.adminData.owners;
  } else {
    owners = [
      { user_id: "1", display_name: "Budi Santoso", phone_e164: "+6281234567890", businessCount: 2, cardCount: 3, created_at: "2026-10-12", status: "active" },
      { user_id: "2", display_name: "Siti Rahma", phone_e164: "+6285712342210", businessCount: 1, cardCount: 2, created_at: "2026-10-11", status: "active" },
      { user_id: "3", display_name: "Deni Kurnia", phone_e164: "+6281312343021", businessCount: 1, cardCount: 1, created_at: "2026-10-08", status: "active" },
      { user_id: "4", display_name: "Maya Putri", phone_e164: "+6282112347742", businessCount: 3, cardCount: 5, created_at: "2026-10-04", status: "active" },
    ];
  }
  
  // Apply filters
  if (filters.search) {
    owners = owners.filter(o => 
      o.display_name?.toLowerCase().includes(filters.search) ||
      o.phone_e164?.includes(filters.search)
    );
  }
  if (filters.status) {
    owners = owners.filter(o => o.status === filters.status);
  }
  
  // Pagination
  const totalOwners = owners.length;
  const totalPages = Math.ceil(totalOwners / pagination.perPage);
  const startIdx = (pagination.page - 1) * pagination.perPage;
  const paginatedOwners = owners.slice(startIdx, startIdx + pagination.perPage);
  
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box">
          <input placeholder="Cari nama atau nomor HP..." data-search="owners" value="${filters.search}" />
        </div>
        <select class="select" data-filter="owners.status">
          <option value="">Semua Status</option>
          <option value="active" ${filters.status === 'active' ? 'selected' : ''}>Aktif</option>
          <option value="blocked" ${filters.status === 'blocked' ? 'selected' : ''}>Diblokir</option>
        </select>
      </div>
    </div>
    
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Owner</th>
            <th>Nomor HP</th>
            <th>Profil</th>
            <th>Kartu</th>
            <th>Bergabung</th>
            <th>Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedOwners.length === 0 ? `
            <tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">
              ${filters.search || filters.status ? 'Tidak ada owner yang cocok dengan filter.' : 'Belum ada owner.'}
            </td></tr>
          ` : paginatedOwners.map(o => `
            <tr>
              <td data-label="Owner"><strong>${o.display_name || '-'}</strong></td>
              <td data-label="Nomor HP">${o.phone_e164 ? maskPhone(o.phone_e164) : '-'}</td>
              <td data-label="Profil">${o.businessCount || 0} profil</td>
              <td data-label="Kartu">${o.cardCount || 0} kartu</td>
              <td data-label="Bergabung">${formatDate(o.created_at)}</td>
              <td data-label="Tindakan">
                <div class="btn-group">
                  <button class="btn btn-secondary btn-sm" data-reset-modal="${o.display_name}">${icons.help} Reset</button>
                  <button class="btn btn-ghost btn-sm" data-view-owner="${o.user_id}">Detail</button>
                </div>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    
    <div class="table-footer">
      <span class="muted">Menampilkan ${paginatedOwners.length} dari ${totalOwners} owner</span>
      ${totalPages > 1 ? `
        <div class="pagination">
          <button class="btn btn-ghost btn-sm" data-page="${Math.max(1, pagination.page - 1)}" data-page-type="owners" ${pagination.page <= 1 ? 'disabled' : ''}>←</button>
          ${generatePaginationButtons(pagination.page, totalPages, 'owners')}
          <button class="btn btn-ghost btn-sm" data-page="${Math.min(totalPages, pagination.page + 1)}" data-page-type="owners" ${pagination.page >= totalPages ? 'disabled' : ''}>→</button>
        </div>
      ` : ''}
    </div>`;
  
  return appShell("admin", "Owner", "Kelola akun owner dan pemulihan akses.", content);
}

function adminProfilesPage() {
  const content = `<div class="toolbar"><div class="filters"><div class="search-box"><input placeholder="Cari profil atau slug..." /></div></div></div><div class="grid-3">${profileAdminCard("KN", "Kopi Nusantara", "/kopi-nusantara", "2 kartu", "892")}${profileAdminCard("SC", "Salon Cantika", "/salon-cantika", "1 kartu", "574")}${profileAdminCard("BR", "Bakso Rasa", "/bakso-rasa", "3 kartu", "1.204")}${profileAdminCard("KS", "Klinik Sehat", "/klinik-sehat", "1 kartu", "431")}${profileAdminCard("TB", "Toko Berkah", "/toko-berkah", "2 kartu", "687")}</div>`;
  return appShell("admin", "Profil Usaha", "Pantau halaman publik yang dibuat oleh owner.", content);
}

function profileAdminCard(initial, name, slug, cards, views) {
  return `<article class="feature-card"><div class="row-between"><div class="business-logo">${initial}</div>${statusBadge("active")}</div><h3 style="margin-top:18px">${name}</h3><p style="font-size:11px">spnb.id${slug}</p><div class="row-between"><small class="muted">${cards}</small><small class="muted">${views} tampilan</small></div><button class="btn btn-secondary btn-block btn-sm" style="margin-top:16px" data-route="/profil">Lihat Halaman</button></article>`;
}

// Get admin platform stats
async function getAdminStats(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  if (!USE_REAL_DATA) {
    return {
      totalInteractions: 84284,
      qrScans: 38102,
      nfcTaps: 46182,
      googleClicks: 25647,
      profileViews: 58637,
      activeCards: 412,
      totalCards: 648,
      activeResellers: 12,
      daily: generateDemoDaily(days),
      byCity: [
        { city: 'Jakarta', cards: 128, percentage: 31 },
        { city: 'Bandung', cards: 104, percentage: 25 },
        { city: 'Surabaya', cards: 76, percentage: 18 },
        { city: 'Yogyakarta', cards: 49, percentage: 12 },
        { city: 'Lainnya', cards: 55, percentage: 14 },
      ]
    };
  }
  
  try {
    // Get interaction stats
    const { data: events, error: eventsError } = await supabaseClient
      .from('interaction_events')
      .select('event_type, token_kind, occurred_at')
      .gte('occurred_at', since);
    
    if (eventsError) {
      console.error('Admin stats error:', eventsError);
      return null;
    }
    
    // Get card stats
    const { data: cards } = await supabaseClient
      .from('cards')
      .select('lifecycle_state, assigned_reseller_id');
    
    // Get reseller stats
    const { data: resellers } = await supabaseClient
      .from('resellers')
      .select('id, city, status')
      .eq('status', 'active');
    
    // Process events
    const stats = {
      totalInteractions: events?.length || 0,
      qrScans: 0,
      nfcTaps: 0,
      googleClicks: 0,
      profileViews: 0,
      activeCards: 0,
      totalCards: cards?.length || 0,
      activeResellers: resellers?.length || 0,
      daily: [],
      byCity: []
    };
    
    const dailyMap = {};
    
    events?.forEach(e => {
      if (e.event_type === 'qr_scan' || e.token_kind === 'qr') stats.qrScans++;
      if (e.event_type === 'nfc_tap' || e.token_kind === 'nfc') stats.nfcTaps++;
      if (e.event_type === 'profile_view') stats.profileViews++;
      if (e.event_type === 'profile_link_click') stats.googleClicks++;
      
      const day = e.occurred_at.split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    
    // Count active cards
    stats.activeCards = cards?.filter(c => c.lifecycle_state === 'claimed').length || 0;
    
    // Process daily
    stats.daily = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
    
    // Process by city
    const cityMap = {};
    resellers?.forEach(r => {
      const city = r.city || 'Lainnya';
      const cityCards = cards?.filter(c => c.assigned_reseller_id === r.id && c.lifecycle_state === 'claimed').length || 0;
      cityMap[city] = (cityMap[city] || 0) + cityCards;
    });
    
    const totalCityCards = Object.values(cityMap).reduce((a, b) => a + b, 0) || 1;
    stats.byCity = Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, cards]) => ({
        city,
        cards,
        percentage: Math.round(cards / totalCityCards * 100)
      }));
    
    return stats;
  } catch (e) {
    console.error('getAdminStats exception:', e);
    return null;
  }
}

function adminStatsPage() {
  const stats = state.adminStats;
  const selectedPeriod = state.adminStatsPeriod || 30;
  
  // Load stats if not loaded
  if (!stats && !state.adminStatsLoading) {
    loadAdminStats(selectedPeriod);
    return appShell("admin", "Statistik Platform", "Memuat data...", `
      <div style="display:flex;align-items:center;justify-content:center;min-height:400px">
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="margin-top:16px;color:var(--muted)">Memuat statistik platform...</p>
        </div>
      </div>
    `);
  }
  
  if (state.adminStatsLoading) {
    return appShell("admin", "Statistik Platform", "Memuat data...", `
      <div style="display:flex;align-items:center;justify-content:center;min-height:400px">
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="margin-top:16px;color:var(--muted)">Memuat statistik platform...</p>
        </div>
      </div>
    `);
  }
  
  const s = stats || {};
  
  // Calculate percentages
  const totalScans = (s.qrScans || 0) + (s.nfcTaps || 0);
  const qrPercent = totalScans > 0 ? Math.round((s.qrScans || 0) / totalScans * 100) : 50;
  const nfcPercent = totalScans > 0 ? Math.round((s.nfcTaps || 0) / totalScans * 100) : 50;
  const googlePercent = s.totalInteractions > 0 ? Math.round((s.googleClicks || 0) / s.totalInteractions * 100) : 0;
  
  // Chart data
  const chartData = s.daily || generateDemoDaily(selectedPeriod);
  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const recentDays = chartData.slice(-7);
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  
  const content = `
    <div class="stats-toolbar">
      <div class="stats-period-selector">
        <button class="period-btn ${selectedPeriod === 7 ? 'active' : ''}" data-admin-stats-period="7">7 Hari</button>
        <button class="period-btn ${selectedPeriod === 30 ? 'active' : ''}" data-admin-stats-period="30">30 Hari</button>
        <button class="period-btn ${selectedPeriod === 90 ? 'active' : ''}" data-admin-stats-period="90">90 Hari</button>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-ghost btn-sm" data-export-interactions="${selectedPeriod}">${icons.chart} Export CSV</button>
        <button class="btn btn-secondary btn-sm" data-refresh-admin-stats>${icons.chart} Refresh</button>
      </div>
    </div>
    
    ${metrics([
      { 
        label: "Total interaksi", 
        value: formatNumber(s.totalInteractions || 0), 
        trend: `${selectedPeriod} hari terakhir`, 
        icon: "chart" 
      },
      { 
        label: "Scan QR", 
        value: formatNumber(s.qrScans || 0), 
        trend: `${qrPercent}% dari total scan`, 
        icon: "qr" 
      },
      { 
        label: "Tap NFC", 
        value: formatNumber(s.nfcTaps || 0), 
        trend: `${nfcPercent}% dari total scan`, 
        icon: "nfc" 
      },
      { 
        label: "Klik Google", 
        value: formatNumber(s.googleClicks || 0), 
        trend: `${googlePercent}% dari interaksi`, 
        icon: "star" 
      },
    ])}
    
    <div class="admin-stat-cards" style="margin-top:20px">
      <div class="admin-stat-card">
        <strong>${formatNumber(s.activeCards || 0)}</strong>
        <span>Kartu Aktif</span>
        <small>dari ${formatNumber(s.totalCards || 0)} total</small>
      </div>
      <div class="admin-stat-card">
        <strong>${s.activeResellers || 0}</strong>
        <span>Reseller Aktif</span>
        <small>di ${s.byCity?.length || 0} kota</small>
      </div>
      <div class="admin-stat-card">
        <strong>${formatNumber(s.profileViews || 0)}</strong>
        <span>Tampilan Profil</span>
        <small>${selectedPeriod} hari terakhir</small>
      </div>
    </div>
    
    <div class="dashboard-grid" style="margin-top:20px">
      <section class="panel chart-panel">
        <div class="panel-title">
          <div>
            <h2>Pertumbuhan interaksi platform</h2>
            <p>Total interaksi harian dari semua kartu</p>
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
      </section>
      
      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>Kota reseller teratas</h2>
            <p>Berdasarkan jumlah kartu aktif</p>
          </div>
        </div>
        <div class="activity-list">
          ${(s.byCity || []).map(c => `
            <div class="activity-item">
              <span class="activity-icon">${icons.map}</span>
              <div>
                <b>${c.city}</b>
                <small>${c.cards} kartu aktif</small>
              </div>
              <small>${c.percentage}%</small>
            </div>
          `).join('') || '<p class="muted" style="text-align:center;padding:20px">Belum ada data.</p>'}
        </div>
      </section>
    </div>
    
    <section class="panel" style="margin-top:20px">
      <div class="panel-title">
        <div>
          <h2>Distribusi sumber interaksi</h2>
          <p>Perbandingan QR scan vs NFC tap</p>
        </div>
      </div>
      <div class="grid-2" style="gap:30px;margin-top:16px">
        <div>
          <div class="row-between" style="margin-bottom:8px">
            <span class="row" style="gap:8px">${icons.nfc} Tap NFC</span>
            <b>${nfcPercent}%</b>
          </div>
          <div class="progress-bar" style="height:16px">
            <div class="progress-fill nfc" style="width:${nfcPercent}%"></div>
          </div>
          <span class="stat-detail">${formatNumber(s.nfcTaps || 0)} tap total</span>
        </div>
        <div>
          <div class="row-between" style="margin-bottom:8px">
            <span class="row" style="gap:8px">${icons.qr} Scan QR</span>
            <b>${qrPercent}%</b>
          </div>
          <div class="progress-bar" style="height:16px">
            <div class="progress-fill qr" style="width:${qrPercent}%"></div>
          </div>
          <span class="stat-detail">${formatNumber(s.qrScans || 0)} scan total</span>
        </div>
      </div>
    </section>
  `;
  
  return appShell("admin", "Statistik Platform", "Analisis performa kartu dan jaringan reseller.", content);
}

async function loadAdminStats(days = 30) {
  state.adminStatsLoading = true;
  state.adminStatsPeriod = days;
  render();
  
  try {
    const stats = await getAdminStats(days);
    state.adminStats = stats;
  } catch (e) {
    console.error('loadAdminStats error:', e);
    state.adminStats = null;
  }
  
  state.adminStatsLoading = false;
  render();
}

function adminLogsPage() {
  const filters = state.filters.logs;
  const pagination = state.pagination.logs;
  
  // Mock logs data (will be replaced with real data later)
  let logs = [
    { user: "Admin SPNB", userType: "admin", action: "Membuat batch BTH-0018", detail: "100 kartu", time: "12 Okt · 10:32", timestamp: "2026-10-12T10:32:00" },
    { user: "Reseller Bandung", userType: "reseller", action: "Menandai KRT-000126 terjual", detail: "Stok reseller", time: "12 Okt · 09:48", timestamp: "2026-10-12T09:48:00" },
    { user: "Budi Santoso", userType: "owner", action: "Mengubah tujuan KRT-000125", detail: "Google Rating", time: "12 Okt · 09:14", timestamp: "2026-10-12T09:14:00" },
    { user: "Admin SPNB", userType: "admin", action: "Membuat tautan reset akun", detail: "Owner: Siti Rahma", time: "11 Okt · 16:20", timestamp: "2026-10-11T16:20:00" },
    { user: "Reseller Jakarta", userType: "reseller", action: "Menandai KRT-000127 terjual", detail: "Stok reseller", time: "11 Okt · 14:08", timestamp: "2026-10-11T14:08:00" },
    { user: "Maya Putri", userType: "owner", action: "Mengaktifkan KRT-000130", detail: "Owner baru", time: "10 Okt · 11:22", timestamp: "2026-10-10T11:22:00" },
    { user: "Admin SPNB", userType: "admin", action: "Distribusi 20 kartu", detail: "Ke Reseller Surabaya", time: "10 Okt · 09:00", timestamp: "2026-10-10T09:00:00" },
    { user: "Deni Kurnia", userType: "owner", action: "Mengubah profil usaha", detail: "Bakso Rasa", time: "9 Okt · 15:45", timestamp: "2026-10-09T15:45:00" },
  ];
  
  // Apply filters
  if (filters.search) {
    logs = logs.filter(l => 
      l.user?.toLowerCase().includes(filters.search) ||
      l.action?.toLowerCase().includes(filters.search) ||
      l.detail?.toLowerCase().includes(filters.search)
    );
  }
  if (filters.user) {
    logs = logs.filter(l => l.userType === filters.user);
  }
  
  // Pagination
  const totalLogs = logs.length;
  const totalPages = Math.ceil(totalLogs / pagination.perPage);
  const startIdx = (pagination.page - 1) * pagination.perPage;
  const paginatedLogs = logs.slice(startIdx, startIdx + pagination.perPage);
  
  const content = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box">
          <input placeholder="Cari aktivitas..." data-search="logs" value="${filters.search}" />
        </div>
        <select class="select" data-filter="logs.user">
          <option value="">Semua Pengguna</option>
          <option value="admin" ${filters.user === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="reseller" ${filters.user === 'reseller' ? 'selected' : ''}>Reseller</option>
          <option value="owner" ${filters.user === 'owner' ? 'selected' : ''}>Owner</option>
        </select>
      </div>
      <button class="btn btn-secondary" data-export-audit-log>${icons.chart} Ekspor CSV</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Pengguna</th><th>Aktivitas</th><th>Detail</th><th>Waktu</th></tr>
        </thead>
        <tbody>
          ${paginatedLogs.length === 0 ? `
            <tr><td colspan="4" style="text-align:center;padding:24px;color:var(--muted)">
              ${filters.search || filters.user ? 'Tidak ada log yang cocok dengan filter.' : 'Belum ada aktivitas.'}
            </td></tr>
          ` : paginatedLogs.map(l => `<tr><td data-label="Pengguna"><strong>${l.user}</strong></td><td data-label="Aktivitas">${l.action}</td><td data-label="Detail">${l.detail}</td><td data-label="Waktu">${l.time}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
    
    <div class="table-footer">
      <span class="muted">Menampilkan ${paginatedLogs.length} dari ${totalLogs} log</span>
      ${totalPages > 1 ? `
        <div class="pagination">
          <button class="btn btn-ghost btn-sm" data-page="${Math.max(1, pagination.page - 1)}" data-page-type="logs" ${pagination.page <= 1 ? 'disabled' : ''}>←</button>
          ${generatePaginationButtons(pagination.page, totalPages, 'logs')}
          <button class="btn btn-ghost btn-sm" data-page="${Math.min(totalPages, pagination.page + 1)}" data-page-type="logs" ${pagination.page >= totalPages ? 'disabled' : ''}>→</button>
        </div>
      ` : ''}
    </div>`;
  return appShell("admin", "Riwayat Aktivitas", "Audit perubahan penting yang dilakukan setiap pengguna.", content);
}

function adminSettingsPage() {
  const content = `<div class="grid-2" style="align-items:start"><section class="panel"><div class="panel-title"><div><h2>Identitas Platform</h2><p>Branding yang tampil pada halaman profil.</p></div></div><div class="stack"><div class="form-group"><label>Nama platform</label><input class="input" value="SPNB DIGITAL" /></div><div class="form-group"><label>Domain utama</label><input class="input" value="spnb.id" /></div><div class="form-group"><label>Nomor WhatsApp bantuan</label><input class="input" value="0895386763040" /></div><div class="form-group"><label>Teks branding</label><input class="input" value="Didukung oleh SPNB DIGITAL" /></div><button class="btn btn-primary" data-demo-toast="Pengaturan platform berhasil disimpan.">Simpan Pengaturan</button></div></section><section class="panel"><div class="panel-title"><div><h2>Aturan Sistem</h2><p>Konfigurasi keamanan dan kartu.</p></div></div><div class="stack"><label class="row-between"><span>Reseller wajib menandai kartu terjual</span><input type="checkbox" checked /></label><label class="row-between"><span>Owner dapat mengganti slug</span><input type="checkbox" checked /></label><label class="row-between"><span>Redirect slug lama</span><input type="checkbox" checked /></label><label class="row-between"><span>Kartu aktif selamanya</span><input type="checkbox" checked /></label><label class="row-between"><span>Branding pada profil publik</span><input type="checkbox" checked /></label></div></section></div>`;
  return appShell("admin", "Pengaturan", "Atur identitas dan aturan utama platform.", content);
}
