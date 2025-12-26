// Main process for ClassPoint Electron app
const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
console.log('[MAIN] electron.cjs loaded');
const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

let mainWindow;
let overlayWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: !isDev,
      webviewTag: true,
    },
    show: false,
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(startUrl);

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
      webSecurity: !isDev,
    },
  });

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
});

ipcMain.handle('update-widget-position', (event, { x, y }) => {
  if (overlayWindow) overlayWindow.setPosition(x, y);
});

app.whenReady().then(() => {
  createMainWindow();

  const { session } = require('electron');
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

    const savePath = path.join(app.getPath('downloads'), 'ClassPoint', fileName);
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
            const jpegPath = path.join(app.getPath('downloads'), 'ClassPoint', jpegFileName);

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
