import { jest } from '@jest/globals';
import { DeviceManager } from '../main/DeviceManager.js';

// Mock dependencies
jest.unstable_mockModule('home-assistant-js-websocket', () => ({
  createConnection: jest.fn(),
  createLongLivedTokenAuth: jest.fn(),
  subscribeEntities: jest.fn(),
  callService: jest.fn(),
}));

jest.unstable_mockModule('ws', () => ({
  default: class MockWebSocket {},
}));

describe('DeviceManager', () => {
  let deviceManager;
  let mockContext;

  beforeEach(async () => {
    mockContext = {
      storage: {
        get: jest.fn().mockResolvedValue({ url: 'ws://ha.local:8123', token: 'mock-token' }),
      },
      secrets: {
        get: jest.fn().mockResolvedValue('mock-token'),
      },
    };

    // Need to dynamically import to use the mocks
    const { DeviceManager } = await import('../main/DeviceManager.js');
    deviceManager = new DeviceManager(mockContext);
  });

  test('initializes with mock devices', () => {
    const devices = deviceManager.getAllDevices();
    expect(devices.length).toBeGreaterThan(0);
    expect(devices.some(d => d.id === 'light_living_room')).toBe(true);
  });

  test('controlDevice updates mock device state', async () => {
    // Initial state
    const device = deviceManager.getDevice('light_living_room');
    expect(device.state.on).toBe(true);

    // Turn off
    await deviceManager.controlDevice('light_living_room', 'turn_off', null);
    
    // Check updated state (mock behavior)
    const updatedDevice = deviceManager.getDevice('light_living_room');
    expect(updatedDevice.state.on).toBe(false);
  });
});
