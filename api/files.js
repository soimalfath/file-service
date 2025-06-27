const { 
  authenticateApiKey, 
  handleCors, 
  errorResponse, 
  successResponse 
} = require('./utils');
const { listObjects } = require('./r2-client');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    // Authenticate API key
    authenticateApiKey(req);
    
    const { token, prefix, limit } = req.query;
    
    const Bucket = process.env.R2_BUCKET_NAME;
    if (!Bucket) {
      return errorResponse(res, 500, 'Server configuration error: Bucket name is missing.');
    }

    const result = await listObjects({ 
      Bucket,
      ContinuationToken: token || undefined,
      Prefix: prefix || '',
      MaxKeys: parseInt(limit, 10) || 100,
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
    
    return successResponse(res, {
      files,
      pagination: {
        nextToken: result.NextContinuationToken || null,
        isTruncated: result.IsTruncated || false,
        count: files.length
      }
    });
    
  } catch (error) {
    console.error('API List files error:', error);
    if (error.message.includes('API key')) {
      return errorResponse(res, 401, error.message);
    }
    return errorResponse(res, 500, 'Failed to list files', error.message);
  }
}
