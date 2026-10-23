const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const fs = require('fs');

// Ensure all application data is stored in the installation folder or user-selected folder
const installDir = path.dirname(app.getPath('exe'));
const dataDir = path.join(installDir, 'app_data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) {
    console.warn('Using appData fallback', e);
  }
}

let mainWindow = null;
let serverInstance = null;
const PORT = process.env.PORT || 3456;

function startLocalServer() {
  const localApp = express();
  localApp.use(express.json());

  // Serve static build from dist folder
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    localApp.use(express.static(distPath));
    localApp.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  serverInstance = localApp.listen(PORT, '127.0.0.1', () => {
    console.log(`Local Cash Management Desktop Server running on http://127.0.0.1:${PORT}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'نظام إدارة التحويلات المالية الذكي',
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: true,
  });

  // Load local web app
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startLocalServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverInstance) serverInstance.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
