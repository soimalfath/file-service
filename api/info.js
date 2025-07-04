const { 
  authenticateApiKey, 
  handleCors, 
  successResponse 
} = require('./utils');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate API key
    authenticateApiKey(req);
    
    return successResponse(res, {
      name: 'R2 File Manager API',
      version: '1.0.0',
      endpoints: {
        'POST /api/upload': 'Upload a single file',
        'POST /api/upload-multiple': 'Upload multiple files (max 10)',
        'GET /api/files': 'List all files with pagination',
        'DELETE /api/files/:key': 'Delete a file by key',
        'GET /api/info': 'API information'
      },
      authentication: 'API Key required in X-API-Key header or Authorization: Bearer <key>',
      maxFileSize: '4MB per file (Vercel Hobby limit)'
    });
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}
