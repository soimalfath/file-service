const Busboy = require('busboy');
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
    
    // Parse multipart form with busboy
    const busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB for Hobby Plan
        files: 1
      }
    });
    
    let fileData = null;
    let uploadError = null;
    
    const parsePromise = new Promise((resolve, reject) => {
      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (fieldname !== 'file') {
          file.resume();
          return;
        }
        
        const chunks = [];
        
        file.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        file.on('end', () => {
          const buffer = Buffer.concat(chunks);
          
          if (buffer.length === 0) {
            uploadError = 'Empty file uploaded';
            return;
          }
          
          fileData = {
            filename: filename,
            buffer: buffer,
            mimetype: mimetype,
            size: buffer.length
          };
        });
        
        file.on('error', (err) => {
          uploadError = err.message;
        });
      });
      
      busboy.on('finish', () => {
        resolve();
      });
      
      busboy.on('error', (err) => {
        reject(err);
      });
    });
    
    req.pipe(busboy);
    await parsePromise;
    
    if (uploadError) {
      return errorResponse(res, 400, uploadError);
    }
    
    if (!fileData) {
      return errorResponse(res, 400, 'No file uploaded');
    }
    
    // Keep original name for UI uploads
    const filename = fileData.filename || 'unknown';
    
    // Upload to R2
    await putObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: fileData.buffer,
      ContentType: fileData.mimetype || 'application/octet-stream',
    });
    
    // Build file URLs
    const baseUrl = process.env.R2_PUBLIC_URL || '';
    const publicUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${filename}` : null;
    
    return res.json({
      message: 'File uploaded successfully',
      filename: filename,
      key: filename,
      size: fileData.size,
      contentType: fileData.mimetype || 'application/octet-stream',
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
