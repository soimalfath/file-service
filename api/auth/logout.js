const { 
  clearCookie, 
  handleCors, 
  successResponse 
} = require('../utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear cookies
  const clearAccessCookie = clearCookie('accessToken');
  const clearRefreshCookie = clearCookie('refreshToken');
  
  res.setHeader('Set-Cookie', [clearAccessCookie, clearRefreshCookie]);
  
  return successResponse(res, null, 'Logout successful');
}
