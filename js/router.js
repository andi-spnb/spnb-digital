// ============ ROUTING ============

function getRoute() {
  const value = window.location.hash.replace(/^#/, "") || "/";
  return value.startsWith("/") ? value : "/";
}

function go(route) {
  if (getRoute() === route) {
    render();
  } else {
    window.location.hash = route;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function pageTitle(route) {
  if (route === "/aktivasi") return "Aktivasi Kartu";
  if (route === "/profil") return "Kopi Nusantara";
  if (route === "/login") return "Masuk";
  if (route.startsWith("/admin")) return "Dashboard Admin";
  if (route.startsWith("/reseller")) return "Dashboard Reseller";
  return "Dashboard Owner";
}

function loadingPage(role) {
  const titles = {
    owner: "Dashboard Owner",
    reseller: "Dashboard Reseller", 
    admin: "Dashboard Admin"
  };
  return `
    <div class="app-shell role-${role}">
      <main class="main-shell" style="display:flex;align-items:center;justify-content:center;min-height:100vh">
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="margin-top:16px;color:var(--muted)">Memuat ${titles[role]}...</p>
        </div>
      </main>
    </div>`;
}
