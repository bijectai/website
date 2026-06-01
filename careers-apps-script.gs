/*****************************************************************
 * biject — Careers backend (Google Apps Script)
 *
 * One web app that does two jobs:
 *   GET  ?action=roles   →  returns the Open rows from the "Roles" tab as JSON
 *   POST {action:"apply"} →  appends a row to the "Applications" tab,
 *                            saving any résumé file to Drive and storing its link
 *
 * SETUP: see "Careers — Google Sheet Setup.md" for click-by-click steps.
 * Paste this whole file into Extensions ▸ Apps Script, then Deploy.
 *****************************************************************/

// Optional: drop a Drive folder ID here to collect résumés in one place.
// Leave "" to auto-create a folder named "biject — Résumés".
var RESUME_FOLDER_ID = "";

/* Columns expected in the "Roles" tab (row 1 = headers, case-insensitive):
   Title | Team | Location | Type | Status | Summary | About |
   Responsibilities | Requirements | WhyItMatters | Compensation
   For Responsibilities / Requirements, put one bullet per line in the cell
   (Alt+Enter inside a cell), or separate with " | ".                        */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "roles";
    if (action === "roles") {
      return json(getRoles());
    }
    return json({ ok: false, error: "Unknown action" });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    if (body.action !== "apply") return json({ ok: false, error: "Unknown action" });

    var resumeLink = "";
    if (body.resume && body.resume.data) {
      resumeLink = saveResume(body.resume, body.name);
    }

    var sheet = getSheet_("Applications", [
      "Timestamp", "Role", "Name", "Email", "Location",
      "LinkedIn / Portfolio", "Résumé", "Heard From", "Source Page"
    ]);
    sheet.appendRow([
      body.submittedAt || new Date(),
      body.role || "",
      body.name || "",
      body.email || "",
      body.location || "",
      body.link || "",
      resumeLink,
      body.heard || "",
      body.page || ""
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ---------- Roles ---------- */
function getRoles() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Roles");
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idx = function (name) { return headers.indexOf(name.toLowerCase()); };

  var map = {
    title: idx("title"), team: idx("team"), location: idx("location"),
    type: idx("type"), status: idx("status"), summary: idx("summary"),
    about: idx("about"), responsibilities: idx("responsibilities"),
    requirements: idx("requirements"), whyItMatters: idx("whyitmatters"),
    compensation: idx("compensation")
  };

  var roles = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var get = function (key) { return map[key] > -1 ? String(row[map[key]]).trim() : ""; };
    if (!get("title")) continue;                     // skip blank rows
    var status = get("status") || "Open";
    if (status.toLowerCase() === "closed") continue; // hide closed roles
    roles.push({
      title: get("title"), team: get("team"), location: get("location"),
      type: get("type"), status: status, summary: get("summary"),
      about: get("about"), responsibilities: get("responsibilities"),
      requirements: get("requirements"), whyItMatters: get("whyItMatters"),
      compensation: get("compensation")
    });
  }
  return roles;
}

/* ---------- Résumé upload ---------- */
function saveResume(resume, applicantName) {
  var folder = RESUME_FOLDER_ID
    ? DriveApp.getFolderById(RESUME_FOLDER_ID)
    : getOrCreateFolder_("biject — Résumés");
  var bytes = Utilities.base64Decode(resume.data);
  var safeName = (applicantName || "applicant").replace(/[^\w.\- ]+/g, "_");
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  var blob = Utilities.newBlob(bytes, resume.mimeType, safeName + " — " + stamp + " — " + resume.name);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function getOrCreateFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

/* ---------- helpers ---------- */
function getSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
