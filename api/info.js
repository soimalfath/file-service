const { 
  authenticateApiKey, 
  handleCors, 
  successResponse 
} = require('./utils');

export default async function handler(req, res) {
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
      deployment: 'Vercel Hobby Plan',
      endpoints: {
        'POST /api/upload': 'Upload a single file (max 25MB)',
        'POST /api/upload-multiple': 'Upload multiple files (max 5 files, 25MB each)',
        'GET /api/files': 'List all files with pagination',
        'DELETE /api/files/:key': 'Delete a file by key',
        'GET /api/info': 'API information'
      },
      authentication: 'API Key required in X-API-Key header or Authorization: Bearer <key>',
      limits: {
        maxFileSize: '25MB per file',
        maxFiles: '5 files per batch upload',
        timeout: '10 seconds per request',
        executions: '1000 per day (Hobby Plan)'
      }
    });
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}
