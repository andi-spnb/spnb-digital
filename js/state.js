// ============ APPLICATION STATE ============

const state = {
  mobileMenu: false,
  loginError: '',
  loginLoading: false,
  // Loaded data from database
  ownerData: null,
  resellerData: null,
  adminData: null,
  // Stats
  ownerStats: null,
  statsLoading: false,
  statsPeriod: 30,
  adminStats: null,
  adminStatsLoading: false,
  adminStatsPeriod: 30,
  // Image upload
  uploadingLogo: false,
  uploadingBanner: false,
  // Notifications
  notifications: [],
  notificationsLoading: false,
  unreadCount: 0,
  showNotificationPanel: false,
  // Filter & Search state
  filters: {
    cards: { search: '', status: '', reseller: '' },
    resellers: { search: '', status: '' },
    owners: { search: '', status: '' },
    logs: { search: '', user: '', date: '' }
  },
  // Pagination state
  pagination: {
    cards: { page: 1, perPage: 20, total: 0 },
    resellers: { page: 1, perPage: 20, total: 0 },
    owners: { page: 1, perPage: 20, total: 0 },
    logs: { page: 1, perPage: 20, total: 0 }
  },
  // Activation flow state
  activation: {
    step: 1,
    // Token from QR code
    token: null,
    claimSessionToken: null,
    // Card info from token validation
    cardId: null,
    cardSerial: null,
    cardStatus: null, // 'valid', 'invalid', 'already_claimed', 'not_sold'
    errorMessage: null,
    // Auth mode: 'login' or 'register'
    authMode: 'register',
    // Registration fields
    email: "",
    phone: "",
    password: "",
    confirm: "",
    displayName: "",
    // Business selection
    selectedBusinessId: null,
    existingBusinesses: [],
    createNewBusiness: true,
    // New business fields
    businessName: "",
    businessSlug: "",
    googleReviewUrl: "",
    // Destination mode
    destinationMode: "direct_google",
    // Processing state
    isLoading: false,
    isSubmitting: false,
  },
  resellerCards: [
    { serial: "KRT-000125", status: "stock", date: "—", owner: "—" },
    { serial: "KRT-000126", status: "sold", date: "12 Okt 2026", owner: "Menunggu aktivasi" },
    { serial: "KRT-000127", status: "active", date: "11 Okt 2026", owner: "0812••••7890" },
    { serial: "KRT-000128", status: "stock", date: "—", owner: "—" },
    { serial: "KRT-000129", status: "active", date: "8 Okt 2026", owner: "0857••••2210" },
  ],
  // Demo business profile data
  businessProfile: {
    name: "Kopi Nusantara",
    description: "Kopi lokal pilihan dan tempat berkumpul yang nyaman. Buka setiap hari pukul 08.00–22.00.",
    address: "Jl. Merdeka No. 24, Bandung",
    logoUrl: "",
    bannerUrl: "",
    themeColor: "#1769c2",
    googleReviewUrl: "https://g.page/r/contoh/review",
    whatsapp: "081234567890",
    mapsUrl: "https://maps.app.goo.gl/contoh",
    instagram: "@kopinusantara",
    website: "https://kopinusantara.id",
  },
};
