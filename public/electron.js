const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
console.log('[MAIN] electron.cjs loaded');
const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

let mainWindow;
let overlayWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: !isDev,
      webviewTag: true,
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
    width: 1920,
    height: 1080,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.maximize();

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

app.whenReady().then(() => {
  createMainWindow();

  const { session } = require('electron');
  session.defaultSession.on('will-download', (event, item, webContents) => {
    // Set the save path, making Electron not to prompt a save dialog.
    const fileName = item.getFilename();
    const savePath = path.join(app.getPath('downloads'), 'ClassPoint', fileName);
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
  });

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
