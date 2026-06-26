# Apps Script Setup

This adds free persistent editing with audit logs using Google Sheets.

## 1. Create The Google Sheet

Create a Google Sheet with these tabs:

- `Knowledge`
- `Drafts`
- `Deleted Records`
- `Record Views`
- `Audit Log`
- `Search Synonyms`

You can copy your current `knowledge.csv` into the `Knowledge` tab. Keep the existing CSV headers. The script will add missing operational columns such as `ID`, `Updated At`, and `Updated By`.

The script can create `Drafts`, `Deleted Records`, `Record Views`, and seed `Search Synonyms` for you when you run `setupSheets`.

## 2. Add The Apps Script

In the Google Sheet:

1. Open `Extensions > Apps Script`.
2. Replace the default code with `apps-script/Code.gs`.
3. If using the Apps Script manifest editor, copy `apps-script/appsscript.json`.
4. Save the project.
5. Run `setupSheets` once and approve the permissions.

Important: replace the existing Apps Script file instead of adding a second copy. Apps Script runs every `.gs` file in the project together, so keeping both `Code.gs` and an old backup like `Code-v0.gs` with the same constants will cause duplicate identifier errors.

If you already deployed an older version of the script, replace the code, save it, run `setupSheets` again, then create a new deployment version.

Drafts need the current `Code.gs` because the website calls `listDrafts`, `saveDraft`, `deleteDraft`, and `publishDraft`. If the website says a draft action is unknown, the Apps Script deployment is still on an older version.

## 3. Deploy As A Web App

In Apps Script:

1. Click `Deploy > New deployment`.
2. Select `Web app`.
3. Set access to your organization if available.
4. Choose the execution mode:
   - `User accessing the web app` if editors all have sheet access.
   - `Me` if the app owner should write on behalf of users.
5. Deploy and copy the `/exec` URL.

## 4. Connect The Website

Open `config.js` and paste the deployment URL:

```js
window.APP_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
};
```

Refresh the site. The status pill should change from `CSV mode` to `Google Sheet mode`.

## Attachments And Images

For the `Attachments / Images` column, the most reliable format is still a Drive sharing link in the cell:

```text
Screenshot name - https://drive.google.com/file/d/FILE_ID/view
```

If Google Sheets converts the link into a Drive card or linked cell, the Apps Script attempts to read the hidden link behind that card and send it to the website. For Drive file chips, also copy the updated `appsscript.json`, then save, reauthorize, and deploy a new web app version.

If the cell only contains an image filename such as `G Drive Missing.jpg`, the Apps Script can try to find a matching file in Google Drive. For images under about 1.5 MB, it embeds the image directly so the website can display it without relying on the Drive thumbnail endpoint. Larger images fall back to a Drive link. This requires the updated manifest permissions and the file name should be unique enough to avoid matching the wrong image.

Avoid inserting images directly over cells, because those are sheet objects rather than cell values and the website cannot reliably read them.

## AI Match

AI Match is optional and disabled by default. It compares the current Inquiry text against the top records already found by the website, then returns a human-reviewed recommendation. It does not edit records, publish drafts, archive, delete, or write AI output back to the Sheet.

To enable it:

1. In Apps Script, open `Project Settings > Script properties`.
2. Add `AI_MATCH_ENABLED` with the value `true`.
3. Add `OPENAI_API_KEY` with your OpenAI API key.
4. Optional: add `OPENAI_MODEL` if you want to override the default model.
5. In `config.js`, set `AI_MATCH_ENABLED: true`.
6. Save, then deploy a new web app version.

To disable AI Match again, set `AI_MATCH_ENABLED: false` in `config.js` and remove the Apps Script `AI_MATCH_ENABLED` property or set it to `false`, then deploy a new web app version.

The frontend never stores the OpenAI key. The browser sends the intake text and top candidate records to Apps Script, and Apps Script sends that limited context to OpenAI.

Avoid pasting passwords, MFA codes, or other sensitive private data into the Inquiry field before using AI Match.

## Search Synonyms

The `Search Synonyms` tab controls search aliases without editing website code.

Columns:

- `Term`: the main word or phrase
- `Synonyms`: alternate words separated by `|`
- `Notes`: optional maintainer notes

Example:

```text
Term: zoom
Synonyms: nyu zoom|zoom cloud|meeting recording|cloud recording
```

After editing synonyms, refresh the website. The app loads synonyms when it starts.

## Drafts

New records start in the `Drafts` tab. Each save creates a new draft version so reviewers can open older versions before publishing. Publishing copies the selected draft version into `Knowledge`; deleting a draft removes all versions of that draft so the review list stays clean.

## Archive And Delete

Published records can be archived or deleted from the website. Archiving keeps the row in `Knowledge` and sets `Status` to `Archived`, which hides it from normal search results. Deleting moves the row from `Knowledge` into `Deleted Records` with `Deleted At` and `Deleted By` values. The website's Archived view can restore archived records back into active records. Deleted records remain in the backend `Deleted Records` tab for history/audit and are not shown in the website UI after confirmation. These actions write to `Audit Log`.

## Record Views

The website quietly logs opened records to the `Record Views` tab. This is hidden from the website UI and is intended for internal usage reporting. Each row includes timestamp, viewer when Google exposes it, record ID, topic, status, source area, page URL, and browser user agent. If the web app is deployed with broad "Anyone" access, viewer email may be `unknown`.

## 5. Audit Logs

Every saved edit appends a row to `Audit Log` with:

- timestamp
- editor
- action
- record ID
- topic
- changed fields
- before JSON
- after JSON
- note

If the editor email shows as `unknown`, adjust the web app deployment mode or your Workspace domain policy.
