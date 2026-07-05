# API Proxy

Browser calls directly to Google Apps Script Web Apps are not stable for OurSpace because Apps Script does not return the CORS headers the frontend needs. A browser may show `200 OK`, but JavaScript still cannot read the JSON response.

The stable path is:

```text
React app
  -> /api/apps-script
Vercel Function or Vite dev proxy
  -> APPS_SCRIPT_URL
Google Apps Script Web App
```

## Env

Use `.env` locally and Vercel Environment Variables in production:

```bash
VITE_API_URL="/api/apps-script"
APPS_SCRIPT_URL="https://script.google.com/macros/s/xxx/exec"
```

`VITE_API_URL` is safe for the browser. `APPS_SCRIPT_URL` must stay server-side.

## Local dev

Use `vercel dev` when testing the real Vercel Function path. `bun dev` alone does not run Vercel Functions; this project has a Vite dev middleware fallback so `/api/apps-script` still works locally.

The frontend still calls `/api/apps-script`, so pairing and Settings use the same API path locally and in production.

## Production

On Vercel, `api/apps-script.ts` accepts POST requests, forwards the raw text body to `APPS_SCRIPT_URL`, follows redirects, and returns JSON to the frontend.

## Manual test

Use Settings -> `Cek koneksi`. It sends `health.check` through `/api/apps-script`.
