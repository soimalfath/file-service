const { 
  authenticateToken, 
  handleCors, 
  errorResponse, 
  successResponse 
} = require('../utils');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    const { user } = authenticateToken(req);
    return successResponse(res, { authenticated: true, username: user.username });
  } catch (error) {
    return res.status(401).json({ authenticated: false });
  }
}
