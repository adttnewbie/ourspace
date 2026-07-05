# Deploy Apps Script

Use this when `/api/apps-script` returns `502` and the upstream Google page says `Fungsi skrip tidak ditemukan: doPost`. That means the deployed Web App is not running the current source.

## Manual deploy

1. Open the Google Apps Script project.
2. Copy or push every `.gs` file from this folder into the project:
   - `Code.gs`
   - `00_config.gs`
   - `01_errors.gs`
   - `02_responses.gs`
   - `03_requests.gs`
   - `04_ids_time.gs`
   - `05_spreadsheet.gs`
   - `06_session.gs`
   - `07_actions.gs`
   - `08_pairing.gs`
   - `09_members.gs`
3. Confirm `Code.gs` contains a global top-level function:

```js
function doPost(event) {
  try {
    return jsonSuccess(routeAction(parseJsonRequest(event)))
  } catch (error) {
    return jsonFailure(error)
  }
}
```

4. Confirm `Code.gs` also contains global `doGet(event)`.
5. Go to Deploy > Manage deployments.
6. Select the Web App deployment, then Edit.
7. Set Version to New version.
8. Click Deploy.
9. Copy the Web App `/exec` URL and use it as `APPS_SCRIPT_URL`.

Open the `/exec` URL in a browser. It should return JSON with:

```json
{
  "ok": true,
  "data": {
    "service": "ourspace-apps-script",
    "status": "ok",
    "entrypoint": "doGet",
    "hasDoPost": true
  }
}
```

## clasp deploy

This folder is connected to Apps Script with `apps-script/.clasp.json`.

Run from `apps-script/`:

```bash
clasp status
clasp push
clasp version "ourspace api"
clasp deploy
```

After deploy, use the Web App `/exec` URL as `APPS_SCRIPT_URL`, not the `/dev` URL.
