// Auto-updater service for production builds
const { ipcRenderer } = window.require ? window.require('electron') : {};

export class UpdateService {
  static async checkForUpdates() {
    if (!ipcRenderer) {
      console.log('Running in web mode - updates not available');
      return null;
    }

    try {
      const updateInfo = await ipcRenderer.invoke('check-for-updates');
      return updateInfo;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return null;
    }
  }

  static async downloadUpdate() {
    if (!ipcRenderer) return false;

    try {
      await ipcRenderer.invoke('download-update');
      return true;
    } catch (error) {
      console.error('Failed to download update:', error);
      return false;
    }
  }

  static async installUpdate() {
    if (!ipcRenderer) return false;

    try {
      await ipcRenderer.invoke('install-update');
      return true;
    } catch (error) {
      console.error('Failed to install update:', error);
      return false;
    }
  }

  static onUpdateAvailable(callback) {
    if (!ipcRenderer) return;
    ipcRenderer.on('update-available', callback);
  }

  static onUpdateDownloaded(callback) {
    if (!ipcRenderer) return;
    ipcRenderer.on('update-downloaded', callback);
  }

  static removeAllListeners() {
    if (!ipcRenderer) return;
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-downloaded');
  }
}