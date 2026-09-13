// Auto-updater service for production builds
// Removed ipcRenderer since it's not needed directly anymore if we use contextBridge

export class UpdateService {
  static async checkForUpdates() {
    if (!window.electronAPI) {
// /* console.log */ ('Running in web mode - updates not available');
      return null;
    }

    try {
      const updateInfo = await window.electronAPI.invoke('check-for-updates');
      return updateInfo;
    } catch (error) {
// /* console.error */ ('Failed to check for updates:', error);
      return null;
    }
  }

  static async downloadUpdate() {
    if (!window.electronAPI) return false;

    try {
      await window.electronAPI.invoke('download-update');
      return true;
    } catch (error) {
// /* console.error */ ('Failed to download update:', error);
      return false;
    }
  }

  static async installUpdate() {
    if (!window.electronAPI) return false;

    try {
      await window.electronAPI.invoke('install-update');
      return true;
    } catch (error) {
// /* console.error */ ('Failed to install update:', error);
      return false;
    }
  }

  static onUpdateAvailable(callback: (info: any) => void) {
    if (!window.electronAPI) return;
    window.electronAPI.on('update-available', callback);
  }

  static onUpdateDownloaded(callback: any) {
    if (!window.electronAPI) return;
    window.electronAPI.on('update-downloaded', callback);
  }

  static removeAllListeners() {
    if (!window.electronAPI) return;
    // Context bridge doesn't support removeAllListeners easily, just no-op or implement removeListener individually
  }
}
