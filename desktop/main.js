/**
 * MAISHAA WORKSPACE — desktop wrapper (Electron).
 *
 * - Loads the online workspace in a hardened window (no node integration, context isolation).
 * - Free mode works immediately. "Pro → Activate Pro key" sends the key + a per-PC device id to
 *   /api/license/activate-device and stores the signed token it gets back.
 * - The token is attached to every request to the workspace as the X-Maishaa-License header, which
 *   the server turns into Pro entitlements (AI Command Center, higher AI limits...).
 * - The token is re-validated on start and every 12 h. A revoked / expired licence drops back to Free;
 *   if the server is unreachable the app keeps working until the token's own expiry (max 30 days).
 */
const { app, BrowserWindow, Menu, dialog, ipcMain, session, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const APP_URL = (process.env.MAISHAA_APP_URL || 'https://workspace.maishaa.bd').replace(/\/+$/, '');
const APP_ORIGIN = new URL(APP_URL).origin;
const LICENSE_FILE = () => path.join(app.getPath('userData'), 'license.json');
const REVALIDATE_MS = 12 * 60 * 60 * 1000;

let mainWindow = null;
let activateWindow = null;
let state = { deviceId: '', token: '', tokenExpiresAt: 0, licenseExpiresAt: null };

// ── persistence ──
function loadState() {
  try {
    state = { ...state, ...JSON.parse(fs.readFileSync(LICENSE_FILE(), 'utf8')) };
  } catch {
    /* first run */
  }
  if (!state.deviceId) {
    state.deviceId = crypto.randomUUID();
    saveState();
  }
}
function saveState() {
  fs.mkdirSync(path.dirname(LICENSE_FILE()), { recursive: true });
  fs.writeFileSync(LICENSE_FILE(), JSON.stringify(state), { mode: 0o600 });
}
const hasValidToken = () => Boolean(state.token) && state.tokenExpiresAt > Date.now();

// ── server calls ──
async function post(pathname, body) {
  const res = await fetch(`${APP_URL}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function activate(key) {
  try {
    const r = await post('/api/license/activate-device', {
      key,
      deviceId: state.deviceId,
      deviceName: os.hostname(),
    });
    if (!r.ok) return { ok: false, error: r.data.error || `Server error ${r.status}` };
    state.token = r.data.token;
    state.tokenExpiresAt = r.data.tokenExpiresAt;
    state.licenseExpiresAt = r.data.licenseExpiresAt;
    saveState();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Cannot reach the server. Check your internet connection.' };
  }
}

async function revalidate({ silent }) {
  if (!state.token) return;
  try {
    const r = await post('/api/license/validate', { token: state.token });
    if (r.ok && r.data.valid) {
      state.token = r.data.token;
      state.tokenExpiresAt = r.data.tokenExpiresAt;
      state.licenseExpiresAt = r.data.licenseExpiresAt;
      saveState();
    } else if (r.ok) {
      state.token = '';
      state.tokenExpiresAt = 0;
      saveState();
      mainWindow?.webContents.reload();
      if (!silent) {
        dialog.showMessageBox({
          type: 'info',
          message: 'Your Pro licence is no longer active (expired or revoked). The app is now in Free mode.',
        });
      }
    }
  } catch {
    /* offline: keep working until the token expires */
  }
}

async function deactivate() {
  if (state.token) {
    try {
      await post('/api/license/deactivate-device', { token: state.token });
    } catch {
      /* best effort: the admin can also reset PCs for this key */
    }
  }
  state.token = '';
  state.tokenExpiresAt = 0;
  state.licenseExpiresAt = null;
  saveState();
  mainWindow?.webContents.reload();
}

// ── windows ──
function isAppUrl(url) {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0b1329',
    title: 'MAISHAA WORKSPACE',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url) && !isAppUrl(url)) shell.openExternal(url);
    return isAppUrl(url) ? { action: 'allow' } : { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!isAppUrl(url)) {
      e.preventDefault();
      if (/^https:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      mainWindow.loadURL(
        'data:text/html;charset=utf-8,' +
          encodeURIComponent(
            `<body style="font-family:sans-serif;background:#0b1329;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center">` +
              `<div><h2>Cannot reach MAISHAA WORKSPACE</h2><p style="color:#94a3b8">${desc}. Check your internet connection and press Ctrl+R to retry.</p></div></body>`
          )
      );
    }
  });
  mainWindow.loadURL(APP_URL);
  mainWindow.on('closed', () => (mainWindow = null));
}

function openActivateWindow() {
  if (activateWindow) return activateWindow.focus();
  activateWindow = new BrowserWindow({
    width: 480,
    height: 420,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: mainWindow || undefined,
    modal: Boolean(mainWindow),
    backgroundColor: '#0b1329',
    title: 'Activate Pro',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  activateWindow.setMenu(null);
  activateWindow.loadFile(path.join(__dirname, 'activate.html'));
  activateWindow.on('closed', () => (activateWindow = null));
}

function buildMenu() {
  const template = [
    {
      label: 'Pro',
      submenu: [
        { label: 'Activate Pro key…', click: openActivateWindow },
        {
          label: 'Licence status',
          click: () =>
            dialog.showMessageBox({
              type: 'info',
              message: hasValidToken()
                ? `Pro is active on this PC.\nLicence ends: ${state.licenseExpiresAt ? new Date(state.licenseExpiresAt).toLocaleDateString() : 'never (lifetime)'}`
                : 'Free mode. Enter a Pro key to unlock all features.',
            }),
        },
        {
          label: 'Deactivate this PC',
          click: async () => {
            const { response } = await dialog.showMessageBox({
              type: 'question',
              buttons: ['Deactivate', 'Cancel'],
              defaultId: 1,
              message: 'Deactivate Pro on this PC? You can then use the key on another PC.',
            });
            if (response === 0) await deactivate();
          },
        },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    {
      label: 'Help',
      submenu: [
        { label: 'Pricing & plans', click: () => mainWindow?.loadURL(`${APP_URL}/pricing`) },
        { label: 'Contact support', click: () => mainWindow?.loadURL(`${APP_URL}/contact`) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── app lifecycle ──
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  ipcMain.handle('license:activate', async (_e, key) => {
    if (typeof key !== 'string' || key.trim().length < 8) return { ok: false, error: 'Enter a valid licence key.' };
    const r = await activate(key.trim());
    if (r.ok) {
      activateWindow?.close();
      mainWindow?.webContents.reload();
      dialog.showMessageBox({ type: 'info', message: 'Pro activated. All features are unlocked.' });
    }
    return r;
  });
  ipcMain.handle('license:close', () => activateWindow?.close());

  app.whenReady().then(() => {
    loadState();
    // Attach the licence token to requests to the workspace origin only.
    session.defaultSession.webRequest.onBeforeSendHeaders({ urls: [`${APP_ORIGIN}/*`] }, (details, cb) => {
      const headers = { ...details.requestHeaders };
      if (hasValidToken()) headers['X-Maishaa-License'] = state.token;
      else delete headers['X-Maishaa-License'];
      cb({ requestHeaders: headers });
    });
    buildMenu();
    createMainWindow();
    revalidate({ silent: false });
    setInterval(() => revalidate({ silent: true }), REVALIDATE_MS);
  });

  app.on('window-all-closed', () => app.quit());
}
