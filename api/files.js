const { authenticateApiKey, authenticateHybrid, handleCors, errorResponse, successResponse } = require('./utils');
const { listObjects, putObject, headObject, deleteObject, getObject, getPresignedUrl } = require('./r2-client');
const formidable = require('formidable');

// Helper: get key from req
function getKey(req) {
  if (req.query && req.query.key) return req.query.key;
  if (req.query && req.query["[key]"]) return req.query["[key]"];
  if (req.url && req.url.match(/\/([^\/]+)$/)) return decodeURIComponent(req.url.match(/\/([^\/]+)$/)[1]);
  return null;
}

// Helper: get content type from file extension
function getContentTypeFromKey(key) {
  const ext = key.toLowerCase().split('.').pop();
  const mimeTypes = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    
    // Videos
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'm4a': 'audio/mp4',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Text
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  // --- List files (GET /api/files) ---
  if (req.method === 'GET' && req.url.startsWith('/files')) {
    try {
      const { user, newAccessToken } = authenticateHybrid(req);
      // Set new access token if JWT was refreshed
      if (newAccessToken) {
        const { setCookie } = require('./utils');
        const accessCookie = setCookie('accessToken', newAccessToken, { maxAge: 15 * 60 });
        res.setHeader('Set-Cookie', accessCookie);
      }
      const { token, prefix, limit, search, type } = req.query;
      const Bucket = process.env.R2_BUCKET_NAME;
      if (!Bucket) return errorResponse(res, 500, 'Server configuration error: Bucket name is missing.');
      const result = await listObjects({
        Bucket,
        ContinuationToken: token || undefined,
        Prefix: typeof prefix === 'string' ? prefix : undefined,
        MaxKeys: parseInt(limit, 10) || 100
      });
      const baseUrl = process.env.R2_PUBLIC_URL || '';
      let files = await Promise.all((result.Contents || []).map(async obj => {
        const publicUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${obj.Key}` : null;
        let presignedUrl = null;
        try {
          presignedUrl = await getPresignedUrl ? await getPresignedUrl({
            Bucket,
            Key: obj.Key,
            expiresIn: 3600
          }) : null;
        } catch (e) {
          presignedUrl = null;
        }
        return {
          key: obj.Key,
          filename: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          contentType: getContentTypeFromKey(obj.Key),
          publicUrl,
          presignedUrl,
          downloadUrl: `/r2/download/${encodeURIComponent(obj.Key)}`
        };
      }));

      // --- Backend Filtering ---
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        files = files.filter(f => f.key.toLowerCase().includes(searchLower));
      }
      if (type && type !== 'all') {
        // getFileType logic: match frontend
        const getFileType = (contentType) => {
          if (!contentType) return 'doc';
          if (contentType.startsWith('image/')) return 'image';
          if (contentType.startsWith('video/')) return 'video';
          if (contentType.startsWith('audio/')) return 'audio';
          if ([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv'
          ].includes(contentType)) return 'doc';
          if ([
            'application/zip',
            'application/vnd.rar',
            'application/x-7z-compressed',
            'application/x-tar',
            'application/gzip'
          ].includes(contentType)) return 'archive';
          return 'doc';
        };
        files = files.filter(f => getFileType(f.contentType) === type);
      }

      return successResponse(res, { files, pagination: { nextToken: result.NextContinuationToken || null, isTruncated: result.IsTruncated || false, count: files.length } });
    } catch (error) {
      console.error('API List files error:', error);
      if (error.message.includes('API key') || error.message.includes('token') || error.message.includes('authenticate')) return errorResponse(res, 401, error.message);
      return errorResponse(res, 500, 'Failed to list files', error.message);
    }
  }

  // --- Upload file (POST /api/files/upload) ---
  if (req.method === 'POST' && req.url === '/files/upload') {
    try {
      const { user, newAccessToken } = authenticateHybrid(req);
      // Set new access token if JWT was refreshed
      if (newAccessToken) {
        const { setCookie } = require('./utils');
        const accessCookie = setCookie('accessToken', newAccessToken, { maxAge: 15 * 60 });
        res.setHeader('Set-Cookie', accessCookie);
      }
      const form = new formidable.IncomingForm({ maxFileSize: 25 * 1024 * 1024, maxFiles: 1 });
      const [fields, files] = await form.parse(req);
      if (!files.file || files.file.length === 0) return errorResponse(res, 400, 'No file uploaded');
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file.size || file.size === 0) return errorResponse(res, 400, 'Empty file uploaded');
      const originalName = file.originalFilename || file.name || 'unknown';
      const filename = Date.now() + '-' + originalName;
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(file.filepath);
      await putObject({ Bucket: process.env.R2_BUCKET_NAME, Key: filename, Body: fileBuffer, ContentType: file.mimetype || 'application/octet-stream' });
      const baseUrl = process.env.R2_PUBLIC_URL || '';
      const publicUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${filename}` : null;
      return successResponse(res, { filename, key: filename, size: file.size, contentType: file.mimetype || 'application/octet-stream', url: publicUrl, downloadUrl: `/r2/download/${filename}` });
    } catch (error) {
      console.error('API Upload error:', error);
      if (error.message.includes('API key') || error.message.includes('token') || error.message.includes('authenticate')) return errorResponse(res, 401, error.message);
      return errorResponse(res, 500, 'Upload failed', error.message);
    }
  }

  // --- Delete file (DELETE /api/files/:key) ---
  if (req.method === 'DELETE' && req.url.startsWith('/files/')) {
    try {
      const { user, newAccessToken } = authenticateHybrid(req);
      // Set new access token if JWT was refreshed
      if (newAccessToken) {
        const { setCookie } = require('./utils');
        const accessCookie = setCookie('accessToken', newAccessToken, { maxAge: 15 * 60 });
        res.setHeader('Set-Cookie', accessCookie);
      }
      const key = getKey(req);
      if (!key) return errorResponse(res, 400, 'File key is required');
      const Bucket = process.env.R2_BUCKET_NAME;
      try {
        await headObject({ Bucket, Key: key });
      } catch (err) {
        if (err.name === 'NotFound' || err.message.includes('not found')) return errorResponse(res, 404, 'File not found');
        throw err;
      }
      await deleteObject({ Bucket, Key: key });
      return successResponse(res, { message: 'File deleted successfully', key });
    } catch (error) {
      console.error('API Delete error:', error);
      if (error.message.includes('API key') || error.message.includes('token') || error.message.includes('authenticate')) return errorResponse(res, 401, error.message);
      return errorResponse(res, 500, 'Failed to delete file', error.message);
    }
  }

  // --- Not found ---
  return errorResponse(res, 404, 'Not found');
}
