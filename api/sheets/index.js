// Vercel Serverless API — דופמין
// קורא מ-Apps Script → gviz → fallback סטטי

import { readFileSync } from 'fs';
import { join } from 'path';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyHice6ZGQycZnFek-2JMh9-KzumxW5U6QoDGshvMBqouY5w8MM7T1gni4G0C3Ka-4g/exec';
const SHEET_ID = '1ypSdymFV-oufB1YEKzNii9uvm05FwdmzN8K0fBkZxKI';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache');
}

// קריאה דרך gviz (דורש Sheet ציבורי)
async function readGviz(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('gviz error: ' + r.status);
  const text = await r.text();
  if (!text.includes('google.visualization')) throw new Error('gviz: not public');
  const json = JSON.parse(text.replace(/^.*?\(/, '').replace(/\);?\s*$/, ''));
  const cols = json.table.cols.map(c => c.label);
  const rows = (json.table.rows || []).map((row, idx) => {
    const obj = { rowIndex: idx + 2 };
    cols.forEach((col, i) => {
      const cell = row.c[i];
      obj[col] = cell ? (cell.v !== null && cell.v !== undefined ? String(cell.v) : '') : '';
    });
    return obj;
  });
  return rows;
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

// Fallback סטטי — הכתבות ששמרנו
function getStaticArticles() {
  try {
    const p = join(process.cwd(), 'public', 'articles-today.json');
    const data = JSON.parse(readFileSync(p, 'utf8'));
    return data;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || 'articles';
  const topic  = req.query.topic  || 'all';

  if (action === 'ping') {
    return res.status(200).json({ status: 'ok', time: new Date().toISOString() });
  }

  if (action === 'articles') {
    // נסה gviz (Sheet ציבורי)
    try {
      const rows = await readGviz('מאמרים');
      let articles = toArticles(rows);
      if (topic !== 'all') articles = articles.filter(a => a.topic === topic);
      return res.status(200).json({ articles, total: articles.length, updated: new Date().toISOString(), source: 'sheet' });
    } catch (gvizErr) {
      console.warn('gviz failed:', gvizErr.message);
    }

    // Fallback: קובץ סטטי
    const staticData = getStaticArticles();
    if (staticData) {
      let articles = staticData.articles || [];
      if (topic !== 'all') articles = articles.filter(a => a.topic === topic);
      return res.status(200).json({ articles, total: articles.length, updated: staticData.updated, source: 'static' });
    }

    return res.status(503).json({ error: 'No data source available', articles: [], total: 0 });
  }

  if (action === 'stats') {
    try {
      const [artRows, subRows] = await Promise.all([
        readGviz('מאמרים'),
        readGviz('מנויים').catch(() => [])
      ]);
      const articles = toArticles(artRows);
      const active = subRows.filter(s => {
        const st = String(s['סטטוס'] || '').toLowerCase();
        return st === 'active' || st === '' || st === 'פעיל';
      }).length;
      const byTopic = {};
      articles.forEach(a => { byTopic[a.topic || 'אחר'] = (byTopic[a.topic || 'אחר'] || 0) + 1; });
      return res.status(200).json({
        success: true,
        totalArticles: articles.length, totalSubscribers: subRows.length,
        activeSubscribers: active, todayArticles: articles.length, byTopic
      });
    } catch (e) {
      // fallback stats from static
      const staticData = getStaticArticles();
      const articles = staticData ? staticData.articles : [];
      const byTopic = {};
      articles.forEach(a => { byTopic[a.topic || 'אחר'] = (byTopic[a.topic || 'אחר'] || 0) + 1; });
      return res.status(200).json({
        success: true,
        totalArticles: articles.length, totalSubscribers: 0,
        activeSubscribers: 0, todayArticles: articles.length, byTopic
      });
    }
  }

  if (action === 'subscribers') {
    try {
      const rows = await readGviz('מנויים');
      return res.status(200).json(rows);
    } catch(e) {
      return res.status(200).json([]);
    }
  }

  return res.status(400).json({ error: 'Unknown action: ' + action });
}
