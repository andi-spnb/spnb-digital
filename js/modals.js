// ============ MODALS ============

function openModal(content) {
  closeModal();
  root.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" id="modal"><div class="modal">${content}</div></div>`);
  document.body.classList.add("no-scroll");
}

function closeModal() {
  document.getElementById("modal")?.remove();
  document.body.classList.remove("no-scroll");
}

function batchModal() {
  openModal(`
    <div class="row-between">
      <div><h2>Buat Batch Kartu</h2><p>Generate kartu baru dengan serial unik.</p></div>
      <button class="icon-btn" data-modal-close>${icons.close}</button>
    </div>
    <form id="batchForm" class="stack">
      <div class="form-group">
        <label>Jumlah kartu <span class="required">*</span></label>
        <input id="batch-count" class="input" type="number" min="1" max="100" value="10" required />
        <span class="input-hint">Maksimal 100 kartu per batch</span>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Awalan serial</label>
          <input id="batch-prefix" class="input" value="KRT" maxlength="12" />
        </div>
        <div class="form-group">
          <label>Nomor awal</label>
          <input id="batch-start" class="input" type="number" value="1" min="1" />
        </div>
      </div>
      <div class="form-group">
        <label>Kode batch</label>
        <input id="batch-code" class="input" placeholder="BTH-0019" />
        <span class="input-hint">Kosongkan untuk auto-generate</span>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-modal-close>Batal</button>
        <button type="submit" class="btn btn-primary">${icons.plus} Buat Batch</button>
      </div>
    </form>
  `);
}

function resellerModal() {
  openModal(`
    <div class="row-between">
      <div><h2>Tambah Reseller</h2><p>Buat akun reseller baru.</p></div>
      <button class="icon-btn" data-modal-close>${icons.close}</button>
    </div>
    <form id="resellerForm" class="stack">
      <div class="form-group">
        <label>Nama reseller <span class="required">*</span></label>
        <input id="reseller-name" class="input" placeholder="Contoh: Reseller Medan" required />
      </div>
      <div class="form-group">
        <label>Nomor HP <span class="required">*</span></label>
        <input id="reseller-phone" class="input" type="tel" placeholder="08xx xxxx xxxx" required />
      </div>
      <div class="form-group">
        <label>Kota</label>
        <input id="reseller-city" class="input" placeholder="Kota reseller" />
      </div>
      <div class="info-box" style="margin-top:8px">
        ${icons.help}
        <div>
          <strong>Catatan</strong>
          <p>Reseller akan dibuat sebagai entitas bisnis. Untuk login, buat akun user terpisah dan hubungkan ke reseller ini.</p>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-modal-close>Batal</button>
        <button type="submit" class="btn btn-primary">${icons.plus} Buat Reseller</button>
      </div>
    </form>
  `);
}

function resetModal(owner) {
  openModal(`<div class="row-between"><div><h2>Buat Tautan Reset</h2><p>Untuk akun milik ${owner}.</p></div><button class="icon-btn" data-modal-close>${icons.close}</button></div><div style="padding:16px;border-radius:13px;background:var(--blue-50);font-size:12px;color:var(--blue-800)">Tautan hanya dapat digunakan satu kali dan akan kedaluwarsa dalam 30 menit. Kirimkan secara manual ke WhatsApp owner.</div><div class="modal-actions"><button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" data-create-reset>Buat & Salin Tautan</button></div>`);
}

function sellModal(cardId, serial) {
  openModal(`<div class="row-between"><div><h2>Tandai Sebagai Terjual?</h2><p>Kartu ${serial} akan dibuka untuk proses aktivasi.</p></div><button class="icon-btn" data-modal-close>${icons.close}</button></div><div style="padding:16px;border:1px solid var(--blue-200);border-radius:13px;background:var(--blue-50);font-size:12px;color:var(--blue-800)"><b>Penting:</b> Setelah dikonfirmasi, kartu dapat diklaim oleh orang pertama yang memindai QR. Tidak ada data pembeli yang perlu diisi.</div><div class="modal-actions"><button class="btn btn-ghost" data-modal-close>Batal</button><button class="btn btn-primary" data-confirm-sell="${cardId}" data-serial="${serial}">Ya, Tandai Terjual</button></div>`);
}

// Modal detail reseller
function resellerDetailModal(reseller) {
  const r = reseller || {};
  const stockCount = r.stockCount || 0;
  const soldCount = r.soldCount || 0;
  const activeCount = r.activeCount || 0;
  
  openModal(`
    <div class="row-between">
      <div><h2>Detail Reseller</h2><p>${r.name || 'Reseller'}</p></div>
      <button class="icon-btn" data-modal-close>${icons.close}</button>
    </div>
    <div class="reseller-detail-content">
      <div class="reseller-detail-header">
        <div class="reseller-avatar-lg">${(r.name || 'R').substring(0, 2).toUpperCase()}</div>
        <div>
          <h3>${r.name || '-'}</h3>
          <p>${r.city || '-'} · ${r.phone_e164 || '-'}</p>
          ${statusBadge(r.status || 'active')}
        </div>
      </div>
      <div class="reseller-detail-stats">
        <div class="stat-box">
          <strong>${stockCount}</strong>
          <span>Stok</span>
        </div>
        <div class="stat-box">
          <strong>${soldCount}</strong>
          <span>Terjual</span>
        </div>
        <div class="stat-box">
          <strong>${activeCount}</strong>
          <span>Aktif</span>
        </div>
      </div>
      <div class="reseller-detail-info">
        <div class="info-row"><span>ID</span><strong>${r.id || '-'}</strong></div>
        <div class="info-row"><span>Bergabung</span><strong>${formatDate(r.created_at) || '-'}</strong></div>
        <div class="info-row"><span>Email</span><strong>${r.email || '-'}</strong></div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-close>Tutup</button>
      ${r.status === 'active' 
        ? `<button class="btn btn-secondary" data-toggle-reseller-status="${r.id}" data-status="inactive">${icons.close} Nonaktifkan</button>`
        : `<button class="btn btn-primary" data-toggle-reseller-status="${r.id}" data-status="active">${icons.check} Aktifkan</button>`
      }
    </div>
  `);
}

// Modal detail owner
function ownerDetailModal(owner) {
  const o = owner || {};
  
  openModal(`
    <div class="row-between">
      <div><h2>Detail Owner</h2><p>${o.display_name || 'Owner'}</p></div>
      <button class="icon-btn" data-modal-close>${icons.close}</button>
    </div>
    <div class="owner-detail-content">
      <div class="owner-detail-header">
        <div class="owner-avatar-lg">${(o.display_name || 'O').substring(0, 2).toUpperCase()}</div>
        <div>
          <h3>${o.display_name || '-'}</h3>
          <p>${o.phone_e164 || '-'}</p>
          ${statusBadge(o.status || 'active')}
        </div>
      </div>
      <div class="owner-detail-info">
        <div class="info-row"><span>User ID</span><strong style="font-size:11px">${o.user_id || '-'}</strong></div>
        <div class="info-row"><span>Bergabung</span><strong>${formatDate(o.created_at) || '-'}</strong></div>
        <div class="info-row"><span>Profil Usaha</span><strong>${o.businessCount || 0} profil</strong></div>
        <div class="info-row"><span>Kartu Aktif</span><strong>${o.cardCount || 0} kartu</strong></div>
      </div>
      ${o.businesses && o.businesses.length > 0 ? `
        <div class="owner-businesses">
          <h4>Profil Usaha</h4>
          <div class="business-list">
            ${o.businesses.map(b => `
              <div class="business-item">
                <div class="business-logo-sm" style="background:${b.theme_color || '#1769c2'}">${(b.name || 'B').substring(0, 2).toUpperCase()}</div>
                <div>
                  <strong>${b.name}</strong>
                  <small>${b.slug || '-'}</small>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-close>Tutup</button>
      <button class="btn btn-secondary" data-reset-modal="${o.display_name}">${icons.help} Reset Password</button>
    </div>
  `);
}

// Modal aksi kartu (admin)
function cardActionModal(card) {
  const c = card || {};
  const isBlocked = c.service_state === 'blocked' || c.status === 'blocked';
  
  openModal(`
    <div class="row-between">
      <div><h2>Aksi Kartu</h2><p>${c.serial || 'Kartu'}</p></div>
      <button class="icon-btn" data-modal-close>${icons.close}</button>
    </div>
    <div class="card-action-content">
      <div class="card-action-header">
        <div class="card-icon-lg">${icons.card}</div>
        <div>
          <h3>${c.serial || '-'}</h3>
          <p>${statusBadge(c.status || c.lifecycle_state || 'stock')}</p>
        </div>
      </div>
      <div class="card-action-info">
        <div class="info-row"><span>ID</span><strong style="font-size:11px">${c.id || '-'}</strong></div>
        <div class="info-row"><span>Reseller</span><strong>${c.reseller || '-'}</strong></div>
        <div class="info-row"><span>Owner</span><strong>${c.owner || '-'}</strong></div>
        <div class="info-row"><span>Tujuan</span><strong>${c.destination_mode === 'profile' ? 'Profil Bisnis' : 'Google Rating'}</strong></div>
        <div class="info-row"><span>Dibuat</span><strong>${formatDate(c.created_at) || '-'}</strong></div>
      </div>
    </div>
    <div class="card-action-buttons">
      ${isBlocked 
        ? `<button class="btn btn-primary btn-block" data-unblock-card="${c.id}">${icons.check} Aktifkan Kembali</button>`
        : `<button class="btn btn-secondary btn-block" data-block-card="${c.id}">${icons.close} Blokir Kartu</button>`
      }
      ${c.lifecycle_state === 'claimed' ? `
        <button class="btn btn-ghost btn-block" data-reset-card="${c.id}">${icons.help} Reset ke Stok Admin</button>
      ` : ''}
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-close>Tutup</button>
    </div>
  `);
}

// Modal bulk distribute
function bulkDistributeModal() {
  const resellers = state.adminData?.resellers || [];
  const selectedCount = state.selectedCards.length;
  
  openModal(`
    <div class="row-between">
      <div><h2>Distribusikan ${selectedCount} Kartu</h2><p>Pilih reseller tujuan</p></div>
      <button class="icon-btn" data-modal-close>${icons.close}</button>
    </div>
    <div class="bulk-distribute-content">
      <div class="info-box" style="margin-bottom:16px">
        ${icons.help}
        <div>
          <strong>${selectedCount} kartu dipilih</strong>
          <p>Kartu akan dipindahkan ke stok reseller yang dipilih.</p>
        </div>
      </div>
      <div class="form-group">
        <label>Reseller Tujuan <span class="required">*</span></label>
        <select class="input" id="bulk-distribute-reseller" required>
          <option value="">Pilih reseller...</option>
          ${resellers.map(r => `<option value="${r.id}">${r.name} (${r.city || '-'})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Catatan (opsional)</label>
        <input class="input" id="bulk-distribute-note" placeholder="Catatan distribusi..." />
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-close>Batal</button>
      <button class="btn btn-primary" data-confirm-bulk-distribute>${icons.stock} Distribusikan</button>
    </div>
  `);
}

// Modal detail kartu (reseller view)
function cardDetailModal(card) {
  const c = card || {};
  const statusLabel = {
    'stock': 'Stok Tersedia',
    'sold': 'Terjual (Menunggu Aktivasi)',
    'active': 'Sudah Aktif'
  };
  
  openModal(`
    <div class="row-between">
      <div><h2>Detail Kartu</h2><p>${c.serial || 'Kartu'}</p></div>
      <button class="icon-btn" data-modal-close>${icons.close}</button>
    </div>
    <div class="card-detail-content">
      <div class="card-detail-header">
        <div class="card-icon-lg">${icons.card}</div>
        <div>
          <h3>${c.serial || '-'}</h3>
          <p>${statusBadge(c.status || 'stock')}</p>
        </div>
      </div>
      <div class="card-detail-info">
        <div class="info-row"><span>Status</span><strong>${statusLabel[c.status] || c.status || '-'}</strong></div>
        <div class="info-row"><span>Mode Tujuan</span><strong>${c.destination_mode === 'profile' ? 'Profil Bisnis' : 'Google Rating Langsung'}</strong></div>
        ${c.allocated_at ? `<div class="info-row"><span>Diterima</span><strong>${formatDate(c.allocated_at)}</strong></div>` : ''}
        ${c.sold_at ? `<div class="info-row"><span>Ditandai Terjual</span><strong>${formatDate(c.sold_at)}</strong></div>` : ''}
        ${c.claimed_at ? `<div class="info-row"><span>Diaktifkan</span><strong>${formatDate(c.claimed_at)}</strong></div>` : ''}
        ${c.date && !c.allocated_at && !c.sold_at && !c.claimed_at ? `<div class="info-row"><span>Tanggal</span><strong>${c.date}</strong></div>` : ''}
      </div>
      ${c.status === 'active' ? `
        <div class="info-box" style="margin-top:16px">
          ${icons.check}
          <div>
            <strong>Kartu Sudah Aktif</strong>
            <p>Kartu ini sudah diklaim dan diaktifkan oleh owner. Tidak ada tindakan yang diperlukan.</p>
          </div>
        </div>
      ` : ''}
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-close>Tutup</button>
      ${c.status === 'sold' ? `<button class="btn btn-secondary" data-unsell-card="${c.id}" data-serial="${c.serial}" data-modal-close>Batalkan Penjualan</button>` : ''}
    </div>
  `);
}

// Modal QR Code dan NFC untuk kartu (admin view)
function cardQrNfcModal(cardId, serial, qrToken, nfcToken) {
  // Generate activation URL
  const baseUrl = window.location.origin + window.location.pathname;
  const activationUrl = `${baseUrl}#/aktivasi?token=${qrToken || cardId}`;
  const nfcUrl = `${baseUrl}#/c/${nfcToken || cardId}`;
  
  openModal(`
    <div class="row-between">
      <div><h2>QR Code & NFC</h2><p>${serial}</p></div>
      <button class="icon-btn" data-modal-close>${icons.close}</button>
    </div>
    <div class="qr-nfc-content">
      <div class="qr-section">
        <div class="qr-code-container" id="qr-code-display">
          <div class="qr-loading">
            <div class="loading-spinner"></div>
            <span>Generating QR...</span>
          </div>
        </div>
        <p class="qr-serial">${serial}</p>
      </div>
      
      <div class="link-section">
        <div class="form-group">
          <label>${icons.qr} Link Aktivasi (QR Code)</label>
          <div class="input-with-copy">
            <input class="input" id="activation-link" value="${activationUrl}" readonly />
            <button class="btn btn-ghost btn-sm" data-copy-link="activation-link" title="Salin link">
              ${icons.link}
            </button>
          </div>
          <span class="input-hint">Link ini digunakan untuk QR code pada kartu fisik</span>
        </div>
        
        <div class="form-group">
          <label>${icons.nfc} Link NFC Tag</label>
          <div class="input-with-copy">
            <input class="input" id="nfc-link" value="${nfcUrl}" readonly />
            <button class="btn btn-ghost btn-sm" data-copy-link="nfc-link" title="Salin link">
              ${icons.link}
            </button>
          </div>
          <span class="input-hint">Link ini ditulis ke NFC tag pada kartu fisik</span>
        </div>
      </div>
      
      <div class="nfc-info-section">
        <div class="info-box">
          ${icons.nfc}
          <div>
            <strong>Informasi NFC Tag</strong>
            <p>Gunakan aplikasi NFC Writer untuk menulis link NFC ke tag. Pastikan tag mendukung NDEF format.</p>
          </div>
        </div>
        
        <div class="nfc-specs">
          <h4>Spesifikasi Tag NFC</h4>
          <div class="spec-grid">
            <div class="spec-item">
              <span class="spec-label">Tipe Tag</span>
              <span class="spec-value">NTAG213 / NTAG215</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Format</span>
              <span class="spec-value">NDEF URI Record</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Token</span>
              <span class="spec-value">${nfcToken || cardId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-close>Tutup</button>
      <button class="btn btn-secondary" data-download-qr="${serial}">
        ${icons.chart} Download QR
      </button>
      <button class="btn btn-primary" data-copy-link="activation-link">
        ${icons.link} Salin Link
      </button>
    </div>
  `);
  
  // Generate QR code after modal is rendered
  setTimeout(() => generateQrCode(activationUrl, serial), 100);
}

// Generate QR Code menggunakan library atau canvas
function generateQrCode(url, serial) {
  const container = document.getElementById('qr-code-display');
  if (!container) return;
  
  // Check if qrcode library is available
  if (typeof QRCode !== 'undefined') {
    container.innerHTML = '';
    new QRCode(container, {
      text: url,
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    // Fallback: Generate QR using canvas with simple pattern (or use API)
    container.innerHTML = `
      <div class="qr-fallback">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" 
             alt="QR Code ${serial}" 
             width="200" 
             height="200"
             onerror="this.parentElement.innerHTML='<div class=\\'qr-error\\'>${icons.qr}<p>Gagal memuat QR</p></div>'" />
      </div>
    `;
  }
}
