# Arah UI SPNB DIGITAL

## Tujuan

Membuat produk yang terasa dirancang khusus untuk operasional kartu NFC/QR, bukan template SaaS atau landing page generik.

## Prinsip

1. **Utamakan fakta dan tugas.** Gunakan copy spesifik seperti “Tandai kartu terjual” daripada “Kelola bisnis dengan mudah”.
2. **Satu biru solid sebagai aksen.** Gradient bukan elemen utama identitas.
3. **Card hanya ketika dibutuhkan.** Data operasional menggunakan tabel, list, atau section dengan garis pemisah.
4. **Radius kecil dan konsisten.** 6–10px; pill hanya untuk status.
5. **Shadow hanya untuk layer.** Modal dan dropdown boleh memiliki shadow, panel biasa cukup border.
6. **Ikon SVG satu keluarga.** Hindari emoji dan karakter Unicode sebagai ikon antarmuka.
7. **Tidak membuat angka terlihat lebih pasti dari kenyataan.** Tulis “klik tombol Google”, bukan “ulasan diperoleh”.
8. **Setiap role berorientasi pekerjaan:**
   - Owner: status kartu dan tujuan aktif.
   - Reseller: stok yang perlu diproses.
   - Admin: exception queue dan operasional produksi.
9. **Data prototype harus ditandai.** Dashboard demo menampilkan label `Data demo`.
10. **Foto produk apa adanya.** Tidak dimiringkan, tidak dilapisi blob, dan tidak diberi floating badge dekoratif.

## Larangan visual

- Blob radial dan lingkaran dekoratif berulang.
- Glassmorphism.
- Gradient pada setiap tombol, ikon, dan cover.
- Enam kartu fitur identik hanya untuk mengisi halaman.
- Semua teks menggunakan bobot 800.
- CTA ganda dengan bobot yang sama.
- Grafik tanpa unit, konteks, atau penjelasan.
- Fake social proof dan kategori pill tanpa data nyata.
- Slogan seperti “lebih dari sekadar”, “solusi inovatif”, atau “membantu bisnis tumbuh” tanpa fakta pendukung.

## Komponen dasar

- Font: system UI (`Inter` bila tersedia, lalu Segoe UI).
- Body: 13–16px sesuai konteks.
- Border: abu-biru tipis.
- Primary: biru `#1769c2`.
- Text utama: `#172536`.
- Background aplikasi: `#f5f7f9`.
- Desktop content max-width: 1160px untuk public site dan 1440px untuk dashboard.

## Pemeriksaan sebelum merge

- Apakah komponen membantu tugas pengguna atau hanya dekorasi?
- Apakah sebuah panel bisa diganti garis pemisah sederhana?
- Apakah istilah yang digunakan sesuai data yang benar-benar tersedia?
- Apakah status dapat dipahami tanpa warna saja?
- Apakah halaman tetap nyaman pada lebar 360px?
- Apakah reseller melihat data pribadi yang tidak diperlukan?
- Apakah tindakan destruktif memakai konfirmasi dan menjelaskan akibatnya?
