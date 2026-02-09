import { PluginContextMock } from '../mocks/PluginContextMock';
import http from 'http';

const gatewayPlugin = require('../../plugins/api-gateway/main/index');

describe('API Gateway Plugin', () => {
  let context: PluginContextMock;

  beforeEach(() => {
    context = new PluginContextMock('api-gateway');
  });

  afterEach(async () => {
    // Trigger stop event to close server
    context.emit('stop');
    // Wait a bit for close
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('should register a gateway', async () => {
    await gatewayPlugin.activate(context);
    expect(context.services.gateways.registered.length).toBe(1);
    expect(context.services.gateways.registered[0].sourceName).toBe('webhook');
  });

  it('should receive messages via webhook', async () => {
    await gatewayPlugin.activate(context);
    
    // Send HTTP POST
    const postData = JSON.stringify({
      content: 'test message',
      sender: 'tester',
      channel: 'test-chan'
    });

    await new Promise<void>((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      }, (res) => {
        expect(res.statusCode).toBe(200);
        resolve();
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    // Check if observation was published to DSN
    expect(context.dsn.observations.length).toBe(1);
    expect(context.dsn.observations[0].content).toContain('Message from tester');
    
    // Check IPC emission
    expect(context.ipc.sent.length).toBeGreaterThan(0);
    expect(context.ipc.sent[0].channel).toBe('gateway:message');
    expect(context.ipc.sent[0].data.content).toBe('test message');
  });
});
