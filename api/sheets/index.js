// Vercel Serverless API — דופמין
// קורא מ-Google Sheets דרך gviz API (Sheet ציבורי) או googleapis (Service Account)

const SHEET_ID = '1ypSdymFV-oufB1YEKzNii9uvm05FwdmzN8K0fBkZxKI';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// קריאה דרך gviz (Sheet ציבורי)
async function readGviz(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error('gviz error: ' + r.status);
  const text = await r.text();
  // gviz מחזיר google.visualization.Query.setResponse({...});
  const json = JSON.parse(text.replace(/^.*?\(/, '').replace(/\);?\s*$/, ''));
  const cols = json.table.cols.map(c => c.label);
  const rows = (json.table.rows || []).map(row => {
    const obj = { rowIndex: 0 };
    cols.forEach((col, i) => {
      const cell = row.c[i];
      obj[col] = cell ? (cell.v !== null && cell.v !== undefined ? String(cell.v) : '') : '';
    });
    return obj;
  });
  return rows;
}

// קריאה דרך googleapis (Service Account)
async function readServiceAccount(sheetName) {
  const { google } = await import('googleapis');
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:M`
  });
  const values = r.data.values || [];
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row, i) => {
    const obj = { rowIndex: i + 2 };
    headers.forEach((h, j) => { obj[h] = row[j] || ''; });
    return obj;
  });
}

async function readSheet(sheetName) {
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    return readServiceAccount(sheetName);
  }
  return readGviz(sheetName);
}

function toArticles(rows) {
  return rows
    .filter(o => o['כותרת'])
    .map((o, i) => ({
      id:       o.rowIndex || i + 2,
      rowIndex: o.rowIndex || i + 2,
      topic:    o['נושא']        || '',
      sub:      o['תת-נושא']     || '',
      src:      o['מקור']        || '',
      date:     o['תאריך']       || '',
      title:    o['כותרת']       || '',
      lines:    [o['שורה 1'], o['שורה 2'], o['שורה 3']].filter(Boolean),
      life:     o['משפט לחיים'] || '',
      question: o['שאלה']        || '',
      link:     o['קישור']       || '',
      r: { v: parseInt(o['צפיות'] || 0) || 0, s: parseInt(o['שמירות'] || 0) || 0 }
    }));
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || 'articles';
  const topic  = req.query.topic  || 'all';

  if (action === 'ping') {
    return res.status(200).json({ status: 'ok', time: new Date().toISOString() });
  }

  try {
    if (action === 'articles') {
      const rows = await readSheet('מאמרים');
      let articles = toArticles(rows);
      if (topic !== 'all') articles = articles.filter(a => a.topic === topic);
      return res.status(200).json({ articles, total: articles.length, updated: new Date().toISOString() });
    }

    if (action === 'stats') {
      const [artRows, subRows] = await Promise.all([
        readSheet('מאמרים'),
        readSheet('מנויים')
      ]);
      const articles    = toArticles(artRows);
      const subscribers = subRows;
      const active = subscribers.filter(s => {
        const st = String(s['סטטוס'] || '').toLowerCase();
        return st === 'active' || st === '' || st === 'פעיל';
      }).length;
      const byTopic = {};
      articles.forEach(a => { byTopic[a.topic || 'אחר'] = (byTopic[a.topic || 'אחר'] || 0) + 1; });
      return res.status(200).json({
        success: true,
        totalArticles: articles.length, totalSubscribers: subscribers.length,
        activeSubscribers: active, todayArticles: 0, byTopic
      });
    }

    if (action === 'subscribers') {
      const rows = await readSheet('מנויים');
      return res.status(200).json(rows);
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (err) {
    console.error('API error:', err.message);
    // האתר יציג fallback data — זה עדיף על crash
    return res.status(503).json({
      error: err.message,
      hint: 'פתח את ה-Google Sheet לצפייה ציבורית: Share → Anyone with the link → Viewer'
    });
  }
}
