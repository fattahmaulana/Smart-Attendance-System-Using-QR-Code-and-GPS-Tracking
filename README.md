# Sistem Monitoring Kehadiran Siswa (QR Code & Geolocation)

Aplikasi web fullstack berskala enterprise untuk sistem presensi siswa menggunakan QR Code dinamis dan validasi geolokasi (Haversine formula).

## Fitur Utama
- **Admin Dashboard**: Generate QR Code dinamis yang otomatis refresh setiap 1 menit. Menampilkan statistik dan riwayat presensi secara real-time.
- **Scan Siswa**: Halaman mobile-optimized untuk siswa melakukan presensi dengan memasukkan NIS dan men-scan QR Code.
- **Validasi Geolokasi**: Menggunakan formula Haversine untuk memastikan siswa berada dalam radius 50 meter dari sekolah.
- **Keamanan**: QR Code menggunakan token unik yang kedaluwarsa dalam 1 menit. Rute admin dilindungi dengan JWT Authentication (HTTP-only cookies).

## Teknologi
- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI (Custom), Sonner (Toasts), Lucide Icons.
- **Backend**: Express.js (terintegrasi dengan Vite middleware).
- **Database**: SQLite (dapat dengan mudah diubah ke MySQL) menggunakan Prisma ORM.

## Cara Setup & Menjalankan Lokal

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   Buat file `.env` di root direktori dan tambahkan:
   ```env
   JWT_SECRET="super-secret-jwt-key-for-dev"
   ```

3. **Migrasi Database**
   Jalankan perintah berikut untuk membuat database SQLite dan men-generate Prisma Client:
   ```bash
   npx prisma db push
   ```

4. **Jalankan Development Server**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

## Penggunaan
- Buka `http://localhost:3000/login` untuk masuk ke Dashboard Admin.
- Gunakan kredensial default:
  - **Username**: `admin`
  - **Password**: `admin123`
- Buka `http://localhost:3000/scan` di perangkat mobile (atau tab lain) untuk simulasi scan QR Code sebagai siswa.

## Catatan untuk Production (MySQL)
Untuk menggunakan MySQL di production:
1. Ubah `provider = "sqlite"` menjadi `provider = "mysql"` di `prisma/schema.prisma`.
2. Tambahkan `DATABASE_URL="mysql://user:password@localhost:3306/dbname"` di `.env`.
3. Jalankan `npx prisma migrate dev` untuk membuat tabel di MySQL.
