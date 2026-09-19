// Main process for Genatis Electron app
if (process.env.VITE_SENTRY_DSN && process.env.VITE_SENTRY_DSN.startsWith('http')) {
  try {
    const { init } = require('@sentry/electron/main');
    init({
      dsn: process.env.VITE_SENTRY_DSN,
    });
  } catch (err) {
    console.error('[SENTRY] Failed to initialize main process Sentry:', err);
  }
}
const { app, BrowserWindow, ipcMain, desktopCapturer, screen, Menu, MenuItem } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
console.log('[MAIN] electron.cjs loaded');

// Completely disable and remove default Electron application menu (File, Edit, View, Window, Help)
// Ensures no developer toolbar or Electron menu bar is visible on any window
Menu.setApplicationMenu(null);

// --- Industrial OPS Hardening: ThawSpace / Persistent Partition Detection ---
// School OPS panels running Deep Freeze or UWF restore C:\ on reboot.
// Detect secondary persistent partitions (D:\, E:\, or designated ThawSpace) and redirect data.
function detectPersistentRoot() {
  const envTarget = process.env.GENATIS_DATA_DIR;
  if (envTarget && fs.existsSync(envTarget)) {
    return envTarget;
  }
  const candidatePaths = [
    'D:\\GenatisData',
    'E:\\GenatisData',
    'C:\\ThawSpace\\GenatisData',
  ];
  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) return candidate;
      const driveRoot = path.parse(candidate).root;
      if (fs.existsSync(driveRoot) && driveRoot.toUpperCase() !== 'C:\\') {
        fs.mkdirSync(candidate, { recursive: true });
        return candidate;
      }
    } catch (e) {
      // Ignore permission or drive missing errors
    }
  }
  return null;
}

const persistentRoot = detectPersistentRoot();
if (persistentRoot) {
  try {
    const userDataDir = path.join(persistentRoot, 'UserData');
    const downloadsDir = path.join(persistentRoot, 'Downloads');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
    app.setPath('userData', userDataDir);
    app.setPath('downloads', downloadsDir);
    console.log(`[OPS-PERSISTENCE] Redirected user data to persistent volume: ${userDataDir}`);
  } catch (err) {
    console.warn('[OPS-PERSISTENCE] Failed to redirect persistent path:', err);
  }
}

// --- Industrial OPS Hardening: Safe Lock Cleanup ---
// In the event of a sudden wall-switch cut or abrupt shutdown, ensure stale LevelDB lock files
// are cleanly cleared without ever wiping user sessions, auth credentials, or LocalStorage/IndexedDB.
const userDataPath = app.getPath('userData');

function cleanOrphanLocks(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        cleanOrphanLocks(fullPath);
      } else if (entry.name === 'LOCK' || entry.name.endsWith('.lock')) {
        try {
          fs.unlinkSync(fullPath);
          console.log(`[OPS-PERSISTENCE] Cleared stale lock file: ${fullPath}`);
        } catch (e) {
          // File currently held by active process; do not disturb
        }
      }
    }
  } catch (err) {
    // Non-fatal if directory read fails
  }
}

try {
  cleanOrphanLocks(path.join(userDataPath, 'IndexedDB'));
  cleanOrphanLocks(path.join(userDataPath, 'Local Storage'));
} catch (e) {
  // Non-fatal
}

app.commandLine.appendSwitch('plugins');
app.commandLine.appendSwitch('enable-pdf-viewer-index', '1');

// 4K High-DPI & GPU Rendering on OPS modules:
// Enable per-monitor DPI support naturally without forcing scale factor 1.0 (which caused touch coordinate drift)
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

let mainWindow;
let overlayWindow;

function resolvePreloadPath() {
  const candidates = [
    path.join(__dirname, 'public', 'preload.js'),
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, 'build', 'preload.js'),
    path.join(__dirname, '..', 'public', 'preload.js')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, 'public', 'preload.js');
}

function resolveIndexPath() {
  const candidates = [
    path.join(__dirname, 'build', 'index.html'),
    path.join(__dirname, 'index.html'),
    path.join(__dirname, '..', 'build', 'index.html')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, 'build', 'index.html');
}

function createMainWindow() {
  const preloadPath = resolvePreloadPath();
  const iconPath = fs.existsSync(path.join(__dirname, 'public', 'icon.png'))
    ? path.join(__dirname, 'public', 'icon.png')
    : path.join(__dirname, 'build', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      zoomFactor: 1.0,
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: !isDev,
      webviewTag: true,
      devTools: isDev // Completely disabled in production
    },
    show: false,
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${resolveIndexPath()}`;

  mainWindow.loadURL(startUrl);

  // Disable the default menu bar completely (removes developer toolbar)
  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();
  mainWindow.setAutoHideMenuBar(true);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Block Developer Tools and accidental reloads in production
  if (!isDev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });

    mainWindow.webContents.on('before-input-event', (event, input) => {
      const isDevTools =
        input.key === 'F12' ||
        (input.control && input.shift && ['i', 'j', 'c'].includes(input.key.toLowerCase()));

      const isReload =
        input.key === 'F5' ||
        (input.control && input.key.toLowerCase() === 'r');

      if (isDevTools || isReload) {
        event.preventDefault();
      }
    });
  }

  // Add Context Menu for saving images (suppress default inspect menu elsewhere in production)
  mainWindow.webContents.on('context-menu', (event, params) => {
    if (params.mediaType === 'image') {
      const menu = new Menu();
      menu.append(new MenuItem({
        label: 'Save Image to Resource Hub',
        click: () => {
          mainWindow.webContents.downloadURL(params.srcURL);
        }
      }));
      menu.popup();
    } else if (!isDev) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (overlayWindow) overlayWindow.close();
  });
}

function createOverlayWindow() {
  if (overlayWindow) {
    overlayWindow.focus();
    return;
  }

  overlayWindow = new BrowserWindow({
    width: 350,
    height: 200,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: resolvePreloadPath(),
      webSecurity: !isDev,
      devTools: isDev
    },
  });

  overlayWindow.setMenuBarVisibility(false);
  overlayWindow.removeMenu();
  overlayWindow.setAutoHideMenuBar(true);

  overlayWindow.setIgnoreMouseEvents(false);
  const overlayUrl = isDev
    ? 'http://localhost:3000/#/overlay'
    : `file://${resolveIndexPath()}#/overlay`;

  overlayWindow.loadURL(overlayUrl);

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

// IPC Handlers
ipcMain.on('open-overlay', () => {
  createOverlayWindow();
});

ipcMain.on('capture-screen', async () => {
  if (!mainWindow) return;
  mainWindow.minimize();
  setTimeout(async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      });
      const primarySource = sources[0];
      if (primarySource) {
        const image = primarySource.thumbnail.toDataURL();
        mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send('screen-captured', image);
      }
    } catch (error) {
      console.error('Failed to capture screen:', error);
      mainWindow.restore();
    }
  }, 500);
});

ipcMain.on('close-overlay', () => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
});

ipcMain.on('download-url', (event, url) => {
  if (mainWindow) {
    mainWindow.webContents.downloadURL(url);
  }
});

// Widget IPC handlers
ipcMain.handle('show-widget', () => {
  console.log('[MAIN] show-widget handler invoked');
  if (!overlayWindow) {
    createOverlayWindow();
  } else {
    overlayWindow.show();
  }
});

ipcMain.handle('hide-widget', () => {
  if (overlayWindow) overlayWindow.hide();
});

ipcMain.handle('close-widget', () => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
  // Notify main window that widget is closed
  if (mainWindow) {
    mainWindow.webContents.send('widget-closed');
  }
});

ipcMain.handle('update-widget-position', (event, { x, y }) => {
  if (overlayWindow) overlayWindow.setPosition(x, y);
});

ipcMain.handle('set-widget-size', (event, { width, height }) => {
  if (overlayWindow) {
    overlayWindow.setSize(width, height);
  }
});

ipcMain.handle('set-widget-minimized', (event, isMinimized) => {
  if (overlayWindow) {
    if (isMinimized) {
      overlayWindow.setSize(350, 64);
    } else {
      overlayWindow.setSize(350, 200);
    }
  }
});

ipcMain.on('broadcast-widget-data', (event, data) => {
  if (overlayWindow) {
    overlayWindow.webContents.send('broadcast-widget-data', data);
    overlayWindow.webContents.send('widget-data-update', data);
  }
});

ipcMain.on('request-widget-data', (event) => {
  if (mainWindow) {
    mainWindow.webContents.send('request-widget-sync');
  }
});

ipcMain.on('request-widget-sync', (event) => {
  if (mainWindow) {
    mainWindow.webContents.send('request-widget-sync');
  }
});

// Start-on-Login / Auto-launch handlers (Windows Registry integration)
ipcMain.handle('get-start-on-login', () => {
  try {
    const settings = app.getLoginItemSettings({
      path: process.execPath,
      args: isDev ? [path.resolve(__dirname)] : []
    });
    return settings.openAtLogin;
  } catch (err) {
    console.error('[MAIN] getLoginItemSettings error:', err);
    return false;
  }
});

ipcMain.on('set-start-on-login', (event, startOnLogin) => {
  try {
    const enable = Boolean(startOnLogin);
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: false,
      path: process.execPath,
      args: isDev ? [path.resolve(__dirname)] : []
    });
    console.log(`[MAIN] Startup on login set to: ${enable}`);
  } catch (err) {
    console.error('[MAIN] setLoginItemSettings error:', err);
  }
});

ipcMain.handle('save-file', async (event, { dataUrl, payloadPath }) => {
  const fs = require('fs');
  try {
    const dir = path.dirname(payloadPath);
    const ext = path.extname(payloadPath);
    const name = path.basename(payloadPath, ext);
    const newPath = path.join(dir, `${name}-annotated-${Date.now()}${ext}`);
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(newPath, base64Data, 'base64');
    return { success: true, path: newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-path', async (event, filePath) => {
  const { shell } = require('electron');
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Hardware Identity & Local Room Config Resolution for Zero-Network Boot
let cachedHardwareIdentity = null;

function resolveHardwareRoomIdentity() {
  const hostname = os.hostname();
  let config = null;

  // 1. Check candidate persistent config paths
  const configPaths = [
    process.env.GENATIS_ROOM_CONFIG,
    persistentRoot ? path.join(persistentRoot, 'board-config.json') : null,
    'C:\\GenatisData\\board-config.json',
    path.join(app.getPath('userData'), 'board-config.json'),
    path.join(__dirname, 'board-config.json')
  ].filter(Boolean);

  for (const cfgPath of configPaths) {
    try {
      if (fs.existsSync(cfgPath)) {
        const raw = fs.readFileSync(cfgPath, 'utf8');
        config = JSON.parse(raw);
        console.log(`[HARDWARE-IDENTITY] Loaded local room config from ${cfgPath}:`, config);
        break;
      }
    } catch (e) {
      // ignore
    }
  }

  // 2. If no config file, extract from hostname pattern:
  // e.g. FKS-ROOM-9-WHIZ1 -> Grade 9 Whiz 1
  // e.g. ROOM-6A -> Grade 6 A
  // e.g. BOARD-G9-WHIZ1 -> Grade 9 Whiz 1
  if (!config) {
    const host = hostname.toUpperCase();
    const match = host.match(/(?:ROOM|BOARD|G)[-_]?(?:GRADE)?(\d+)[-_]?([A-Z]+)(\d*)/i);
    if (match) {
      const grade = match[1];
      const type = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
      const num = match[3] ? parseInt(match[3], 10) : 1;
      config = {
        id: `grade${grade}-${type.toLowerCase()}${num}`,
        name: `Grade ${grade} ${type} ${num}`,
        grade: `grade${grade}`,
        type,
        number: num,
        source: 'hostname'
      };
    }
  }

  return {
    hostname,
    assignedSection: config || null
  };
}

ipcMain.handle('get-hardware-config', () => {
  return resolveHardwareRoomIdentity();
});

ipcMain.handle('get-machine-hardware-id', async () => {
  if (cachedHardwareIdentity) return cachedHardwareIdentity;
  const hostname = os.hostname();
  let uuid = '';
  try {
    uuid = execSync('powershell.exe -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', { timeout: 1500, encoding: 'utf8' }).trim();
  } catch (e) {
    try {
      uuid = execSync('wmic csproduct get uuid', { timeout: 1500, encoding: 'utf8' }).replace(/UUID|\r|\n|\s/gi, '').trim();
    } catch (e2) {
      uuid = hostname;
    }
  }
  cachedHardwareIdentity = {
    hostname,
    uuid: uuid || hostname,
    machineId: `${hostname}_${uuid || 'default'}`
  };
  return cachedHardwareIdentity;
});

// Dynamic Click-Through for Transparent Overlay Windows (prevents digitizer hit-barriers)
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(Boolean(ignore), options || { forward: true });
  }
});

app.whenReady().then(() => {
  createMainWindow();

  const { session } = require('electron');

  // CORS Bypass Workaround for Firebase and Cloudinary
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: [
      'https://firebasestorage.googleapis.com/*',
      'https://res.cloudinary.com/*'
    ] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      
      // Inject headers to bypass browser CORS checks and force inline viewing
      responseHeaders['Access-Control-Allow-Origin'] = ['*'];
      responseHeaders['Content-Security-Policy'] = ["default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';"];
      
      // Force inline for Cloudinary/Firebase PDFs to prevent black screens/downloads
      if (details.url.toLowerCase().endsWith('.pdf')) {
        responseHeaders['Content-Disposition'] = ['inline'];
        responseHeaders['Content-Type'] = ['application/pdf'];
      }

      callback({ responseHeaders });
    }
  );

  const sharp = require('sharp');
  const fs = require('fs').promises;

  session.defaultSession.on('will-download', async (event, item) => {
    let fileName = item.getFilename();
    const mimeType = item.getMimeType();
    const isImage = mimeType.startsWith('image/');
    const isPngOrJpeg = mimeType === 'image/png' || mimeType === 'image/jpeg';

    // Add file extension if missing
    if (mimeType === 'image/jpeg' && !fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.jpeg')) {
      fileName += '.jpg';
    } else if (mimeType === 'image/png' && !fileName.toLowerCase().endsWith('.png')) {
      fileName += '.png';
    } else if (mimeType === 'image/webp' && !fileName.toLowerCase().endsWith('.webp')) {
      fileName += '.webp';
    } else if (mimeType === 'image/gif' && !fileName.toLowerCase().endsWith('.gif')) {
      fileName += '.gif';
    } else if (mimeType === 'image/bmp' && !fileName.toLowerCase().endsWith('.bmp')) {
      fileName += '.bmp';
    } else if (mimeType === 'image/tiff' && !fileName.toLowerCase().endsWith('.tiff') && !fileName.toLowerCase().endsWith('.tif')) {
      fileName += '.tiff';
    }

    if (fileName === 'download' || fileName === 'image') {
      const ext = mimeType.split('/')[1];
      fileName = `image-${Date.now()}.${ext}`;
    }

    const savePath = path.join(app.getPath('downloads'), 'Genatis', fileName);
    item.setSavePath(savePath);

    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed');
      } else if (state === 'progressing') {
        if (item.isPaused()) console.log('Download is paused');
        else console.log(`Received bytes: ${item.getReceivedBytes()}`);
      }
    });

    item.once('done', async (event, state) => {
      if (state === 'completed') {
        console.log('Download successfully');

        let finalPath = savePath;
        let finalMimeType = item.getMimeType();
        let finalFileName = fileName;

        // Convert non-PNG/JPEG images to JPEG
        if (isImage && !isPngOrJpeg) {
          try {
            console.log(`Converting ${mimeType} to JPEG...`);
            const jpegFileName = fileName.replace(/\.[^.]+$/, '.jpg');
            const jpegPath = path.join(app.getPath('downloads'), 'Genatis', jpegFileName);

            // Read the downloaded file and convert to JPEG
            await sharp(savePath)
              .jpeg({ quality: 90 })
              .toFile(jpegPath);

            // Delete the original file
            await fs.unlink(savePath);

            finalPath = jpegPath;
            finalMimeType = 'image/jpeg';
            finalFileName = jpegFileName;

            console.log(`Converted to JPEG: ${jpegPath}`);
          } catch (error) {
            console.error('Failed to convert image:', error);
            // If conversion fails, keep the original file
          }
        }

        if (mainWindow) {
          mainWindow.webContents.send('download-complete', {
            name: finalFileName,
            path: finalPath,
            type: finalMimeType,
            size: item.getTotalBytes(),
            addedAt: new Date().toISOString(),
          });
        }
      } else {
        console.log(`Download failed: ${state}`);
      }
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  console.log('[OPS-PERSISTENCE] Genatis app shutting down.');
});
