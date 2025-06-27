const express = require('express');
const multer = require('multer');
const { R2 } = require('./r2-client');
const router = express.Router();

// Configure multer for memory storage (for R2 upload)
const upload = multer({ storage: multer.memoryStorage() });

// API Key from environment variables
const API_KEY = process.env.API_KEY || 'your-api-key-change-this';

// Middleware to authenticate API key
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required', 
      message: 'Provide API key in X-API-Key header or Authorization: Bearer <key>' 
    });
  }
  
  if (apiKey !== API_KEY) {
    return res.status(401).json({ 
      error: 'Invalid API key' 
    });
  }
  
  next();
}

// POST /api/upload - Upload a file to R2 (API access)
router.post('/upload', authenticateApiKey, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'Please provide a file in the "file" field'
      });
    }
    
    // Validate file
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'Empty file uploaded' });
    }
    
    // Check file size (limit 25MB for Hobby Plan)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        error: 'File too large',
        message: `Maximum file size is ${maxSize / 1024 / 1024}MB`
      });
    }
    
    // Generate filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const filename = `${timestamp}-${originalName}`;
    
    // Upload to R2
    await R2.putObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });
    
    // Build file URLs
    const baseUrl = process.env.R2_PUBLIC_URL || '';
    const publicUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${filename}` : null;
    const downloadUrl = `/r2/download/${filename}`;
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: filename,
        originalName: originalName,
        key: filename,
        size: req.file.size,
        contentType: req.file.mimetype,
        publicUrl: publicUrl,
        downloadUrl: downloadUrl,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('API Upload error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Upload failed', 
      message: err.message 
    });
  }
});

// POST /api/upload-multiple - Upload multiple files to R2 (API access)
router.post('/upload-multiple', authenticateApiKey, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No files uploaded',
        message: 'Please provide files in the "files" field'
      });
    }
    
    const uploadResults = [];
    const errors = [];
    
    for (const file of req.files) {
      try {
        // Validate file
        if (!file.buffer || file.buffer.length === 0) {
          errors.push({ file: file.originalname, error: 'Empty file' });
          continue;
        }
        // Check file size (limit 25MB)
        const maxSize = 25 * 1024 * 1024;
        if (file.size > maxSize) {
          errors.push({ file: file.originalname, error: 'File too large' });
          continue;
        }
        // Generate filename with timestamp
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const filename = `${timestamp}-${randomSuffix}-${file.originalname}`;
        // Upload to R2
        await R2.putObject({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype,
        });
        // Build file URLs
        const baseUrl = process.env.R2_PUBLIC_URL || '';
        const publicUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${filename}` : null;
        const downloadUrl = `/r2/download/${filename}`;
        uploadResults.push({
          filename: filename,
          originalName: file.originalname,
          key: filename,
          size: file.size,
          contentType: file.mimetype,
          publicUrl: publicUrl,
          downloadUrl: downloadUrl,
          uploadedAt: new Date().toISOString()
        });
      } catch (uploadError) {
        errors.push({ 
          file: file.originalname, 
          error: uploadError.message 
        });
      }
    }
    
    res.json({
      success: uploadResults.length > 0,
      message: `${uploadResults.length} files uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      data: {
        uploaded: uploadResults,
        errors: errors,
        summary: {
          total: req.files.length,
          successful: uploadResults.length,
          failed: errors.length
        }
      }
    });
  } catch (err) {
    console.error('API Multiple upload error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Upload failed', 
      message: err.message 
    });
  }
});

// GET /api/files - List files (API access)
router.get('/files', authenticateApiKey, async (req, res) => {
  try {
    const Bucket = process.env.R2_BUCKET_NAME;
    if (!Bucket) {
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error: Bucket name is missing.' 
      });
    }

    const result = await R2.listObjects({ 
      Bucket,
      ContinuationToken: req.query.token || undefined,
      Prefix: req.query.prefix || '',
      MaxKeys: parseInt(req.query.limit, 10) || 100,
    });

    const baseUrl = process.env.R2_PUBLIC_URL || '';
    
    const files = (result.Contents || []).map(obj => ({
      key: obj.Key,
      filename: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      publicUrl: baseUrl ? `${baseUrl.replace(/\/$/, '')}/${obj.Key}` : null,
      downloadUrl: `/r2/download/${encodeURIComponent(obj.Key)}`
    }));
    
    res.json({
      success: true,
      data: {
        files,
        pagination: {
          nextToken: result.NextContinuationToken || null,
          isTruncated: result.IsTruncated || false,
          count: files.length
        }
      }
    });
  } catch (err) {
    console.error('API List files error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to list files', 
      message: err.message 
    });
  }
});

// DELETE /api/files/:key - Delete a file (API access)
router.delete('/files/:key', authenticateApiKey, async (req, res) => {
  try {
    const key = req.params.key;
    const Bucket = process.env.R2_BUCKET_NAME;
    
    // Check if file exists
    try {
      await R2.headObject({ Bucket, Key: key });
    } catch (err) {
      if (err.name === 'NotFound' || err.message.includes('not found')) {
        return res.status(404).json({ 
          success: false,
          error: 'File not found' 
        });
      }
      throw err;
    }
    
    // Delete the file
    await R2.deleteObject({ Bucket, Key: key });
    
    res.json({ 
      success: true,
      message: 'File deleted successfully',
      data: { key }
    });
  } catch (err) {
    console.error('API Delete error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete file',
      message: err.message
    });
  }
});

// GET /api/info - API information
router.get('/info', authenticateApiKey, (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'R2 File Manager API',
      version: '1.0.0',
      endpoints: {
        'POST /api/upload': 'Upload a single file',
        'POST /api/upload-multiple': 'Upload multiple files (max 5)',
        'GET /api/files': 'List all files with pagination',
        'DELETE /api/files/:key': 'Delete a file by key',
        'GET /api/info': 'API information'
      },
      authentication: 'API Key required in X-API-Key header or Authorization: Bearer <key>',
      maxFileSize: '25MB per file'
    }
  });
});

module.exports = router;
