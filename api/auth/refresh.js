const jwt = require('jsonwebtoken');
const { 
  parseCookies,
  generateTokens, 
  handleCors, 
  setCookie, 
  errorResponse, 
  successResponse 
} = require('../utils');

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-key-change-this';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    const cookies = parseCookies(req.headers.cookie);
    const { refreshToken } = cookies;
    
    if (!refreshToken) {
      return errorResponse(res, 401, 'No refresh token provided');
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    
    if (decoded.type !== 'refresh') {
      return errorResponse(res, 401, 'Invalid token type');
    }
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.username);
    
    // Set new HTTP-only cookies
    const accessCookie = setCookie('accessToken', accessToken, {
      maxAge: 15 * 60 // 15 minutes
    });
    
    const refreshCookie = setCookie('refreshToken', newRefreshToken, {
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });
    
    res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
    
    return successResponse(res, { username: decoded.username }, 'Tokens refreshed');
  } catch (error) {
    console.error('Token refresh error:', error);
    return errorResponse(res, 401, 'Invalid refresh token');
  }
}
