const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, data) => {
    const validChannels = ['show-widget', 'hide-widget', 'close-widget', 'save-file', 'open-path', 'check-for-updates', 'download-update', 'install-update', 'set-widget-size', 'get-start-on-login', 'get-machine-hardware-id'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  },
  send: (channel, data) => {
    const validChannels = ['set-start-on-login', 'broadcast-widget-data', 'download-url', 'resize-widget', 'request-widget-sync', 'set-ignore-mouse-events'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, func) => {
    const validChannels = ['widget-closed', 'download-complete', 'screen-captured', 'request-widget-sync'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      const subscription = (event, ...args) => func(event, ...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },
  removeListener: (channel, func) => {
      ipcRenderer.removeListener(channel, func);
  }
});
