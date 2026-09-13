// Main process for Classora Electron app
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
const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
console.log('[MAIN] electron.cjs loaded');

// --- Industrial OPS Hardening: ThawSpace / Persistent Partition Detection ---
// School OPS panels running Deep Freeze or UWF restore C:\ on reboot.
// Detect secondary persistent partitions (D:\, E:\, or designated ThawSpace) and redirect data.
function detectPersistentRoot() {
  const envTarget = process.env.GENATIS_DATA_DIR || process.env.CLASSORA_DATA_DIR;
  if (envTarget && fs.existsSync(envTarget)) {
    return envTarget;
  }
  const candidatePaths = [
    'D:\\ClassoraData',
    'D:\\GenatisData',
    'E:\\ClassoraData',
    'E:\\GenatisData',
    'C:\\ThawSpace\\ClassoraData',
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

// --- Industrial OPS Hardening: Crash Sentinel Circuit ---
// When a wall-switch hard cut occurs, deleting orphan LOCK files leaves torn MANIFEST / .ldb tables,
// causing unhandled Chromium/Firestore startup crashes.
// The Crash Sentinel Circuit detects unclean shutdowns and resets local LevelDB storage so the app rehydrates cleanly.
const userDataPath = app.getPath('userData');
const crashSentinelPath = path.join(userDataPath, '.crash_sentinel');

if (fs.existsSync(crashSentinelPath)) {
  console.warn('[OPS-RECOVERY] Abrupt power cut detected from previous session (.crash_sentinel present).');
  console.warn('[OPS-RECOVERY] Purging potentially torn LevelDB / IndexedDB tables to prevent unhandled startup crashes...');
  try {
    fs.rmSync(path.join(userDataPath, 'Local Storage'), { recursive: true, force: true });
    fs.rmSync(path.join(userDataPath, 'IndexedDB'), { recursive: true, force: true });
    fs.rmSync(path.join(userDataPath, 'Session Storage'), { recursive: true, force: true });
    console.log('[OPS-RECOVERY] Successfully purged torn LevelDB state. App will rehydrate cleanly from Firestore.');
  } catch (cleanErr) {
    console.warn('[OPS-RECOVERY] Error during crash sentinel cleanup:', cleanErr.message);
  }
}

// Arm the sentinel for this session
try {
  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
  fs.writeFileSync(crashSentinelPath, `${Date.now()}`);
} catch (e) {
  // Non-fatal if read-only
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

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      zoomFactor: 1.0,
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'public', 'preload.js'),
      webSecurity: !isDev,
      webviewTag: true
    },
    show: false,
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Disable the default menu bar
  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Add Context Menu for saving images
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { Menu, MenuItem } = require('electron');
    const menu = new Menu();

    if (params.mediaType === 'image') {
      menu.append(new MenuItem({
        label: 'Save Image to Resource Hub',
        click: () => {
          mainWindow.webContents.downloadURL(params.srcURL);
        }
      }));
      menu.popup();
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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: !isDev,
    },
  });

  overlayWindow.setIgnoreMouseEvents(false);
  // overlayWindow.maximize(); // Removed maximization for widget mode = isDev
  const overlayUrl = isDev
    ? 'http://localhost:3000/#/overlay'
    : `file://${path.join(__dirname, 'build/index.html')}#/overlay`;

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

ipcMain.on('broadcast-widget-data', (event, data) => {
  if (overlayWindow) {
    overlayWindow.webContents.send('widget-data-update', data);
  }
});

ipcMain.on('request-widget-data', (event) => {
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

// Hardware Identity for Deep Freeze Amnesia Bypass
ipcMain.handle('get-machine-hardware-id', async () => {
  const hostname = os.hostname();
  let uuid = '';
  try {
    uuid = execSync('powershell.exe -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', { timeout: 4000, encoding: 'utf8' }).trim();
  } catch (e) {
    try {
      uuid = execSync('wmic csproduct get uuid', { timeout: 4000, encoding: 'utf8' }).replace(/UUID|\r|\n|\s/gi, '').trim();
    } catch (e2) {
      uuid = hostname;
    }
  }
  return {
    hostname,
    uuid: uuid || hostname,
    machineId: `${hostname}_${uuid || 'default'}`
  };
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

    const savePath = path.join(app.getPath('downloads'), 'Classora', fileName);
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
            const jpegPath = path.join(app.getPath('downloads'), 'Classora', jpegFileName);

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
  try {
    const userData = app.getPath('userData');
    const sentinel = path.join(userData, '.crash_sentinel');
    if (fs.existsSync(sentinel)) {
      fs.unlinkSync(sentinel);
      console.log('[OPS-RECOVERY] Clean shutdown confirmed. Crash sentinel removed.');
    }
  } catch (e) {
    // Ignore cleanup error on quit
  }
});
