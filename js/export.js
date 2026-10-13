/**
 * EXPORT CSV FUNCTIONS
 * 
 * Functions for exporting data to CSV format.
 * Includes exports for cards, resellers, interactions, sales, and audit logs.
 */

// Convert array of objects to CSV string
function arrayToCSV(data, columns) {
  if (!data || data.length === 0) return '';
  
  // Header row
  const headers = columns.map(col => `"${col.label}"`).join(',');
  
  // Data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = col.getValue ? col.getValue(item) : item[col.key];
      if (value === null || value === undefined) value = '';
      // Escape quotes and wrap in quotes
      value = String(value).replace(/"/g, '""');
      return `"${value}"`;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

// Download CSV file
function downloadCSV(csvContent, filename) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export cards data (Admin)
async function exportCardsCSV() {
  toast('Menyiapkan export...');
  
  let cards;
  if (USE_REAL_DATA) {
    const { data } = await supabaseClient
      .from('cards')
      .select(`
        serial,
        lifecycle_state,
        service_state,
        destination_mode,
        created_at,
        claimed_at,
        resellers (name),
        accounts (display_name, phone_e164),
        businesses (name)
      `)
      .order('created_at', { ascending: false });
    cards = data || [];
  } else {
    // Demo data
    cards = [
      { serial: 'KRT-000125', lifecycle_state: 'claimed', resellers: { name: 'Reseller Bandung' }, accounts: { display_name: 'Budi Santoso', phone_e164: '+6281234567890' }, businesses: { name: 'Kopi Nusantara' }, created_at: '2026-10-01', claimed_at: '2026-10-12' },
      { serial: 'KRT-000126', lifecycle_state: 'sold_unclaimed', resellers: { name: 'Reseller Bandung' }, accounts: null, businesses: null, created_at: '2026-10-01', claimed_at: null },
      { serial: 'KRT-000127', lifecycle_state: 'claimed', resellers: { name: 'Reseller Jakarta' }, accounts: { display_name: 'Siti Rahma', phone_e164: '+6285722102210' }, businesses: { name: 'Salon Cantika' }, created_at: '2026-10-02', claimed_at: '2026-10-11' },
    ];
  }
  
  const columns = [
    { key: 'serial', label: 'Serial' },
    { key: 'lifecycle_state', label: 'Status', getValue: (c) => mapCardStatus(c.lifecycle_state) },
    { label: 'Reseller', getValue: (c) => c.resellers?.name || '-' },
    { label: 'Owner', getValue: (c) => c.accounts?.display_name || '-' },
    { label: 'Telepon Owner', getValue: (c) => c.accounts?.phone_e164 || '-' },
    { label: 'Bisnis', getValue: (c) => c.businesses?.name || '-' },
    { key: 'destination_mode', label: 'Mode', getValue: (c) => c.destination_mode === 'direct_google' ? 'Google Rating' : 'Profil' },
    { key: 'created_at', label: 'Dibuat', getValue: (c) => formatDate(c.created_at) },
    { key: 'claimed_at', label: 'Diaktifkan', getValue: (c) => formatDate(c.claimed_at) },
  ];
  
  const csv = arrayToCSV(cards, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `kartu-spnb-${date}.csv`);
  toast(`${cards.length} kartu berhasil diekspor.`);
}

// Export resellers data (Admin)
async function exportResellersCSV() {
  toast('Menyiapkan export...');
  
  let resellers;
  if (USE_REAL_DATA) {
    const { data } = await supabaseClient
      .from('resellers')
      .select('name, phone_e164, city, status, created_at')
      .order('name');
    resellers = data || [];
    
    // Get card counts per reseller
    const { data: cards } = await supabaseClient
      .from('cards')
      .select('assigned_reseller_id, lifecycle_state');
    
    resellers = resellers.map(r => {
      const resellerCards = cards?.filter(c => c.assigned_reseller_id === r.id) || [];
      return {
        ...r,
        stockCount: resellerCards.filter(c => c.lifecycle_state === 'reseller_stock').length,
        soldCount: resellerCards.filter(c => c.lifecycle_state === 'sold_unclaimed').length,
        activeCount: resellerCards.filter(c => c.lifecycle_state === 'claimed').length,
      };
    });
  } else {
    resellers = [
      { name: 'Reseller Bandung', phone_e164: '+6281234567890', city: 'Bandung', status: 'active', stockCount: 24, soldCount: 3, activeCount: 87 },
      { name: 'Reseller Jakarta', phone_e164: '+6285712345678', city: 'Jakarta', status: 'active', stockCount: 31, soldCount: 5, activeCount: 104 },
      { name: 'Reseller Surabaya', phone_e164: '+6287812345678', city: 'Surabaya', status: 'active', stockCount: 18, soldCount: 2, activeCount: 65 },
    ];
  }
  
  const columns = [
    { key: 'name', label: 'Nama Reseller' },
    { key: 'phone_e164', label: 'Telepon' },
    { key: 'city', label: 'Kota' },
    { key: 'status', label: 'Status' },
    { key: 'stockCount', label: 'Stok' },
    { key: 'soldCount', label: 'Terjual' },
    { key: 'activeCount', label: 'Aktif' },
  ];
  
  const csv = arrayToCSV(resellers, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `reseller-spnb-${date}.csv`);
  toast(`${resellers.length} reseller berhasil diekspor.`);
}

// Export interactions/stats data (Admin)
async function exportInteractionsCSV(days = 30) {
  toast('Menyiapkan export...');
  
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  let events;
  if (USE_REAL_DATA) {
    const { data } = await supabaseClient
      .from('interaction_events')
      .select(`
        occurred_at,
        event_type,
        token_kind,
        destination_mode,
        user_agent_class,
        cards (serial),
        businesses (name)
      `)
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
      .limit(5000);
    events = data || [];
  } else {
    events = [
      { occurred_at: '2026-10-13T10:30:00', event_type: 'qr_scan', token_kind: 'qr', cards: { serial: 'KRT-000125' }, businesses: { name: 'Kopi Nusantara' }, user_agent_class: 'mobile' },
      { occurred_at: '2026-10-13T10:28:00', event_type: 'profile_view', token_kind: null, cards: null, businesses: { name: 'Kopi Nusantara' }, user_agent_class: 'mobile' },
      { occurred_at: '2026-10-13T10:25:00', event_type: 'profile_link_click', token_kind: null, cards: null, businesses: { name: 'Kopi Nusantara' }, user_agent_class: 'mobile' },
    ];
  }
  
  const eventLabels = {
    'qr_scan': 'Scan QR',
    'nfc_tap': 'Tap NFC',
    'profile_view': 'Lihat Profil',
    'profile_link_click': 'Klik Tombol'
  };
  
  const columns = [
    { key: 'occurred_at', label: 'Waktu', getValue: (e) => new Date(e.occurred_at).toLocaleString('id-ID') },
    { key: 'event_type', label: 'Tipe Event', getValue: (e) => eventLabels[e.event_type] || e.event_type },
    { label: 'Kartu', getValue: (e) => e.cards?.serial || '-' },
    { label: 'Bisnis', getValue: (e) => e.businesses?.name || '-' },
    { key: 'token_kind', label: 'Sumber', getValue: (e) => e.token_kind === 'qr' ? 'QR' : e.token_kind === 'nfc' ? 'NFC' : '-' },
    { key: 'user_agent_class', label: 'Device', getValue: (e) => e.user_agent_class || '-' },
  ];
  
  const csv = arrayToCSV(events, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `interaksi-spnb-${days}hari-${date}.csv`);
  toast(`${events.length} interaksi berhasil diekspor.`);
}

// Export reseller sales data
async function exportResellerSalesCSV() {
  toast('Menyiapkan export...');
  
  let cards;
  if (USE_REAL_DATA && state.resellerData?.inventory) {
    cards = state.resellerData.inventory;
  } else {
    cards = state.resellerCards || [];
  }
  
  const columns = [
    { key: 'serial', label: 'Serial Kartu' },
    { key: 'status', label: 'Status', getValue: (c) => {
      const status = c.lifecycle_state ? mapCardStatus(c.lifecycle_state) : c.status;
      return status === 'stock' ? 'Stok' : status === 'sold' ? 'Terjual' : status === 'active' ? 'Aktif' : status;
    }},
    { label: 'Tanggal', getValue: (c) => formatDate(c.sold_at || c.claimed_at || c.allocated_at || c.date) },
    { key: 'owner', label: 'Owner', getValue: (c) => {
      if (c.lifecycle_state === 'claimed') return 'Sudah aktif';
      if (c.lifecycle_state === 'sold_unclaimed') return 'Menunggu aktivasi';
      return c.owner || '-';
    }},
  ];
  
  const csv = arrayToCSV(cards, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `penjualan-reseller-${date}.csv`);
  toast(`${cards.length} kartu berhasil diekspor.`);
}

// Export audit log (Admin)
async function exportAuditLogCSV() {
  toast('Menyiapkan export...');
  
  let logs;
  if (USE_REAL_DATA) {
    const { data } = await supabaseClient
      .from('audit_log')
      .select(`
        occurred_at,
        action,
        entity_type,
        entity_id,
        actor_role,
        accounts (display_name)
      `)
      .order('occurred_at', { ascending: false })
      .limit(1000);
    logs = data || [];
  } else {
    logs = [
      { occurred_at: '2026-10-12T10:32:00', accounts: { display_name: 'Admin SPNB' }, action: 'cards_allocated', entity_type: 'stock_transfer', entity_id: '123', actor_role: 'admin' },
      { occurred_at: '2026-10-12T09:48:00', accounts: { display_name: 'Reseller Bandung' }, action: 'card_marked_sold', entity_type: 'card', entity_id: 'KRT-000126', actor_role: 'reseller' },
    ];
  }
  
  const actionLabels = {
    'cards_allocated': 'Distribusi kartu',
    'card_marked_sold': 'Tandai terjual',
    'card_sale_reversed': 'Batalkan penjualan',
    'card_claimed': 'Aktivasi kartu',
    'card_configuration_changed': 'Ubah konfigurasi',
    'business_slug_changed': 'Ubah slug',
  };
  
  const columns = [
    { key: 'occurred_at', label: 'Waktu', getValue: (l) => new Date(l.occurred_at).toLocaleString('id-ID') },
    { label: 'Pengguna', getValue: (l) => l.accounts?.display_name || '-' },
    { key: 'actor_role', label: 'Role' },
    { key: 'action', label: 'Aksi', getValue: (l) => actionLabels[l.action] || l.action },
    { key: 'entity_type', label: 'Tipe' },
    { key: 'entity_id', label: 'ID' },
  ];
  
  const csv = arrayToCSV(logs, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `audit-log-spnb-${date}.csv`);
  toast(`${logs.length} log berhasil diekspor.`);
}
