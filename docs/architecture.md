# Architecture

## Ringkasan

Frontend React memanggil Google Apps Script Web App sebagai API. Apps Script menyimpan data pairing, session, home, dan notes ke Google Spreadsheet. Google Drive dipakai untuk gallery dan backup pada fase lanjut.

```text
React app (Vite + Tailwind + shadcn)
  -> fetch POST JSON
Google Apps Script Web App
  -> SpreadsheetApp
  -> DriveApp (fase lanjut)
Google Spreadsheet + Google Drive
```

## Frontend

Stack:

- Vite React TypeScript.
- Tailwind CSS untuk styling utility.
- shadcn/ui untuk komponen dasar.
- React Router saat halaman mulai lebih dari satu.
- PWA basic untuk install ke home screen.

Route v1:

- `/pairing`
- `/` home.
- `/notes`
- `/settings`

Route fase lanjut:

- `/gallery`
- `/dates`
- `/lists`

Navigasi mobile memakai bottom tabs:

- Home.
- Notes.
- Gallery.
- Dates.
- More.

Tab yang belum aktif boleh disabled atau menampilkan "segera hadir".

## Backend API

Apps Script Web App menyediakan satu endpoint `doPost(e)` untuk semua action. Frontend mengirim JSON dengan bentuk umum:

```json
{
  "action": "notes.create",
  "memberId": "member_123",
  "sessionToken": "session_abc",
  "payload": {}
}
```

Jangan memakai `GET` untuk data private karena token akan lebih mudah bocor lewat URL/log.

## Database

Google Spreadsheet dipakai sebagai database tabular. Sheet v1:

- `members`
- `pairing_sessions`
- `couple_settings`
- `sticky_notes`

Gunakan `id` berbasis UUID/string unik untuk semua row. Jangan pakai nomor baris sebagai ID karena urutan sheet bisa berubah.

Sheet fase lanjut:

- `date_plans`
- `gallery`
- `shared_lists`
- `backups`

## Session dan pairing

- Pairing pertama mengikat dua device utama.
- Setiap device menyimpan `memberId` dan `sessionToken` di `localStorage`.
- Apps Script memvalidasi `memberId` dan `sessionToken` untuk request setelah pairing.
- `memberId` menentukan ownership item.
- Hanya pembuat item yang boleh edit/hapus.

Pairing memakai polling ringan:

- Frontend mengirim sinyal setelah tombol ditahan 3 detik.
- Frontend memanggil status tiap 1-2 detik saat waiting state.
- Pairing sukses jika dua sinyal valid masuk dalam window 30 detik.

## Secrets

Simpan konfigurasi sensitif di Apps Script Properties:

- `SHEET_ID`
- `DRIVE_ROOT_FOLDER_ID`
- `SESSION_SECRET`
- `PAIRING_WINDOW_SECONDS`

Jangan hardcode ID resource atau secret di frontend.

## Storage fase lanjut

Google Drive menyimpan file asli gallery dan backup. Spreadsheet hanya menyimpan metadata:

- Drive file ID.
- Thumbnail/cache payload untuk preview private.
- MIME type.
- Caption.
- Taken date.
- Owner/author.
- Created timestamp.

## Deployment

Frontend:

- Deploy ke Vercel.
- Simpan URL API di env `VITE_API_URL`.

Backend:

- Deploy Apps Script sebagai Web App.
- Resource Google dibuat dari nol: Spreadsheet, folder Drive, Apps Script.
- Workflow Apps Script masih dokumentasi dulu; implementasi backend lokal atau `clasp` bisa diputuskan setelah blueprint ini.

## Risiko teknis

- Apps Script punya limit eksekusi dan kuota harian.
- CORS dan mode deployment Apps Script harus dites saat implementasi backend dimulai.
- Polling terlalu sering bisa membebani Apps Script.
- Upload file besar via Apps Script bisa lambat, jadi gallery dibatasi 5 MB per foto pada fase lanjut.
- Spreadsheet tidak cocok untuk query kompleks atau data sangat besar.
- Private Drive file tidak bisa langsung dipasang sebagai URL publik tanpa melemahkan privacy.

Mitigasi:

- Polling pairing 1-2 detik hanya saat waiting state.
- Pagination sederhana di API list.
- Simpan timestamp ISO untuk sorting.
- Hindari query lintas-sheet yang berat.
- Untuk gallery private, tampilkan thumbnail/base64 kecil dari API dan simpan file asli di Drive.
