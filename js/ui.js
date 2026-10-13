// ============ ICONS & UI COMPONENTS ============

const iconPaths = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>',
  business: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
  chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 3.2 2.3c-.9.4-.9 1.1-.9 1.7"/><path d="M12 17h.01"/>',
  stock: '<path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/>',
  reseller: '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0"/><path d="M14 14a4.5 4.5 0 0 1 7.5 3.4"/>',
  log: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  setting: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
  scan: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><path d="M8 12h8"/>',
  nfc: '<path d="M6.5 7.5a6.4 6.4 0 0 1 0 9M10 9.8a3.2 3.2 0 0 1 0 4.4M14 5a10 10 0 0 1 0 14"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  phone: '<path d="M8.5 3H5.8A2.8 2.8 0 0 0 3 5.8 15.2 15.2 0 0 0 18.2 21a2.8 2.8 0 0 0 2.8-2.8v-2.7l-4-1.2-1.2 2.4a12 12 0 0 1-8.5-8.5L9.7 7l-1.2-4Z"/>',
  map: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  link: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 20h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  share: '<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"/>',
};

function icon(name, className = "") {
  const path = iconPaths[name] || iconPaths.help;
  return `<svg class="svg-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

const icons = new Proxy({}, { get: (_, name) => icon(name) });

function brandLogo() {
  return `<svg class="brand-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="url(#brand-grad)"/>
    <path d="M12 28V12h6.5c1.8 0 3.2.45 4.2 1.35 1 .9 1.5 2.1 1.5 3.6 0 1-.25 1.85-.75 2.55-.5.7-1.2 1.2-2.1 1.5v.1c1.1.2 2 .7 2.65 1.5.65.8.98 1.8.98 3 0 1.7-.55 3-1.65 3.9-1.1.9-2.6 1.35-4.5 1.35H12v.15zm4-10.2h2.2c.8 0 1.4-.18 1.8-.55.4-.37.6-.9.6-1.6 0-.65-.2-1.15-.6-1.5-.4-.35-1-.52-1.8-.52H16v4.17zm0 3.2v4.8h2.7c.85 0 1.5-.2 1.95-.6.45-.4.68-1 .68-1.8 0-.75-.23-1.32-.7-1.7-.47-.38-1.13-.57-2-.57H16v-.13z" fill="#fff"/>
    <circle cx="30" cy="12" r="4" fill="#4AE3B5"/>
    <defs><linearGradient id="brand-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1a6fd1"/><stop offset="1" stop-color="#0f4c8a"/>
    </linearGradient></defs>
  </svg>`;
}

function brand(link = "#/") {
  return `
    <a class="brand" href="${link}" aria-label="SPNB DIGITAL">
      <span class="brand-mark">${brandLogo()}</span>
      <span class="brand-word">SPNB<span>DIGITAL</span></span>
    </a>`;
}

function statusBadge(status) {
  const map = {
    active: ["Aktif", "status-active"],
    stock: ["Stok reseller", "status-stock"],
    admin: ["Stok admin", "status-stock"],
    sold: ["Terjual", "status-sold"],
    blocked: ["Diblokir", "status-blocked"],
    replaced: ["Diganti", "status-replaced"],
  };
  const item = map[status] || [status, "status-stock"];
  return `<span class="status ${item[1]}">${item[0]}</span>`;
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
