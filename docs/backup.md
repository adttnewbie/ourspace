# OurSpace Backup

Backup dibuat oleh Google Apps Script dan disimpan sebagai file JSON private di:

```text
OurSpace/backups/
```

## Yang Dibackup

- `members`
- `pairing_sessions`
- `couple_settings`
- `sticky_notes`
- `date_plans`
- `gallery`

Gallery yang dibackup hanya metadata Spreadsheet. File foto asli tetap berada di Google Drive dan tidak ikut dimasukkan ke JSON backup.

## Yang Tidak Dibackup

- Restore belum diimplementasikan.
- File foto asli tidak disalin ulang.
- Public sharing URL tidak dibuat.
- Backup lama belum dibersihkan otomatis.

## Setup

1. Isi Script Property `DRIVE_ROOT_FOLDER_ID`.
2. Jalankan `setupSchema()` setelah schema berubah.
3. Jalankan `authorizeOurSpace()` sekali dari Apps Script editor.
4. Deploy ulang Web App setelah push backend.

## Manual Backup

Dari Apps Script editor, pilih function:

```text
runBackup
```

Lalu klik Run. Jika berhasil, file JSON muncul di folder `backups`, dan sheet `backups` mendapat row `success`.

## Verifikasi File Backup

1. Buka file JSON terbaru di `OurSpace/backups/`.
2. Pastikan ada metadata `generatedAt`, `appName`, `version`, `includedSheets`, dan `itemCounts`.
3. Pastikan `includedSheets` berisi `members`, `pairing_sessions`, `couple_settings`, `sticky_notes`, `date_plans`, dan `gallery`.
4. Pastikan `itemCounts` masuk akal untuk setiap sheet.
5. Cari `sessionToken` dan pastikan tidak ada raw session token.
6. Pastikan `gallery` hanya berisi metadata; file foto asli dan base64 upload asli tidak ada di JSON.

## Trigger Otomatis

Install trigger harian:

```text
installBackupTrigger
```

Hapus trigger backup:

```text
removeBackupTriggers
```

Trigger menjalankan `runBackup()` sekali per hari.
