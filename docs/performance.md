# Performance Notes

OurSpace runs on a Vite frontend plus Google Apps Script, so the main goal is
to avoid repeated calls and make slow network moments feel intentional.

## Optimized Paths

- `session.resume` is cached in memory for a short TTL. Manual Settings checks
  still force a fresh session validation.
- Identical in-flight safe read requests are deduped in `src/lib/api.ts`.
- Home, Notes, Date Plans, and Shared Lists keep small last-known JSON payloads
  in `sessionStorage` and refresh in the background.
- Gallery keeps its list cache in memory only because `thumbnailData` can contain
  base64 previews. It should not be persisted to browser storage.
- Create/update/delete flows update the local list after backend success instead
  of refetching the full list.
- Home summary requests only one Gallery item so photo thumbnails do not slow
  the first Home render.
- Gallery, Dates, Lists, Notes, and Settings are lazy-loaded route chunks.
- Loading states use compact scrapbook skeleton cards instead of blank screens or
  large spinner-only panels.

## Cache TTLs

- `home.get`: 45 seconds, `sessionStorage`.
- `notes.list`: 60 seconds, `sessionStorage`.
- `datePlans.list`: 60 seconds, `sessionStorage`.
- `sharedLists.list`: 60 seconds, `sessionStorage`.
- `gallery.list`: 60 seconds, memory only.

If cached data exists, the page shows it first with a small "Lagi nyegerin
data..." state while the background request refreshes. If refresh fails, the
cached UI stays visible with a soft warning. If no cache exists, the page uses
the layout-matched skeleton and then the normal error state if the request fails.

## In-flight Dedupe

Only safe reads are deduped:

- `health.check`
- `session.resume`
- `couple.status`
- `home.get`
- `notes.list`
- `datePlans.list`
- `gallery.list`
- `sharedLists.list`
- `gallery.health`
- `backup.health`
- `backups.list`

Mutations and state-changing actions are intentionally not deduped:

- create/update/delete actions
- `pairing.start`
- `pairing.signal`
- `session.recover`
- `backup.runNow`
- `couple.reset`

Manual Settings "Cek session" calls `session.resume` with a forced fresh
validation, bypassing the short in-memory session cache.

## Debugging API Calls

Development builds log lightweight API traces from `src/lib/api.ts` with:

- action
- timestamp
- cache hit/miss
- in-flight dedupe reuse
- duration
- success/error code

The trace never logs `sessionToken`, raw request body, or secrets. Production
builds skip these logs.

## Apps Script Notes

- `health.check` returns before Spreadsheet/Drive access.
- `setupSchema()` is manual only and must not run during normal `doPost`.
- `getSpreadsheet()` reuses the Spreadsheet object within the runtime context to
  reduce repeated `SpreadsheetApp.openById` overhead.
- `gallery.list` reads Spreadsheet metadata only. It does not fetch Drive blobs.

## Known Limits

- Apps Script and Spreadsheet reads can still be slow on cold starts.
- Gallery list payload can grow if many small photos store base64 thumbnails.
  Large photos intentionally use placeholders instead of heavy thumbnail data.
- Backup can be heavy by design and should stay manual/triggered, not part of
  normal page loading.

## Manual Checks

1. Open protected pages twice; the second visit should reuse cached list data.
2. Navigate between Notes, Dates, Gallery, Lists, and Settings; the app shell
   should stay visible while lazy chunks load.
3. Create/edit/delete an item and confirm the list updates without a full reload.
4. Confirm Network does not show duplicate simultaneous identical API requests.
5. Confirm browser requests still go through `/api/apps-script`.
