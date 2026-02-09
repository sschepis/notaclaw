import { LogManager, LogEntry } from '../../../src/main/services/LogManager';

describe('LogManager', () => {
  let logManager: LogManager;

  beforeEach(() => {
    logManager = new LogManager();
  });

  describe('log', () => {
    it('should add a log entry with correct properties', () => {
      logManager.log('info', 'Test', 'Test Title', 'Test message');

      const logs = logManager.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'info',
        category: 'Test',
        title: 'Test Title',
        message: 'Test message',
      });
      expect(logs[0].id).toBeDefined();
      expect(logs[0].timestamp).toBeDefined();
    });

    it('should include optional data', () => {
      const data = { key: 'value' };
      logManager.log('info', 'Test', 'Title', 'Message', data);

      const logs = logManager.getLogs();
      expect(logs[0].data).toEqual(data);
    });

    it('should emit log event', () => {
      const listener = jest.fn();
      logManager.on('log', listener);

      logManager.log('info', 'Test', 'Title', 'Message');

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        level: 'info',
        category: 'Test',
      }));
    });

    it('should add new logs at the beginning', () => {
      logManager.log('info', 'Test', 'First', 'First message');
      logManager.log('info', 'Test', 'Second', 'Second message');

      const logs = logManager.getLogs();
      expect(logs[0].title).toBe('Second');
      expect(logs[1].title).toBe('First');
    });
  });

  describe('convenience methods', () => {
    it('should log info level', () => {
      logManager.info('Category', 'Title', 'Message');
      expect(logManager.getLogs()[0].level).toBe('info');
    });

    it('should log warn level', () => {
      logManager.warn('Category', 'Title', 'Message');
      expect(logManager.getLogs()[0].level).toBe('warn');
    });

    it('should log error level', () => {
      logManager.error('Category', 'Title', 'Message');
      expect(logManager.getLogs()[0].level).toBe('error');
    });

    it('should log debug level', () => {
      logManager.debug('Category', 'Title', 'Message');
      expect(logManager.getLogs()[0].level).toBe('debug');
    });
  });

  describe('getLogs', () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        logManager.log('info', 'Test', `Log ${i}`, `Message ${i}`);
      }
    });

    it('should return all logs by default (up to limit)', () => {
      const logs = logManager.getLogs();
      expect(logs).toHaveLength(10);
    });

    it('should respect limit parameter', () => {
      const logs = logManager.getLogs(5);
      expect(logs).toHaveLength(5);
    });
  });

  describe('getLogsByCategory', () => {
    beforeEach(() => {
      logManager.log('info', 'System', 'System log 1', 'Message');
      logManager.log('info', 'Network', 'Network log 1', 'Message');
      logManager.log('info', 'System', 'System log 2', 'Message');
      logManager.log('info', 'AI', 'AI log 1', 'Message');
    });

    it('should filter logs by category', () => {
      const logs = logManager.getLogsByCategory('System');
      expect(logs).toHaveLength(2);
      expect(logs.every(l => l.category === 'System')).toBe(true);
    });

    it('should respect limit parameter', () => {
      const logs = logManager.getLogsByCategory('System', 1);
      expect(logs).toHaveLength(1);
    });

    it('should return empty array for non-existent category', () => {
      const logs = logManager.getLogsByCategory('NonExistent');
      expect(logs).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all logs', () => {
      logManager.log('info', 'Test', 'Title', 'Message');
      logManager.log('info', 'Test', 'Title 2', 'Message 2');
      
      logManager.clear();
      
      expect(logManager.getLogs()).toHaveLength(0);
    });

    it('should emit logs-cleared event', () => {
      const listener = jest.fn();
      logManager.on('logs-cleared', listener);
      
      logManager.clear();
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('max logs limit', () => {
    it('should trim old logs when exceeding max limit', () => {
      // LogManager has maxLogs = 1000 by default
      // We'll add 1005 logs and verify oldest are trimmed
      for (let i = 0; i < 1005; i++) {
        logManager.log('info', 'Test', `Log ${i}`, `Message ${i}`);
      }
      
      const logs = logManager.getLogs(2000);
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });
});
