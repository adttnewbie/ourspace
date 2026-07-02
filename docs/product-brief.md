# Product Brief

## Nama kerja

OurSpace

## Tujuan

Membuat ruang digital private untuk dua orang yang terasa personal sejak pertama masuk: kamu dan pasangan menahan tombol lingkaran bersamaan, lalu momen sukses itu menjadi tanggal jadian di app.

## Pengguna

- User utama: kamu.
- User kedua: pasangan kamu.
- Tidak ada role publik atau guest pada MVP.
- Dua device utama: satu untuk kamu, satu untuk pasangan.

## Nilai utama

- Satu tempat untuk menyimpan momen dan rencana.
- Cepat dibuka dari HP.
- Terasa seperti scrapbook lucu, bukan app produktivitas kantor.
- Tetap private walaupun backend memakai Google Apps Script.

## V1

### Pairing onboarding

- Sebelum masuk home, masing-masing user mengisi nama/nickname.
- Keduanya menahan tombol lingkaran selama 3 detik.
- Pairing dianggap sukses jika dua sinyal masuk dalam window 30 detik.
- Timestamp sukses dari backend menjadi `anniversaryDate`.
- Setelah pairing, device yang sama langsung masuk home pada kunjungan berikutnya.

### Home

- Greeting personal dalam bahasa Indonesia santai.
- Counter hari bersama dari `anniversaryDate`.
- Quick add untuk sticky note.
- Section "terbaru hari ini" untuk note atau item lain yang dibuat hari itu.
- Jika tidak ada konten hari itu, section terbaru disembunyikan.

### Sticky Notes

- Note pendek bergaya sticky note.
- Dibuat oleh salah satu member.
- Hanya pembuat yang boleh edit/hapus.
- Delete memakai soft delete.

## Fitur setelah v1

- Date Plans simple: judul, tanggal, lokasi, status, catatan.
- Gallery private: foto saja, caption dan tanggal wajib, max 5 MB.
- Gallery preview via thumbnail dari API; file asli tetap private di Drive.
- Shared Lists untuk wishlist tempat, makanan, film, aktivitas, atau hadiah.
- Backup otomatis via Apps Script trigger ke folder Drive.
- Calendar view.
- Search global.
- Tema visual tambahan.

## Non-goals v1

- Google OAuth.
- Multi-couple atau multi-tenant.
- Chat realtime.
- Push notification.
- Offline-first sync.
- Permission kompleks per item.
- Admin dashboard besar.
- Upload gallery.
- Date Plans.
- Shared Lists.
