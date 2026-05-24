// ══════════════════════════════════════════════════════════
// SSR News (דופמין) – Google Apps Script — גרסה מלאה
// ══════════════════════════════════════════════════════════
// הוראות:
// 1. פתח את Google Sheet → Extensions → Apps Script
// 2. מחק את כל מה שיש שם
// 3. הדבק את כל הקוד הזה
// 4. Deploy → New Deployment → Web App
//    Execute as: Me | Access: Anyone
// 5. העתק את ה-URL שתקבל
// ══════════════════════════════════════════════════════════

const ARTICLES_SHEET    = 'מאמרים';
const SUBSCRIBERS_SHEET = 'מנויים';

// ── נקודת כניסה GET ──────────────────────────────────────
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'articles';
  try {
    switch (action) {
      case 'articles':         return jsonResp(getArticles(e.parameter));
      case 'stats':            return jsonResp(getStats());
      case 'subscribers':      return jsonResp(getSubscribers());
      case 'deleteArticle':    return jsonResp(deleteArticle(e.parameter.id));
      case 'updateArticle':    return jsonResp(updateArticle(e.parameter.id, e.parameter.title));
      case 'updateSubscriber': return jsonResp(updateSubscriberStatus(e.parameter.id, e.parameter.status));
      case 'sendTest':         return jsonResp(sendTestEmail(e.parameter.email));
      case 'ping':             return jsonResp({ status: 'ok', time: new Date().toISOString() });
      default:                 return jsonResp({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResp({ error: err.message });
  }
}

// ── נקודת כניסה POST ─────────────────────────────────────
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action || 'subscribe';
    switch (action) {
      case 'subscribe':   return jsonResp(handleSubscribe(data));
      case 'addArticle':  return jsonResp(addArticle(data));
      default:            return jsonResp({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResp({ success: false, error: err.message });
  }
}

// ── עזר: JSON response ───────────────────────────────────
function jsonResp(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── עזר: Sheet לפי שם ────────────────────────────────────
function getSheetByName(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

// ── עזר: שורות ל-objects ─────────────────────────────────
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).map((row, i) => {
    const obj = { rowIndex: i + 2 };
    headers.forEach((h, j) => { obj[h] = row[j]; });
    return obj;
  });
}

// ── עזר: פורמט תאריך ─────────────────────────────────────
function formatDate(d) {
  if (!d) return '';
  if (d instanceof Date) {
    return d.toLocaleDateString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\./g, '/');
  }
  return String(d);
}

// ════════════════════════════════════════════════════════
// מאמרים
// ════════════════════════════════════════════════════════

function getArticles(params) {
  const sh = getSheetByName(ARTICLES_SHEET);
  if (!sh) return { error: 'Sheet not found', articles: [] };

  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return { articles: [] };

  const headers  = rows[0];
  const articles = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[1]) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx]; });
    articles.push({
      id:       i + 1,
      rowIndex: i + 1,
      topic:    obj['נושא']       || '',
      sub:      obj['תת-נושא']    || '',
      src:      obj['מקור']       || '',
      date:     formatDate(obj['תאריך']),
      title:    obj['כותרת']      || '',
      lines:    [obj['שורה 1'], obj['שורה 2'], obj['שורה 3']].filter(Boolean),
      life:     obj['משפט לחיים'] || '',
      question: obj['שאלה']       || '',
      link:     obj['קישור']      || '',
      r: {
        v: parseInt(obj['צפיות']  || 0),
        s: parseInt(obj['שמירות'] || 0)
      }
    });
  }

  if (params && params.topic && params.topic !== 'all') {
    return { articles: articles.filter(a => a.topic === params.topic) };
  }
  return { articles, total: articles.length, updated: new Date().toISOString() };
}

function addArticle(data) {
  const sh = getSheetByName(ARTICLES_SHEET);
  if (!sh) return { success: false, error: 'Articles sheet not found' };
  sh.appendRow([
    new Date(),
    data.title    || '',
    data.topic    || '',
    data.subtopic || '',
    data.source   || '',
    data.line1    || '',
    data.line2    || '',
    data.line3    || '',
    data.quote    || '',
    data.question || '',
    data.url      || '',
    0, 0
  ]);
  return { success: true, rowIndex: sh.getLastRow() };
}

function deleteArticle(id) {
  const sh  = getSheetByName(ARTICLES_SHEET);
  if (!sh) return { success: false, error: 'Articles sheet not found' };
  const row = parseInt(id, 10);
  if (isNaN(row) || row < 2) return { success: false, error: 'Invalid id' };
  sh.deleteRow(row);
  return { success: true, deleted: row };
}

function updateArticle(id, title) {
  const sh  = getSheetByName(ARTICLES_SHEET);
  if (!sh) return { success: false, error: 'Articles sheet not found' };
  const row = parseInt(id, 10);
  if (isNaN(row) || row < 2) return { success: false, error: 'Invalid id' };
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const col = headers.indexOf('כותרת') + 1;
  if (col < 1) return { success: false, error: 'Title column not found' };
  sh.getRange(row, col).setValue(title);
  return { success: true };
}

// ════════════════════════════════════════════════════════
// מנויים
// ════════════════════════════════════════════════════════

function getSubscribers() {
  const sh = getSheetByName(SUBSCRIBERS_SHEET);
  if (!sh) return [];
  return sheetToObjects(sh);
}

function handleSubscribe(data) {
  let sh = getSheetByName(SUBSCRIBERS_SHEET);
  if (!sh) {
    sh = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SUBSCRIBERS_SHEET);
    sh.getRange(1, 1, 1, 7).setValues([[
      'תאריך הרשמה','שם','מייל','נושאים','סטטוס','מזהה','מקור'
    ]]);
  }

  const emails = sh.getRange(2, 3, Math.max(sh.getLastRow() - 1, 1), 1).getValues().flat();
  if (emails.includes(data.email)) {
    return { success: false, error: 'already_subscribed' };
  }

  const id = 'SSR-' + Date.now();
  sh.appendRow([
    new Date(), data.name || '', data.email,
    (data.topics || []).join(', '), 'active', id, 'website'
  ]);

  sendConfirmationEmail(data.name, data.email, data.topics || [], id);
  return { success: true, id };
}

function updateSubscriberStatus(id, status) {
  const sh = getSheetByName(SUBSCRIBERS_SHEET);
  if (!sh) return { success: false, error: 'Sheet not found' };
  const row = parseInt(id, 10);
  if (isNaN(row) || row < 2) return { success: false, error: 'Invalid id' };
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const col = headers.indexOf('סטטוס') + 1;
  if (col < 1) return { success: false, error: 'Status column not found' };
  sh.getRange(row, col).setValue(status);
  return { success: true };
}

// ════════════════════════════════════════════════════════
// סטטיסטיקות
// ════════════════════════════════════════════════════════

function getStats() {
  const artSh = getSheetByName(ARTICLES_SHEET);
  const subSh = getSheetByName(SUBSCRIBERS_SHEET);

  const articles    = artSh ? sheetToObjects(artSh) : [];
  const subscribers = subSh ? sheetToObjects(subSh) : [];

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const activeSubscribers = subscribers.filter(s => {
    const st = String(s['סטטוס'] || s.status || '').toLowerCase().trim();
    return st === 'active' || st === '' || st === 'פעיל';
  }).length;

  const todayArticles = articles.filter(a => {
    const d = a['תאריך'] || a.date || '';
    if (!d) return false;
    try {
      return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd') === todayStr;
    } catch(e) { return false; }
  }).length;

  const byTopic = {};
  articles.forEach(a => {
    const t = String(a['נושא'] || a.topic || 'אחר').trim();
    byTopic[t] = (byTopic[t] || 0) + 1;
  });

  return {
    success:           true,
    totalSubscribers:  subscribers.length,
    activeSubscribers: activeSubscribers,
    totalArticles:     articles.length,
    todayArticles:     todayArticles,
    byTopic:           byTopic
  };
}

// ════════════════════════════════════════════════════════
// מיילים
// ════════════════════════════════════════════════════════

function sendConfirmationEmail(name, email, topics, id) {
  const topicLabels = {
    ai: 'בינה מלאכותית', psychology: 'פסיכולוגיה',
    neuroscience: 'מדעי המוח', education: 'חינוך',
    health: 'בריאות', science: 'מדע',
    physics: 'פיזיקה', astronomy: 'אסטרונומיה', tutorials: 'מדריכים'
  };
  const topicNames = topics.map(t => topicLabels[t] || t).join(', ') || 'כל הנושאים';

  MailApp.sendEmail({
    to: email,
    subject: `ברוך הבא ל-דופמין! ✅`,
    htmlBody: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;
        background:#0d0d0d;color:#fff;border-radius:10px;overflow:hidden">
        <div style="background:#000;padding:28px;text-align:center;border-bottom:2px solid #00ff88">
          <div style="font-size:28px;font-weight:900;color:#00ff88">דופמין ☀️</div>
          <div style="font-size:13px;color:#888;margin-top:4px">ניוזלטר יומי · BETA</div>
        </div>
        <div style="padding:28px">
          <h2 style="color:#00ff88">שלום ${name || 'חבר'}! 👋</h2>
          <p style="color:#ccc;line-height:1.7">
            נרשמת בהצלחה — תקבל ניוזלטר כל יום ב-<strong style="color:#fff">7:00 בבוקר</strong>
            עם מאמרים מסוכמים בעברית, משפט לחיים, ושאלה לחשיבה.
          </p>
          <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;
            padding:16px;margin:20px 0">
            <div style="font-size:11px;color:#555;margin-bottom:8px">הנושאים שלך</div>
            <div style="color:#00ff88">${topicNames}</div>
          </div>
          <div style="font-size:12px;color:#555;margin-top:20px">
            מזהה מנוי: <span style="color:#00ff88;font-family:monospace">${id}</span>
          </div>
        </div>
      </div>`
  });
}

function sendTestEmail(email) {
  if (!email || !email.includes('@')) return { success: false, error: 'Invalid email' };
  MailApp.sendEmail({
    to:      email,
    subject: '🧪 [בדיקה] דופמין — ניוזלטר יומי',
    body:    'זהו מייל בדיקה מלוח הניהול של דופמין. אם קיבלת מייל זה — הכל עובד!'
  });
  return { success: true, sent: email };
}

// ════════════════════════════════════════════════════════
// SETUP — הרץ פעם אחת כדי לאתחל את ה-Sheets
// ════════════════════════════════════════════════════════
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let art = ss.getSheetByName(ARTICLES_SHEET);
  if (!art) art = ss.insertSheet(ARTICLES_SHEET);

  if (art.getLastRow() === 0) {
    const headers = ['תאריך','כותרת','נושא','תת-נושא','מקור',
                     'שורה 1','שורה 2','שורה 3','משפט לחיים','שאלה','קישור','צפיות','שמירות'];
    art.getRange(1, 1, 1, headers.length).setValues([headers])
       .setFontWeight('bold').setBackground('#00ff88').setFontColor('#000');
  }

  let sub = ss.getSheetByName(SUBSCRIBERS_SHEET);
  if (!sub) sub = ss.insertSheet(SUBSCRIBERS_SHEET);

  if (sub.getLastRow() === 0) {
    const headers = ['תאריך הרשמה','שם','מייל','נושאים','סטטוס','מזהה','מקור'];
    sub.getRange(1, 1, 1, headers.length).setValues([headers])
       .setFontWeight('bold').setBackground('#1a73e8').setFontColor('#fff');
  }

  SpreadsheetApp.getUi().alert('✅ Sheets מוכנים!\n\nעכשיו: Deploy → New Deployment → Web App\nExecute as: Me | Access: Anyone');
}
