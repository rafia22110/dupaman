// ══════════════════════════════════════════════════════════
// SSR News – Google Apps Script
// הדבק את הקוד הזה ב: Extensions → Apps Script
// פרוס כ-Web App: Execute as "Me", Access "Anyone"
// ══════════════════════════════════════════════════════════

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ARTICLES_SHEET = 'מאמרים';
const SUBSCRIBERS_SHEET = 'מנויים';

// ── GET: מחזיר מאמרים לאתר ──
function doGet(e) {
  const action = e.parameter.action || 'articles';
  let result;

  if (action === 'articles') {
    result = getArticles(e.parameter);
  } else if (action === 'ping') {
    result = { status: 'ok', time: new Date().toISOString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders ? addCors(result) : ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
}

function addCors(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getArticles(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(ARTICLES_SHEET);
  if (!sh) return { error: 'Sheet not found', articles: [] };

  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return { articles: [] };

  const headers = rows[0];
  const articles = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[1]) continue; // skip empty title rows

    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx]; });

    // Build article object matching site structure
    articles.push({
      id:       i,
      topic:    obj['נושא'] || '',
      sub:      obj['תת-נושא'] || '',
      src:      obj['מקור'] || '',
      date:     formatDate(obj['תאריך']),
      title:    obj['כותרת'] || '',
      lines:    [obj['שורה 1'], obj['שורה 2'], obj['שורה 3']].filter(Boolean),
      life:     obj['משפט לחיים'] || '',
      question: obj['שאלה'] || '',
      link:     obj['קישור'] || '',
      r:        { v: parseInt(obj['צפיות'] || 0), s: parseInt(obj['שמירות'] || 0) }
    });
  }

  // Optional filters
  if (params.topic && params.topic !== 'all') {
    return { articles: articles.filter(a => a.topic === params.topic) };
  }

  return { articles, total: articles.length, updated: new Date().toISOString() };
}

function formatDate(d) {
  if (!d) return '';
  if (d instanceof Date) {
    return d.toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\./g, '/');
  }
  return String(d);
}

// ── POST: רישום מנוי חדש ──
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'subscribe';

    if (action === 'subscribe') {
      return handleSubscribe(data);
    }
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSubscribe(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SUBSCRIBERS_SHEET);

  // Create sheet if not exists
  if (!sh) {
    sh = ss.insertSheet(SUBSCRIBERS_SHEET);
    sh.getRange(1, 1, 1, 7).setValues([[
      'תאריך הרשמה', 'שם', 'מייל', 'נושאים נבחרים', 'סטטוס', 'מזהה', 'מקור'
    ]]);
    sh.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
  }

  // Check if already subscribed
  const emails = sh.getRange(2, 3, Math.max(sh.getLastRow() - 1, 1), 1).getValues().flat();
  if (emails.includes(data.email)) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'already_subscribed' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const id = 'SSR-' + Date.now();
  sh.appendRow([
    new Date(),
    data.name || '',
    data.email,
    (data.topics || []).join(', '),
    'active',
    id,
    'website'
  ]);

  // Send confirmation email
  sendConfirmationEmail(data.name, data.email, data.topics || [], id);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendConfirmationEmail(name, email, topics, id) {
  const topicLabels = {
    ai: 'בינה מלאכותית', psychology: 'פסיכולוגיה',
    neuroscience: 'מדעי המוח', education: 'חינוך',
    health: 'בריאות', science: 'מדע',
    physics: 'פיזיקה', astronomy: 'אסטרונומיה',
    tutorials: 'מדריכים'
  };
  const topicNames = topics.map(t => topicLabels[t] || t).join(', ') || 'כל הנושאים';

  MailApp.sendEmail({
    to: email,
    subject: `ברוך הבא ל-SSR News! ✅`,
    htmlBody: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:10px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#000,#111);padding:28px;text-align:center;border-bottom:2px solid #00ff88">
          <div style="font-size:28px;font-weight:900;color:#00ff88">SSR News</div>
          <div style="font-size:13px;color:#888;margin-top:4px">ניוזלטר יומי · BETA</div>
        </div>
        <div style="padding:28px">
          <h2 style="color:#00ff88;margin-bottom:12px">שלום ${name || 'חבר'}! 👋</h2>
          <p style="color:#ccc;line-height:1.7;margin-bottom:16px">
            נרשמת בהצלחה ל-<strong style="color:#fff">SSR News</strong> – הניוזלטר היומי שלך.
          </p>
          <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:16px;margin-bottom:20px">
            <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">הנושאים שלך</div>
            <div style="color:#00ff88;font-size:14px">${topicNames}</div>
          </div>
          <p style="color:#888;font-size:13px;line-height:1.7">
            תקבל ניוזלטר כל יום ב-<strong style="color:#fff">7:00 בבוקר</strong> עם מאמרים מסוכמים בעברית, 
            משפט לחיים, ושאלה לחשיבה.
          </p>
          <div style="margin-top:20px;padding:12px;background:#0a1a0a;border:1px solid #00ff8833;border-radius:6px;font-size:12px;color:#555">
            מזהה מנוי: <span style="color:#00ff88;font-family:monospace">${id}</span>
          </div>
        </div>
      </div>`
  });
}

// ══════════════════════════════════════════════════════════
// SETUP: מריץ פעם אחת כדי ליצור את ה-Sheet
// ══════════════════════════════════════════════════════════
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Articles sheet
  let art = ss.getSheetByName(ARTICLES_SHEET);
  if (!art) art = ss.insertSheet(ARTICLES_SHEET);
  else art.clear();

  const artHeaders = ['תאריך','כותרת','נושא','תת-נושא','מקור','שורה 1','שורה 2','שורה 3','משפט לחיים','שאלה','קישור','צפיות','שמירות'];
  art.getRange(1, 1, 1, artHeaders.length).setValues([artHeaders]);
  art.getRange(1, 1, 1, artHeaders.length)
    .setFontWeight('bold').setBackground('#00ff88').setFontColor('#000000');
  art.setColumnWidth(1, 100);
  art.setColumnWidth(2, 280);
  art.setColumnWidth(3, 120);

  // Example data row
  art.appendRow([
    new Date(), 'GPT-5 עם זיכרון ארוך-טווח', 'ai', 'LLMs', 'MIT Tech Review',
    'OpenAI הכריזה על GPT-5 עם חלון הקשר של מיליון טוקנים.',
    'המודל יכול לזכור שיחות מלפני שבועות.',
    'זה מאפשר שימוש כסוכן אישי לאורך זמן.',
    'AI שזוכר אותך לאורך זמן הוא כלי שונה מהיסוד.',
    'אילו החלטות היית מוכן לאצול ל-AI שמכיר אותך?',
    'https://www.technologyreview.com', 142, 38
  ]);

  // Subscribers sheet
  let sub = ss.getSheetByName(SUBSCRIBERS_SHEET);
  if (!sub) sub = ss.insertSheet(SUBSCRIBERS_SHEET);
  else sub.clear();

  const subHeaders = ['תאריך הרשמה','שם','מייל','נושאים','סטטוס','מזהה','מקור'];
  sub.getRange(1, 1, 1, subHeaders.length).setValues([subHeaders]);
  sub.getRange(1, 1, 1, subHeaders.length)
    .setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');

  SpreadsheetApp.getUi().alert('✅ Sheets נוצרו בהצלחה!\n\nעכשיו פרוס כ-Web App:\nExtensions → Apps Script → Deploy → New Deployment\nExecute as: Me | Access: Anyone');
}
