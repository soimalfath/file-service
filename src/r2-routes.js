const express = require('express');
const multer = require('multer');
const { R2 } = require('./r2-client');
const router = express.Router();

// Configure multer for memory storage (for R2 upload)
const upload = multer({ storage: multer.memoryStorage() });

// POST /r2/upload - Upload a file to R2
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Validate file
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'Empty file uploaded' });
    }
    
    // Generate a unique filename
		const name = req.file.originalname;
    
    // Upload to R2
    const uploadResult = await R2.putObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: name,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });
    
    // Build file URL (using R2 public endpoint if available)
    const baseUrl = process.env.R2_PUBLIC_URL || '';
    const fileUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${name}` : null;
    
    res.json({
      message: 'File uploaded successfully',
      filename: name,
      key: name,
      size: req.file.size,
      contentType: req.file.mimetype,
      url: fileUrl,
      downloadUrl: `/r2/download/${name}`
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: err.message 
    });
  }
});

// GET /r2/files - List all files in R2
router.get('/files', async (req, res) => {
  try {
    const Bucket = process.env.R2_BUCKET_NAME;
    if (!Bucket) {
        console.error("R2_BUCKET_NAME environment variable is not set.");
        return res.status(500).json({ error: 'Server configuration error: Bucket name is missing.' });
    }
    const result = await R2.listObjects({ 
      Bucket,
			ContinuationToken: req.query.token || undefined,
			Prefix: req.query.prefix || '', // Uncomment if you want to filter by prefix
      MaxKeys: parseInt(req.query.limit, 10) || 100, // Anda bisa atur limit per halaman
    });



    const baseUrl = process.env.R2_PUBLIC_URL || '';
    
    const files = (result.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      // URL publik langsung menunjuk ke key
      url: baseUrl ? `${baseUrl.replace(/\/$/, '')}/${obj.Key}` : null,
      downloadUrl: `/r2/download/${encodeURIComponent(obj.Key)}`
    }));
    
    // Mengirim kembali token ke klien agar bisa meminta halaman selanjutnya
    res.json({
      files,
      nextToken: result.NextContinuationToken || null,
      isTruncated: result.IsTruncated || false
    });
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: 'Failed to list files', details: err.message });
  }
});

// GET /r2/download/:key - Download a file from R2
router.get('/download/:key', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const Bucket = process.env.R2_BUCKET_NAME;
    
    // Check if file exists
    const headResult = await R2.headObject({ Bucket, Key: key });
    if (!headResult) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get the file from R2
    const result = await R2.getObject({ Bucket, Key: key });
    
    // Extract original filename (remove UUID prefix if present)
    const originalName = key.includes('-') ? key.split('-').slice(1).join('-') : key;
    
    // Set appropriate headers
    res.setHeader('Content-Type', headResult.ContentType || result.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    if (headResult.ContentLength || result.ContentLength) {
      res.setHeader('Content-Length', headResult.ContentLength || result.ContentLength);
    }
    
    // Handle both stream and buffer responses
    if (result.Body && typeof result.Body.pipe === 'function') {
      // Stream the file to the response
      result.Body.pipe(res);
    } else if (result.Body) {
      // Handle buffer or other response types
      const chunks = [];
      for await (const chunk of result.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      res.send(buffer);
    } else {
      throw new Error('No file content received');
    }
  } catch (err) {
    console.error('Download error:', err);
    if (err.name === 'NoSuchKey' || err.message.includes('not found')) {
      res.status(404).json({ error: 'File not found' });
    } else {
      res.status(500).json({ error: 'Failed to download file: ' + err.message });
    }
  }
});

// GET /r2/presigned/:key - Get a presigned URL for a file
router.get('/presigned/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const Bucket = process.env.R2_BUCKET_NAME;
    
    // Check if file exists
    const headResult = await R2.headObject({ Bucket, Key: key });
    if (!headResult) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Generate presigned URL (default: 1 hour)
    const expiresIn = parseInt(req.query.expires, 10) || 3600;
    const url = await R2.getPresignedUrl({ 
      Bucket, 
      Key: key,
      expiresIn
    });
    
    res.json({
      url,
      expiresIn
    });
  } catch (err) {
    console.error('Presigned URL error:', err);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

// DELETE /r2/files/:key - Delete a file from R2
router.delete('/files/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const Bucket = process.env.R2_BUCKET_NAME;
    
    // Check if file exists
    const headResult = await R2.headObject({ Bucket, Key: key });
    if (!headResult) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Delete the file
    await R2.deleteObject({ Bucket, Key: key });
    
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
