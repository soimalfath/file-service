const { 
  authenticateToken, 
  handleCors, 
  errorResponse,
  setCookie 
} = require('../../utils');
const { headObject, getObject } = require('../../r2-client');

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
    
    const { key } = req.query;
    
    if (!key) {
      return errorResponse(res, 400, 'File key is required');
    }
    
    const decodedKey = decodeURIComponent(key);
    const Bucket = process.env.R2_BUCKET_NAME;
    
    // Check if file exists and get metadata
    const headResult = await headObject({ Bucket, Key: decodedKey });
    if (!headResult) {
      return errorResponse(res, 404, 'File not found');
    }
    
    // Get the file from R2
    const result = await getObject({ Bucket, Key: decodedKey });
    
    // Extract original filename
    const originalName = decodedKey.includes('-') ? decodedKey.substring(decodedKey.indexOf('-') + 1) : decodedKey;
    
    // Set appropriate headers
    res.setHeader('Content-Type', headResult.ContentType || result.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    if (headResult.ContentLength || result.ContentLength) {
      res.setHeader('Content-Length', headResult.ContentLength || result.ContentLength);
    }
    
    // Handle stream response
    if (result.Body && typeof result.Body.pipe === 'function') {
      result.Body.pipe(res);
    } else if (result.Body) {
      const chunks = [];
      for await (const chunk of result.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      res.send(buffer);
    } else {
      throw new Error('No file content received');
    }
    
  } catch (error) {
    console.error('R2 Download error:', error);
    if (error.message.includes('token')) {
      return errorResponse(res, 401, error.message);
    }
    if (error.name === 'NoSuchKey' || error.message.includes('not found')) {
      return errorResponse(res, 404, 'File not found');
    }
    return errorResponse(res, 500, 'Failed to download file', error.message);
  }
}
