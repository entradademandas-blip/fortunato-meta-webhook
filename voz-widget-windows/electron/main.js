const path = require('path');
const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen, session } = require('electron');

const channels = require('./ipc-channels');
const log = require('../src/logger');
const speechToText = require('../src/speechToText');
const textToSpeech = require('../src/textToSpeech');
const masterControllerClient = require('../src/masterControllerClient');

const HOTKEY = 'Control+Alt+M';
const WINDOW_WIDTH = 460;
const WINDOW_HEIGHT = 560;
const WINDOW_MARGIN = 24;

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  const { workAreaSize } = screen.getPrimaryDisplay();

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: workAreaSize.width - WINDOW_WIDTH - WINDOW_MARGIN,
    y: WINDOW_MARGIN,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Sem esse handler, o Electron nega qualquer pedido de permissão (inclusive
  // getUserMedia) por padrão — o botão de voz nunca conseguiria acessar o microfone.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Fechar a janela (Alt+F4, X) só esconde o widget; quem realmente encerra o
  // processo é o item "Sair" da bandeja.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function toggleVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send(channels.WIDGET_SHOWN);
  }
}

function createTray() {
  tray = new Tray(path.join(__dirname, '..', 'assets', 'tray-icon.png'));
  tray.setToolTip('Master Controller — Voz Widget');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Mostrar/Ocultar', click: toggleVisibility },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ])
  );
  tray.on('click', toggleVisibility);
}

function registerGlobalHotkey() {
  const registered = globalShortcut.register(HOTKEY, toggleVisibility);
  if (!registered) {
    log.warn(`[main] não foi possível registrar o atalho global ${HOTKEY} (conflito com outro app?)`);
  }
}

function registerIpcHandlers() {
  ipcMain.handle(channels.MIC_TRANSCRIBE, async (_event, { audioBuffer }) => {
    return speechToText.transcribe(Buffer.from(audioBuffer));
  });

  ipcMain.handle(channels.MASTER_CONTROLLER_SEND, async (_event, { text }) => {
    return masterControllerClient.send(text);
  });

  ipcMain.handle(channels.TTS_SPEAK, async (_event, { text }) => {
    return textToSpeech.synthesize(text);
  });

  ipcMain.handle(channels.LOG_CLIENT_ERROR, async (_event, { scope, message }) => {
    log.error(`[renderer:${scope}] ${message}`);
    return { ok: true };
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  createTray();
  registerGlobalHotkey();
});

app.on('window-all-closed', (event) => {
  // Widget de bandeja: nunca sai automaticamente ao fechar a janela.
  event.preventDefault();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
