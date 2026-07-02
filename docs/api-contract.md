# API Contract

## Base request

Semua request dari frontend ke Apps Script memakai `POST` JSON.

```json
{
  "action": "notes.list",
  "memberId": "member_123",
  "sessionToken": "session_plaintext_from_local_storage",
  "payload": {}
}
```

Pairing awal boleh mengirim `memberId` dan `sessionToken` kosong karena session belum terbentuk.

## Base response

Sukses:

```json
{
  "ok": true,
  "data": {}
}
```

Gagal:

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token"
  }
}
```

## Error code

- `UNAUTHORIZED`: token salah atau kosong.
- `BAD_REQUEST`: payload tidak valid.
- `NOT_FOUND`: item tidak ditemukan.
- `CONFLICT`: update bentrok.
- `FORBIDDEN`: member tidak boleh mengubah item milik member lain.
- `PAIRING_EXPIRED`: window pairing 30 detik habis.
- `INTERNAL_ERROR`: error tidak terduga.

## Pairing

### `pairing.start`

Dipanggil saat user pertama masuk flow pairing dan mengisi nickname.

Payload:

```json
{
  "nickname": "Nama Kamu"
}
```

Response data:

```json
{
  "pairingSessionId": "pair_123",
  "status": "waiting",
  "expiresAt": "2026-07-02T08:00:30.000Z"
}
```

### `pairing.signal`

Dipanggil setelah tombol berhasil ditahan 3 detik.

Payload:

```json
{
  "pairingSessionId": "pair_123",
  "nickname": "Nama Kamu"
}
```

Response data saat masih menunggu pasangan:

```json
{
  "status": "waiting",
  "expiresAt": "2026-07-02T08:00:30.000Z"
}
```

Response data saat paired:

```json
{
  "status": "paired",
  "memberId": "member_a",
  "sessionToken": "session_token",
  "anniversaryDate": "2026-07-02T08:00:12.000Z",
  "members": [
    { "id": "member_a", "nickname": "Nama Kamu" },
    { "id": "member_b", "nickname": "Nama Pasangan" }
  ]
}
```

### `pairing.status`

Dipanggil tiap 1-2 detik saat waiting state.

Payload:

```json
{
  "pairingSessionId": "pair_123"
}
```

Response data sama seperti `pairing.signal`.

## Session

### `session.resume`

Memvalidasi `memberId` dan `sessionToken` dari `localStorage`.

Payload:

```json
{}
```

Response data:

```json
{
  "member": {
    "id": "member_a",
    "nickname": "Nama Kamu"
  },
  "members": [
    { "id": "member_a", "nickname": "Nama Kamu" },
    { "id": "member_b", "nickname": "Nama Pasangan" }
  ],
  "anniversaryDate": "2026-07-02T08:00:12.000Z"
}
```

## Home

### `home.get`

Payload:

```json
{}
```

Response data:

```json
{
  "greeting": "Hai, Nama Kamu",
  "anniversaryDate": "2026-07-02T08:00:12.000Z",
  "daysTogether": 1,
  "today": {
    "stickyNotes": []
  },
  "counts": {
    "stickyNotes": 0
  }
}
```

Jika `today.stickyNotes` kosong, frontend menyembunyikan section terbaru hari ini.

## Sticky Notes

### `notes.list`

Payload:

```json
{
  "limit": 50,
  "cursor": null
}
```

Response data:

```json
{
  "items": [
    {
      "id": "note_123",
      "body": "Aku kangen es krim kemarin.",
      "color": "pink",
      "createdBy": "member_a",
      "createdByNickname": "Nama Kamu",
      "createdAt": "2026-07-02T08:05:00.000Z",
      "updatedAt": "2026-07-02T08:05:00.000Z",
      "canEdit": true
    }
  ],
  "nextCursor": null
}
```

### `notes.create`

Payload:

```json
{
  "body": "Aku kangen es krim kemarin.",
  "color": "pink"
}
```

### `notes.update`

Payload:

```json
{
  "id": "note_123",
  "body": "Aku kangen es krim kemarin banget.",
  "color": "yellow"
}
```

Backend wajib mengembalikan `FORBIDDEN` jika `memberId` request bukan `createdBy`.

### `notes.delete`

Payload:

```json
{
  "id": "note_123"
}
```

Delete adalah soft delete. Backend wajib mengembalikan `FORBIDDEN` jika `memberId` request bukan `createdBy`.

## Date Plans fase lanjut

Actions:

- `datePlans.list`
- `datePlans.create`
- `datePlans.update`
- `datePlans.delete`

Create payload:

```json
{
  "title": "Dinner",
  "scheduledAt": "2026-07-12T19:00:00+07:00",
  "locationName": "Nama tempat",
  "status": "planned",
  "notes": "Catatan"
}
```

## Gallery fase lanjut

Actions:

- `gallery.list`
- `gallery.create`
- `gallery.update`
- `gallery.delete`

Create payload:

```json
{
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 4800000,
  "base64": "...",
  "caption": "Caption wajib",
  "takenAt": "2026-07-02"
}
```

Rules:

- `fileSize` maksimal 5 MB.
- `caption` dan `takenAt` wajib.
- Backend menyimpan original ke private Drive.
- API list/detail mengembalikan thumbnail/base64 kecil untuk preview private, bukan public URL.

## Settings

### `settings.resetPairing`

Dipakai dari settings dengan konfirmasi kuat.

```json
{
  "mode": "keep_data"
}
```

Mode awal yang disarankan: `keep_data`. Mode hapus data bisa ditambahkan belakangan jika benar-benar dibutuhkan.
