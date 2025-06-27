const { 
  authenticateToken, 
  handleCors, 
  errorResponse,
  setCookie 
} = require('../../utils');
const { headObject, deleteObject } = require('../../r2-client');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'DELETE') {
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
    
    const { key } = req.query;
    
    if (!key) {
      return errorResponse(res, 400, 'File key is required');
    }
    
    const Bucket = process.env.R2_BUCKET_NAME;
    
    // Check if file exists
    try {
      await headObject({ Bucket, Key: key });
    } catch (err) {
      if (err.name === 'NotFound' || err.message.includes('not found')) {
        return errorResponse(res, 404, 'File not found');
      }
      throw err;
    }
    
    // Delete the file
    await deleteObject({ Bucket, Key: key });
    
    return res.json({ message: 'File deleted successfully' });
    
  } catch (error) {
    console.error('R2 Delete error:', error);
    if (error.message.includes('token')) {
      return errorResponse(res, 401, error.message);
    }
    return errorResponse(res, 500, 'Failed to delete file', error.message);
  }
}
