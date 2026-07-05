# OurSpace Apps Script Backend

Backend ini adalah Google Apps Script untuk OurSpace v1. Pairing onboarding dan session resume sudah diimplementasikan; Notes CRUD masih placeholder.

## File

- `Code.gs`: entrypoint `doPost(e)`.
- `00_config.gs`: Script Properties dan schema sheet.
- `01_errors.gs`: helper error.
- `02_responses.gs`: helper response JSON.
- `03_requests.gs`: parser request POST JSON.
- `04_ids_time.gs`: helper ID dan timestamp.
- `05_spreadsheet.gs`: helper Spreadsheet dan `setupSchema()`.
- `06_session.gs`: session validation.
- `07_actions.gs`: action router dan placeholder Notes/Home handlers.
- `08_pairing.gs`: pairing onboarding.
- `09_members.gs`: helper member/session.
- `appsscript.json`: manifest Apps Script.

## Buat Spreadsheet

1. Buka Google Sheets.
2. Buat spreadsheet baru, misalnya `OurSpace Database`.
3. Copy Spreadsheet ID dari URL.
   - Contoh URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.
4. Sheet bisa kosong dulu. Nanti jalankan `setupSchema()` dari editor Apps Script untuk membuat/memvalidasi sheet:
   - `members`
   - `pairing_sessions`
   - `couple_settings`
   - `sticky_notes`

## Buat Apps Script

1. Buka `script.google.com`.
2. Buat project baru.
3. Buat file sesuai isi folder `apps-script/`.
4. Copy isi setiap file `.gs` ke file Apps Script dengan nama yang sama.
5. Copy isi `appsscript.json` ke manifest Apps Script.

## Script Properties

Di Apps Script editor:

1. Buka Project Settings.
2. Tambahkan Script Properties:

| Key | Value |
| --- | --- |
| `SHEET_ID` | Spreadsheet ID dari Google Sheets |
| `SESSION_SECRET` | String random panjang untuk hashing session nanti |
| `PAIRING_WINDOW_SECONDS` | `30` |

## Setup schema

Setelah properties diisi:

1. Pilih function `setupSchema`.
2. Klik Run.
3. Izinkan akses Spreadsheet saat diminta.
4. Pastikan sheet dan header sudah muncul di Spreadsheet.

## Deploy sebagai Web App

Detail redeploy ada di `DEPLOY.md`, termasuk cara memperbaiki error `doPost` tidak ditemukan.

1. Klik Deploy.
2. Pilih New deployment.
3. Type: Web app.
4. Execute as: Me.
5. Who has access: sesuai kebutuhan private/testing.
6. Deploy dan copy Web App URL.

## Hubungkan ke frontend

Di root project frontend:

1. Buat `.env` dari `.env.example`.
2. Isi:

```bash
VITE_API_URL="/api/apps-script"
APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

3. Restart `bun dev`.

Frontend tidak memanggil Apps Script langsung dari browser karena respons Apps Script tidak punya CORS header yang stabil. Gunakan proxy `/api/apps-script`; lihat `docs/api-proxy.md`.

## Test manual cepat

Kirim POST JSON ke Web App URL:

```json
{
  "action": "health.check",
  "memberId": "",
  "sessionToken": "",
  "payload": {}
}
```

Response sukses:

```json
{
  "ok": true,
  "data": {
    "service": "ourspace-apps-script",
    "status": "ok"
  }
}
```
