import { SecureChannel } from './system';

export interface PluginContext {
  on(event: string, callback: () => void): void;
  ipc: {
    on(channel: string, callback: (data: any) => void): void;
    send(channel: string, data: any): void;
  };
  traits?: {
    register: (trait: any) => void;
  };
  [key: string]: any;
}

export const activate = (context: PluginContext) => {
  console.log('[Secure Comms] Main process activated');
  
  // Default channel
  let channel = new SecureChannel();

  context.on('ready', () => {
    console.log('[Secure Comms] Ready');
  });

  // Example IPC handler
  context.ipc.on('ping', (data: any) => {
    console.log('[Secure Comms] Received ping:', data);
    context.ipc.send('pong', { message: 'Hello from main process!' });
  });

  context.ipc.on('configure', (data: { p1: number, p2: number }) => {
      try {
          channel = new SecureChannel(data.p1, data.p2);
          console.log(`[Secure Comms] Reconfigured with primes ${data.p1}, ${data.p2}`);
          context.ipc.send('configured', { success: true });
      } catch (e) {
          console.error('[Secure Comms] Configuration error:', e);
          context.ipc.send('error', { error: (e as Error).message });
      }
  });

  context.ipc.on('secure-encode', (data: { message: number[], startTime: number }) => {
    try {
      const times: number[] = [];
      // Start slightly ahead to allow for processing/transmission latency
      let currentTime = data.startTime || 0;
      
      for (const byte of data.message) {
        // Find next occurrence
        const t = channel.encode(byte, currentTime);
        times.push(t);
        // Advance time to avoid reusing the same instant
        // We add a small buffer (e.g. 10 steps = 0.1s)
        currentTime = t + 0.1; 
      }
      
      context.ipc.send('secure-encoded', { times });
    } catch (e) {
      console.error('[Secure Comms] Encoding error:', e);
      context.ipc.send('secure-error', { error: (e as Error).message });
    }
  });

  context.ipc.on('secure-decode', (data: { times: number[] }) => {
    try {
      const message: number[] = [];
      for (const t of data.times) {
        const byte = channel.decode(t);
        message.push(byte);
      }
      context.ipc.send('secure-decoded', { message });
    } catch (e) {
      console.error('[Secure Comms] Decoding error:', e);
      context.ipc.send('secure-error', { error: (e as Error).message });
    }
  });

  if (context.traits) {
    context.traits.register({
      id: 'secure-communication',
      name: 'Secure Communication',
      description: 'Encode/decode secure messages using quaternion-based prime resonance.',
      instruction: 'You can use the secure communication channel to encode and decode sensitive messages using a specialized prime resonance algorithm.',
      activationMode: 'dynamic',
      triggerKeywords: ['secure', 'encode', 'decode', 'message', 'prime', 'resonance', 'channel', 'encrypt', 'decrypt']
    });
  }
};

export const deactivate = () => {
  console.log('[Secure Comms] Deactivated');
};

