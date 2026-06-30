const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rxReadyDesktop', {
  isPatientLookupConfigured: () => ipcRenderer.invoke('patient-lookup:is-configured'),
  configurePatientLookup: (input) => ipcRenderer.invoke('patient-lookup:configure', input),
  lookupPatient: (hn) => ipcRenderer.invoke('patient-lookup:lookup', hn),
  importConfigIni: () => ipcRenderer.invoke('patient-lookup:import-config-ini'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
});
