// ============ CONFIGURATION ============
const root = document.getElementById("app");
const whatsappNumber = "62895386763040";
const whatsappText = encodeURIComponent("Halo SPNB DIGITAL, saya tertarik membeli kartu Google Review NFC + QR.");
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`;

// Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Flag untuk menggunakan data real atau mock
let USE_REAL_DATA = false;

// Auth state
let currentUser = null;
let currentAccount = null;
let currentRoles = [];
let authInitialized = false;

// Check koneksi dan set flag
async function checkSupabaseConnection() {
  try {
    // Try a simple auth check instead of querying accounts table
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!error) {
      USE_REAL_DATA = true;
      console.log('✅ Connected to Supabase');
      return;
    }
    
    console.log('⚠️ Supabase auth check failed, using mock data');
  } catch (e) {
    console.log('⚠️ Supabase connection failed, using mock data');
  }
}
