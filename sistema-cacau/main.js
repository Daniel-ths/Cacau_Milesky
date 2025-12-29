const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let backendProcess;

function getBackendPath() {
  // Como vamos desligar o ASAR, o caminho é o mesmo em Dev e Prod:
  return path.join(__dirname, 'backend', 'index.js');
}

function startBackend() {
  const backendPath = getBackendPath();
  const userDataPath = app.getPath('userData');

  // Inicia o backend
  backendProcess = fork(backendPath, [], {
    env: {
      ...process.env,
      NODE_ENV: app.isPackaged ? 'production' : 'development',
      USER_DATA_PATH: userDataPath
    },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  });

  backendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error('Backend fechou inesperadamente', code);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Gestão de Cacau",
    icon: path.join(__dirname, 'icon.png'), // Se tiver icone
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (!app.isPackaged) {
    // DESENVOLVIMENTO
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // PRODUÇÃO: Carrega o React compilado da pasta dist
    // Importante: frontend/dist/index.html deve existir
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  startBackend();
  // Pequeno delay para garantir carregamento
  setTimeout(createWindow, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});