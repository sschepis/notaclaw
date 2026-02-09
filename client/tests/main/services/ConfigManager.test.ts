import { ConfigManager, AppConfig, NetworkConfig, LoggingConfig } from '../../../src/main/services/ConfigManager';
import fs from 'fs/promises';
import { app } from 'electron';

jest.mock('fs/promises');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/userData'),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  const defaultConfig: AppConfig = {
    network: {
      peers: [
        'http://localhost:8765/gun',
        'https://gun-manhattan.herokuapp.com/gun',
        'https://gun-us.herokuapp.com/gun'
      ],
      bootstrapUrl: 'https://alephnet.io/bootstrap',
      heartbeatIntervalMs: 30000
    },
    logging: {
      level: 'info',
      format: 'json'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configManager = new ConfigManager();
  });

  describe('initialize', () => {
    it('should load config from file if it exists', async () => {
      const customConfig: AppConfig = {
        network: {
          peers: ['http://custom-peer:8765/gun'],
          bootstrapUrl: 'https://custom-bootstrap.io',
          heartbeatIntervalMs: 60000
        },
        logging: {
          level: 'debug',
          format: 'pretty',
          outputFile: 'app.log'
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(customConfig));

      await configManager.initialize();

      expect(mockFs.readFile).toHaveBeenCalledWith('/mock/userData/config.json', 'utf-8');
      expect(configManager.getConfig()).toEqual(customConfig);
    });

    it('should use default config and save if file does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();

      expect(configManager.getConfig()).toEqual(defaultConfig);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should deep merge partial user config with defaults', async () => {
      const partialConfig = {
        network: {
          heartbeatIntervalMs: 45000
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(partialConfig));

      await configManager.initialize();

      const config = configManager.getConfig();
      expect(config.network.heartbeatIntervalMs).toBe(45000);
      expect(config.network.peers).toEqual(defaultConfig.network.peers);
      expect(config.logging).toEqual(defaultConfig.logging);
    });
  });

  describe('getNetworkConfig', () => {
    it('should return network configuration', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();

      const networkConfig = configManager.getNetworkConfig();
      expect(networkConfig).toEqual(defaultConfig.network);
    });
  });

  describe('getLoggingConfig', () => {
    it('should return logging configuration', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();

      const loggingConfig = configManager.getLoggingConfig();
      expect(loggingConfig).toEqual(defaultConfig.logging);
    });
  });

  describe('updateNetworkConfig', () => {
    it('should update network config and save', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();
      
      const updates: Partial<NetworkConfig> = {
        heartbeatIntervalMs: 45000,
        bootstrapUrl: 'https://new-bootstrap.io'
      };

      await configManager.updateNetworkConfig(updates);

      const config = configManager.getNetworkConfig();
      expect(config.heartbeatIntervalMs).toBe(45000);
      expect(config.bootstrapUrl).toBe('https://new-bootstrap.io');
      expect(config.peers).toEqual(defaultConfig.network.peers);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2); // Initial save + update
    });
  });

  describe('updateLoggingConfig', () => {
    it('should update logging config and save', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();

      const updates: Partial<LoggingConfig> = {
        level: 'debug',
        outputFile: 'debug.log'
      };

      await configManager.updateLoggingConfig(updates);

      const config = configManager.getLoggingConfig();
      expect(config.level).toBe('debug');
      expect(config.outputFile).toBe('debug.log');
      expect(config.format).toBe('json');
    });
  });

  describe('addPeer', () => {
    it('should add a new peer to the list', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();

      const newPeer = 'http://new-peer:8765/gun';
      await configManager.addPeer(newPeer);

      const config = configManager.getNetworkConfig();
      expect(config.peers).toContain(newPeer);
    });

    it('should not add duplicate peer', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();

      const existingPeer = defaultConfig.network.peers[0];
      await configManager.addPeer(existingPeer);

      const config = configManager.getNetworkConfig();
      const peerCount = config.peers.filter(p => p === existingPeer).length;
      expect(peerCount).toBe(1);
    });
  });

  describe('removePeer', () => {
    it('should remove a peer from the list', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();

      const peerToRemove = defaultConfig.network.peers[0];
      await configManager.removePeer(peerToRemove);

      const config = configManager.getNetworkConfig();
      expect(config.peers).not.toContain(peerToRemove);
    });

    it('should handle removing non-existent peer gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue();

      await configManager.initialize();

      const originalPeers = [...configManager.getNetworkConfig().peers];
      await configManager.removePeer('http://non-existent:8765/gun');

      const config = configManager.getNetworkConfig();
      expect(config.peers).toEqual(originalPeers);
    });
  });
});
