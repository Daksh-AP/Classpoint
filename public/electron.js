const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
console.log('[MAIN] electron.cjs loaded');
// Lock internal rasterization to 1080p (scale factor 1.0) to prevent 4K fill-rate stutter & pen lag
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
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
    webPreferences: {
      zoomFactor: 1.0,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev,
    },
    show: false,
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (overlayWindow) {
      overlayWindow.close();
    }
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
    skipTaskbar: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  overlayWindow.setIgnoreMouseEvents(false);
  // overlayWindow.maximize(); // Removed maximization for widget mode

  overlayWindow.loadURL(
    isDev
      ? 'http://localhost:3000/#/overlay'
      : `file://${path.join(__dirname, '../build/index.html')}#/overlay`
  );

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

// IPC Handlers
ipcMain.on('open-overlay', () => {
  createOverlayWindow();
});

ipcMain.on('close-overlay', () => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
});

ipcMain.on('broadcast-widget-data', (event, data) => {
  if (overlayWindow) {
    overlayWindow.webContents.send('widget-data-update', data);
  }
});

ipcMain.on('request-widget-data', (event) => {
  // Ask main window to send data
  if (mainWindow) {
    mainWindow.webContents.send('request-widget-sync');
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
  if (overlayWindow) {
    overlayWindow.hide();
  }
});

ipcMain.handle('close-widget', () => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
});

ipcMain.handle('update-widget-position', (event, { x, y }) => {
  if (overlayWindow) {
    overlayWindow.setPosition(x, y);
  }
});

ipcMain.handle('set-widget-size', (event, { width, height }) => {
  if (overlayWindow) {
    overlayWindow.setSize(width, height);
  }
});

ipcMain.on('set-start-on-login', (event, startOnLogin) => {
  app.setLoginItemSettings({
    openAtLogin: startOnLogin,
    path: app.getPath('exe')
  });
});

ipcMain.handle('save-file', async (event, { dataUrl, payloadPath }) => {
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

app.whenReady().then(() => {
  createMainWindow();

  const { session } = require('electron');

  const handleDownload = (event, item, webContents) => {
    // Ensure the download directory exists
    const downloadFolder = path.join(app.getPath('downloads'), 'Genatis');
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }

    // Set the save path, making Electron not to prompt a save dialog.
    const fileName = item.getFilename();
    const savePath = path.join(downloadFolder, fileName);
    item.setSavePath(savePath);

    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed');
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('Download is paused');
        } else {
          console.log(`Received bytes: ${item.getReceivedBytes()}`);
        }
      }
    });

    item.once('done', (event, state) => {
      if (state === 'completed') {
        console.log('Download successfully');
        if (mainWindow) {
          mainWindow.webContents.send('download-complete', {
            name: fileName,
            path: savePath,
            type: item.getMimeType(),
            size: item.getTotalBytes(),
            addedAt: new Date().toISOString()
          });
        }
      } else {
        console.log(`Download failed: ${state}`);
      }
    });
  };

  session.defaultSession.on('will-download', handleDownload);
  session.fromPartition('persist:browser').on('will-download', handleDownload);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
