const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret-key-change-this';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-key-change-this';

// Middleware to verify JWT access token from cookies
function authenticateToken(req, res, next) {
  const { accessToken, refreshToken } = req.cookies;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    // Try to verify access token
    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    req.user = { username: decoded.username };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' && refreshToken) {
      // Access token expired, try to refresh
      try {
        const refreshDecoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        
        if (refreshDecoded.type !== 'refresh') {
          return res.status(401).json({ error: 'Invalid refresh token type' });
        }
        
        // Generate new access token
        const newAccessToken = jwt.sign(
          { username: refreshDecoded.username, type: 'access' }, 
          ACCESS_TOKEN_SECRET, 
          { expiresIn: '15m' }
        );
        
        // Set new access token cookie
        res.cookie('accessToken', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000 // 15 minutes
        });
        
        req.user = { username: refreshDecoded.username };
        next();
      } catch (refreshError) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }
    } else {
      return res.status(401).json({ error: 'Invalid access token' });
    }
  }
}

// Middleware to check if user is already authenticated (for redirecting from login page)
function redirectIfAuthenticated(req, res, next) {
  const { accessToken } = req.cookies;
  
  if (accessToken) {
    try {
      jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
      return res.redirect('/');
    } catch (error) {
      // Token invalid, continue to login page
    }
  }
  
  next();
}

module.exports = {
  authenticateToken,
  redirectIfAuthenticated
};
