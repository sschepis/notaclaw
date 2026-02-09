import { DeviceManager } from './DeviceManager.js';

export function activate(context) {
  console.log('[IoT Resonance Bridge] Activating...');

  const deviceManager = new DeviceManager(context);
  
  // Setup listener for real-time updates
  deviceManager.onDeviceUpdate = (devices) => {
      context.ipc.send('devices', devices);
  };

  context.dsn.registerTool({
    name: 'controlDevice',
    description: 'Sends a command to a connected IoT device',
    parameters: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        action: { type: 'string', enum: ['turn_on', 'turn_off', 'set_level', 'lock', 'unlock', 'set_temperature'] },
        value: { type: 'number' }
      },
      required: ['deviceId', 'action']
    }
  }, async (args) => {
    console.log(`[IoT Resonance Bridge] Device ${args.deviceId} -> ${args.action}`);
    
    await deviceManager.controlDevice(args.deviceId, args.action, args.value);
    
    return { status: 'success', newState: 'pending_update' };
  });

  context.dsn.registerTool({
      name: 'listDevices',
      description: 'Lists all connected IoT devices and their states',
      parameters: { type: 'object', properties: {} }
  }, async () => {
      return { devices: deviceManager.getAllDevices() };
  });

  // IPC Handlers
  context.ipc.on('getDevices', () => {
      context.ipc.send('devices', deviceManager.getAllDevices());
  });

  context.ipc.on('controlDevice', async (args) => {
      await deviceManager.controlDevice(args.deviceId, args.action, args.value);
      context.ipc.send('devices', deviceManager.getAllDevices());
  });

  context.ipc.on('reload-iot-config', () => {
      deviceManager.loadConfig();
  });

  console.log('[IoT Resonance Bridge] Activated.');
}
