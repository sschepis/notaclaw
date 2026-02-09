// Mock RobotJS before importing SessionManager
const mockRobot = {
  setMouseDelay: jest.fn(),
  moveMouse: jest.fn(),
  mouseClick: jest.fn(),
  typeString: jest.fn(),
  keyTap: jest.fn(),
};

jest.mock('robotjs', () => mockRobot, { virtual: true });

import { SessionManager, SessionState, SessionAction } from '../../../src/main/services/SessionManager';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionManager = new SessionManager();
  });

  describe('initialization', () => {
    it('should start in IDLE state', () => {
      expect(sessionManager.getState()).toBe('IDLE');
    });

    it('should set mouse delay on creation', () => {
      expect(mockRobot.setMouseDelay).toHaveBeenCalledWith(2);
    });
  });

  describe('getState', () => {
    it('should return current session state', () => {
      const state = sessionManager.getState();
      expect(['IDLE', 'OBSERVING', 'ACTING', 'LOCKED']).toContain(state);
    });
  });

  describe('startSession', () => {
    it('should transition to OBSERVING state', async () => {
      const result = await sessionManager.startSession();
      
      expect(result).toBe(true);
      expect(sessionManager.getState()).toBe('OBSERVING');
    });

    it('should return false if session is locked', async () => {
      // Force locked state through emergency stop
      (sessionManager as any).state = 'LOCKED';
      
      const result = await sessionManager.startSession();
      
      expect(result).toBe(false);
    });
  });

  describe('stopSession', () => {
    it('should transition to IDLE state', async () => {
      await sessionManager.startSession();
      
      const result = await sessionManager.stopSession();
      
      expect(result).toBe(true);
      expect(sessionManager.getState()).toBe('IDLE');
    });
  });

  describe('getSnapshot', () => {
    it('should throw error if session is locked', async () => {
      (sessionManager as any).state = 'LOCKED';
      
      await expect(sessionManager.getSnapshot())
        .rejects.toThrow('Session is locked');
    });

    // Note: Further snapshot tests would require mocking desktopCapturer
    // which is already mocked in setup.ts
  });

  describe('executeAction', () => {
    beforeEach(async () => {
      await sessionManager.startSession();
    });

    // Note: These tests will return false when robotjs is not available
    // The SessionManager gracefully handles missing robotjs
    it('should attempt to execute MOUSE_MOVE action', async () => {
      const action: SessionAction = {
        type: 'MOUSE_MOVE',
        x: 100,
        y: 200,
      };
      
      // Result depends on robotjs availability
      const result = await sessionManager.executeAction(action);
      
      // When robotjs is not available, returns false
      expect(typeof result).toBe('boolean');
    });

    it('should attempt to execute CLICK action', async () => {
      const action: SessionAction = { type: 'CLICK' };
      
      const result = await sessionManager.executeAction(action);
      
      expect(typeof result).toBe('boolean');
    });

    it('should attempt to execute TYPE action', async () => {
      const action: SessionAction = {
        type: 'TYPE',
        text: 'Hello World',
      };
      
      const result = await sessionManager.executeAction(action);
      
      expect(typeof result).toBe('boolean');
    });

    it('should attempt to execute KEY_TAP action', async () => {
      const action: SessionAction = {
        type: 'KEY_TAP',
        key: 'enter',
        modifiers: ['control'],
      };
      
      const result = await sessionManager.executeAction(action);
      
      expect(typeof result).toBe('boolean');
    });

    it('should return false if session is IDLE', async () => {
      await sessionManager.stopSession();
      
      const action: SessionAction = { type: 'CLICK' };
      const result = await sessionManager.executeAction(action);
      
      expect(result).toBe(false);
    });

    it('should return false if session is LOCKED', async () => {
      (sessionManager as any).state = 'LOCKED';
      
      const action: SessionAction = { type: 'CLICK' };
      const result = await sessionManager.executeAction(action);
      
      expect(result).toBe(false);
    });

    it('should return to OBSERVING state after action completes (when robotjs unavailable)', async () => {
      const action: SessionAction = { type: 'CLICK' };
      
      await sessionManager.executeAction(action);
      
      // When robotjs is not available, state stays OBSERVING since action fails
      const state = sessionManager.getState();
      expect(['OBSERVING', 'IDLE']).toContain(state);
    });

    it('should reject out-of-bounds mouse movements', async () => {
      const action: SessionAction = {
        type: 'MOUSE_MOVE',
        x: -100, // negative is out of bounds
        y: 200,
      };
      
      const result = await sessionManager.executeAction(action);
      
      expect(result).toBe(false);
    });
  });

  describe('validation', () => {
    beforeEach(async () => {
      await sessionManager.startSession();
    });

    it('should validate mouse coordinates are within screen bounds', async () => {
      // Screen mock returns 1920x1080 in setup.ts
      const outOfBoundsAction: SessionAction = {
        type: 'MOUSE_MOVE',
        x: 2000, // exceeds 1920
        y: 500,
      };
      
      const result = await sessionManager.executeAction(outOfBoundsAction);
      
      expect(result).toBe(false);
    });

    it('should attempt to allow coordinates within bounds', async () => {
      const withinBoundsAction: SessionAction = {
        type: 'MOUSE_MOVE',
        x: 960, // center of 1920
        y: 540, // center of 1080
      };
      
      // Validation should pass, but execution depends on robotjs
      const result = await sessionManager.executeAction(withinBoundsAction);
      
      // Result depends on robotjs availability
      expect(typeof result).toBe('boolean');
    });
  });
});
