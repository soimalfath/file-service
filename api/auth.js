const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  ADMIN_USER,
  generateTokens,
  handleCors,
  setCookie,
  clearCookie,
  errorResponse,
  successResponse,
  parseCookies,
  authenticateToken
} = require('./utils');

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-key-change-this';

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  // Get the path from URL, handle both Vercel (/auth/*) and Express routing (/*) 
  const path = req.url || req.originalUrl || '';
  const method = req.method;

  // LOGIN
  if (method === 'POST' && (path === '/auth/login' || path === '/login' || path.endsWith('/login'))) {
    try {
      const { username, password } = req.body;
      if (!username || !password) return errorResponse(res, 400, 'Username and password are required');
      if (username !== ADMIN_USER.username || !bcrypt.compareSync(password, ADMIN_USER.passwordHash)) return errorResponse(res, 401, 'Invalid credentials');
      const { accessToken, refreshToken } = generateTokens(username);
      const accessCookie = setCookie('accessToken', accessToken, { maxAge: 15 * 60 });
      const refreshCookie = setCookie('refreshToken', refreshToken, { maxAge: 7 * 24 * 60 * 60 });
      res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
      return successResponse(res, { username }, 'Login successful');
    } catch (error) {
      console.error('Login error:', error);
      return errorResponse(res, 500, 'Internal server error');
    }
  }

  // LOGOUT
  if (method === 'POST' && (path === '/auth/logout' || path === '/logout' || path.endsWith('/logout'))) {
    const clearAccessCookie = clearCookie('accessToken');
    const clearRefreshCookie = clearCookie('refreshToken');
    res.setHeader('Set-Cookie', [clearAccessCookie, clearRefreshCookie]);
    return successResponse(res, null, 'Logout successful');
  }

  // REFRESH
  if (method === 'POST' && (path === '/auth/refresh' || path === '/refresh' || path.endsWith('/refresh'))) {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const { refreshToken } = cookies;
      if (!refreshToken) return errorResponse(res, 401, 'No refresh token provided');
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      if (decoded.type !== 'refresh') return errorResponse(res, 401, 'Invalid token type');
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.username);
      const accessCookie = setCookie('accessToken', accessToken, { maxAge: 15 * 60 });
      const refreshCookie = setCookie('refreshToken', newRefreshToken, { maxAge: 7 * 24 * 60 * 60 });
      res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
      return successResponse(res, { username: decoded.username }, 'Tokens refreshed');
    } catch (error) {
      console.error('Token refresh error:', error);
      return errorResponse(res, 401, 'Invalid refresh token');
    }
  }

  // STATUS
  if (method === 'GET' && (path === '/auth/status' || path === '/status' || path.endsWith('/status'))) {
    try {
      const { user } = authenticateToken(req);
      return successResponse(res, { authenticated: true, username: user.username });
    } catch (error) {
      return successResponse(res, { authenticated: false }, 'Not authenticated');
    }
  }

  // Not found
  return errorResponse(res, 404, 'Not found');
}
