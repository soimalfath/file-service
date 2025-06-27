const path = require('path');
const { parseCookies } = require('./utils');

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if user is authenticated
  const cookies = parseCookies(req.headers.cookie);
  const { accessToken } = cookies;
  
  if (!accessToken) {
    // Redirect to login if not authenticated
    return res.redirect('/login.html');
  }
  
  // Serve main app if authenticated
  return res.redirect('/index.html');
}
