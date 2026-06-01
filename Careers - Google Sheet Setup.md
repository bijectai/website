# Careers page — Google Sheet setup (≈ 5 minutes)

This connects `careers.html` to a Google Sheet so that:

- **Open roles** are pulled **live** from the Sheet (add a row → it appears on the page)
- **Applications** (including résumé files) land back in the Sheet automatically

You only do this once. After that, you manage everything from the Sheet — you never touch the code again.

---

## 1. Create the Sheet

1. Go to <https://sheets.google.com> and create a new spreadsheet. Name it e.g. **biject — Careers**.
2. Rename the first tab to **`Roles`** (double-click the tab name at the bottom).
3. In row 1 of the **Roles** tab, paste these column headers across A1:K1:

   ```
   Title  Team  Location  Type  Status  Summary  About  Responsibilities  Requirements  WhyItMatters  Compensation
   ```

4. Add one row per open role. Notes:
   - **Status** — put `Open` to show it, `Closed` to hide it.
   - **Responsibilities** / **Requirements** — put **one bullet per line** inside the cell (press **Alt+Enter** / **⌥+Return** to add a line break within a cell), or separate items with ` | `.
   - **About** / **WhyItMatters** — free paragraphs (line breaks become separate paragraphs).
   - Leave any cell blank and that part is simply omitted on the page.

   _(A second tab named **`Applications`** is created automatically the first time someone applies — you don't need to make it.)_

> Tip: the **Research Associate** role is already seeded in `careers.js` as a fallback, so the page works even before you do this. Copy its fields from that file into your first Sheet row to get started fast.

---

## 2. Add the script

1. In the Sheet, open **Extensions ▸ Apps Script**.
2. Delete the placeholder `function myFunction() {}`.
3. Open **`careers-apps-script.gs`** (in this project), copy the **entire** file, and paste it in.
4. Click the **Save** icon (💾).

---

## 3. Deploy it as a Web App

1. Click **Deploy ▸ New deployment**.
2. Click the gear ⚙ next to "Select type" → choose **Web app**.
3. Set:
   - **Description**: `biject careers`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**  ← important, this lets the public page reach it
4. Click **Deploy**.
5. Approve the permissions prompt (it needs access to *this* Sheet and to Drive for résumé storage). You may see an "unverified app" screen — click **Advanced ▸ Go to … (unsafe)**; this is your own script, it's safe.
6. Copy the **Web app URL**. It looks like:

   ```
   https://script.google.com/macros/s/AKfy............../exec
   ```

---

## 4. Paste the URL into the page

1. Open **`careers.js`** (in this project).
2. At the very top, set:

   ```js
   const CONFIG = {
     APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfy.../exec"
   };
   ```

3. Save. Reload `careers.html`.

That's it. The amber "not wired up" banner disappears, roles load from your Sheet, and applications + résumés flow into it.

---

## Adding / editing roles later

Just edit the **Roles** tab in your Sheet:

- **New role** → add a row.
- **Take a role down** → set its **Status** to `Closed` (or delete the row).
- Changes appear on the page on the next load — no redeploy, no code edits.

## Where applications go

Each submission appends a row to the **Applications** tab:

| Timestamp | Role | Name | Email | Location | LinkedIn / Portfolio | Résumé | Heard From | Source Page |
|---|---|---|---|---|---|---|---|---|

The **Résumé** column holds a link to the uploaded file, saved to a Drive folder named **"biject — Résumés"** (or a folder you specify via `RESUME_FOLDER_ID` at the top of the script).

> **Want email alerts on new applications?** In the Sheet: **Tools ▸ Notification settings ▸ Edit notifications**, and choose "Notify me when… any changes are made." Or tell me and I'll add an email notification line to the script.

---

## Troubleshooting

- **Roles don't load / form errors** → re-check that "Who has access" is **Anyone**, and that the URL ends in `/exec` (not `/dev`).
- **You changed the script** → you must **Deploy ▸ Manage deployments ▸ ✏️ Edit ▸ Version: New version ▸ Deploy** for changes to go live. (Re-using the same deployment keeps the same URL.)
- **Résumé uploads fail on large files** → the page caps uploads at 8 MB; Apps Script has its own limits, so keep résumés reasonable.
