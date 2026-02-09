import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { configManager } from './ConfigManager';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  category?: string;
  component?: string;
  nodeId?: string;
  requestId?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  action: string;
  details: string;
  context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

/**
 * Production-ready structured logger
 * - JSON output for production
 * - Pretty output for development
 * - File output support
 * - Configurable via ConfigManager
 */
class LoggerService {
  private inMemoryLogs: LogEntry[] = [];
  private maxInMemoryLogs = 1000;
  private initialized = false;
  private level: LogLevel = 'info';
  private format: 'json' | 'pretty' = 'pretty';
  private fileStream: fs.WriteStream | null = null;

  constructor() {
    // Default configuration before init
    this.level = 'info';
    this.format = 'pretty';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await configManager.initialize();
    const loggingConfig = configManager.getLoggingConfig();

    this.level = loggingConfig.level as LogLevel;
    this.format = loggingConfig.format as 'json' | 'pretty';

    if (loggingConfig.outputFile) {
      const logPath = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath, { recursive: true });
      }
      const logFile = path.join(logPath, loggingConfig.outputFile);
      this.fileStream = fs.createWriteStream(logFile, { flags: 'a' });
    }

    this.initialized = true;
    this.info('Logger', 'Initialized', `Logging at level: ${loggingConfig.level}`);
  }

  /**
   * Log a debug message
   */
  debug(category: string, action: string, details?: string, context?: LogContext): void {
    this.log('debug', category, action, details, context);
  }

  /**
   * Log an info message
   */
  info(category: string, action: string, details?: string, context?: LogContext): void {
    this.log('info', category, action, details, context);
  }

  /**
   * Log a warning message
   */
  warn(category: string, action: string, details?: string, context?: LogContext): void {
    this.log('warn', category, action, details, context);
  }

  /**
   * Log an error message
   */
  error(category: string, action: string, details?: string, context?: LogContext): void {
    this.log('error', category, action, details, context);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, category: string, action: string, details?: string, context?: LogContext): void {
    // Check if this log level should be output
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      action,
      details: details || '',
      context
    };

    // Store in memory for UI access
    this.inMemoryLogs.push(entry);
    if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
      this.inMemoryLogs.shift();
    }

    // Format and output the log
    const output = this.formatLog(entry);

    // Output to console
    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }

    // Write to file if configured
    if (this.fileStream) {
      const jsonLine = JSON.stringify({
        time: new Date(entry.timestamp).toISOString(),
        level,
        category,
        action,
        msg: details,
        ...context
      }) + '\n';
      this.fileStream.write(jsonLine);
    }
  }

  private formatLog(entry: LogEntry): string {
    if (this.format === 'json') {
      return JSON.stringify({
        time: new Date(entry.timestamp).toISOString(),
        level: entry.level,
        category: entry.category,
        action: entry.action,
        msg: entry.details,
        ...entry.context
      });
    }

    // Pretty format
    const time = new Date(entry.timestamp).toISOString();
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m'  // red
    };
    const reset = '\x1b[0m';
    const levelStr = `${levelColors[entry.level]}[${entry.level.toUpperCase()}]${reset}`;
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

    return `${time} ${levelStr} [${entry.category}] ${entry.action}${entry.details ? ': ' + entry.details : ''}${contextStr}`;
  }

  /**
   * Get recent logs for UI display
   */
  getLogs(limit?: number): LogEntry[] {
    const logs = [...this.inMemoryLogs].reverse();
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: string, limit?: number): LogEntry[] {
    const filtered = this.inMemoryLogs
      .filter(l => l.category === category)
      .reverse();
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * Clear in-memory logs
   */
  clear(): void {
    this.inMemoryLogs = [];
  }

  /**
   * Create a child logger with bound context
   */
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Close the file stream on shutdown
   */
  close(): void {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
  }
}

/**
 * Child logger with pre-bound context
 */
class ChildLogger {
  constructor(
    private parent: LoggerService,
    private context: LogContext
  ) {}

  debug(action: string, details?: string, extraContext?: LogContext): void {
    this.parent.debug(this.context.category || 'App', action, details, { ...this.context, ...extraContext });
  }

  info(action: string, details?: string, extraContext?: LogContext): void {
    this.parent.info(this.context.category || 'App', action, details, { ...this.context, ...extraContext });
  }

  warn(action: string, details?: string, extraContext?: LogContext): void {
    this.parent.warn(this.context.category || 'App', action, details, { ...this.context, ...extraContext });
  }

  error(action: string, details?: string, extraContext?: LogContext): void {
    this.parent.error(this.context.category || 'App', action, details, { ...this.context, ...extraContext });
  }
}

// Export singleton instance
export const logger = new LoggerService();

// Export for compatibility with existing LogManager usage
export { LoggerService };
