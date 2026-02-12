import { activate, deactivate, PluginContext } from '../main/index';
import { SecureChannel } from '../main/system';
import { createPrimeQuaternion, findGaussianFactors, findEisensteinFactors } from '../main/math';

describe('Secure Comms Math', () => {
    test('should find Gaussian factors', () => {
        // 13 = 2^2 + 3^2
        const factors = findGaussianFactors(13);
        expect(factors).toEqual([2, 3]);
    });

    test('should find Eisenstein factors', () => {
        // 13 = 1^2 - 1*4 + 4^2 = 1 - 4 + 16 = 13
        const factors = findEisensteinFactors(13);
        expect(factors).not.toBeNull();
        if (factors) {
            const [c, d] = factors;
            expect(c*c - c*d + d*d).toBe(13);
        }
    });

    test('should create prime quaternion', () => {
        const q = createPrimeQuaternion(13);
        expect(q).not.toBeNull();
    });
});

describe('Secure Comms System', () => {
    test('should encode and decode a byte', () => {
        const channel = new SecureChannel();
        const byte = 42;
        const t = channel.encode(byte, 0);
        const decoded = channel.decode(t);
        expect(decoded).toBe(byte);
    });

    test('should encode and decode a sequence', () => {
        const channel = new SecureChannel();
        const message = [10, 20, 30];
        const times: number[] = [];
        let t = 0;
        for (const byte of message) {
            t = channel.encode(byte, t + 0.1);
            times.push(t);
        }
        
        const decodedMessage = times.map(time => channel.decode(time));
        expect(decodedMessage).toEqual(message);
    });
});

describe('Secure Comms Main Process', () => {
  let mockContext: PluginContext;
  let onMock: jest.Mock;
  let ipcOnMock: jest.Mock;
  let ipcSendMock: jest.Mock;

  beforeEach(() => {
    onMock = jest.fn();
    ipcOnMock = jest.fn();
    ipcSendMock = jest.fn();
    
    mockContext = {
      on: onMock,
      ipc: {
        on: ipcOnMock,
        send: ipcSendMock
      }
    };
  });

  test('should activate and register ready handler', () => {
    activate(mockContext);
    expect(onMock).toHaveBeenCalledWith('ready', expect.any(Function));
  });

  test('should handle secure-encode', () => {
    activate(mockContext);
    const handler = ipcOnMock.mock.calls.find(call => call[0] === 'secure-encode')[1];
    handler({ message: [1, 2, 3], startTime: 0 });
    expect(ipcSendMock).toHaveBeenCalledWith('secure-encoded', expect.objectContaining({
        times: expect.any(Array)
    }));
  });

  test('should handle configuration', () => {
    activate(mockContext);
    const handler = ipcOnMock.mock.calls.find(call => call[0] === 'configure')[1];
    handler({ p1: 61, p2: 73 });
    expect(ipcSendMock).toHaveBeenCalledWith('configured', { success: true });
  });
});

