const { 
  authenticateToken, 
  handleCors, 
  errorResponse,
  setCookie,
  successResponse 
} = require('../../utils');
const { headObject, getPresignedUrl } = require('../../r2-client');

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
    
    const { key, expires } = req.query;
    
    if (!key) {
      return errorResponse(res, 400, 'File key is required');
    }
    
    const Bucket = process.env.R2_BUCKET_NAME;
    
    // Check if file exists
    const headResult = await headObject({ Bucket, Key: key });
    if (!headResult) {
      return errorResponse(res, 404, 'File not found');
    }
    
    // Generate presigned URL (default: 1 hour)
    const expiresIn = parseInt(expires, 10) || 3600;
    const url = await getPresignedUrl({ 
      Bucket, 
      Key: key,
      expiresIn
    });
    
    return successResponse(res, {
      url,
      expiresIn
    });
    
  } catch (error) {
    console.error('R2 Presigned URL error:', error);
    if (error.message.includes('token')) {
      return errorResponse(res, 401, error.message);
    }
    return errorResponse(res, 500, 'Failed to generate presigned URL', error.message);
  }
}
