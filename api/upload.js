const formidable = require('formidable');
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
    
    // Parse form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 1
    });
    
    const [fields, files] = await form.parse(req);
    
    if (!files.file || files.file.length === 0) {
      return errorResponse(res, 400, 'No file uploaded', 'Please provide a file in the "file" field');
    }
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    // Validate file
    if (!file.size || file.size === 0) {
      return errorResponse(res, 400, 'Empty file uploaded');
    }
    
    // Generate filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const originalName = file.originalFilename || file.name || 'unknown';
    const filename = `${timestamp}-${originalName}`;
    
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
    const downloadUrl = `/r2/download/${filename}`;
    
    return successResponse(res, {
      filename: filename,
      originalName: originalName,
      key: filename,
      size: file.size,
      contentType: file.mimetype || 'application/octet-stream',
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
