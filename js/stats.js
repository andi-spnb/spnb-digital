// ============================================================
// STATS FUNCTIONS
// Statistics and analytics utilities for interaction tracking
// ============================================================

async function getInteractionStats(cardId, days = 30) {
  if (!USE_REAL_DATA) return { qr: 124, nfc: 86, total: 210 };
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseClient
    .from('interaction_events')
    .select('event_type')
    .eq('card_id', cardId)
    .gte('occurred_at', since);
  
  const stats = { qr: 0, nfc: 0, total: 0 };
  data?.forEach(e => {
    if (e.event_type === 'qr_scan') stats.qr++;
    if (e.event_type === 'nfc_tap') stats.nfc++;
    stats.total++;
  });
  return stats;
}

// Get comprehensive stats for owner dashboard
async function getOwnerStats(businessIds, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const previousStart = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString();
  
  if (!USE_REAL_DATA || !businessIds || businessIds.length === 0) {
    // Return demo data
    return {
      current: {
        profileViews: 892,
        googleClicks: 426,
        whatsappClicks: 164,
        mapsClicks: 98,
        qrScans: 387,
        nfcTaps: 505,
        totalInteractions: 892
      },
      previous: {
        profileViews: 736,
        totalInteractions: 736
      },
      daily: generateDemoDaily(days),
      byCard: [],
      byLinkType: {
        google_review: 426,
        whatsapp: 164,
        google_maps: 98,
        instagram: 45,
        website: 32
      }
    };
  }
  
  try {
    // Get current period stats
    const { data: currentEvents, error: currentError } = await supabaseClient
      .from('interaction_events')
      .select('event_type, card_id, profile_link_id, token_kind, occurred_at')
      .in('business_id', businessIds)
      .gte('occurred_at', since);
    
    if (currentError) {
      console.error('Stats fetch error:', currentError);
      return null;
    }
    
    // Get previous period for comparison
    const { data: previousEvents } = await supabaseClient
      .from('interaction_events')
      .select('event_type')
      .in('business_id', businessIds)
      .gte('occurred_at', previousStart)
      .lt('occurred_at', since);
    
    // Process current period
    const current = {
      profileViews: 0,
      googleClicks: 0,
      whatsappClicks: 0,
      mapsClicks: 0,
      qrScans: 0,
      nfcTaps: 0,
      totalInteractions: 0
    };
    
    const dailyMap = {};
    const cardMap = {};
    const linkTypeMap = {};
    
    currentEvents?.forEach(e => {
      current.totalInteractions++;
      
      // By event type
      if (e.event_type === 'profile_view') current.profileViews++;
      if (e.event_type === 'qr_scan') current.qrScans++;
      if (e.event_type === 'nfc_tap') current.nfcTaps++;
      if (e.event_type === 'profile_link_click') {
        // Would need to join with profile_links to get type
        // For now, count generically
      }
      
      // By token kind
      if (e.token_kind === 'qr') current.qrScans++;
      if (e.token_kind === 'nfc') current.nfcTaps++;
      
      // Daily aggregation
      const day = e.occurred_at.split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + 1;
      
      // By card
      if (e.card_id) {
        cardMap[e.card_id] = (cardMap[e.card_id] || 0) + 1;
      }
    });
    
    // Get link click details
    const { data: linkClicks } = await supabaseClient
      .from('interaction_events')
      .select(`
        profile_link_id,
        profile_links (link_type)
      `)
      .in('business_id', businessIds)
      .eq('event_type', 'profile_link_click')
      .gte('occurred_at', since);
    
    linkClicks?.forEach(e => {
      const linkType = e.profile_links?.link_type || 'unknown';
      linkTypeMap[linkType] = (linkTypeMap[linkType] || 0) + 1;
      
      if (linkType === 'google_review') current.googleClicks++;
      if (linkType === 'whatsapp') current.whatsappClicks++;
      if (linkType === 'google_maps') current.mapsClicks++;
    });
    
    // Process previous period
    const previous = {
      profileViews: 0,
      totalInteractions: previousEvents?.length || 0
    };
    previousEvents?.forEach(e => {
      if (e.event_type === 'profile_view') previous.profileViews++;
    });
    
    // Convert daily map to sorted array
    const daily = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
    
    return {
      current,
      previous,
      daily,
      byCard: Object.entries(cardMap).map(([cardId, count]) => ({ cardId, count })),
      byLinkType: linkTypeMap
    };
  } catch (e) {
    console.error('getOwnerStats exception:', e);
    return null;
  }
}

// Generate demo daily data
function generateDemoDaily(days) {
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    // Random count between 20-50
    const count = Math.floor(Math.random() * 30) + 20;
    daily.push({ date: dateStr, count });
  }
  return daily;
}

// Calculate percentage change
function calcChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

// Format number with thousands separator
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
