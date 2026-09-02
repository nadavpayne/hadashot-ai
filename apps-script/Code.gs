/**
 * Google Apps Script — receives signups from hadashot-ai.com and appends
 * them to this spreadsheet.
 *
 * Setup
 *  1. Open the Google Sheet that should hold the list.
 *  2. Extensions → Apps Script, paste this file over the default Code.gs.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as:      Me
 *       Who has access:  Anyone
 *  4. Copy the /exec URL it gives you.
 *  5. In Vercel: Settings → Environment Variables → add
 *       SHEETS_WEBHOOK_URL = that /exec URL
 *     Then redeploy so the function picks it up.
 *
 * "Anyone" only means Google will not demand a login. The URL stays private:
 * it lives in Vercel's environment, never in the public repo, and the browser
 * never sees it — only the server calls it.
 */

var SHEET_NAME = 'signups';

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var email = String(payload.email || '').trim().toLowerCase();

    // Validate here too. This endpoint is reachable on its own, so it cannot
    // assume the caller already checked.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json({ ok: false, error: 'invalid_email' });
    }

    var sheet = getSheet();

    // Skip duplicates rather than piling up repeat signups.
    var existing = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function (r) {
          return String(r[0]).trim().toLowerCase();
        })
      : [];
    if (existing.indexOf(email) !== -1) {
      return json({ ok: true, duplicate: true });
    }

    sheet.appendRow([email, payload.at || new Date().toISOString(), payload.source || '']);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['email', 'joined_at', 'source']);
  }
  return sheet;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
