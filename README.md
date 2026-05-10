# 3D Photo Gallery with Google Drive Backend

## Setup

1. Salin `.env.example` menjadi `.env`
2. Isi `PHOTO_URLS` jika ingin menyimpan link foto langsung di environment
3. Jalankan:

```bash
npm install
npm start
```

## Cara kerja

- `server.js` menyediakan endpoint `GET /api/photos`
- Endpoint membaca `PHOTO_URLS` dari `.env`
- `script.js` memanggil endpoint dan membuat frame foto secara dinamis

## Catatan penting

- `PHOTO_URLS` bisa berisi link gambar langsung
- File publik tidak perlu menyimpan daftar URL foto jika `PHOTO_URLS` disimpan di `.env`
- Jika `/api/photos` kosong, script akan mencoba `/photos.json`
- Jika tidak ada kedua sumber tersebut, script akan menggunakan foto lokal dari `photos/`

## Foto tersimpan di environment

Jika kamu ingin agar daftar foto tidak terlihat di file publik, kamu bisa menggunakan `PHOTO_URLS` di `.env`.

Contoh isi `.env`:

```ini
PHOTO_URLS=["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
```

Atau gunakan format baris baru / koma:

```ini
PHOTO_URLS=https://example.com/photo1.jpg,https://example.com/photo2.jpg
```

Ketika `PHOTO_URLS` terpasang, server akan mengembalikan daftar foto dari environment tanpa perlu Google Drive API.

## Alternatif statis dengan `photos.json`

Jika tidak ingin menggunakan Google Cloud API, kamu bisa memakai file `photos.json`.

- Buat file `photos.json` di folder proyek.
- Isi dengan array URL gambar publik:

```json
{
  "photos": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ]
}
```

- `script.js` akan mencoba ambil foto dari `/photos.json` terlebih dahulu.
- Jika tidak tersedia, sistem akan menggunakan fallback lokal `photos/photo1.jpg` sampai `photos/photo48.jpg`.

### Hosting statis

Dengan GitHub Pages atau Netlify, cukup deploy semua file proyek dan pastikan `photos.json` ikut terdeploy.
