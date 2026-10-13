# Prototype SPNB DIGITAL

Prototype interaktif kartu Google Review berbasis NFC dan QR dengan kombinasi warna biru–putih.

## Menjalankan

Cara paling sederhana: buka `index.html` di browser.

Atau jalankan server lokal dari folder ini:

```powershell
python -m http.server 8080
```

Kemudian buka `http://localhost:8080`.

## Halaman demo

- `#/` — Homepage pemasaran
- `#/aktivasi` — Alur aktivasi kartu empat langkah
- `#/profil` — Contoh halaman profil bisnis
- `#/login` — Pemilih demo akun
- `#/owner` — Dashboard owner
- `#/reseller` — Dashboard reseller
- `#/admin` — Dashboard admin

## Interaksi yang tersedia

- Wizard aktivasi kartu
- Pilihan tujuan Google Rating atau profil bisnis
- Perubahan status kartu oleh reseller
- Modal pembuatan batch kartu
- Modal pembuatan reseller
- Pembuatan tautan reset owner
- Navigasi seluruh dashboard
- Tampilan responsif desktop dan ponsel
- Tombol pembelian ke WhatsApp `0895386763040`

## Fondasi tahap berikutnya

- `styles-v2.css` — perombakan visual agar lebih restrained dan tidak terasa seperti template AI/SaaS generik.
- `docs/UI-DIRECTION.md` — aturan desain yang harus dipertahankan selama pengembangan.
- `docs/PRODUCT-SPEC.md` — aturan bisnis, keamanan, privasi, dan workflow MVP.
- `supabase/migrations/202610120001_initial_schema.sql` — rancangan PostgreSQL/Supabase awal beserta RLS dan RPC transaksi penting.

## Catatan

Frontend masih menggunakan data simulasi. Skema database sudah disiapkan, tetapi belum diterapkan ke proyek Supabase karena kredensial dan environment production belum tersedia. Autentikasi nyata, redirect service, QR/NFC production, penyimpanan event, upload gambar, dan reset password melalui Admin API masih harus dihubungkan.
