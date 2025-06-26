const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { R2 } = require('./r2-client'); // Assumes you have an R2 client setup in r2-client.js

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /upload
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Generate a unique filename
    const uniqueName = `${crypto.randomUUID()}_${req.file.originalname}`;

    // Upload to R2 (root of the bucket)
    await R2.putObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    // Build file URL (using R2 public endpoint or CDN if available)
    const baseUrl = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;
    const fileUrl = `${baseUrl.replace(/\/$/, '')}/${uniqueName}`;

    res.json({
      message: 'File uploaded successfully',
      filename: uniqueName,
      url: fileUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /files?limit=20&token=xxx
router.get('/files', async (req, res) => {
  try {
    const MaxKeys = parseInt(req.query.limit, 10) || 20;
    const ContinuationToken = req.query.token;
    const Bucket = process.env.R2_BUCKET_NAME;
    const baseUrl = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;

    const result = await R2.listObjects({ Bucket, ContinuationToken, MaxKeys });
    const files = (result.Contents || []).map(obj => ({
      filename: obj.Key,
      url: `${baseUrl.replace(/\/$/, '')}/${obj.Key}`
    }));

    res.json({
      files,
      nextToken: result.NextContinuationToken || null,
      isTruncated: !!result.IsTruncated
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

module.exports = router;
