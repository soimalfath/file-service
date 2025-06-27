const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Hardcoded user credentials
const ADMIN_USER = {
  username: process.env.ADMIN_USERNAME || 'admin',
  passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10)
};

// JWT secrets from environment variables
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret-key-change-this';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-key-change-this';
const API_KEY = process.env.API_KEY || 'your-api-key-change-this';

// Token expiration times
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';

// Generate tokens
function generateTokens(username) {
  const payload = { username, type: 'access' };
  const refreshPayload = { username, type: 'refresh' };
  
  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
  const refreshToken = jwt.sign(refreshPayload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
  
  return { accessToken, refreshToken };
}

// Parse cookies from request
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {});
}

// Set cookie helper for Vercel
function setCookie(name, value, options = {}) {
  const defaults = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };
  
  const opts = { ...defaults, ...options };
  let cookie = `${name}=${encodeURIComponent(value)}`;
  
  if (opts.maxAge) cookie += `; Max-Age=${opts.maxAge}`;
  if (opts.httpOnly) cookie += '; HttpOnly';
  if (opts.secure) cookie += '; Secure';
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts.path) cookie += `; Path=${opts.path}`;
  
  return cookie;
}

// Clear cookie helper
function clearCookie(name) {
  return `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// Authenticate JWT token from cookies
function authenticateToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  const { accessToken, refreshToken } = cookies;
  
  if (!accessToken) {
    throw new Error('Access token required');
  }
  
  try {
    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return { user: { username: decoded.username }, newAccessToken: null };
  } catch (error) {
    if (error.name === 'TokenExpiredError' && refreshToken) {
      try {
        const refreshDecoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        if (refreshDecoded.type !== 'refresh') {
          throw new Error('Invalid refresh token type');
        }
        
        const newAccessToken = jwt.sign(
          { username: refreshDecoded.username, type: 'access' }, 
          ACCESS_TOKEN_SECRET, 
          { expiresIn: ACCESS_TOKEN_EXPIRES }
        );
        
        return { 
          user: { username: refreshDecoded.username }, 
          newAccessToken 
        };
      } catch (refreshError) {
        throw new Error('Invalid or expired refresh token');
      }
    } else {
      throw new Error('Invalid access token');
    }
  }
}

// Authenticate API key
function authenticateApiKey(req) {
  const apiKey = req.headers['x-api-key'] || 
                 (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));
  
  if (!apiKey) {
    throw new Error('API key required');
  }
  
  if (apiKey !== API_KEY) {
    throw new Error('Invalid API key');
  }
  
  return true;
}

// CORS handler
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// Error response helper
function errorResponse(res, status, error, message = null) {
  return res.status(status).json({
    success: false,
    error,
    message: message || error
  });
}

// Success response helper
function successResponse(res, data, message = null) {
  return res.status(200).json({
    success: true,
    message,
    data
  });
}

module.exports = {
  ADMIN_USER,
  generateTokens,
  parseCookies,
  setCookie,
  clearCookie,
  authenticateToken,
  authenticateApiKey,
  handleCors,
  errorResponse,
  successResponse
};
