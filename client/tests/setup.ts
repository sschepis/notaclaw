// Jest setup file

// Mock BrowserWindow class with static methods
const mockBrowserWindow: any = jest.fn(() => ({
  loadURL: jest.fn(),
  loadFile: jest.fn(),
  webContents: {
    send: jest.fn(),
  },
  on: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  setIgnoreMouseEvents: jest.fn(),
}));
mockBrowserWindow.getAllWindows = jest.fn(() => []);

// Mock Electron modules for testing
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => `/mock/path/${name}`),
    quit: jest.fn(),
    on: jest.fn(),
  },
  BrowserWindow: mockBrowserWindow,
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
  },
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
  desktopCapturer: {
    getSources: jest.fn().mockResolvedValue([]),
  },
  globalShortcut: {
    register: jest.fn().mockReturnValue(true),
    unregister: jest.fn(),
  },
  screen: {
    getPrimaryDisplay: jest.fn().mockReturnValue({
      workAreaSize: { width: 1920, height: 1080 },
    }),
  },
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
}));

// Mock Gun
const mockGunInstance = {
  get: jest.fn(),
  put: jest.fn(),
  once: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  opt: jest.fn(),
  user: jest.fn(),
};

// Make chainable
mockGunInstance.get.mockReturnValue(mockGunInstance);
mockGunInstance.put.mockImplementation((data, callback) => {
  if (callback) callback({ err: null });
  return mockGunInstance;
});
mockGunInstance.once.mockImplementation((callback) => {
  if (callback) callback(null);
});
mockGunInstance.user.mockReturnValue({
  create: jest.fn(),
  auth: jest.fn(),
  leave: jest.fn(),
});

jest.mock('gun', () => {
  return jest.fn(() => mockGunInstance);
});

// Global test timeout
jest.setTimeout(10000);

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
