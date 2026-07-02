# MVP Roadmap

## Phase 0: Blueprint docs

Goal: keputusan produk dan teknis tidak tercecer.

- Sinkronkan product brief, architecture, data model, API contract, pairing flow, dan UI direction.
- Tegaskan batas v1: Pairing + Home + Sticky Notes.
- Tandai Date Plans, Gallery, Shared Lists, dan backup otomatis sebagai fase lanjut.

## Phase 1: Frontend foundation

Goal: app siap untuk UI mobile scrapbook.

- Pasang Tailwind CSS.
- Pasang shadcn/ui.
- Siapkan React Router.
- Siapkan PWA basic: manifest, icon, mobile viewport, theme color.
- Siapkan env `VITE_API_URL`.
- Buat layout mobile dengan bottom tabs.

## Phase 2: Google resources

Goal: backend punya sumber data awal.

- Buat Spreadsheet dari nol sesuai [Data Model](./data-model.md).
- Buat folder Drive `OurSpace/gallery` dan `OurSpace/backups`.
- Buat Apps Script Web App.
- Simpan `SHEET_ID`, `DRIVE_ROOT_FOLDER_ID`, `SESSION_SECRET`, dan `PAIRING_WINDOW_SECONDS` di Script Properties.

## Phase 3: Pairing onboarding

Goal: dua device bisa terikat lewat hold button.

- Halaman pairing dengan input nickname.
- Tombol lingkaran hold 3 detik.
- Waiting state saat baru satu device mengirim sinyal.
- Polling `pairing.status` tiap 1-2 detik selama waiting state.
- Sukses pairing menyimpan `memberId` dan `sessionToken` di `localStorage`.
- `anniversaryDate` memakai timestamp backend saat pairing sukses.

## Phase 4: Home scrapbook

Goal: setelah pairing, app langsung terasa personal.

- Greeting personal bahasa Indonesia santai.
- Counter hari bersama.
- Quick add sticky note.
- Section terbaru hari ini.
- Sembunyikan section terbaru jika tidak ada item hari itu.
- Visual pastel colorful, scrapbook penuh, motion halus.

## Phase 5: Sticky Notes

Goal: fitur CRUD pertama end-to-end dari React sampai Spreadsheet.

- List sticky notes.
- Create sticky note pendek.
- Edit sticky note hanya oleh pembuat.
- Soft delete sticky note hanya oleh pembuat.
- Tampilkan author sebagai nickname.
- Loading, error, dan empty state.

## Phase 6: Date Plans

Goal: rencana date simple.

- List date plans.
- Create/edit date plan.
- Status chip: `idea`, `planned`, `done`, `cancelled`.
- Sort by date.

## Phase 7: Gallery private

Goal: foto tersimpan private di Drive dan tetap bisa dipreview di app.

- Upload foto saja, max 5 MB.
- Caption dan tanggal wajib.
- Simpan original di private Drive.
- Simpan metadata dan thumbnail kecil di Spreadsheet.
- Tampilkan grid dari thumbnail API.

## Phase 8: Backup otomatis

Goal: data lebih aman tanpa operasi manual.

- Apps Script trigger berkala.
- Export Spreadsheet data ke JSON/CSV.
- Simpan backup ke folder Drive `OurSpace/backups`.
- Catat hasil backup di sheet `backups`.

## Build order paling aman

1. Docs blueprint.
2. Tailwind, shadcn, router, PWA basic.
3. API client frontend.
4. Apps Script helper untuk Spreadsheet.
5. Pairing end-to-end.
6. Home.
7. Sticky Notes.
8. Date Plans.
9. Gallery.
10. Backup otomatis.
