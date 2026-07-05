# Live Testing Checklist

Use this before building the next feature phase.

## Setup

1. Update the Apps Script project with every file from `apps-script/`.
2. In Apps Script, run `setupSchema` once if sheets are not created yet.
   Run it again after any schema change, for example after adding `date_plans` or `gallery`.
3. Confirm Script Properties are configured:
   - `SHEET_ID`
   - `SESSION_SECRET`
   - `PAIRING_WINDOW_SECONDS`
   - `DRIVE_ROOT_FOLDER_ID`
4. In Apps Script editor, run `authorizeOurSpace` once and approve Google Drive access.
   Expect it to return `status: authorized` and the Drive root folder name.
5. Deploy Apps Script with a new Web App version:
   - Deploy > Manage deployments
   - Edit the Web App deployment
   - Version: New version
   - Deploy
6. Copy the Web App `/exec` URL into `.env` as `APPS_SCRIPT_URL`.
7. Keep frontend calls on the proxy:

```bash
VITE_API_URL="/api/apps-script"
APPS_SCRIPT_URL="https://script.google.com/macros/s/xxx/exec"
```

8. Run proxy-capable local dev:

```bash
vercel dev
```

`bun dev` has a Vite fallback proxy in this repo, but `vercel dev` is the closer production check for `/api/apps-script`.

## Backup Setup

1. Run `setupSchema()`.
2. Confirm `DRIVE_ROOT_FOLDER_ID` points to the private OurSpace Drive folder.
3. Run `authorizeOurSpace()`.
4. Run `backup.health` from Settings with `Cek Backup`.
5. Run `runBackup()` manually from Apps Script editor.
6. Confirm a JSON file appears in Drive folder `backups`.
7. Confirm the `backups` sheet has a `success` row.
8. Open the JSON file and confirm `generatedAt`, `includedSheets`, and `itemCounts` exist.
9. Confirm the expected sheets exist and the item counts look right.
10. Search the JSON for `sessionToken` and confirm no raw token is present.
11. Confirm gallery data is metadata only, not original image base64.
12. Run `installBackupTrigger()`.
13. In Apps Script Triggers, confirm a daily `runBackup` trigger exists.

## Settings Checks

1. Open Settings.
2. Confirm API path shows `/api/apps-script`.
3. Click `Cek koneksi`.
4. Expect `Backend tersambung.`
5. Click `Cek session`.
6. If no local session exists, expect `UNAUTHORIZED`.
7. Click `Cek Gallery` after pairing.
8. Click `Cek Backup` after pairing.
9. Expect `Gallery siap dipakai.` and `Backup siap dipakai.`
10. Use `Hapus session lokal` to reset the browser back to `/pairing`.

## Local API Smoke Test

Run these while `vercel dev` or `bun dev` is serving the proxy:

```bash
curl --max-time 10 -s -X POST http://127.0.0.1:3000/api/apps-script \
  -H 'Content-Type: text/plain;charset=utf-8' \
  --data '{"action":"health.check","memberId":"","sessionToken":"","payload":{}}'
```

Expected: fast JSON with `ok: true`.

```bash
curl --max-time 10 -s -X POST http://127.0.0.1:3000/api/apps-script \
  -H 'Content-Type: text/plain;charset=utf-8' \
  --data '{"action":"session.resume","memberId":"","sessionToken":"","payload":{}}'
```

Expected: fast JSON with `ok: false` and error code `SESSION_INVALID`.

## Pairing

1. Open `/pairing` on the first browser or device.
2. Enter nickname.
3. Hold the pairing button.
4. Expect first device to enter waiting state.
5. Open `/pairing` on the second browser or device.
6. Enter a different nickname.
7. Hold the pairing button.
8. Expect both devices to redirect to Home.
9. Confirm `anniversaryDate` is created once.
10. Restart the dev server.
11. Refresh both browsers and expect Home through `session.resume`.
12. Call `pairing.start` after the couple exists and expect `COUPLE_ALREADY_PAIRED`.

Pairing is one-time only because it represents the anniversary event.

## Session Recovery

1. Clear local storage on a third browser/device.
2. Open `/pairing`.
3. Expect recovery flow, not hold-button pairing.
4. Enter the right nickname with a wrong anniversary date.
5. Expect generic recovery failure copy.
6. Enter the right nickname and correct anniversary date.
7. Expect a new session token to be issued and saved, then redirect to Home.
8. Confirm `anniversaryDate` did not change in `couple_settings`.
9. Confirm expired rows in `pairing_sessions` do not affect `session.resume`.

Recovery currently replaces the `sessionToken` for that member/device identity.
Full multi-device approval can be added later if needed.

## Home

1. Confirm Home loads greeting from backend.
2. Confirm days together appears.
3. Create a note from Home quick add.
4. Confirm Home refreshes and note count updates.

## Notes CRUD

1. Open Notes.
2. Create a note from Notes.
3. Edit your own note.
4. Delete your own note.
5. On the other member device, confirm edit/delete buttons are hidden for notes you did not create.
6. If testing through API manually, confirm backend returns `FORBIDDEN` when another member tries to update/delete someone else's note.

## Date Plans CRUD

1. Open Dates.
2. Create a date plan with title and scheduled date/time.
3. Edit your own date plan.
4. Delete your own date plan.
5. Open the Spreadsheet and confirm the deleted row has `deletedAt` filled.
6. On the other member device, confirm edit/delete buttons are hidden for date plans you did not create.
7. If testing through API manually, confirm backend returns `FORBIDDEN` when another member tries to update/delete someone else's date plan.

## Date Plans Calendar

1. Open Dates and switch from `List` to `Kalender`.
2. Navigate to the previous and next month.
3. Select a day that has a plan and confirm the selected-day card shows the title, time, location, status, and notes.
4. Select a day without plans and confirm the empty message is friendly.
5. Switch back to `List` and confirm create, edit, and delete still work there.

## Shared Lists CRUD

1. Open Lists from Home or Settings.
2. Create a shared item with title, category, status, and optional notes.
3. Edit your own shared item.
4. Delete your own shared item.
5. Open the Spreadsheet and confirm the deleted row has `deletedAt` filled.
6. On the other member device, confirm edit/delete buttons are hidden for items they did not create.
7. If testing through API manually, confirm backend returns `FORBIDDEN` when another member tries to update/delete someone else's shared item.
8. Run a backup and confirm `shared_lists` appears in the backup JSON `includedSheets`.

## Gallery CRUD

1. Open Gallery.
2. Run `Cek Gallery` in Settings and confirm it passes.
3. Upload a JPG, PNG, or WebP photo under 1 MB with caption and taken date.
4. Confirm the preview appears in the gallery card.
5. Upload a larger photo under 5 MB.
6. Confirm placeholder preview is intentional if the thumbnail is not returned.
7. Try uploading a file over 5 MB and expect a friendly rejection.
8. Try submitting without caption or taken date and expect a friendly rejection.
9. Edit your own caption and taken date.
10. Delete your own photo.
11. Open the Spreadsheet and confirm the deleted row has `deletedAt` filled.
12. Confirm the Drive file remains private and is not exposed as a public URL.
13. On the other member device, confirm edit/delete buttons are hidden for photos they did not upload.
14. If testing through API manually, confirm backend returns `FORBIDDEN` when another member tries to update/delete someone else's photo.

## Final Mobile QA

Run this on a narrow phone viewport or real mobile browser.

1. Pairing: nickname step is compact, hold screen is clear, waiting/expired/error copy is short and understandable.
2. Home: greeting and days-together card is the emotional center, shortcuts show Notes, Dates, Gallery, and Lists.
3. Notes: create, edit, delete, validation, color picker, and note cards are readable without cramped buttons.
4. Dates: List CRUD still works, Kalender month navigation works, selected day is obvious, selected-day details stay compact.
5. Gallery: upload form explains file limits, preview or placeholder looks intentional, caption/date/edit/delete are readable.
6. Shared Lists: filters are compact, category/status chips include text, create/edit/delete are easy to tap.
7. Backup: Settings `Cek Backup` and `Backup sekarang` show loading and success/error states clearly.
8. Settings: API/session/gallery/debug sections are readable, and `Hapus session lokal` is visually careful before reset.
9. Bottom nav: no page content or primary button is hidden behind the nav at the bottom.
10. Accessibility: every form has visible or accessible labels, focus rings are visible, and status is not color-only.

## Network Check

Browser Network tab should show:

```text
POST /api/apps-script
```

It should not show:

```text
POST https://script.google.com/...
```
