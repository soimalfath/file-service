const Busboy = require('busboy');
const { 
  authenticateApiKey, 
  handleCors, 
  errorResponse, 
  successResponse 
} = require('./utils');
const { putObject } = require('./r2-client');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    // Authenticate API key
    authenticateApiKey(req);
    
    // Parse multipart form with busboy (lighter than formidable)
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
      return errorResponse(res, 400, 'No file uploaded', 'Please provide a file in the "file" field');
    }
    
    // Generate filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const originalName = fileData.filename || 'unknown';
    const filename = `${timestamp}-${originalName}`;
    
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
    const downloadUrl = `/r2/download/${filename}`;
    
    return successResponse(res, {
      filename: filename,
      originalName: originalName,
      key: filename,
      size: fileData.size,
      contentType: fileData.mimetype || 'application/octet-stream',
      publicUrl: publicUrl,
      downloadUrl: downloadUrl,
      uploadedAt: new Date().toISOString()
    }, 'File uploaded successfully');
    
  } catch (error) {
    console.error('API Upload error:', error);
    if (error.message.includes('API key')) {
      return errorResponse(res, 401, error.message);
    }
    return errorResponse(res, 500, 'Upload failed', error.message);
  }
}
