/**
 * Notification System
 * Handles notifications display, loading, and management
 */

// Notification types and their configs
const notificationConfig = {
  card_activated: {
    icon: 'check',
    color: 'green',
    getTitle: (n) => 'Kartu Diaktifkan',
    getMessage: (n) => `${n.data?.serial || 'Kartu'} telah diaktifkan oleh ${n.data?.ownerName || 'owner baru'}.`
  },
  card_sold: {
    icon: 'card',
    color: 'blue',
    getTitle: (n) => 'Kartu Terjual',
    getMessage: (n) => `${n.data?.serial || 'Kartu'} ditandai terjual.`
  },
  stock_received: {
    icon: 'stock',
    color: 'blue',
    getTitle: (n) => 'Stok Diterima',
    getMessage: (n) => `${n.data?.count || 0} kartu baru diterima dari admin.`
  },
  profile_milestone: {
    icon: 'chart',
    color: 'violet',
    getTitle: (n) => 'Milestone Tercapai',
    getMessage: (n) => `Profil ${n.data?.businessName || 'Anda'} mencapai ${n.data?.count || 0} interaksi!`
  },
  new_review_click: {
    icon: 'star',
    color: 'orange',
    getTitle: (n) => 'Klik Google Rating',
    getMessage: (n) => `Seseorang mengklik tombol rating di ${n.data?.businessName || 'profil Anda'}.`
  },
  system: {
    icon: 'bell',
    color: 'blue',
    getTitle: (n) => n.title || 'Pemberitahuan',
    getMessage: (n) => n.message || ''
  }
};

// Generate demo notifications based on role
function generateDemoNotifications(role) {
  const now = Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  if (role === 'owner') {
    return [
      { id: '1', type: 'new_review_click', data: { businessName: 'Kopi Nusantara' }, read: false, created_at: new Date(now - 5 * minute).toISOString() },
      { id: '2', type: 'profile_milestone', data: { businessName: 'Kopi Nusantara', count: 500 }, read: false, created_at: new Date(now - 2 * hour).toISOString() },
      { id: '3', type: 'new_review_click', data: { businessName: 'Kopi Nusantara' }, read: true, created_at: new Date(now - 5 * hour).toISOString() },
      { id: '4', type: 'system', title: 'Selamat Datang!', message: 'Kartu Anda sudah aktif. Letakkan di kasir untuk mulai mengumpulkan ulasan.', read: true, created_at: new Date(now - 1 * day).toISOString() },
    ];
  }
  
  if (role === 'reseller') {
    return [
      { id: '1', type: 'card_activated', data: { serial: 'KRT-000127', ownerName: 'Siti Rahma' }, read: false, created_at: new Date(now - 10 * minute).toISOString() },
      { id: '2', type: 'card_activated', data: { serial: 'KRT-000125', ownerName: 'Budi Santoso' }, read: false, created_at: new Date(now - 3 * hour).toISOString() },
      { id: '3', type: 'stock_received', data: { count: 20 }, read: true, created_at: new Date(now - 1 * day).toISOString() },
      { id: '4', type: 'card_sold', data: { serial: 'KRT-000126' }, read: true, created_at: new Date(now - 2 * day).toISOString() },
    ];
  }
  
  if (role === 'admin') {
    return [
      { id: '1', type: 'card_activated', data: { serial: 'KRT-000127', ownerName: 'Siti Rahma' }, read: false, created_at: new Date(now - 15 * minute).toISOString() },
      { id: '2', type: 'system', title: 'Batch Selesai', message: 'Batch BTH-0018 (100 kartu) siap didistribusikan.', read: false, created_at: new Date(now - 1 * hour).toISOString() },
      { id: '3', type: 'card_sold', data: { serial: 'KRT-000126' }, read: true, created_at: new Date(now - 4 * hour).toISOString() },
      { id: '4', type: 'stock_received', data: { count: 50, resellerName: 'Reseller Bandung' }, read: true, created_at: new Date(now - 1 * day).toISOString() },
    ];
  }
  
  return [];
}

// Load notifications
async function loadNotifications() {
  state.notificationsLoading = true;
  
  if (!USE_REAL_DATA) {
    // Demo mode
    await new Promise(resolve => setTimeout(resolve, 300));
    const role = currentRoles.includes('admin') ? 'admin' : 
                 currentRoles.includes('reseller') ? 'reseller' : 'owner';
    state.notifications = generateDemoNotifications(role);
    state.unreadCount = state.notifications.filter(n => !n.read).length;
    state.notificationsLoading = false;
    return;
  }
  
  try {
    // In production, fetch from a notifications table
    // For now, we'll generate based on recent audit_log entries
    const { data: logs } = await supabaseClient
      .from('audit_log')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(20);
    
    // Transform audit logs to notifications
    const notifications = (logs || []).map(log => {
      let type = 'system';
      let data = {};
      
      if (log.action === 'card_claimed') {
        type = 'card_activated';
        data = { serial: log.entity_id, ownerName: log.new_values?.owner_name };
      } else if (log.action === 'card_marked_sold') {
        type = 'card_sold';
        data = { serial: log.entity_id };
      } else if (log.action === 'cards_allocated') {
        type = 'stock_received';
        data = { count: log.new_values?.card_count };
      }
      
      return {
        id: log.id?.toString(),
        type,
        data,
        read: false, // Would need a separate read status table
        created_at: log.occurred_at
      };
    });
    
    state.notifications = notifications;
    state.unreadCount = notifications.filter(n => !n.read).length;
  } catch (e) {
    console.error('loadNotifications error:', e);
    state.notifications = [];
  }
  
  state.notificationsLoading = false;
}

// Mark notification as read
async function markNotificationRead(notificationId) {
  const notification = state.notifications.find(n => n.id === notificationId);
  if (notification && !notification.read) {
    notification.read = true;
    state.unreadCount = Math.max(0, state.unreadCount - 1);
    
    // In production, update the database
    // await supabaseClient.from('notifications').update({ read: true }).eq('id', notificationId);
  }
}

// Mark all as read
async function markAllNotificationsRead() {
  state.notifications.forEach(n => n.read = true);
  state.unreadCount = 0;
  
  // In production, update all in database
  toast('Semua notifikasi ditandai sudah dibaca.');
}

// Format relative time
function formatRelativeTime(dateString) {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diff = now - date;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  
  if (diff < minute) return 'Baru saja';
  if (diff < hour) return `${Math.floor(diff / minute)} menit lalu`;
  if (diff < day) return `${Math.floor(diff / hour)} jam lalu`;
  if (diff < week) return `${Math.floor(diff / day)} hari lalu`;
  return formatDate(dateString);
}

// Render notification item
function renderNotificationItem(notification) {
  const config = notificationConfig[notification.type] || notificationConfig.system;
  const title = config.getTitle(notification);
  const message = config.getMessage(notification);
  const time = formatRelativeTime(notification.created_at);
  
  return `
    <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-notification-id="${notification.id}">
      <div class="notification-icon ${config.color}">${icons[config.icon]}</div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        <div class="notification-time">${time}</div>
      </div>
      ${!notification.read ? '<div class="notification-dot"></div>' : ''}
    </div>
  `;
}

// Render notification panel
function renderNotificationPanel() {
  if (!state.showNotificationPanel) return '';
  
  const notifications = state.notifications || [];
  
  return `
    <div class="notification-panel" id="notificationPanel">
      <div class="notification-header">
        <h3>Notifikasi</h3>
        ${state.unreadCount > 0 ? `
          <button class="text-link" data-mark-all-read>Tandai semua dibaca</button>
        ` : ''}
      </div>
      <div class="notification-list">
        ${state.notificationsLoading ? `
          <div class="notification-loading">
            <div class="loading-spinner" style="width:24px;height:24px"></div>
          </div>
        ` : notifications.length === 0 ? `
          <div class="notification-empty">
            <span>${icons.bell}</span>
            <p>Tidak ada notifikasi</p>
          </div>
        ` : notifications.map(n => renderNotificationItem(n)).join('')}
      </div>
    </div>
  `;
}

// Get activity feed for dashboard
async function getActivityFeed(role, limit = 5) {
  if (!USE_REAL_DATA) {
    // Demo activity based on role
    const now = Date.now();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    
    if (role === 'owner') {
      return [
        { icon: 'nfc', title: 'NFC disentuh', subtitle: 'Kartu KRT-000125', time: '2 menit' },
        { icon: 'star', title: 'Google Rating diklik', subtitle: 'Kopi Nusantara', time: '12 menit' },
        { icon: 'qr', title: 'QR dipindai', subtitle: 'Kartu KRT-000127', time: '28 menit' },
        { icon: 'phone', title: 'WhatsApp diklik', subtitle: 'Profil bisnis', time: '1 jam' },
        { icon: 'eye', title: 'Profil dilihat', subtitle: 'Kopi Nusantara', time: '1 jam' },
      ];
    }
    
    if (role === 'reseller') {
      return [
        { icon: 'check', title: 'KRT-000127 diaktifkan', subtitle: 'Owner: 0812••••7890', time: '10 menit' },
        { icon: 'card', title: 'KRT-000126 ditandai terjual', subtitle: 'Menunggu aktivasi', time: '3 jam' },
        { icon: 'stock', title: '10 kartu diterima', subtitle: 'Dari Admin', time: 'Kemarin' },
        { icon: 'check', title: 'KRT-000124 diaktifkan', subtitle: 'Owner: 0857••••2210', time: '2 hari' },
      ];
    }
    
    if (role === 'admin') {
      return [
        { icon: 'card', title: 'Batch BTH-0018 dibuat', subtitle: '100 kartu', time: '10:32' },
        { icon: 'stock', title: '20 kartu ke Reseller Bandung', subtitle: 'Distribusi', time: '09:48' },
        { icon: 'user', title: 'Reset akun Siti Rahma', subtitle: 'Link dibuat', time: 'Kemarin' },
        { icon: 'check', title: 'KRT-000127 diaktifkan', subtitle: 'Owner baru', time: 'Kemarin' },
      ];
    }
    
    return [];
  }
  
  try {
    // Fetch recent activity from appropriate source based on role
    if (role === 'owner') {
      const businessIds = state.ownerData?.businesses?.map(b => b.id) || [];
      if (businessIds.length === 0) return [];
      
      const { data: events } = await supabaseClient
        .from('interaction_events')
        .select('event_type, token_kind, occurred_at, cards(serial), businesses(name)')
        .in('business_id', businessIds)
        .order('occurred_at', { ascending: false })
        .limit(limit);
      
      return (events || []).map(e => {
        const eventIcons = {
          'qr_scan': 'qr',
          'nfc_tap': 'nfc',
          'profile_view': 'eye',
          'profile_link_click': 'star'
        };
        const eventTitles = {
          'qr_scan': 'QR dipindai',
          'nfc_tap': 'NFC disentuh',
          'profile_view': 'Profil dilihat',
          'profile_link_click': 'Tombol diklik'
        };
        return {
          icon: eventIcons[e.event_type] || 'chart',
          title: eventTitles[e.event_type] || e.event_type,
          subtitle: e.cards?.serial || e.businesses?.name || '-',
          time: formatRelativeTime(e.occurred_at)
        };
      });
    }
    
    // For reseller and admin, use audit_log
    const { data: logs } = await supabaseClient
      .from('audit_log')
      .select('action, entity_id, occurred_at, new_values')
      .order('occurred_at', { ascending: false })
      .limit(limit);
    
    const actionConfig = {
      'cards_allocated': { icon: 'stock', title: 'Kartu didistribusikan' },
      'card_marked_sold': { icon: 'card', title: 'Kartu ditandai terjual' },
      'card_claimed': { icon: 'check', title: 'Kartu diaktifkan' },
      'card_sale_reversed': { icon: 'close', title: 'Penjualan dibatalkan' },
    };
    
    return (logs || []).map(l => {
      const config = actionConfig[l.action] || { icon: 'log', title: l.action };
      return {
        icon: config.icon,
        title: config.title,
        subtitle: l.entity_id || '-',
        time: formatRelativeTime(l.occurred_at)
      };
    });
  } catch (e) {
    console.error('getActivityFeed error:', e);
    return [];
  }
}
