# Pairing Flow

## Tujuan

Pairing adalah onboarding pertama OurSpace. Momen dua orang berhasil menahan tombol bersamaan menjadi tanggal jadian di app.

## Alur sukses

1. User membuka app pertama kali.
2. App tidak menemukan `memberId` dan `sessionToken` di `localStorage`.
3. App menampilkan halaman pairing.
4. Masing-masing user mengisi nickname.
5. Masing-masing user menahan tombol lingkaran selama 3 detik.
6. Setelah hold selesai, frontend memanggil `pairing.signal`.
7. Jika baru satu device mengirim sinyal, UI masuk waiting state.
8. Frontend polling `pairing.status` tiap 1-2 detik.
9. Jika sinyal kedua masuk dalam 30 detik, backend membuat dua member dan session.
10. Backend menyimpan `anniversaryDate` dari timestamp sukses pairing.
11. Frontend menyimpan `memberId` dan `sessionToken`.
12. App masuk ke home.

## State UI

### Idle

- Input nickname.
- Tombol lingkaran siap ditekan.
- Copy singkat: "Tahan bareng-bareng."

### Holding

- Progress ring berjalan 3 detik.
- Lepas sebelum selesai membatalkan progress.
- Tombol tidak mengirim sinyal sampai progress penuh.

### Waiting

- Ditampilkan setelah sinyal pertama diterima.
- Copy singkat: "Nunggu pasangan kamu..."
- Polling status aktif.
- Countdown sampai window 30 detik habis.

### Paired

- Tampilkan success state singkat.
- Simpan session lokal.
- Redirect ke home.

### Expired

- Tampil jika window 30 detik habis.
- Tombol aktif lagi untuk coba ulang.
- Copy singkat: "Belum barengan, coba sekali lagi."

## Aturan backend

- Window pairing default 30 detik.
- Timestamp backend adalah sumber kebenaran.
- Jangan memakai timestamp device untuk `anniversaryDate`.
- Pairing sukses hanya jika ada dua sinyal dari dua device/nickname berbeda dalam window yang sama.
- Setelah sukses, pairing session tidak boleh dipakai ulang.

## Session setelah pairing

- Device menyimpan `memberId` dan `sessionToken` di `localStorage`.
- Kunjungan berikutnya memanggil `session.resume`.
- Jika session valid, langsung masuk home.
- Jika session invalid, kembali ke pairing atau reset flow.

## Reset

Reset pairing dilakukan dari settings dengan konfirmasi kuat.

Default mode:

- `keep_data`: hapus session/member aktif, tetapi data notes tetap soft-preserved.

Mode hapus semua data ditunda sampai benar-benar dibutuhkan.
