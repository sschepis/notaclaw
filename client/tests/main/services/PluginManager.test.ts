import { PluginManager } from '../../../src/main/services/PluginManager';
import { DSNNode } from '../../../src/main/services/DSNNode';
import { AIProviderManager } from '../../../src/main/services/AIProviderManager';
import { SignedEnvelopeService } from '../../../src/main/services/SignedEnvelopeService';
import { TrustEvaluator } from '../../../src/main/services/TrustEvaluator';
import { TrustGate } from '../../../src/main/services/TrustGate';
import { ServiceRegistry } from '../../../src/main/services/ServiceRegistry';
import { SignedEnvelope, TrustAssessment, CapabilityCheckResult } from '../../../src/shared/trust-types';
import path from 'path';
import fs from 'fs/promises';

jest.mock('fs/promises');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data'),
    getAppPath: jest.fn().mockReturnValue('/mock/app'),
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([]),
  }
}));

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockDSNNode: jest.Mocked<DSNNode>;
  let mockAIManager: jest.Mocked<AIProviderManager>;
  let mockEnvelopeService: jest.Mocked<SignedEnvelopeService>;
  let mockTrustEvaluator: jest.Mocked<TrustEvaluator>;
  let mockTrustGate: jest.Mocked<TrustGate>;
  let mockServiceRegistry: jest.Mocked<ServiceRegistry>;

  beforeEach(() => {
    mockDSNNode = {
      getConfig: jest.fn(),
    } as any;
    mockAIManager = {
      processRequest: jest.fn(),
    } as any;
    mockEnvelopeService = {
      verify: jest.fn(),
    } as any;
    mockTrustEvaluator = {
      evaluate: jest.fn(),
    } as any;
    mockTrustGate = {
      checkAll: jest.fn(),
    } as any;
    mockServiceRegistry = {
      registerToolHandler: jest.fn(),
      register: jest.fn(),
      invokeTool: jest.fn(),
    } as any;

    pluginManager = new PluginManager(
      mockDSNNode,
      mockAIManager,
      mockEnvelopeService,
      mockTrustEvaluator,
      mockTrustGate,
      mockServiceRegistry
    );

    // Mock bundled plugins dir to avoid real FS access
    (pluginManager as any).bundledPluginsDir = '/mock/bundled';
    (pluginManager as any).pluginsDir = '/mock/plugins';
  });

  it('should load a plugin with valid signature and trust', async () => {
    const pluginPath = '/mock/plugins/test-plugin';
    const manifest = {
      id: 'test-plugin',
      version: '1.0.0',
      name: 'Test Plugin',
      description: 'Test',
      permissions: [],
      // main: 'index.js' // Comment out main to avoid require failure
    };
    const envelope = {
      contentHash: 'hash',
      payload: manifest,
      signature: 'sig',
    } as any;

    (fs.readdir as jest.Mock).mockResolvedValue([{ 
        name: 'test-plugin', 
        isDirectory: () => true 
    }]);
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('manifest.json')) return Promise.resolve(JSON.stringify(manifest));
      if (filePath.endsWith('signed-envelope.json')) return Promise.resolve(JSON.stringify(envelope));
      return Promise.reject('File not found');
    });

    mockEnvelopeService.verify.mockResolvedValue({ valid: true, ed25519Valid: true, seaValid: true, resonanceValid: true });
    mockTrustEvaluator.evaluate.mockResolvedValue({ level: 'VOUCHED' } as any);
    mockTrustGate.checkAll.mockReturnValue(new Map());

    await pluginManager.initialize();

    const plugins = pluginManager.getPlugins();
    expect(plugins.length).toBe(1);
    expect(plugins[0].manifest.id).toBe('test-plugin');
    expect(plugins[0].status).toBe('active');
    expect(plugins[0].trust?.level).toBe('VOUCHED');
  });

  it('should block a plugin with invalid signature', async () => {
    const pluginPath = '/mock/plugins/bad-plugin';
    const manifest = { id: 'bad-plugin', version: '1.0.0', name: 'Bad Plugin', description: '', permissions: [] };
    const envelope = { contentHash: 'hash', payload: manifest } as any;

    (fs.readdir as jest.Mock).mockResolvedValue([{ name: 'bad-plugin', isDirectory: () => true }]);
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('manifest.json')) return Promise.resolve(JSON.stringify(manifest));
      if (filePath.endsWith('signed-envelope.json')) return Promise.resolve(JSON.stringify(envelope));
      return Promise.reject('File not found');
    });

    mockEnvelopeService.verify.mockResolvedValue({ valid: false, error: 'Bad sig', ed25519Valid: false, seaValid: true, resonanceValid: true });

    await pluginManager.initialize();

    const plugins = pluginManager.getPlugins();
    expect(plugins.length).toBe(0); // Should be blocked and not added to map? Or added with blocked status?
    // Implementation says: if status === 'blocked', return; so not added.
  });

  it('should mark plugin as pending-confirmation if capabilities require it', async () => {
    const manifest = { id: 'confirm-plugin', version: '1.0.0', name: 'Confirm Plugin', description: '', permissions: [] };
    const envelope = { contentHash: 'hash', payload: manifest, requestedCapabilities: ['fs:write'] } as any;

    (fs.readdir as jest.Mock).mockResolvedValue([{ name: 'confirm-plugin', isDirectory: () => true }]);
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('manifest.json')) return Promise.resolve(JSON.stringify(manifest));
      if (filePath.endsWith('signed-envelope.json')) return Promise.resolve(JSON.stringify(envelope));
      return Promise.reject('File not found');
    });

    mockEnvelopeService.verify.mockResolvedValue({ valid: true, ed25519Valid: true, seaValid: true, resonanceValid: true });
    mockTrustEvaluator.evaluate.mockResolvedValue({ level: 'UNKNOWN' } as any);
    
    const decisions = new Map<any, any>();
    decisions.set('fs:write', { decision: 'CONFIRM' });
    mockTrustGate.checkAll.mockReturnValue(decisions);

    await pluginManager.initialize();

    const plugins = pluginManager.getPlugins();
    expect(plugins.length).toBe(1);
    expect(plugins[0].status).toBe('pending-confirmation');
    expect(plugins[0].instance).toBeUndefined(); // Should not activate
  });
});
