# SPNB DIGITAL - Production Setup Guide

## Persiapan Database Supabase

### 1. Jalankan Migrations
Jalankan file SQL berikut secara berurutan di Supabase SQL Editor:

```
1. supabase/migrations/202610120001_initial_schema.sql
2. supabase/migrations/202610130001_public_profile_access.sql
3. supabase/migrations/202610130002_storage_bucket.sql
```

### 2. Setup Demo Users (Opsional)
Untuk testing, jalankan seed data:
```
supabase/seed-complete.sql
```

Ini akan membuat 3 akun demo:
- **Admin**: admin@spnb.id / Admin123!
- **Reseller**: reseller@spnb.id / Reseller123!
- **Owner**: owner@spnb.id / Owner123!

### 3. Deploy Edge Functions
Deploy edge functions untuk token handling:

```bash
cd supabase
supabase functions deploy validate-card-token
supabase functions deploy resolve-card-token
```

## Konfigurasi Environment

### supabase-config.js
Pastikan file `supabase-config.js` berisi kredensial yang benar:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

## Fitur yang Tersedia

### Untuk Owner:
- ✅ Dashboard dengan statistik real-time
- ✅ Kelola kartu (ubah tujuan: Google Rating / Profil)
- ✅ Edit profil usaha (nama, deskripsi, alamat, logo, banner)
- ✅ Lihat statistik interaksi (QR scan, NFC tap, klik)
- ✅ Notifikasi aktivitas
- ✅ Export data ke CSV

### Untuk Reseller:
- ✅ Lihat inventory kartu yang dialokasikan
- ✅ Tandai kartu sebagai terjual
- ✅ Batalkan penjualan (sebelum kartu diklaim)
- ✅ Lihat statistik penjualan
- ✅ Export laporan penjualan

### Untuk Admin:
- ✅ Dashboard overview platform
- ✅ Buat batch kartu baru
- ✅ Distribusikan kartu ke reseller
- ✅ Kelola reseller (tambah, lihat)
- ✅ Lihat semua owner dan kartu
- ✅ Statistik platform keseluruhan
- ✅ Audit log aktivitas
- ✅ Export berbagai laporan

### Halaman Publik:
- ✅ Landing page dengan informasi produk
- ✅ Halaman profil bisnis dinamis (/p/{slug})
- ✅ Tracking interaksi (QR scan, NFC tap, klik tombol)
- ✅ Flow aktivasi kartu baru

## Alur Kerja Kartu

```
1. Admin membuat batch kartu
   └── Status: admin_stock

2. Admin distribusi ke Reseller
   └── Status: reseller_stock

3. Reseller tandai terjual
   └── Status: sold_unclaimed

4. Pembeli scan QR dan aktivasi
   └── Status: claimed (aktif)
```

## Troubleshooting

### Koneksi Database Gagal
- Periksa SUPABASE_URL dan SUPABASE_ANON_KEY
- Pastikan RLS policies sudah disetup dengan benar
- Cek network/firewall

### Login Gagal
- Pastikan user sudah dibuat di Authentication > Users
- Jalankan seed-complete.sql untuk demo users
- Periksa email confirmation settings

### Edge Functions Error
- Deploy ulang edge functions
- Periksa SUPABASE_SERVICE_ROLE_KEY di function settings
- Cek logs di Supabase Dashboard > Edge Functions

## Deployment ke Vercel

1. Push ke GitHub repository
2. Connect repository di Vercel
3. Set environment variables jika diperlukan
4. Deploy

File `vercel.json` sudah dikonfigurasi untuk SPA routing.
