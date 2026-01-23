import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

import "./ipc.js";

/** @type {BrowserWindow | null} */
let mainWindow: BrowserWindow | null = null;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// More reliable development environment detection
const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "default",
  });

  if (isDev) {
    // Development mode: Load Vite dev server
    mainWindow.loadURL("http://localhost:5173").catch(() => {
      // If Vite server isn't running, show error page
      mainWindow?.loadFile(path.join(__dirname, "../public/error.html"));
    });
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode: Load from packaged dist directory
    const distPath = path.join(__dirname, "../dist", "index.html");
    mainWindow.loadFile(distPath).catch((/** @type {Error} */ err) => {
      console.error("Failed to load index.html:", err);
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
