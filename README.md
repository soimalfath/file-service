# File Service

This is a simple Express.js file upload service that saves uploaded files to a Cloudflare R2 bucket using the AWS SDK.

## Features
- Upload files via `/upload` endpoint
- Files are saved in the root of the R2 bucket with a unique filename
- Uses Multer for handling file uploads

## Setup

### 1. Install dependencies
```
npm install
```

### 2. Environment Variables
Create a `.env` file in the project root with the following variables:
```
R2_ENDPOINT=<your_r2_endpoint>
R2_ACCESS_KEY_ID=<your_access_key_id>
R2_SECRET_ACCESS_KEY=<your_secret_access_key>
R2_BUCKET_NAME=<your_bucket_name>
PORT=3000 # or any port you prefer
```

### 3. Start the server
```
npm start
```

## Usage
Send a POST request to `/upload` with a file field named `file`.

Example using `curl`:
```
curl -F "file=@path/to/your/file.txt" http://localhost:3000/upload
```

## List Files Endpoint

You can list all files in the bucket (with pagination) using:

```
GET /upload/files?limit=20&token=NEXT_TOKEN
```
- `limit` (optional): Number of files per page (default 20)
- `token` (optional): Continuation token for pagination (from previous response)

Example response:
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
