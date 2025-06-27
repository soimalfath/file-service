const bcrypt = require('bcryptjs');
const { 
  ADMIN_USER, 
  generateTokens, 
  handleCors, 
  setCookie, 
  errorResponse, 
  successResponse 
} = require('../utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    const { username, password } = req.body;
    
    // Validate credentials
    if (!username || !password) {
      return errorResponse(res, 400, 'Username and password are required');
    }
    
    if (username !== ADMIN_USER.username || !bcrypt.compareSync(password, ADMIN_USER.passwordHash)) {
      return errorResponse(res, 401, 'Invalid credentials');
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(username);
    
    // Set HTTP-only cookies
    const accessCookie = setCookie('accessToken', accessToken, {
      maxAge: 15 * 60 // 15 minutes
    });
    
    const refreshCookie = setCookie('refreshToken', refreshToken, {
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });
    
    res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
    
    return successResponse(res, { username }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
}
