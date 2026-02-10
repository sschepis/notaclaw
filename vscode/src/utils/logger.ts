/**
 * Logging utility for Agent Control extension
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private level: LogLevel = 'info';
  private logToFile: boolean = false;
  private logFilePath: string | null = null;
  private logFileStream: fs.WriteStream | null = null;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Agent Control');
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  configure(level: LogLevel, logToFile: boolean): void {
    this.level = level;
    this.logToFile = logToFile;

    if (this.logToFile) {
      this.initializeFileLogging();
    } else {
      this.closeFileLogging();
    }
  }

  private initializeFileLogging(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      this.warn('Cannot enable file logging: no workspace folder open');
      return;
    }

    const logDir = path.join(workspaceFolder.uri.fsPath, '.vscode', 'agent-control-logs');
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.logFilePath = path.join(logDir, `agent-control-${timestamp}.log`);
      this.logFileStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
      
      this.info(`File logging enabled: ${this.logFilePath}`);
    } catch (error) {
      this.warn(`Failed to initialize file logging: ${error}`);
    }
  }

  private closeFileLogging(): void {
    if (this.logFileStream) {
      this.logFileStream.end();
      this.logFileStream = null;
    }
    this.logFilePath = null;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    let formattedMessage = `[${timestamp}] [${levelStr}] ${message}`;
    
    if (args.length > 0) {
      const argsStr = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      formattedMessage += ` ${argsStr}`;
    }
    
    return formattedMessage;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, ...args);
    
    // Output to VS Code output channel
    this.outputChannel.appendLine(formattedMessage);
    
    // Output to file if enabled
    if (this.logFileStream) {
      this.logFileStream.write(formattedMessage + '\n');
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  /**
   * Log a request/response pair for debugging
   */
  logRequest(clientId: string, method: string, params?: unknown): void {
    this.debug(`[${clientId}] --> ${method}`, params);
  }

  logResponse(clientId: string, method: string, result?: unknown): void {
    this.debug(`[${clientId}] <-- ${method}`, result);
  }

  logError(clientId: string, method: string, error: unknown): void {
    this.error(`[${clientId}] <-- ${method} ERROR`, error);
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.closeFileLogging();
    this.outputChannel.dispose();
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
