# OurSpace Docs

Dokumentasi ini menjadi blueprint awal untuk membangun OurSpace: web app private untuk kamu dan pasangan, dengan onboarding hold button, home scrapbook, dan sticky notes sebagai fitur v1.

## Isi docs

- [Product Brief](./product-brief.md): arah produk, v1, fitur lanjutan, dan batasan.
- [Architecture](./architecture.md): rancangan stack Vite React, Apps Script, Spreadsheet, Drive, session, dan deploy.
- [Pairing Flow](./pairing-flow.md): detail onboarding hold button dua device.
- [UI Direction](./ui-direction.md): arah visual scrapbook, home, navigasi, dan motion.
- [Data Model](./data-model.md): struktur sheet untuk pairing, member, settings, sticky notes, dan fase lanjut.
- [API Contract](./api-contract.md): action API Apps Script untuk pairing, home, dan notes v1.
- [API Proxy](./api-proxy.md): same-origin proxy agar frontend tidak kena CORS Apps Script.
- [Backup](./backup.md): cara kerja backup JSON private, trigger harian, dan batasan restore.
- [Deployment](./deployment.md): langkah deploy Vercel, env, dan smoke test production.
- [Performance](./performance.md): catatan cache ringan, lazy route, dan batasan Apps Script.
- [Production Checklist](./production-checklist.md): checklist env, Apps Script, Drive, Vercel, dan manual test sebelum dipakai harian.
- [Live Testing](./live-testing.md): checklist deploy, pairing, Home, dan Notes CRUD sebelum fitur baru.
- [MVP Roadmap](./mvp-roadmap.md): urutan build dari docs sampai fitur lanjutan.

## Stack awal

- Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn/ui.
- Backend API: Google Apps Script Web App.
- Database: Google Spreadsheet.
- Storage: Google Drive.
- Deploy frontend: Vercel.
- Auth/session v1: pairing dua device, `memberId`, dan session lokal.

## Prinsip build

- Private by default: data couple tidak boleh terbuka publik.
- Mobile-first: mayoritas pemakaian kemungkinan dari HP.
- PWA basic: bisa di-install ke home screen, tanpa offline-first dulu.
- Spreadsheet dipakai sebagai database ringan, bukan sistem query kompleks.
- Drive hanya menyimpan file; metadata tetap dicatat di Spreadsheet.
- V1 dibatasi ke Pairing + Home + Sticky Notes supaya cepat selesai dan stabil.
- Gallery, Date Plans, Shared Lists, dan backup otomatis masuk fase setelah v1.
