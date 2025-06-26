# Cloudflare R2 File Service

Layanan pengunggahan file sederhana menggunakan Express.js dengan antarmuka pengguna modern berbasis Tailwind CSS, yang khusus menggunakan Cloudflare R2 untuk penyimpanan cloud.

## Fitur Utama
- Unggah file dengan drag & drop atau pemilihan file
- Tampilkan daftar semua file yang diunggah dengan pagination
- Unduh file langsung dari Cloudflare R2
- Lihat file melalui URL publik R2 (jika dikonfigurasi)
- Hapus file dari penyimpanan R2
- Buat URL presigned untuk berbagi file sementara
- Antarmuka pengguna modern dengan Tailwind CSS
- CORS diaktifkan untuk permintaan lintas domain

## Cara Setup

### 1. Instal dependensi
```
npm install
```

### 2. Variabel Lingkungan
Buat file `.env` di root proyek dengan variabel berikut:
```
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-public-bucket-url.r2.dev (opsional)
PORT=3000
```

### 3. Jalankan server
```
npm start
```

Aplikasi akan berjalan di port 3000 secara default, atau Anda dapat mengatur port kustom dengan variabel lingkungan PORT.

## API Endpoints

### Unggah file
```
POST /r2/upload
```
Request: `multipart/form-data` dengan field file bernama `file`

### Daftar semua file
```
GET /r2/files
```
Response: JSON dengan array files, token pagination, dan status truncation

### Unduh file
```
GET /r2/download/:key
```
Response: File untuk diunduh

### Dapatkan URL presigned (akses sementara)
```
GET /r2/presigned/:key
```
Response: JSON dengan URL sementara dan waktu kedaluwarsa

### Hapus file
```
DELETE /r2/files/:key
```
Response: Pesan sukses

## Frontend

Frontend dapat diakses di `http://localhost:3000` dan menyediakan antarmuka yang user-friendly untuk:
- Mengunggah file dengan dukungan drag & drop
- Melihat semua file yang diunggah dengan pagination
- Mengunduh file
- Melihat file secara langsung (jika URL publik R2 dikonfigurasi)
- Membuat link akses sementara (URL presigned)
- Menghapus file

## Struktur Aplikasi
```
file-service/
├── .env.example          # Contoh konfigurasi lingkungan
├── package.json          # Dependensi dan script npm
├── README.md             # Dokumentasi
├── src/
│   ├── app.js            # File utama Express server
│   ├── r2-client.js      # Konfigurasi dan fungsi client Cloudflare R2
│   └── r2-routes.js      # Router API untuk operasi CRUD R2
└── frontend/
    ├── index.html        # Halaman redirect ke R2 UI
    └── index.r2.html     # Antarmuka pengguna untuk R2
```

## Teknologi
- Express.js - Framework backend
- Multer - Penanganan upload file
- AWS SDK v3 - Interaksi dengan Cloudflare R2
- Tailwind CSS - Styling frontend
```json
{
  "files": [
    { "filename": "...", "url": "..." },
    { "filename": "...", "url": "..." }
  ],
  "nextToken": "...",
  "isTruncated": true
}
```

- Use `nextToken` for the next page if `isTruncated` is true.

## Usage Example (List Files)
```
curl "http://localhost:3000/upload/files?limit=10"
```

## Folder Structure

Recommended structure for maintainability:

```
file-service/
├── src/
│   ├── app.js           # Main Express app
│   ├── upload.js        # Express router for uploads
│   └── r2-client.js     # R2 client logic
├── .env                 # Environment variables
├── package.json         # NPM dependencies
├── README.md            # Project documentation
```

- Place all source code in the `src/` directory for better organization.
- Keep configuration and documentation files in the project root.

## File Descriptions
- `src/app.js`: Main Express app, imports and uses the upload router
- `src/upload.js`: Express router for handling file uploads, Multer middleware, and R2 upload logic
- `src/r2-client.js`: R2 client using AWS SDK v3

## Notes
- Make sure your R2 credentials and bucket are set up correctly.
- Uploaded files are saved with a unique filename to avoid collisions.
