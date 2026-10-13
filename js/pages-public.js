// ============ PUBLIC PAGES ============

function publicHeader() {
  return `
    <header class="site-header">
      <div class="container nav">
        ${brand("#/")}
        <nav class="nav-links" aria-label="Navigasi utama">
          <a href="#/" data-scroll="manfaat">Manfaat</a>
          <a href="#/" data-scroll="cara-kerja">Cara Kerja</a>
          <a href="#/" data-scroll="fitur">Fitur</a>
          <a href="#/" data-scroll="faq">FAQ</a>
        </nav>
        <div class="nav-actions">
          <button class="btn btn-ghost" data-route="/login">Masuk</button>
          <a class="btn btn-primary" href="${whatsappUrl}" target="_blank" rel="noopener">Beli Kartu</a>
          <button class="icon-btn mobile-toggle" data-mobile-menu aria-label="Buka menu">${icons.menu}</button>
        </div>
      </div>
      ${state.mobileMenu ? `
        <nav class="mobile-menu">
          <a href="#/" data-scroll="manfaat">Manfaat</a>
          <a href="#/" data-scroll="cara-kerja">Cara Kerja</a>
          <a href="#/" data-scroll="fitur">Fitur</a>
          <a href="#/" data-scroll="faq">Pertanyaan Umum</a>
          <a href="#/login">Masuk ke Dashboard</a>
        </nav>` : ""}
    </header>`;
}

function homePage() {
  return `
    ${publicHeader()}
    <main>
      <section class="hero">
        <div class="container hero-grid">
          <div class="hero-copy">
            <span class="eyebrow">Solusi digital untuk UMKM</span>
            <h1>Ulasan Google, cukup <span class="blue-text">satu sentuhan.</span></h1>
            <p>Bantu pelanggan menemukan dan memberikan ulasan untuk bisnis Anda. Cukup tempelkan ponsel ke kartu NFC atau pindai QR—cepat, praktis, tanpa aplikasi.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="${whatsappUrl}" target="_blank" rel="noopener">${icons.phone} Beli via WhatsApp</a>
              <button class="btn btn-secondary" data-route="/aktivasi">Lihat Demo Aktivasi ${icons.link}</button>
            </div>
            <div class="hero-note">
              <span>Aktif selamanya</span>
              <span>Tanpa aplikasi</span>
              <span>Bisa diubah kapan saja</span>
            </div>
          </div>
          <div class="hero-visual" aria-label="Mockup kartu Google Review SPNB DIGITAL">
            <div class="visual-blob"></div>
            <img class="product-photo" src="mockup.jpeg" alt="Mockup kartu Google Review NFC dan QR" />
            <div class="float-card float-one">
              <div class="row"><span class="icon-bubble">${icons.nfc}</span><div>NFC siap digunakan<small>Tempel, lalu beri ulasan</small></div></div>
            </div>
            <div class="float-card float-two">
              <div class="row"><span class="icon-bubble">${icons.star}</span><div>4,9 Google Rating<small>Lebih mudah dijangkau</small></div></div>
            </div>
          </div>
        </div>
      </section>

      <div class="logo-strip">
        <div class="container logo-strip-inner">
          <span>Dibuat untuk bisnis yang ingin tumbuh</span>
          <div class="logo-strip-items">
            <span class="mini-pill">Kuliner</span><span class="mini-pill">Salon</span>
            <span class="mini-pill">Retail</span><span class="mini-pill">Jasa</span><span class="mini-pill">Hospitality</span>
          </div>
        </div>
      </div>

      <section class="section" id="manfaat">
        <div class="container">
          <div class="section-heading center">
            <span class="eyebrow">Lebih dari sekadar kartu</span>
            <h2>Cara termudah mendekatkan pelanggan dengan bisnis Anda</h2>
            <p>Satu kartu untuk mengarahkan pelanggan ke Google Rating atau profil digital bisnis yang lengkap.</p>
          </div>
          <div class="grid-3">
            <article class="feature-card">
              <div class="feature-icon">${icons.nfc}</div><h3>Tap atau scan</h3>
              <p>Gunakan NFC dan QR unik. Pelanggan tidak perlu memasang aplikasi tambahan.</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">${icons.star}</div><h3>Ulasan lebih mudah</h3>
              <p>Arahkan pelanggan langsung ke halaman Google Rating dengan langkah sesingkat mungkin.</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">${icons.link}</div><h3>Profil digital bisnis</h3>
              <p>Tampilkan WhatsApp, lokasi, media sosial, website, dan tombol rating dalam satu halaman.</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">${icons.chart}</div><h3>Statistik interaksi</h3>
              <p>Pantau jumlah scan QR, tap NFC, tampilan profil, dan klik tombol bisnis.</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">${icons.setting}</div><h3>Bebas mengganti tujuan</h3>
              <p>Ubah antara Google Rating dan profil bisnis kapan saja tanpa mencetak kartu baru.</p>
            </article>
            <article class="feature-card">
              <div class="feature-icon">∞</div><h3>Aktif selamanya</h3>
              <p>Satu kali pembelian. Kartu dan halaman bisnis dapat terus digunakan tanpa masa kedaluwarsa.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section section-soft" id="cara-kerja">
        <div class="container how-grid">
          <div class="how-image"><img src="mockup.jpeg" alt="Kartu NFC SPNB DIGITAL" /></div>
          <div>
            <span class="eyebrow">Cara kerja</span>
            <h2>Siap digunakan hanya dalam beberapa menit</h2>
            <p>Tidak ada proses teknis yang rumit. Aktifkan sekali, lalu gunakan selama bisnis Anda berjalan.</p>
            <div class="step-list">
              <div class="step"><div class="step-no">01</div><div><h3>Beli dan pindai QR</h3><p>Setelah reseller menandai kartu terjual, pindai QR untuk memulai aktivasi.</p></div></div>
              <div class="step"><div class="step-no">02</div><div><h3>Daftarkan bisnis</h3><p>Buat akun dengan nomor HP dan password, lalu masukkan profil serta link Google.</p></div></div>
              <div class="step"><div class="step-no">03</div><div><h3>Pilih tujuan kartu</h3><p>Arahkan pelanggan langsung ke Google Rating atau ke halaman profil bisnis.</p></div></div>
              <div class="step"><div class="step-no">04</div><div><h3>Letakkan dan gunakan</h3><p>Taruh kartu di kasir, meja, atau area pelayanan agar mudah dijangkau pelanggan.</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section" id="fitur">
        <div class="container">
          <div class="section-heading center">
            <span class="eyebrow">Satu kartu, dua pilihan</span>
            <h2>Pilih pengalaman yang paling cocok untuk pelanggan</h2>
            <p>Setiap kartu dapat memiliki mode berbeda dan bisa diganti kapan saja melalui dashboard owner.</p>
          </div>
          <div class="mode-grid">
            <article class="mode-card">
              <span class="mode-tag">Paling cepat</span>
              <div class="feature-icon">${icons.star}</div>
              <h3>Langsung ke Google Rating</h3>
              <p>Pelanggan langsung membuka halaman ulasan Google setelah tap NFC atau scan QR.</p>
              <ul><li>Alur pemberian ulasan lebih singkat</li><li>Cocok ditempatkan di kasir dan meja</li><li>Scan QR dan tap NFC tercatat terpisah</li></ul>
            </article>
            <article class="mode-card">
              <span class="mode-tag">Profil lebih lengkap</span>
              <div class="feature-icon">${icons.link}</div>
              <h3>Halaman Profil Bisnis</h3>
              <p>Bangun halaman mini untuk menghubungkan pelanggan dengan seluruh kanal bisnis Anda.</p>
              <ul><li>Google Rating, WhatsApp, dan lokasi</li><li>Instagram, TikTok, Facebook, website</li><li>Slug nama usaha dan tema yang dapat diatur</li></ul>
            </article>
          </div>
        </div>
      </section>

      <section class="section section-soft">
        <div class="container how-grid">
          <div>
            <span class="eyebrow">Kelola dengan mudah</span>
            <h2>Semua kartu dan interaksi dalam satu dashboard</h2>
            <p>Owner dapat mengelola banyak kartu dan profil usaha. Admin serta reseller juga memiliki akses khusus sesuai kebutuhan masing-masing.</p>
            <div class="hero-actions">
              <button class="btn btn-primary" data-route="/login">Buka Demo Dashboard</button>
              <button class="btn btn-secondary" data-route="/profil">Lihat Contoh Profil</button>
            </div>
          </div>
          <div class="dashboard-preview">
            <div class="preview-window">
              <div class="preview-bar"><i class="dot"></i><i class="dot"></i><i class="dot"></i></div>
              <div class="preview-content">
                <div class="preview-side"><div class="active">Ringkasan</div><div>Kartu Saya</div><div>Profil Usaha</div><div>Statistik</div><div>Akun</div></div>
                <div class="preview-main">
                  <h3>Ringkasan Bisnis</h3>
                  <div class="stat-mini-grid">
                    <div class="stat-mini">Kartu Aktif<b>3</b></div><div class="stat-mini">Interaksi<b>426</b></div><div class="stat-mini">Klik Rating<b>184</b></div>
                  </div>
                  <div class="chart-fake">
                    <i style="height:35%"></i><i style="height:48%"></i><i style="height:43%"></i><i style="height:69%"></i><i style="height:62%"></i><i style="height:88%"></i><i style="height:77%"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section" id="faq">
        <div class="container">
          <div class="section-heading center"><span class="eyebrow">Pertanyaan umum</span><h2>Hal yang sering ditanyakan</h2></div>
          <div class="faq-list">
            ${faq("Apakah pelanggan perlu menginstal aplikasi?", "Tidak. NFC dan QR akan membuka tautan melalui browser ponsel tanpa aplikasi khusus.")}
            ${faq("Apakah kartu memiliki masa aktif?", "Tidak. Kartu aktif selamanya dan dapat terus digunakan setelah proses aktivasi selesai.")}
            ${faq("Bisakah tujuan kartu diganti?", "Bisa. Owner bebas mengganti mode langsung ke Google Rating atau halaman profil bisnis kapan saja.")}
            ${faq("Apakah satu usaha boleh memiliki beberapa kartu?", "Boleh. Beberapa kartu dapat menggunakan satu profil usaha yang sama, tetapi statistik setiap kartu tetap dipisahkan.")}
            ${faq("Apakah SPNB DIGITAL dapat mengetahui siapa yang memberi ulasan?", "Tidak. Sistem mencatat scan, tap, tampilan, dan klik tombol. Hasil ulasan tetap berada di layanan Google.")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="cta-box">
            <div><h2>Siap membuat bisnis Anda lebih mudah ditemukan?</h2><p>Mulai dengan satu kartu Google Review dari SPNB DIGITAL.</p></div>
            <a class="btn btn-white" href="${whatsappUrl}" target="_blank" rel="noopener">${icons.phone} Pesan via WhatsApp</a>
          </div>
        </div>
      </section>
    </main>
    ${footer()}`;
}

function homePageV2() {
  return `
    ${publicHeader()}
    <main class="site-v2">
      <section class="hero-v2">
        <div class="container hero-v2-grid">
          <div class="hero-v2-copy">
            <span class="product-label">Kartu Google Review NFC + QR</span>
            <h1>Permudah pelanggan membuka halaman ulasan Google Anda.</h1>
            <p>Letakkan kartu di meja atau kasir. Pelanggan cukup menempelkan ponsel atau memindai QR untuk membuka Google Rating atau profil bisnis Anda.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="${whatsappUrl}" target="_blank" rel="noopener">Pesan melalui WhatsApp</a>
              <button class="text-link" data-route="/aktivasi">Lihat proses aktivasi ${icons.link}</button>
            </div>
            <p class="purchase-note">Aktif selamanya · Tidak perlu aplikasi · Tujuan kartu dapat diganti</p>
          </div>
          <figure class="product-figure">
            <img src="mockup.jpeg" alt="Kartu Google Review SPNB DIGITAL di atas meja" />
            <figcaption>Kartu siap pakai dengan NFC dan QR unik.</figcaption>
          </figure>
        </div>
      </section>

      <section class="fact-strip" aria-label="Informasi utama produk">
        <div class="container fact-grid">
          <div><strong>NFC + QR</strong><span>Dua cara akses dalam satu kartu</span></div>
          <div><strong>Tanpa aplikasi</strong><span>Terbuka langsung di browser</span></div>
          <div><strong>Dapat diubah</strong><span>Ganti tujuan tanpa cetak ulang</span></div>
          <div><strong>Data terpisah</strong><span>Scan QR dan tap NFC tercatat</span></div>
        </div>
      </section>

      <section class="section-v2" id="manfaat">
        <div class="container">
          <div class="plain-heading"><span class="section-index">01</span><div><h2>Dibuat untuk dipakai di tempat usaha</h2><p>Bukan sekadar tautan digital. Kartu dirancang untuk masuk ke alur pelayanan yang sudah berjalan.</p></div></div>
          <div class="use-case-list">
            <article class="use-case"><span class="use-case-no">A</span><div><h3>Di meja kasir</h3><p>Staf dapat meminta pelanggan membuka halaman rating setelah transaksi selesai.</p></div></article>
            <article class="use-case"><span class="use-case-no">B</span><div><h3>Di meja pelanggan</h3><p>Pelanggan dapat mengakses rating, menu, lokasi, dan WhatsApp tanpa menunggu staf.</p></div></article>
            <article class="use-case"><span class="use-case-no">C</span><div><h3>Untuk beberapa cabang</h3><p>Gunakan profil dan link Google yang berbeda untuk setiap cabang dalam satu akun owner.</p></div></article>
          </div>
        </div>
      </section>

      <section class="section-v2 section-rule" id="cara-kerja">
        <div class="container">
          <div class="plain-heading"><span class="section-index">02</span><div><h2>Dari pembelian sampai kartu aktif</h2><p>Aktivasi dilakukan sendiri oleh pemilik usaha melalui QR pada kartu.</p></div></div>
          <ol class="process-list">
            <li><span>1</span><div><strong>Reseller menandai kartu terjual</strong><p>Kartu belum dapat diklaim sebelum transaksi dikonfirmasi oleh reseller.</p></div></li>
            <li><span>2</span><div><strong>Owner memindai QR dan membuat akun</strong><p>Cukup gunakan nomor HP dan password. Akun yang sama dapat memiliki beberapa kartu.</p></div></li>
            <li><span>3</span><div><strong>Masukkan profil dan link Google</strong><p>Link dapat diuji terlebih dahulu agar tujuan kartu tidak salah.</p></div></li>
            <li><span>4</span><div><strong>Pilih tujuan lalu aktifkan</strong><p>Setelah aktif, QR dan NFC akan menggunakan pengaturan yang dipilih owner.</p></div></li>
          </ol>
        </div>
      </section>

      <section class="section-v2 mode-section" id="fitur">
        <div class="container">
          <div class="plain-heading"><span class="section-index">03</span><div><h2>Satu kartu, dua cara penggunaan</h2><p>Pengaturan dapat diganti kapan saja dari dashboard tanpa mengubah isi NFC atau mencetak QR baru.</p></div></div>
          <div class="mode-table">
            <article>
              <header><span class="mode-symbol">${icons.star}</span><div><h3>Langsung ke Google Rating</h3><p>Untuk alur ulasan yang paling singkat.</p></div></header>
              <dl><div><dt>Setelah tap / scan</dt><dd>Google Rating langsung terbuka</dd></div><div><dt>Cocok digunakan</dt><dd>Kasir, meja pembayaran, resepsionis</dd></div><div><dt>Data yang tercatat</dt><dd>Jumlah tap dan scan, bukan hasil ulasan</dd></div></dl>
            </article>
            <article>
              <header><span class="mode-symbol">${icons.business}</span><div><h3>Halaman Profil Bisnis</h3><p>Untuk menampilkan beberapa tujuan bisnis.</p></div></header>
              <dl><div><dt>Setelah tap / scan</dt><dd>Profil usaha milik owner terbuka</dd></div><div><dt>Isi halaman</dt><dd>Rating, WhatsApp, lokasi, sosial media</dd></div><div><dt>Alamat halaman</dt><dd>Slug nama usaha yang dapat diubah</dd></div></dl>
            </article>
          </div>
          <div class="inline-actions"><button class="btn btn-secondary" data-route="/profil">Lihat contoh profil bisnis</button><button class="btn btn-primary" data-route="/login">Masuk ke Dashboard</button></div>
        </div>
      </section>

      <section class="section-v2 section-rule">
        <div class="container practical-grid">
          <div>
            <span class="section-index">04</span>
            <h2>Hal yang perlu diketahui sebelum membeli</h2>
            <p>Informasi praktis agar kartu digunakan sesuai fungsinya.</p>
          </div>
          <div class="practical-list">
            <div><strong>Kompatibilitas</strong><p>NFC bekerja pada ponsel yang mendukung NFC. QR dapat digunakan sebagai alternatif pada semua ponsel berkamera.</p></div>
            <div><strong>Statistik</strong><p>Dashboard mencatat interaksi pada kartu dan tombol. Sistem tidak dapat memastikan pelanggan benar-benar mengirim ulasan di Google.</p></div>
            <div><strong>Perubahan link</strong><p>Owner dapat mengganti link Google dan mode tujuan tanpa menulis ulang tag NFC.</p></div>
            <div><strong>Pemulihan akun</strong><p>Karena pendaftaran tidak memakai OTP, reset password dibantu oleh admin SPNB DIGITAL.</p></div>
          </div>
        </div>
      </section>

      <section class="section-v2 faq-v2" id="faq">
        <div class="container faq-v2-grid">
          <div><span class="section-index">05</span><h2>Pertanyaan yang sering muncul</h2><p>Belum menemukan jawaban? Hubungi SPNB DIGITAL melalui WhatsApp.</p></div>
          <div class="faq-list">
            ${faq("Apakah pelanggan harus menginstal aplikasi?", "Tidak. NFC dan QR membuka tautan melalui browser ponsel.")}
            ${faq("Apakah kartu memiliki biaya bulanan?", "Untuk rancangan produk ini, kartu aktif selamanya dan tidak memiliki masa perpanjangan.")}
            ${faq("Bisakah beberapa kartu memakai satu profil?", "Bisa. Statistik setiap kartu tetap dipisahkan walaupun menggunakan profil usaha yang sama.")}
            ${faq("Apakah jumlah klik sama dengan jumlah ulasan?", "Tidak. Klik hanya menunjukkan pelanggan membuka tombol Google Rating. Hasil ulasan tetap berada di Google.")}
          </div>
        </div>
      </section>

      <section class="order-section">
        <div class="container order-inner">
          <div><span class="product-label">Pemesanan</span><h2>Pesan kartu SPNB DIGITAL melalui WhatsApp.</h2><p>Tanyakan ketersediaan, harga, dan proses pengiriman kepada tim kami.</p></div>
          <a class="btn btn-primary" href="${whatsappUrl}" target="_blank" rel="noopener">Hubungi 0895-3867-63040</a>
        </div>
      </section>
    </main>
    ${footer()}`;
}

function faq(question, answer) {
  return `<div class="faq-item"><button class="faq-question"><span>${question}</span><span class="faq-plus">+</span></button><div class="faq-answer"><p>${answer}</p></div></div>`;
}

function footer() {
  return `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">${brand("#/")}<p>Solusi kartu NFC dan QR untuk membantu UMKM membangun reputasi serta profil digital yang mudah diakses.</p></div>
          <div><div class="footer-title">Produk</div><div class="footer-links"><a href="#/" data-scroll="manfaat">Manfaat</a><a href="#/" data-scroll="cara-kerja">Cara Kerja</a><a href="#/profil">Contoh Profil</a><a href="${whatsappUrl}" target="_blank">Beli Kartu</a></div></div>
          <div><div class="footer-title">Akun</div><div class="footer-links"><a href="#/login">Masuk</a><a href="#/aktivasi">Aktivasi Kartu</a><a href="#/login">Dashboard</a><a href="${whatsappUrl}" target="_blank">Bantuan</a></div></div>
        </div>
        <div class="footer-bottom"><span>© 2026 SPNB DIGITAL. Seluruh hak dilindungi.</span><span>Dibuat untuk pertumbuhan UMKM Indonesia.</span></div>
      </div>
    </footer>`;
}
