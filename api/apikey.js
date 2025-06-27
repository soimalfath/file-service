// Endpoint: /api/apikey
// Mengembalikan API key dari environment (hanya untuk kebutuhan inject ke FE docs, bukan untuk konsumsi publik)

module.exports = async (req, res) => {
  // Hanya izinkan GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  // Optional: validasi otorisasi jika perlu (misal hanya internal)
  // if (!req.headers['x-internal-secret']) return res.status(403).json({ error: 'Forbidden' });

  const apiKey = process.env.API_KEY || '';
  if (!apiKey) return res.status(404).json({ error: 'API key not set' });
  res.json({ apiKey });
};
