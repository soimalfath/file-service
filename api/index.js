// This file is a placeholder for the main app entry point for Vercel serverless deployment.
// All API logic is now in /api/*.js and static files are in /public.
// No server is started here. Vercel will route requests automatically.

module.exports = (req, res) => {
  res.status(404).json({ error: 'Not found' });
};
