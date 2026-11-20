const { app, BrowserWindow, dialog, ipcMain, nativeImage, powerSaveBlocker, screen, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://wmmtd.xyz/';
const ALLOWED_HOST = 'wmmtd.xyz';
const GITHUB_REPO = 'DJTOMATO/wmmtd_desktop';
const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
const API_LATEST_RELEASE = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const REMOTE_MOD_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/wmmtdmod.js`;

// --- Single-Instance Lock ---
// wmmtd.xyz stores its ~2 GB+ game block cache in OPFS using exclusive SyncAccessHandles.
// Running a single instance guarantees exclusive OPFS storage access is never blocked by a second window.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

// --- Storage, GPU, WebGL2, OffscreenCanvas, WebAssembly JSPI, Audio & Network Optimizations ---
// Chromium parses --disk-cache-size as a signed 32-bit integer (max 2147483647 bytes ≈ 2 GiB).
// Passing >= 2 GiB overflows StringToInt and causes Chromium to silently ignore the flag.
// Combined with persistent OPFS blockstore (~2-3 GB), Cache Storage WASM lift cache (~100 MB),
// and IndexedDB (cards & ghosts), the client provides 3 GB+ of persistent local storage.
app.commandLine.appendSwitch('disk-cache-size', '2147483647');

// Maximize dedicated GPU, WebGL2 OffscreenCanvas, and ANGLE hardware performance
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('use-cmd-decoder', 'passthrough');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('enable-unsafe-webgpu');

if (process.platform === 'win32' && !app.commandLine.hasSwitch('use-angle')) {
  // Direct3D 11 ANGLE provides the lowest-latency DirectComposition swapchain for WebGL2 on Windows
  app.commandLine.appendSwitch('use-angle', 'd3d11');
}

// HTTP/3 (QUIC) for faster block streaming from Cloudflare / data.wmmtd.xyz & instant AudioWorklet wake
app.commandLine.appendSwitch('enable-quic');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Generous V8 heap headroom so the 49k-function WASM lifter & arcade guest memory avoid GC stutters
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// Prevent background throttling so WebRTC P2P linked cabinet races and worker frames never desync on Alt+Tab
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// Ensure WebAssembly JSPI, Exception Handling, Tail Calls, SIMD, and SharedArrayBuffer features are active
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

if (process.platform === 'linux') {
  // Clear global Wayland hints (e.g. Arch / CachyOS /etc/environment) that can conflict with Vulkan/XWayland
  delete process.env.ELECTRON_OZONE_PLATFORM_HINT;

  if (!app.commandLine.hasSwitch('ozone-platform')) {
    app.commandLine.appendSwitch('ozone-platform', 'x11');
  }
  if (!app.commandLine.hasSwitch('ozone-platform-hint')) {
    app.commandLine.appendSwitch('ozone-platform-hint', 'x11');
  }

  const isExplicitWayland = app.commandLine.getSwitchValue('ozone-platform') === 'wayland';
  if (isExplicitWayland) {
    app.commandLine.appendSwitch('enable-features', 'WebAssemblyJSPI,CanvasOopRasterization');
  } else {
    app.commandLine.appendSwitch('enable-features', 'Vulkan,WebAssemblyJSPI,CanvasOopRasterization');
  }
} else {
  app.commandLine.appendSwitch('enable-features', 'WebAssemblyJSPI,CanvasOopRasterization');
}

app.setName('Wangan Minimum Tune');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.glas.wmmtddesktop');
}

let mainWindow = null;
let powerSaveId = null;

function isAllowedHost(urlString) {
  try {
    const parsed = new URL(urlString);
    return parsed.hostname === ALLOWED_HOST || parsed.hostname.endsWith(`.${ALLOWED_HOST}`);
  } catch (_) {
    return false;
  }
}

function getStartupUrlFromArgs(argv) {
  for (const arg of argv || []) {
    if (typeof arg === 'string' && arg.startsWith('https://') && isAllowedHost(arg)) {
      return arg;
    }
  }
  return null;
}

// --- Persistent Window State ---
function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  const defaults = { width: 1366, height: 860, isMaximized: false };
  try {
    const raw = fs.readFileSync(getWindowStatePath(), 'utf8');
    const saved = JSON.parse(raw);
    if (typeof saved.width === 'number' && typeof saved.height === 'number') {
      const bounds = {
        width: Math.max(800, Math.round(saved.width)),
        height: Math.max(600, Math.round(saved.height)),
        isMaximized: Boolean(saved.isMaximized)
      };
      if (typeof saved.x === 'number' && typeof saved.y === 'number') {
        const display = screen.getDisplayMatching({
          x: saved.x,
          y: saved.y,
          width: bounds.width,
          height: bounds.height
        });
        const wa = display.workArea;
        const visibleX = saved.x >= wa.x - 100 && saved.x <= wa.x + wa.width - 100;
        const visibleY = saved.y >= wa.y - 50 && saved.y <= wa.y + wa.height - 100;
        if (visibleX && visibleY) {
          bounds.x = Math.round(saved.x);
          bounds.y = Math.round(saved.y);
        }
      }
      return bounds;
    }
  } catch (_) {
    // Use defaults if state file does not exist or is unreadable
  }
  return defaults;
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
    fs.writeFileSync(
      getWindowStatePath(),
      JSON.stringify({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized
      }),
      'utf8'
    );
  } catch (_) {
    // Ignore disk write issues
  }
}

// --- GitHub Release Update Checker ---
function isNewerVersion(remote, local) {
  const cleanRemote = String(remote || '').replace(/^v/i, '').trim();
  const cleanLocal = String(local || '').replace(/^v/i, '').trim();
  const rParts = cleanRemote.split('.').map(n => parseInt(n, 10) || 0);
  const lParts = cleanLocal.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

async function checkForUpdates(parentWindow) {
  try {
    const response = await fetch(API_LATEST_RELEASE, {
      headers: {
        'User-Agent': `wmmtd_desktop/${app.getVersion()}`
      }
    });
    if (!response.ok) return;
    const data = await response.json();
    const latestTag = data.tag_name || data.name || '';
    if (latestTag && isNewerVersion(latestTag, app.getVersion())) {
      const { response: buttonIndex } = await dialog.showMessageBox(parentWindow || null, {
        type: 'info',
        title: 'Update Available — Wangan Minimum Tune',
        message: `A new version of Wangan Minimum Tune (${latestTag}) is available!`,
        detail: `You are currently using v${app.getVersion()}.\n\nVisit GitHub to download the latest desktop release.`,
        buttons: ['Download Latest Version', 'Later'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (buttonIndex === 0) {
        shell.openExternal(data.html_url || RELEASES_URL);
      }
    }
  } catch (_) {
    // Fail silently if offline
  }
}

// --- Dynamic Mod Engine (wmmtdmod.js) ---
let cachedModCode = null;
let lastModRpcTimestamp = 0;

async function fetchRemoteModScript() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${REMOTE_MOD_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      headers: { 'User-Agent': `wmmtd_desktop/${app.getVersion()}` }
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      cachedModCode = await res.text();
      return cachedModCode;
    }
  } catch (_) {}

  if (!cachedModCode) {
    try {
      const localModPath = path.join(__dirname, 'wmmtdmod.js');
      if (fs.existsSync(localModPath)) {
        cachedModCode = fs.readFileSync(localModPath, 'utf8');
      }
    } catch (_) {}
  }

  return cachedModCode;
}

async function injectModScript(targetWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  try {
    const modCode = await fetchRemoteModScript();
    if (modCode && targetWindow && !targetWindow.isDestroyed()) {
      await targetWindow.webContents.executeJavaScript(modCode).catch(() => {});
    }
  } catch (_) {}
}

// --- Discord Rich Presence (RPC) ---
const RPC = require('discord-rpc');
const DISCORD_CLIENT_ID = '1061024806750916679';
const DISCORD_ICON_URL = 'https://wmmtd.xyz/icon.png';

let rpc = null;
let rpcConnected = false;
let rpcInterval = null;
let rpcRetryTimeout = null;
let isQuitting = false;
const clientLaunchTime = Date.now();

function scheduleRpcReconnect() {
  if (isQuitting || rpcRetryTimeout) return;
  rpcRetryTimeout = setTimeout(() => {
    rpcRetryTimeout = null;
    initDiscordRPC();
  }, 15000);
}

function resetRpcClient() {
  rpcConnected = false;
  if (rpc) {
    try {
      rpc.removeAllListeners();
      rpc.destroy().catch(() => {});
    } catch (_) {}
    rpc = null;
  }
}

async function initDiscordRPC() {
  if (isQuitting || rpcConnected) return;

  resetRpcClient();

  try {
    const client = new RPC.Client({ transport: 'ipc' });
    rpc = client;

    client.on('ready', () => {
      rpcConnected = true;
      updateDiscordPresence();
    });

    client.on('disconnected', () => {
      if (rpc === client) {
        resetRpcClient();
        scheduleRpcReconnect();
      }
    });

    await client.login({ clientId: DISCORD_CLIENT_ID });
  } catch (_) {
    resetRpcClient();
    scheduleRpcReconnect();
  }
}

function buildDefaultDiscordActivity(currentUrl) {
  let details = 'Playing Wangan Minimum Tune';
  let state = 'Arcade Street Racing';

  try {
    if (currentUrl) {
      const parsed = new URL(currentUrl);
      if (parsed.pathname.startsWith('/lobby/') || parsed.searchParams.has('lobby')) {
        details = 'Online Versus Lobby';
        state = 'Linked Arcade Racing';
      } else if (parsed.pathname.includes('input')) {
        details = 'Configuring Controls';
        state = 'Wheel & Gamepad Setup';
      }
    }
  } catch (_) {}

  return {
    details,
    state,
    startTimestamp: clientLaunchTime,
    largeImageKey: DISCORD_ICON_URL,
    largeImageText: `Wangan Minimum Tune Desktop v${app.getVersion()}`,
    instance: false,
    buttons: [
      { label: 'Play on wmmtd.xyz', url: TARGET_URL },
      { label: 'Download Desktop Client', url: RELEASES_URL }
    ]
  };
}

async function updateDiscordPresence() {
  if (!rpcConnected || !rpc) return;

  // Let wmmtdmod.js take precedence when actively pushing status updates
  if (Date.now() - lastModRpcTimestamp < 15000) {
    return;
  }

  const currentUrl = mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents.getURL() : '';
  const activity = buildDefaultDiscordActivity(currentUrl);

  try {
    await rpc.setActivity(activity);
  } catch (_) {
    resetRpcClient();
    scheduleRpcReconnect();
  }
}

function getCleanUserAgent() {
  return app.userAgentFallback
    .replace(/\s*Electron\/[^\s]+/i, '')
    .replace(/\s*(?:wangan-minimum-tune|wmmtd_desktop|wmmtd-desktop)\/[^\s]+/i, '');
}

function getAppIcon() {
  const icoPath = path.join(__dirname, 'icon.ico');
  const pngPath = path.join(__dirname, 'icon.png');
  const icon = nativeImage.createFromPath(process.platform === 'win32' ? icoPath : pngPath);
  return icon.isEmpty() ? undefined : icon;
}

function configureSessionPermissions() {
  // Grant hardware, 3 GB+ persistent storage, audio, WebRTC & WebHID permissions for wmmtd.xyz
  const allowedPermissions = new Set([
    'fullscreen',
    'pointerLock',
    'gamepad',
    'hid',
    'usb',
    'media',
    'audioCapture',
    'clipboard-read',
    'clipboard-sanitized-write',
    'idle-detection',
    'window-management',
    'fileSystem',
    'storage-access',
    'persistent-storage',
    'background-sync'
  ]);

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (isAllowedHost(webContents.getURL())) {
      callback(allowedPermissions.has(permission));
      return;
    }
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (isAllowedHost(requestingOrigin)) {
      return allowedPermissions.has(permission);
    }
    return false;
  });

  // Enable WebHID steering wheel Force Feedback (Logitech / Thrustmaster / Simagic) on wmmtd.xyz
  session.defaultSession.setDevicePermissionHandler((details) => {
    if ((details.deviceType === 'hid' || details.deviceType === 'usb') && isAllowedHost(details.origin)) {
      return true;
    }
    return false;
  });

  session.defaultSession.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    const origin = details.frame?.url || details.webContents?.getURL() || '';
    if (isAllowedHost(origin) && Array.isArray(details.deviceList) && details.deviceList.length > 0) {
      callback(details.deviceList[0].deviceId);
    } else {
      callback();
    }
  });

  // Allow file access for card/log export/import on wmmtd.xyz
  session.defaultSession.on('file-system-access-restricted', (event, details, callback) => {
    const origin = details.origin || details.requestingUrl || TARGET_URL;
    if (isAllowedHost(origin)) {
      callback('allow');
      return;
    }
    callback('deny');
  });
}

function createWindow(initialUrl) {
  const userAgent = getCleanUserAgent();
  const windowState = loadWindowState();

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 800,
    minHeight: 600,
    title: `Wangan Minimum Tune v${app.getVersion()}`,
    backgroundColor: '#0e1013',
    autoHideMenuBar: true,
    fullscreenable: true,
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webgl: true,
      backgroundThrottling: false,
      paintWhenInitiallyHidden: true,
      spellcheck: false,
      v8CacheOptions: 'bypassHeatCheckAndEagerCompile'
    }
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setUserAgent(userAgent);

  // Retain client version in the title bar when the page title changes
  mainWindow.on('page-title-updated', (event, title) => {
    event.preventDefault();
    const versionTag = `v${app.getVersion()}`;
    if (!title.includes(versionTag)) {
      mainWindow.setTitle(`${title} — ${versionTag}`);
    } else {
      mainWindow.setTitle(title);
    }
  });

  // Check for client updates on GitHub shortly after boot
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        checkForUpdates(mainWindow);
      }
    }, 2500);
  });

  // Open external links (Discord, Reddit, Ko-fi, GitHub) in the default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (isAllowedHost(url)) {
        return { action: 'allow' };
      }
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url);
      }
    } catch (_) {
      // Ignore malformed URLs
    }
    return { action: 'deny' };
  });

  // Keep in-window navigation scoped to wmmtd.xyz (including /lobby/<room> and *.wmmtd.xyz)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'file:') {
        return;
      }
      if (!isAllowedHost(url)) {
        event.preventDefault();
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          shell.openExternal(url);
        }
      }
    } catch (_) {
      event.preventDefault();
    }
  });

  // Allow window close without getting trapped by beforeunload dialogs,
  // while still letting pagehide fire so wheel FFB stops and OPFS/IndexedDB flush cleanly.
  mainWindow.webContents.on('will-prevent-unload', (event) => {
    event.preventDefault();
  });

  // Window-scoped keyboard shortcuts (preserves all arcade driving, shifting, and menu keys)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    if (input.alt && (input.key === 'F4' || input.code === 'F4')) {
      event.preventDefault();
      mainWindow.close();
      return;
    }

    if (input.key === 'F5' || (input.control && !input.alt && input.key.toLowerCase() === 'r')) {
      event.preventDefault();
      mainWindow.reload();
    } else if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    } else if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.on('close', () => {
    saveWindowState(mainWindow);
  });

  // Inject lightweight OTA enhancement script (wmmtdmod.js) when wmmtd.xyz loads
  mainWindow.webContents.on('dom-ready', () => {
    const currentUrl = mainWindow?.webContents?.getURL() || '';
    if (isAllowedHost(currentUrl)) {
      injectModScript(mainWindow);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    const currentUrl = mainWindow?.webContents?.getURL() || '';
    if (isAllowedHost(currentUrl)) {
      injectModScript(mainWindow);
      updateDiscordPresence();
    }
  });

  // Fallback to local splash/retry view if network fails
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    if (validatedURL && validatedURL.startsWith('https://')) {
      mainWindow.loadFile('index.html', { query: { error: '1' } });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const query = initialUrl ? { target: initialUrl } : {};
  mainWindow.loadFile('index.html', { query });
}

if (gotSingleInstanceLock) {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const targetUrl = getStartupUrlFromArgs(commandLine);
      if (targetUrl) {
        mainWindow.loadURL(targetUrl);
      }
    }
  });

  app.whenReady().then(() => {
    powerSaveId = powerSaveBlocker.start('prevent-display-sleep');
    configureSessionPermissions();
    createWindow(getStartupUrlFromArgs(process.argv));

    // Initialize Discord Rich Presence
    initDiscordRPC();
    rpcInterval = setInterval(updateDiscordPresence, 15000);
  });
}

ipcMain.on('load-site', (event, url) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (url && isAllowedHost(url)) {
    mainWindow.loadURL(url);
  } else {
    mainWindow.loadURL(TARGET_URL);
  }
});

ipcMain.on('retry-connection', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(TARGET_URL);
  }
});

ipcMain.on('discord-rpc-set-activity', async (event, activity) => {
  if (!rpcConnected || !rpc || !activity) return;
  lastModRpcTimestamp = Date.now();
  try {
    await rpc.setActivity(activity);
  } catch (_) {
    resetRpcClient();
    scheduleRpcReconnect();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (rpcRetryTimeout) {
    clearTimeout(rpcRetryTimeout);
    rpcRetryTimeout = null;
  }
  if (rpcInterval) {
    clearInterval(rpcInterval);
    rpcInterval = null;
  }
  if (rpc) {
    try {
      rpc.clearActivity().catch(() => {});
      rpc.destroy().catch(() => {});
    } catch (_) {}
    rpc = null;
  }
});

app.on('window-all-closed', () => {
  if (powerSaveId !== null && powerSaveBlocker.isStarted(powerSaveId)) {
    powerSaveBlocker.stop(powerSaveId);
    powerSaveId = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
