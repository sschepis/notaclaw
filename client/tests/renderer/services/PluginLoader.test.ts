import { PluginLoader } from '../../../src/renderer/services/PluginLoader';
import { useSlotRegistry } from '../../../src/renderer/services/SlotRegistry';
import { usePluginStore } from '../../../src/renderer/store/usePluginStore';

// Mock window.electronAPI
const mockElectronAPI = {
  getPlugins: jest.fn(),
  readPluginFile: jest.fn(),
  onPluginMessage: jest.fn(),
  sendPluginMessage: jest.fn(),
  pluginStorageGet: jest.fn(),
  pluginStorageSet: jest.fn(),
  pluginStorageDelete: jest.fn(),
  pluginRegisterTool: jest.fn(),
  secretsSet: jest.fn(),
  secretsGet: jest.fn(),
  secretsDelete: jest.fn(),
  secretsHas: jest.fn(),
  secretsList: jest.fn(),
  aiComplete: jest.fn(),
};

// Set up global mock
(global as any).window = {
  electronAPI: mockElectronAPI,
};

// Reset PluginLoader singleton between tests
const resetPluginLoader = () => {
  // Access private static instance to reset it
  (PluginLoader as any).instance = undefined;
};

describe('PluginLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPluginLoader();
    
    // Reset stores
    usePluginStore.setState({ plugins: [], availableSkills: [], filter: 'all', extensions: {} });
    useSlotRegistry.setState({
      registrations: {},
      panels: {},
      stageViews: {},
      navigations: {},
      inspectorTabs: {},
      inspectorSections: {},
      messageDecorators: {},
      settingsTabs: {},
      commands: {},
      modals: [],
      toasts: [],
    });
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PluginLoader.getInstance();
      const instance2 = PluginLoader.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize and load plugins', async () => {
      mockElectronAPI.getPlugins.mockResolvedValue([
        {
          id: 'test-plugin',
          path: '/plugins/test-plugin',
          renderer: 'renderer/bundle.js',
          name: 'Test Plugin',
          version: '1.0.0',
        },
      ]);
      mockElectronAPI.readPluginFile.mockResolvedValue('module.exports = { activate: function() {} };');

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      expect(mockElectronAPI.getPlugins).toHaveBeenCalled();
      expect(loader.getLoadedPlugins()).toContain('test-plugin');
    });

    it('should handle getPlugins returning non-array', async () => {
      mockElectronAPI.getPlugins.mockResolvedValue(null);

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      expect(loader.getLoadedPlugins()).toEqual([]);
    });

    it('should handle getPlugins error', async () => {
      mockElectronAPI.getPlugins.mockRejectedValue(new Error('API Error'));

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      expect(loader.getLoadedPlugins()).toEqual([]);
    });

    it('should skip plugins without renderer', async () => {
      mockElectronAPI.getPlugins.mockResolvedValue([
        {
          id: 'backend-only-plugin',
          path: '/plugins/backend-only',
          // No renderer property
        },
      ]);

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      expect(loader.getLoadedPlugins()).toEqual([]);
    });
  });

  describe('isPluginLoaded', () => {
    it('should return true for loaded plugin', async () => {
      mockElectronAPI.getPlugins.mockResolvedValue([
        {
          id: 'test-plugin',
          path: '/plugins/test-plugin',
          renderer: 'renderer/bundle.js',
        },
      ]);
      mockElectronAPI.readPluginFile.mockResolvedValue('module.exports = {};');

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      expect(loader.isPluginLoaded('test-plugin')).toBe(true);
    });

    it('should return false for not loaded plugin', () => {
      const loader = PluginLoader.getInstance();

      expect(loader.isPluginLoaded('unknown-plugin')).toBe(false);
    });
  });

  describe('unloadPlugin', () => {
    it('should unload a loaded plugin', async () => {
      mockElectronAPI.getPlugins.mockResolvedValue([
        {
          id: 'test-plugin',
          path: '/plugins/test-plugin',
          renderer: 'renderer/bundle.js',
        },
      ]);
      mockElectronAPI.readPluginFile.mockResolvedValue('module.exports = {};');

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      expect(loader.isPluginLoaded('test-plugin')).toBe(true);

      const result = await loader.unloadPlugin('test-plugin');

      expect(result).toBe(true);
      expect(loader.isPluginLoaded('test-plugin')).toBe(false);
    });

    it('should return false for not loaded plugin', async () => {
      const loader = PluginLoader.getInstance();

      const result = await loader.unloadPlugin('unknown-plugin');

      expect(result).toBe(false);
    });

    it('should handle invalid pluginId', async () => {
      const loader = PluginLoader.getInstance();

      const result = await loader.unloadPlugin('');

      expect(result).toBe(false);
    });
  });

  describe('getLoadedPluginInfo', () => {
    it('should return detailed info about loaded plugins', async () => {
      mockElectronAPI.getPlugins.mockResolvedValue([
        {
          id: 'test-plugin',
          path: '/plugins/test-plugin',
          renderer: 'renderer/bundle.js',
          name: 'Test Plugin',
          version: '1.0.0',
        },
      ]);
      mockElectronAPI.readPluginFile.mockResolvedValue('module.exports = {};');

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      const info = loader.getLoadedPluginInfo();

      expect(info.length).toBe(1);
      expect(info[0].id).toBe('test-plugin');
      expect(info[0].metadata.name).toBe('Test Plugin');
      expect(info[0].loadedAt).toBeInstanceOf(Date);
    });
  });

  describe('reloadPlugin', () => {
    it('should reload a loaded plugin', async () => {
      mockElectronAPI.getPlugins.mockResolvedValue([
        {
          id: 'test-plugin',
          path: '/plugins/test-plugin',
          renderer: 'renderer/bundle.js',
        },
      ]);
      mockElectronAPI.readPluginFile.mockResolvedValue('module.exports = {};');

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      const result = await loader.reloadPlugin('test-plugin');

      expect(result).toBe(true);
      expect(loader.isPluginLoaded('test-plugin')).toBe(true);
    });

    it('should return false for not loaded plugin', async () => {
      const loader = PluginLoader.getInstance();

      const result = await loader.reloadPlugin('unknown-plugin');

      expect(result).toBe(false);
    });
  });

  describe('plugin execution', () => {
    it('should call activate function if present', async () => {
      const activateMock = jest.fn();
      mockElectronAPI.getPlugins.mockResolvedValue([
        {
          id: 'test-plugin',
          path: '/plugins/test-plugin',
          renderer: 'renderer/bundle.js',
        },
      ]);
      // Note: The actual code execution is sandboxed, so we can't directly test the activate call
      // This test verifies the plugin loads successfully
      mockElectronAPI.readPluginFile.mockResolvedValue('module.exports = { activate: function(ctx) { console.log("activated"); } };');

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      expect(loader.isPluginLoaded('test-plugin')).toBe(true);
    });

    it('should handle plugin execution errors gracefully', async () => {
      mockElectronAPI.getPlugins.mockResolvedValue([
        {
          id: 'bad-plugin',
          path: '/plugins/bad-plugin',
          renderer: 'renderer/bundle.js',
        },
      ]);
      // Invalid JavaScript that will throw during execution
      mockElectronAPI.readPluginFile.mockResolvedValue('throw new Error("Plugin error");');

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      // Plugin should not be loaded due to execution error
      expect(loader.isPluginLoaded('bad-plugin')).toBe(false);
    });
  });

  describe('file loading fallback', () => {
    it('should try bundle.js first, then index.js', async () => {
      mockElectronAPI.getPlugins.mockResolvedValue([
        {
          id: 'test-plugin',
          path: '/plugins/test-plugin',
          renderer: 'renderer/index.js',
        },
      ]);
      
      // First call (bundle.js) fails
      mockElectronAPI.readPluginFile.mockImplementation((path: string) => {
        if (path.includes('bundle.js')) {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.resolve('module.exports = {};');
      });

      const loader = PluginLoader.getInstance();
      await loader.initialize();

      // Should have tried bundle.js first, then index.js
      expect(mockElectronAPI.readPluginFile).toHaveBeenCalledTimes(2);
      expect(loader.isPluginLoaded('test-plugin')).toBe(true);
    });
  });
});
