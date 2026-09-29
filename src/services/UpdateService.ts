// Over-The-Air (OTA) updater service for Genatis Board

export interface UpdateInfo {
  version: string;
  files?: any[];
  path?: string;
  sha512?: string;
  releaseName?: string;
  releaseNotes?: string;
  releaseDate?: string;
}

export interface DownloadProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

export class UpdateService {
  static async getAppVersion(): Promise<string> {
    if (!window.electronAPI) return '1.0.0 (Web)';
    try {
      const ver = await window.electronAPI.invoke('get-app-version');
      return ver || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  static async checkForUpdates(): Promise<any> {
    if (!window.electronAPI) {
      return { isDev: true, status: 'web-mode', currentVersion: '1.0.0' };
    }

    try {
      const result = await window.electronAPI.invoke('check-for-updates');
      return result;
    } catch (error: any) {
      return { status: 'error', error: error.message };
    }
  }

  static async downloadUpdate(): Promise<boolean> {
    if (!window.electronAPI) return false;
    try {
      const success = await window.electronAPI.invoke('download-update');
      return Boolean(success);
    } catch {
      return false;
    }
  }

  static async installUpdate(): Promise<boolean> {
    if (!window.electronAPI) return false;
    try {
      const success = await window.electronAPI.invoke('install-update');
      return Boolean(success);
    } catch {
      return false;
    }
  }

  static onUpdateAvailable(callback: (info: UpdateInfo) => void): (() => void) | undefined {
    if (!window.electronAPI) return undefined;
    return window.electronAPI.on('update-available', (_event: any, info: UpdateInfo) => callback(info));
  }

  static onUpdateNotAvailable(callback: (info: any) => void): (() => void) | undefined {
    if (!window.electronAPI) return undefined;
    return window.electronAPI.on('update-not-available', (_event: any, info: any) => callback(info));
  }

  static onDownloadProgress(callback: (progress: DownloadProgressInfo) => void): (() => void) | undefined {
    if (!window.electronAPI) return undefined;
    return window.electronAPI.on('download-progress', (_event: any, progress: DownloadProgressInfo) => callback(progress));
  }

  static onUpdateDownloaded(callback: (info: UpdateInfo) => void): (() => void) | undefined {
    if (!window.electronAPI) return undefined;
    return window.electronAPI.on('update-downloaded', (_event: any, info: UpdateInfo) => callback(info));
  }

  static onUpdateError(callback: (error: { message: string }) => void): (() => void) | undefined {
    if (!window.electronAPI) return undefined;
    return window.electronAPI.on('update-error', (_event: any, error: { message: string }) => callback(error));
  }
}
