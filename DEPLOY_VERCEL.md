# 🚀 Panduan Deploy ke Vercel - 3D Photo Gallery

Ikuti langkah-langkah di bawah ini untuk mengonlinekan galeri 3D Anda di Vercel agar bisa diakses oleh siapa saja.

## 1. Persiapan File
Pastikan struktur file Anda sudah benar seperti ini:
- `server.js` (Server Node.js)
- `script.js` (Logika 3D)
- `index.html`
- `styles.css`
- `package.json`
- `musik.mp3` (Pastikan file musik ada di sini)
- `.gitignore` (Pastikan berisi `node_modules` dan `.env`)

## 2. Push ke GitHub
1. Buat repository baru di GitHub.
2. Commit dan Push kode Anda ke repository tersebut.
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin [URL_REPO_GITHUB_ANDA]
   git push -u origin main
   ```

## 3. Import ke Vercel
1. Buka [Vercel Dashboard](https://vercel.com/).
2. Klik **"Add New"** > **"Project"**.
3. Pilih repository GitHub yang baru saja Anda buat.
4. Pada bagian **Build and Output Settings**, biarkan default.

## 4. Konfigurasi Environment Variables (PENTING)
Agar gambar dari Google Drive muncul, Anda harus memasukkan daftar link ke Vercel:
1. Di halaman konfigurasi Vercel, cari menu **"Environment Variables"**.
2. Masukkan Variable pertama:
   - **Key:** `PHOTO_URLS`
   - **Value:** [Buka file `.env` Anda, COPY seluruh teks yang ada di dalam tanda kurung `[...]`, lalu PASTE di sini]
3. Masukkan Variable kedua (Opsional):
   - **Key:** `PORT`
   - **Value:** `3000`
4. Klik **"Add"**.

## 5. Konfigurasi Khusus Vercel (`vercel.json`)
Karena project ini menggunakan Express.js, Vercel butuh file konfigurasi agar API `/api/photos` dan `/api/proxy-image` berjalan lancar. 

**Saya telah membuatkan file `vercel.json` untuk Anda secara otomatis.**

## 6. Selesai!
Klik **"Deploy"**. Setelah selesai, Vercel akan memberikan link domain (contoh: `my-gallery.vercel.app`).

---

### ⚠️ Masalah Umum & Solusi:

**1. Gambar tidak muncul (CORS Error):**
- Pastikan Anda sudah memasukkan `PHOTO_URLS` di dashboard Vercel.
- Pastikan file Google Drive Anda sudah diatur ke **"Anyone with the link"**.

**2. Musik tidak berputar:**
- File musik harus bernama tepat `musik.mp3` (huruf kecil semua).
- Pastikan file tersebut sudah ikut ter-upload ke GitHub.

**3. Teks 3D tidak muncul:**
- Teks 3D membutuhkan waktu 1-2 detik untuk memuat font dari internet saat pertama kali dibuka.
