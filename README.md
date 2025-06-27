# Cloudflare R2 File Service

Layanan pengunggahan file sederhana menggunakan Express.js dengan antarmuka pengguna modern berbasis Tailwind CSS, yang khusus menggunakan Cloudflare R2 untuk penyimpanan cloud. Dilengkapi dengan sistem autentikasi JWT yang aman.

## Fitur Utama
- **Autentikasi Aman**: Sistem login/logout dengan JWT access & refresh tokens
- **Unggah file**: Drag & drop atau pemilihan file dengan progress bar
- **Manajemen File**: Tampilkan, unduh, dan hapus file dengan pagination
- **Sharing**: Buat URL publik dan temporary URL untuk berbagi file
- **UI Modern**: Antarmuka responsif dengan Tailwind CSS dan Font Awesome
- **Security**: HTTP-only cookies, token refresh otomatis

## Cara Setup

### 1. Instal dependensi
```bash
npm install
```

### 2. Variabel Lingkungan
Buat file `.env` di root proyek dengan variabel berikut:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Cloudflare R2 Configuration
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-public-bucket-url.r2.dev

# Authentication Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key-change-this-in-production
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-change-this-in-production
```

### 3. Jalankan server
```bash
npm start
```

Aplikasi akan berjalan di port 3000 secara default.

## Authentication

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

### Security Features
- JWT Access Token (15 menit)
- JWT Refresh Token (7 hari)
- HTTP-only cookies untuk keamanan
- Automatic token refresh
- Protected routes

### Login Process
1. Akses `http://localhost:3000` (akan redirect ke login)
2. Masukkan username dan password
3. Setelah login berhasil, akan redirect ke dashboard file manager

## API Endpoints

### Authentication Routes
```
POST /auth/login     - Login dengan username/password
POST /auth/logout    - Logout dan clear cookies
POST /auth/refresh   - Refresh access token
GET  /auth/status    - Check authentication status
```

### Protected File Routes (Requires Authentication)
```
POST   /r2/upload              - Upload file
GET    /r2/files               - List files with pagination
GET    /r2/download/:key       - Download file
GET    /r2/presigned/:key      - Get temporary URL
DELETE /r2/files/:key          - Delete file
```

### Public API Routes (Requires API Key)
```
POST   /api/upload             - Upload single file
POST   /api/upload-multiple    - Upload multiple files (max 10)
GET    /api/files              - List files with pagination
DELETE /api/files/:key         - Delete file
GET    /api/info               - API information
```

## API Integration

### API Authentication
API menggunakan API Key untuk autentikasi. Sertakan API key dalam header:

```bash
# Option 1: X-API-Key header
curl -H "X-API-Key: your-api-key" \
     -X POST \
     http://localhost:3000/api/upload

# Option 2: Authorization Bearer
curl -H "Authorization: Bearer your-api-key" \
     -X POST \
     http://localhost:3000/api/upload
```

### Upload File via API
```bash
# Single file upload
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -F "file=@/path/to/your/file.jpg" \
  http://localhost:3000/api/upload

# Multiple files upload
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.png" \
  http://localhost:3000/api/upload-multiple
```

### API Documentation
Akses dokumentasi API lengkap di: `http://localhost:3000/api-docs.html` (setelah login)
## Frontend Features

Frontend dapat diakses di `http://localhost:3000` dan menyediakan:

### Dashboard File Manager
- **Responsive Design**: Bekerja optimal di desktop dan mobile
- **Drag & Drop Upload**: Upload multiple files sekaligus
- **File Filtering**: Filter berdasarkan tipe file (gambar, dokumen, audio, video, archive)
- **Search**: Pencarian file berdasarkan nama
- **Pagination**: Load more untuk performa optimal
- **Image Preview**: Preview gambar dengan zoom in/out

### File Operations
- **Public URL**: Copy direct link ke file
- **Temporary URL**: Generate presigned URL (24 jam)
- **Download**: Download file langsung
- **Delete**: Hapus file dengan konfirmasi

### Security UI
- **Login Page**: Modern login interface
- **Auto Logout**: Otomatis logout saat session expired
- **Toast Notifications**: Feedback untuk semua operasi

## Struktur Aplikasi
```
file-service/
├── .env.example              # Template konfigurasi
├── package.json              # Dependencies
├── README.md                 # Dokumentasi
├── src/
│   ├── app.js                # Main Express server
│   ├── auth-routes.js        # Authentication endpoints
│   ├── auth-middleware.js    # JWT middleware
│   ├── r2-client.js          # R2 client configuration
│   └── r2-routes.js          # Protected file operations
└── frontend/
    ├── index.html            # Main file manager UI
    └── login.html            # Login page
```

## Security Notes

### Production Deployment
1. **Change default credentials** di environment variables
2. **Set strong JWT secrets** (minimal 32 karakter)
3. **Enable HTTPS** untuk production
4. **Set NODE_ENV=production**
5. **Configure proper CORS origins**

### Environment Variables untuk Production
```env
NODE_ENV=production
ADMIN_USERNAME=your_secure_username
ADMIN_PASSWORD=your_strong_password
ACCESS_TOKEN_SECRET=very-long-random-string-for-access-tokens
REFRESH_TOKEN_SECRET=different-very-long-random-string-for-refresh-tokens
```

## Deployment ke Vercel

### Langkah Deployment

1. **Push ke GitHub repository**
2. **Connect ke Vercel**:
   - Login ke [vercel.com](https://vercel.com)
   - Import project dari GitHub
   - Pilih repository ini

3. **Set Environment Variables di Vercel**:
   ```
   R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_access_key_id
   R2_SECRET_ACCESS_KEY=your_secret_access_key
   R2_BUCKET_NAME=your_bucket_name
   R2_PUBLIC_URL=https://your-public-bucket-url.r2.dev
   
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_secure_password
   ACCESS_TOKEN_SECRET=your-super-secret-access-token-key
   REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key
   API_KEY=your-api-key-for-external-access
   ```

4. **Deploy**: Vercel akan otomatis deploy project

### Struktur Serverless
```
file-service/
├── api/                      # Vercel serverless functions
│   ├── utils.js              # Shared utilities
│   ├── r2-client.js          # R2 client for serverless
│   ├── auth/                 # Authentication endpoints
│   │   ├── login.js          # POST /api/auth/login
│   │   ├── logout.js         # POST /api/auth/logout
│   │   ├── refresh.js        # POST /api/auth/refresh
│   │   └── status.js         # GET /api/auth/status
│   ├── r2/                   # UI file operations (cookie auth)
│   │   ├── upload.js         # POST /api/r2/upload
│   │   ├── files.js          # GET /api/r2/files
│   │   ├── files/[key].js    # DELETE /api/r2/files/:key
│   │   ├── download/[key].js # GET /api/r2/download/:key
│   │   └── presigned/[key].js # GET /api/r2/presigned/:key
│   ├── upload.js             # POST /api/upload (API key auth)
│   ├── upload-multiple.js    # POST /api/upload-multiple
│   ├── files.js              # GET /api/files (API key auth)
│   ├── files/[key].js        # DELETE /api/files/:key
│   └── info.js               # GET /api/info
├── frontend/                 # Static files
│   ├── index.html            # Main UI
│   ├── login.html            # Login page
│   └── api-docs.html         # API documentation
└── vercel.json               # Vercel configuration
```

### Testing Local Development
```bash
# Install Vercel CLI
npm i -g vercel

# Run local development server
vercel dev

# Access at http://localhost:3000
```

## Teknologi yang Digunakan
- **Backend**: Vercel Serverless Functions, JWT, bcryptjs
- **Frontend**: Vanilla JavaScript, Tailwind CSS, Font Awesome
- **Storage**: Cloudflare R2 (S3-compatible)
- **Security**: HTTP-only cookies, CORS, JWT refresh mechanism
- **Deployment**: Vercel (Full-stack serverless)
