const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('samudraAPI', {
  initDb: () => ipcRenderer.invoke('db:init'),
  getOverview: () => ipcRenderer.invoke('db:overview'),
  search: (query, type) => ipcRenderer.invoke('db:search', query, type),
  getScenarios: () => ipcRenderer.invoke('db:scenarios'),
  getScenarioById: (id) => ipcRenderer.invoke('db:scenario', id),
  getLawLibrary: () => ipcRenderer.invoke('db:law-library'),
  getCases: () => ipcRenderer.invoke('db:get-cases'),
  addCase: (payload) => ipcRenderer.invoke('db:add-case', payload),
  addEvidence: (payload) => ipcRenderer.invoke('db:add-evidence', payload),
  addEvent: (payload) => ipcRenderer.invoke('db:add-event', payload),
  backupDatabase: () => ipcRenderer.invoke('db:backup'),
  restoreDatabase: (backupPath) => ipcRenderer.invoke('db:restore', backupPath),
  login: (username, password) => ipcRenderer.invoke('db:login', username, password),
  ping: () => ipcRenderer.invoke('db:health'),
});
