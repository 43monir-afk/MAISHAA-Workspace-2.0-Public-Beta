# MAISHAA WORKSPACE — Desktop app (Windows)

A hardened Electron window around the online workspace, plus **Pro licence-key activation**.

* Free mode works straight away.
* **Pro → Activate Pro key…** sends the key and a random per-PC id to `POST /api/license/activate-device`.
  The server answers with a signed token that is stored in the app's user-data folder and attached to every request
  as the `X-Maishaa-License` header. The server then treats the request as Pro (AI Command Center, higher AI limits).
* The token is re-validated on start and every 12 h. Revoked/expired keys drop back to Free; if the server is
  unreachable the app keeps working until the token itself expires (max 30 days).
* **Pro → Deactivate this PC** frees the slot so the key can be used on another PC.

## Build the installer (do this on a Windows PC with Node 20+)

```bat
cd desktop
npm install
set MAISHAA_APP_URL=https://workspace.maishaa.bd   (only needed to test against another server, e.g. http://localhost:3000)
npm start            :: run the app for testing
npm run dist         :: creates release\MAISHAA WORKSPACE Setup 1.0.0.exe
```

## Publish it

1. Create a GitHub Release and upload the `.exe`.
2. Copy the direct download link.
3. Website → **Admin panel → Settings → Desktop app download**: paste the link, set the version, save.
   The **Download** page and its button update immediately.

## Notes

* Without a code-signing certificate Windows SmartScreen shows "unknown publisher". Buy a certificate and add
  `win.certificateFile` / `CSC_LINK` to electron-builder when you are ready for public release.
* This version needs internet (it loads the hosted site). File processing still happens on the user's PC.
* Not yet included: auto-update (`electron-updater`), an app icon (put `build/icon.ico` and electron-builder will use it).
