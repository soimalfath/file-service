const { 
  authenticateToken, 
  handleCors, 
  errorResponse,
  setCookie 
} = require('../utils');
const { listObjects } = require('../r2-client');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
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
      size: obj.Size,
      lastModified: obj.LastModified,
      url: baseUrl ? `${baseUrl.replace(/\/$/, '')}/${obj.Key}` : null,
      downloadUrl: `/r2/download/${encodeURIComponent(obj.Key)}`
    }));
    
    return res.json({
      files,
      nextToken: result.NextContinuationToken || null,
      isTruncated: result.IsTruncated || false
    });
    
  } catch (error) {
    console.error('R2 List files error:', error);
    if (error.message.includes('token')) {
      return errorResponse(res, 401, error.message);
    }
    return errorResponse(res, 500, 'Failed to list files', error.message);
  }
}
