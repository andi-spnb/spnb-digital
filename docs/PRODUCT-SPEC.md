# SPNB DIGITAL — Spesifikasi Produk MVP

Dokumen ini menjadi acuan implementasi setelah prototype UI.

## 1. Peran pengguna

### Admin

- Membuat kartu satuan atau batch.
- Menghasilkan pasangan token QR dan NFC.
- Menandai proses QR dicetak dan NFC ditulis.
- Menugaskan stok kartu kepada reseller.
- Membuat dan menonaktifkan akun reseller.
- Melihat owner dan profil usaha.
- Membuat tautan reset password owner yang sekali pakai.
- Memblokir, mengganti, atau memensiunkan kartu.
- Melihat audit log dan statistik platform.

### Reseller

- Hanya melihat stok yang ditugaskan kepadanya.
- Menandai kartu `Terjual` tanpa memasukkan data pembeli.
- Membatalkan penjualan selama kartu belum diklaim.
- Melihat apakah kartu sudah aktif, tanpa melihat data pribadi owner.

### Owner

- Mendaftar dan login menggunakan nomor HP serta password.
- Memiliki beberapa profil usaha dan beberapa kartu.
- Menghubungkan beberapa kartu dengan satu profil usaha.
- Menentukan tujuan setiap kartu: Google Rating atau profil bisnis.
- Mengubah link, mode tujuan, slug, dan konten profil.
- Melihat statistik interaksi QR, NFC, dan tombol profil.

## 2. Siklus hidup kartu

Siklus stok dan kepemilikan dipisahkan dari status layanan.

```text
admin_stock
  → reseller_stock
  → sold_unclaimed
  → claimed
  → retired
```

Status layanan:

```text
enabled | suspended
```

Dengan pemisahan ini, kartu dapat berstatus `claimed + suspended` tanpa menciptakan status gabungan yang membingungkan.

## 3. Aturan QR dan NFC

- QR dan NFC mempunyai token berbeda.
- Kedua token menunjuk ke satu `card_id`.
- Token mentah menggunakan minimal 128 bit data acak.
- Database hanya menyimpan SHA-256 token.
- Setiap kartu hanya boleh mempunyai satu token QR aktif dan satu NFC aktif.
- Token mentah hanya tersedia saat pembuatan/ekspor produksi.
- Jika token harus dicetak ulang, token lama dicabut dan token baru dibuat.
- Serial kartu atau UUID tidak digunakan sebagai URL publik.

Contoh URL publik:

```text
https://domain.com/q/{raw-token-qr}
https://domain.com/n/{raw-token-nfc}
```

Tag NFC statis dan QR dapat disalin. Sistem database tidak dapat mencegah cloning fisik. Perlindungan anti-cloning membutuhkan chip NFC dinamis/kriptografis.

## 4. Aktivasi dan klaim kartu

“Scan pertama” didefinisikan sebagai **owner pertama yang sudah login dan menekan konfirmasi klaim**, bukan permintaan HTTP anonim pertama.

Alur:

1. Reseller menandai kartu sebagai `sold_unclaimed`.
2. Owner memindai QR.
3. Server memvalidasi token dan membuat claim session singkat.
4. Owner mendaftar atau login.
5. Owner membuat/memilih profil usaha.
6. Owner memilih tujuan kartu.
7. Owner menekan Aktifkan.
8. RPC `claim_sold_card` mengunci kartu dan melakukan conditional claim.
9. Hanya satu transaksi yang dapat berhasil.

Scan anonim tidak boleh langsung mengikat kartu agar link preview, crawler, atau bot tidak mengambil kepemilikan.

## 5. Tujuan kartu

### `direct_google`

```text
Tap / scan
→ event dicatat server
→ redirect sementara ke Google Rating
```

### `profile`

```text
Tap / scan
→ event dicatat server
→ halaman profil usaha
→ klik tombol dicatat server
→ redirect ke tujuan tombol
```

Redirect kartu harus menggunakan status sementara (`302`/`307`), karena owner dapat mengubah tujuan. Jangan gunakan redirect permanen untuk URL kartu.

Link Google harus HTTPS dan dibatasi ke host Google yang disetujui. Bila memungkinkan, simpan Google Place ID dan bangun URL review di server untuk mengurangi risiko open redirect.

## 6. Profil dan slug

- Satu owner dapat memiliki banyak profil usaha.
- Satu profil dapat digunakan oleh banyak kartu.
- Mode tujuan tetap disimpan per kartu.
- Slug bersifat unik secara global.
- Slug lama tidak pernah diberikan kepada usaha lain.
- Setelah slug diganti, alamat lama melakukan redirect permanen ke slug baru.
- Perubahan slug dilakukan melalui transaksi database.

## 7. Akun nomor HP tanpa OTP

Nomor HP berfungsi sebagai username dan **tidak dianggap terverifikasi**.

Pengamanan wajib:

- Nomor dinormalisasi ke E.164 sebelum registrasi.
- Password dikelola oleh Supabase Auth, bukan tabel aplikasi.
- Rate limiting pada login dan registrasi.
- CAPTCHA setelah perilaku mencurigakan.
- Pesan login generik agar akun tidak mudah dienumerasi.
- Admin diwajibkan memakai MFA.
- Nomor HP owner tidak dapat diganti sendiri.

Reset password:

1. Owner menghubungi admin.
2. Admin membuat reset capability acak.
3. Hanya hash capability yang disimpan.
4. Tautan berlaku 30 menit dan hanya sekali pakai.
5. Server mengganti password melalui Supabase Auth Admin API.
6. Seluruh session lama dicabut.
7. Tautan reset tidak ditulis ke audit log.

## 8. Privasi reseller

Reseller tidak mendapat akses langsung ke row kartu yang memiliki `owner_id` dan `business_id`. Reseller memakai RPC/view khusus yang hanya mengembalikan:

- ID dan serial kartu.
- Status stok/penjualan/aktivasi.
- Waktu alokasi, penjualan, dan aktivasi.

Nama, nomor HP, link Google, dan profil usaha owner tidak ditampilkan kepada reseller.

## 9. Statistik

Event yang disimpan:

- `qr_scan`
- `nfc_tap`
- `profile_view`
- `profile_link_click`

Event dibuat oleh redirect service/Edge Function, bukan insert anonim langsung ke database.

Data yang disimpan seminimal mungkin:

- Kartu dan profil terkait.
- Jenis event dan sumber QR/NFC.
- Mode tujuan saat event terjadi.
- Waktu.
- Request ID.
- Klasifikasi user agent.
- Hash IP dengan secret bila benar-benar diperlukan.
- Penanda kemungkinan bot.

Dashboard harus selalu menjelaskan bahwa klik Google bukan bukti ulasan benar-benar dikirim.

## 10. Audit log

Audit log bersifat append-only dan mencatat:

- Actor dan perannya.
- Tindakan.
- Entity yang berubah.
- Nilai sebelum/sesudah untuk field yang relevan.
- Request/idempotency ID.
- Waktu.

Tidak boleh menyimpan password, raw QR/NFC token, raw reset token, atau PII yang tidak diperlukan.

## 11. Operasi sensitif

Operasi berikut wajib menggunakan RPC transaction/Edge Function, bukan update tabel langsung:

- Membuat batch/token.
- Distribusi stok.
- Menandai dan membatalkan penjualan.
- Klaim kartu.
- Mengganti slug.
- Memindahkan kepemilikan.
- Mengganti kartu rusak/hilang.
- Memblokir kartu.
- Merotasi token.
- Reset password.

Semua operasi harus idempotent bila berpotensi dikirim ulang oleh jaringan atau tombol ganda.

## 12. Keputusan sebelum peluncuran

Hal berikut masih perlu ditetapkan sebelum production release:

1. Daftar host Google yang diterima untuk link rating/maps.
2. Kebijakan pindah kepemilikan kartu.
3. Kebijakan kartu hilang, rusak, dan penggantian token.
4. Batas dan retensi event analytics.
5. Provider CAPTCHA dan rate limiting.
6. Apakah admin wajib MFA sejak MVP.
7. Domain production dan struktur subdomain.
8. Isi paket fisik, harga, dan ketentuan layanan “aktif selamanya”.
