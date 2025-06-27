const formidable = require('formidable');
const { 
  authenticateToken, 
  handleCors, 
  errorResponse, 
  successResponse,
  setCookie 
} = require('../utils');
const { putObject } = require('../r2-client');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    // Authenticate token from cookies
    const { user, newAccessToken } = authenticateToken(req);
    
    // Set new access token if refreshed
    if (newAccessToken) {
      const accessCookie = setCookie('accessToken', newAccessToken, {
        maxAge: 15 * 60 // 15 minutes
      });
      res.setHeader('Set-Cookie', accessCookie);
    }
    
    // Parse form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 1
    });
    
    const [fields, files] = await form.parse(req);
    
    if (!files.file || files.file.length === 0) {
      return errorResponse(res, 400, 'No file uploaded');
    }
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    // Validate file
    if (!file.size || file.size === 0) {
      return errorResponse(res, 400, 'Empty file uploaded');
    }
    
    // Generate filename with timestamp
    const originalName = file.originalFilename || file.name || 'unknown';
    const filename = originalName; // Keep original name for UI uploads
    
    // Read file buffer
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(file.filepath);
    
    // Upload to R2
    await putObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: fileBuffer,
      ContentType: file.mimetype || 'application/octet-stream',
    });
    
    // Build file URLs
    const baseUrl = process.env.R2_PUBLIC_URL || '';
    const publicUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${filename}` : null;
    
    return res.json({
      message: 'File uploaded successfully',
      filename: filename,
      key: filename,
      size: file.size,
      contentType: file.mimetype || 'application/octet-stream',
      url: publicUrl,
      downloadUrl: `/r2/download/${filename}`
    });
    
  } catch (error) {
    console.error('R2 Upload error:', error);
    if (error.message.includes('token')) {
      return errorResponse(res, 401, error.message);
    }
    return errorResponse(res, 500, 'Upload failed', error.message);
  }
}
