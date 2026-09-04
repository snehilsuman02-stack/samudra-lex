const { ipcMain } = require('electron');
const database = require('./database');

function registerIpc() {
  ipcMain.handle('db:health', async () => {
    try {
      const result = database.getDb().prepare('SELECT 1 AS ok').get();
      return { ok: Boolean(result && result.ok === 1) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('db:init', async () => {
    return database.initializeDatabase();
  });

  ipcMain.handle('db:search', async (_event, query, type = 'ALL') => {
    return database.search(query, type);
  });

  ipcMain.handle('db:overview', async () => {
    return database.getOverview();
  });

  ipcMain.handle('db:scenarios', async () => {
    return database.getScenarios();
  });

  ipcMain.handle('db:scenario', async (_event, id) => {
    return database.getScenarioById(id);
  });

  ipcMain.handle('db:law-library', async () => {
    return database.getLawLibrary();
  });

  ipcMain.handle('db:module-records', async (_event, moduleName) => {
    return database.getModuleRecords(moduleName);
  });

  ipcMain.handle('db:login', async (_event, username, password) => {
    return database.verifyLogin(username, password);
  });

  ipcMain.handle('db:add-case', async (_event, payload) => {
    return database.addCase(payload);
  });

  ipcMain.handle('db:add-evidence', async (_event, payload) => {
    return database.addEvidence(payload);
  });

  ipcMain.handle('db:add-event', async (_event, payload) => {
    return database.addCaseEvent(payload);
  });

  ipcMain.handle('db:get-cases', async () => {
    return database.getCases();
  });

  ipcMain.handle('db:backup', async () => {
    return database.createBackup();
  });

  ipcMain.handle('db:restore', async (_event, backupPath) => {
    return database.restoreBackup(backupPath);
  });
}

module.exports = { registerIpc };
