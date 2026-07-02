# Data Model

## Konvensi umum

Semua sheet data user memakai kolom dasar:

- `id`: UUID/string unik.
- `createdAt`: ISO timestamp.
- `updatedAt`: ISO timestamp.
- `createdBy`: `memberId` pembuat.
- `deletedAt`: kosong jika aktif, ISO timestamp jika soft-deleted.

Soft delete lebih aman untuk app personal karena data kenangan sulit diganti.

## Sheet: `members`

Menyimpan dua device utama yang berhasil pairing.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | string | `memberId` |
| nickname | string | Diisi saat pairing |
| deviceLabel | string | Contoh: `device_a`, `device_b` |
| sessionTokenHash | string | Hash token session, bukan token mentah |
| pairedAt | string | ISO timestamp sukses pairing |
| lastSeenAt | string | ISO timestamp request terakhir |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |
| deletedAt | string | Kosong jika aktif |

## Sheet: `pairing_sessions`

Menyimpan proses hold button sebelum pasangan terikat.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | string | UUID |
| status | string | `waiting`, `paired`, `expired`, `cancelled` |
| firstNickname | string | Nickname device pertama |
| firstSignalAt | string | ISO timestamp |
| secondNickname | string | Nickname device kedua |
| secondSignalAt | string | ISO timestamp |
| pairedAt | string | ISO timestamp sukses |
| expiresAt | string | `firstSignalAt + 30 detik` |
| memberAId | string | Terisi saat paired |
| memberBId | string | Terisi saat paired |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |

## Sheet: `couple_settings`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| key | string | Nama setting |
| value | string | Value sebagai string/JSON |
| updatedAt | string | ISO timestamp |

Setting v1:

- `anniversaryDate`: timestamp sukses pairing dari backend.
- `coupleName`: opsional untuk label bersama.
- `theme`: default `pastel_scrapbook`.
- `driveRootFolderId`: folder Drive fase lanjut.
- `backupFolderId`: folder backup fase lanjut.

## Sheet: `sticky_notes`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | string | UUID |
| body | string | Isi sticky note pendek |
| color | string | Key warna pastel, contoh `pink`, `mint`, `yellow`, `blue` |
| createdBy | string | `memberId` pembuat |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |
| deletedAt | string | Kosong jika aktif |

Aturan:

- Tidak perlu title pada v1.
- Edit/hapus hanya boleh dilakukan oleh `createdBy`.
- Notes diurutkan dari `createdAt` terbaru.

## Sheet fase lanjut: `date_plans`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | string | UUID |
| title | string | Nama date |
| scheduledAt | string | ISO timestamp atau tanggal |
| locationName | string | Nama tempat |
| status | string | `idea`, `planned`, `done`, `cancelled` |
| notes | string | Catatan |
| createdBy | string | `memberId` pembuat |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |
| deletedAt | string | Kosong jika aktif |

## Sheet fase lanjut: `gallery`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | string | UUID |
| fileId | string | Google Drive file ID |
| fileName | string | Nama file |
| mimeType | string | `image/jpeg`, `image/png`, atau `image/webp` |
| fileSize | number | Max 5 MB |
| thumbnailData | string | Base64 thumbnail kecil untuk preview private |
| caption | string | Wajib |
| takenAt | string | Wajib, tanggal foto/momen |
| createdBy | string | `memberId` pembuat |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |
| deletedAt | string | Kosong jika aktif |

Aturan:

- V1 gallery hanya foto, bukan video.
- File Drive tetap private.
- Preview app memakai thumbnail dari API, bukan public link.

## Sheet fase lanjut: `shared_lists`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | string | UUID |
| title | string | Item list |
| category | string | `place`, `food`, `movie`, `gift`, `activity`, dll |
| status | string | `todo`, `doing`, `done` |
| notes | string | Catatan |
| createdBy | string | `memberId` pembuat |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |
| deletedAt | string | Kosong jika aktif |

## Sheet fase lanjut: `backups`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | string | UUID |
| fileId | string | File backup di Drive |
| status | string | `success` atau `failed` |
| message | string | Ringkasan hasil |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |

## Folder Drive

Struktur minimal:

```text
OurSpace/
  gallery/
  backups/
```

Simpan ID folder di Apps Script Properties dan mirror non-secret di `couple_settings` jika perlu.
