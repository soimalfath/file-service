// Endpoint: /api/apikey
// Mengembalikan API key dari environment (hanya untuk kebutuhan inject ke FE docs, bukan untuk konsumsi publik)

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  // CORS agar bisa diakses dari mana saja (khusus endpoint ini)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.API_KEY || '';
  if (!apiKey) return res.status(404).json({ error: 'API key not set' });
  res.json({ apiKey });
};
