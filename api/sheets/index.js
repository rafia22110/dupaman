// Vercel API — proxy ל-n8n שמחובר ל-Google Sheets
// ללא צורך ב-API key

const N8N_BASE = 'https://n8n.alveare-ai.com/webhook';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || 'articles';
  const topic  = req.query.topic  || 'all';

  try {
    // n8n webhook endpoints
    const endpoints = {
      articles:    `${N8N_BASE}/ssr-articles?topic=${topic}`,
      stats:       `${N8N_BASE}/ssr-stats`,
      subscribers: `${N8N_BASE}/ssr-subscribers`,
      ping:        null
    };

    if (action === 'ping') {
      return res.status(200).json({ status: 'ok', time: new Date().toISOString() });
    }

    const endpoint = endpoints[action];
    if (!endpoint) {
      return res.status(400).json({ error: 'Unknown action: ' + action });
    }

    const r = await fetch(endpoint, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!r.ok) {
      throw new Error(`n8n error: ${r.status}`);
    }

    const data = await r.json();
    return res.status(200).json(data);

  } catch (err) {
    // fallback — מחזיר מאמרי הדגמה
    console.error('API error:', err.message);
    return res.status(200).json({
      articles: [],
      total: 0,
      error: err.message,
      fallback: true,
      updated: new Date().toISOString()
    });
  }
}
