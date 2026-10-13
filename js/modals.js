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
