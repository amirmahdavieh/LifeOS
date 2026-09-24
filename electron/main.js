import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.setName('LifeOS');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.amirmahdavieh.lifeos');
}

// db.js resolves its own OS-standard data directory, so the dev server,
// `electron .`, and the packaged app all read/write the same database file.
const { startServer } = await import('../server/index.js');

let mainWindow;

async function createWindow() {
  const { port } = await startServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'LifeOS',
    autoHideMenuBar: true,
    backgroundColor: '#fafafa',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${port}`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
