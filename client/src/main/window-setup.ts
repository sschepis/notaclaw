import { BrowserWindow, screen, session, systemPreferences } from 'electron';
import path from 'path';
import { configManager, WindowBounds } from './services/ConfigManager';

export function createWindow(): BrowserWindow {
  // Grant microphone (media) permission so the Web Speech API can access
  // the audio device from the renderer process.
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      // Allow microphone / camera access for speech-to-text
      const allowed = ['media', 'audioCapture'];
      callback(allowed.includes(permission));
    }
  );

  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission) => {
      const allowed = ['media', 'audioCapture'];
      return allowed.includes(permission);
    }
  );

  // On macOS, request system-level microphone access if not already granted
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    if (status !== 'granted') {
      systemPreferences.askForMediaAccess('microphone').catch(() => {
        // User may deny — ignore
      });
    }
  }

  // Restore saved window bounds, falling back to defaults
  const savedBounds = configManager.getWindowBounds();
  const defaultWidth = 1200;
  const defaultHeight = 800;

  let windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: defaultWidth,
    height: defaultHeight,
    icon: path.join(__dirname, '../../resources/icon.png'),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  };

  if (savedBounds) {
    // Validate that the saved position is still on a visible display
    const boundsVisible = isPositionOnScreen(savedBounds);
    if (boundsVisible) {
      windowOptions.x = savedBounds.x;
      windowOptions.y = savedBounds.y;
      windowOptions.width = savedBounds.width;
      windowOptions.height = savedBounds.height;
    }
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow(windowOptions);

  // Restore maximized state after window is created
  if (savedBounds?.isMaximized) {
    mainWindow.maximize();
  }

  // Debounce timer for saving bounds to avoid excessive disk writes
  let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null;
  const SAVE_DEBOUNCE_MS = 500;

  const saveWindowBounds = () => {
    if (saveBoundsTimer) {
      clearTimeout(saveBoundsTimer);
    }
    saveBoundsTimer = setTimeout(() => {
      if (mainWindow.isDestroyed()) return;
      const isMaximized = mainWindow.isMaximized();
      // When maximized, save the pre-maximized bounds so we restore the
      // correct non-maximized position/size.
      const bounds = isMaximized
        ? (mainWindow.getNormalBounds?.() ?? mainWindow.getBounds())
        : mainWindow.getBounds();
      const windowBounds: WindowBounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
      };
      configManager.setWindowBounds(windowBounds).catch(() => {
        // Ignore write errors — non-critical
      });
    }, SAVE_DEBOUNCE_MS);
  };

  mainWindow.on('resize', saveWindowBounds);
  mainWindow.on('move', saveWindowBounds);
  mainWindow.on('maximize', saveWindowBounds);
  mainWindow.on('unmaximize', saveWindowBounds);

  // Load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }
  
  return mainWindow;
}

/**
 * Check whether the given bounds rectangle overlaps with any connected display.
 * If the saved position is completely off-screen (e.g. monitor was disconnected),
 * we should fall back to defaults.
 */
function isPositionOnScreen(bounds: WindowBounds): boolean {
  const displays = screen.getAllDisplays();
  for (const display of displays) {
    const { x, y, width, height } = display.workArea;
    // Check if at least part of the window (50px margin) overlaps the display
    if (
      bounds.x + bounds.width > x + 50 &&
      bounds.x < x + width - 50 &&
      bounds.y + bounds.height > y + 50 &&
      bounds.y < y + height - 50
    ) {
      return true;
    }
  }
  return false;
}
