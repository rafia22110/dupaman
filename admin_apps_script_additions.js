/**
 * admin_apps_script_additions.js
 * ─────────────────────────────────────────────────────────────────
 * Additional Apps Script functions for the SSR News (דופמין) admin
 * dashboard. Add these to your existing apps_script.js file and
 * wire them into the doGet / doPost routing as shown below.
 *
 * Google Sheet ID: 1ypSdymFV-oufB1YEKzNii9uvm05FwdmzN8K0fBkZxKI
 *
 * Expected sheet tabs:
 *   - "articles"    → columns: id, date, source, topic, subtopic, title,
 *                               line1, line2, line3, quote, question, url
 *   - "subscribers" → columns: id, date, name, email, topics, status
 * ─────────────────────────────────────────────────────────────────
 */

// ── SHEET NAMES (adjust if yours differ) ──────────────────────────
var ARTICLES_SHEET   = 'articles';
var SUBSCRIBERS_SHEET = 'subscribers';

// ─────────────────────────────────────────────────────────────────
// doGet ROUTING — paste this block into your existing doGet handler
// Replace / extend your current switch/if-else with these cases:
//
//   case 'stats':           return jsonResponse(getStats());
//   case 'articles':        return jsonResponse(getArticles());
//   case 'subscribers':     return jsonResponse(getSubscribers());
//   case 'deleteArticle':   return jsonResponse(deleteArticle(e.parameter.id));
//   case 'updateArticle':   return jsonResponse(updateArticle(e.parameter.id, e.parameter.title));
//   case 'updateSubscriber':return jsonResponse(updateSubscriberStatus(e.parameter.id, e.parameter.status));
//   case 'sendTest':        return jsonResponse(sendTestEmail(e.parameter.email));
//
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// doPost ROUTING — paste this case into your doPost handler:
//
//   case 'addArticle': return jsonResponse(addArticle(JSON.parse(e.postData.contents)));
//
// ─────────────────────────────────────────────────────────────────

/**
 * Helper: return a CORS-friendly JSON response.
 * Already defined in most setups — skip if duplicate.
 */
function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Helper: get a sheet by name from the active spreadsheet.
 */
function getSheet(name) {
  var ss = SpreadsheetApp.openById('1ypSdymFV-oufB1YEKzNii9uvm05FwdmzN8K0fBkZxKI');
  return ss.getSheetByName(name);
}

/**
 * Helper: convert a sheet's data (with header row) into an array of objects.
 */
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return String(h).trim(); });
  return data.slice(1).map(function(row, i) {
    var obj = { rowIndex: i + 2 }; // 1-based, row 1 = header
    headers.forEach(function(h, j) {
      obj[h] = row[j];
    });
    return obj;
  });
}

/**
 * getStats()
 * Returns aggregate statistics for the admin dashboard.
 *
 * Response shape:
 * {
 *   totalSubscribers: number,
 *   activeSubscribers: number,
 *   totalArticles: number,
 *   todayArticles: number,
 *   byTopic: { [topic: string]: number }
 * }
 */
function getStats() {
  try {
    var articlesSheet     = getSheet(ARTICLES_SHEET);
    var subscribersSheet  = getSheet(SUBSCRIBERS_SHEET);

    var articles    = articlesSheet    ? sheetToObjects(articlesSheet)    : [];
    var subscribers = subscribersSheet ? sheetToObjects(subscribersSheet) : [];

    var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    var totalSubscribers  = subscribers.length;
    var activeSubscribers = subscribers.filter(function(s) {
      var status = String(s.status || s.Status || '').toLowerCase().trim();
      return status === '' || status === 'active' || status === 'פעיל';
    }).length;

    var totalArticles = articles.length;
    var todayArticles = articles.filter(function(a) {
      var d = a.date || a.Date || a.תאריך || '';
      if (!d) return false;
      var formatted = Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      return formatted === todayStr;
    }).length;

    var byTopic = {};
    articles.forEach(function(a) {
      var topic = String(a.topic || a.Topic || a.נושא || 'אחר').trim();
      byTopic[topic] = (byTopic[topic] || 0) + 1;
    });

    return {
      success: true,
      totalSubscribers:  totalSubscribers,
      activeSubscribers: activeSubscribers,
      totalArticles:     totalArticles,
      todayArticles:     todayArticles,
      byTopic:           byTopic
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * getArticles()
 * Returns all article rows from the articles sheet.
 *
 * Response: Array of article objects, each with rowIndex as `id`.
 */
function getArticles() {
  try {
    var sheet = getSheet(ARTICLES_SHEET);
    if (!sheet) return [];
    var rows = sheetToObjects(sheet);
    // Normalise: expose rowIndex as id if no explicit id column
    return rows.map(function(r) {
      if (!r.id && !r.Id && !r.ID) r.id = r.rowIndex;
      return r;
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * getSubscribers()
 * Returns all subscriber rows from the subscribers sheet.
 *
 * Response: Array of subscriber objects.
 */
function getSubscribers() {
  try {
    var sheet = getSheet(SUBSCRIBERS_SHEET);
    if (!sheet) return [];
    var rows = sheetToObjects(sheet);
    return rows.map(function(r) {
      if (!r.id && !r.Id && !r.ID) r.id = r.rowIndex;
      return r;
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * deleteArticle(id)
 * Deletes an article row by rowIndex (1-based, header is row 1).
 *
 * @param {string|number} id  The rowIndex of the article to delete.
 */
function deleteArticle(id) {
  try {
    var sheet = getSheet(ARTICLES_SHEET);
    if (!sheet) return { success: false, error: 'Articles sheet not found' };
    var rowIndex = parseInt(id, 10);
    if (isNaN(rowIndex) || rowIndex < 2) {
      return { success: false, error: 'Invalid row index: ' + id };
    }
    sheet.deleteRow(rowIndex);
    return { success: true, deleted: rowIndex };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * updateArticle(id, title)
 * Updates the title cell of an article row.
 *
 * @param {string|number} id     The rowIndex of the article.
 * @param {string}        title  The new title value.
 */
function updateArticle(id, title) {
  try {
    var sheet = getSheet(ARTICLES_SHEET);
    if (!sheet) return { success: false, error: 'Articles sheet not found' };

    var rowIndex = parseInt(id, 10);
    if (isNaN(rowIndex) || rowIndex < 2) {
      return { success: false, error: 'Invalid row index: ' + id };
    }

    // Find the "title" column index
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var titleCol = -1;
    headers.forEach(function(h, i) {
      var hn = String(h).toLowerCase().trim();
      if (hn === 'title' || hn === 'כותרת') titleCol = i + 1;
    });
    if (titleCol < 0) return { success: false, error: 'Title column not found' };

    sheet.getRange(rowIndex, titleCol).setValue(title);
    return { success: true, updated: rowIndex, title: title };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * addArticle(data)
 * Appends a new article row to the articles sheet.
 *
 * @param {Object} data  Article fields from the admin form.
 *   Expected keys: title, topic, subtopic, source, line1, line2, line3,
 *                  quote, question, url
 */
function addArticle(data) {
  try {
    var sheet = getSheet(ARTICLES_SHEET);
    if (!sheet) return { success: false, error: 'Articles sheet not found' };

    // Read header row to determine column order
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers || headers.length === 0) {
      // Create headers if sheet is empty
      headers = ['id', 'date', 'source', 'topic', 'subtopic', 'title',
                 'line1', 'line2', 'line3', 'quote', 'question', 'url'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    var newId = Utilities.getUuid();
    var now   = new Date();
    var fieldMap = {
      id:       newId,
      date:     now,
      source:   data.source   || '',
      topic:    data.topic    || '',
      subtopic: data.subtopic || '',
      title:    data.title    || '',
      line1:    data.line1    || '',
      line2:    data.line2    || '',
      line3:    data.line3    || '',
      quote:    data.quote    || '',
      question: data.question || '',
      url:      data.url      || ''
    };

    var row = headers.map(function(h) {
      var key = String(h).trim().toLowerCase();
      // Try exact match, then lowercase match
      return fieldMap[h] !== undefined ? fieldMap[h] :
             fieldMap[key] !== undefined ? fieldMap[key] : '';
    });

    sheet.appendRow(row);
    var newRowIndex = sheet.getLastRow();

    return { success: true, id: newId, rowIndex: newRowIndex };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * updateSubscriberStatus(id, status)
 * Sets a subscriber's status to 'active' or 'inactive'.
 *
 * @param {string|number} id      The rowIndex (or email if no rowIndex).
 * @param {string}        status  'active' | 'inactive'
 */
function updateSubscriberStatus(id, status) {
  try {
    var sheet = getSheet(SUBSCRIBERS_SHEET);
    if (!sheet) return { success: false, error: 'Subscribers sheet not found' };

    var rowIndex = parseInt(id, 10);
    if (isNaN(rowIndex) || rowIndex < 2) {
      // Try to find by email
      var data    = sheet.getDataRange().getValues();
      var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var emailCol = headers.indexOf('email');
      rowIndex = -1;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][emailCol] || '') === String(id)) {
          rowIndex = i + 1;
          break;
        }
      }
      if (rowIndex < 2) return { success: false, error: 'Subscriber not found: ' + id };
    }

    // Find status column
    var headers2 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var statusCol = -1;
    headers2.forEach(function(h, i) {
      var hn = String(h).toLowerCase().trim();
      if (hn === 'status' || hn === 'סטטוס') statusCol = i + 1;
    });
    if (statusCol < 0) return { success: false, error: 'Status column not found' };

    sheet.getRange(rowIndex, statusCol).setValue(status);
    return { success: true, updated: rowIndex, status: status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * sendTestEmail(email)
 * Sends a test newsletter email to a specific address.
 * Customize the body as needed.
 *
 * @param {string} email  Recipient email address.
 */
function sendTestEmail(email) {
  try {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' };
    }

    var subject = '🧪 [בדיקה] דופמין — ניוזלטר יומי';
    var body = [
      'שלום,',
      '',
      'זהו מייל בדיקה מלוח הניהול של דופמין (SSR News).',
      'אם קיבלת מייל זה, מערכת הדיוור פועלת כראוי.',
      '',
      '— צוות דופמין'
    ].join('\n');

    MailApp.sendEmail({
      to:      email,
      subject: subject,
      body:    body
    });

    return { success: true, sent: email };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// EXAMPLE doGet / doPost stubs
// Merge these into your existing doGet / doPost functions.
// ─────────────────────────────────────────────────────────────────

/*
function doGet(e) {
  var action = e.parameter.action || '';
  try {
    switch (action) {
      case 'stats':             return jsonResponse(getStats());
      case 'articles':          return jsonResponse(getArticles());
      case 'subscribers':       return jsonResponse(getSubscribers());
      case 'deleteArticle':     return jsonResponse(deleteArticle(e.parameter.id));
      case 'updateArticle':     return jsonResponse(updateArticle(e.parameter.id, e.parameter.title));
      case 'updateSubscriber':  return jsonResponse(updateSubscriberStatus(e.parameter.id, e.parameter.status));
      case 'sendTest':          return jsonResponse(sendTestEmail(e.parameter.email));
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  var action = e.parameter.action || '';
  try {
    switch (action) {
      case 'addArticle':
        var data = JSON.parse(e.postData.contents);
        return jsonResponse(addArticle(data));
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}
*/
