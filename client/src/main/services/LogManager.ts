import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';

export interface LogEntry {
    id: string;
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'debug';
    category: string;
    title: string;
    message: string;
    data?: any;
}

export class LogManager extends EventEmitter {
    private logs: LogEntry[] = [];
    private maxLogs: number = 1000;

    constructor() {
        super();
    }

    log(level: LogEntry['level'], category: string, title: string, message: string, data?: any) {
        const entry: LogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            level,
            category,
            title,
            message,
            data
        };

        this.logs.unshift(entry);
        
        // Trim logs if exceeds max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Emit for internal listeners
        this.emit('log', entry);

        // Send to renderer
        this.broadcastToRenderers(entry);
    }

    info(category: string, title: string, message: string, data?: any) {
        this.log('info', category, title, message, data);
    }

    warn(category: string, title: string, message: string, data?: any) {
        this.log('warn', category, title, message, data);
    }

    error(category: string, title: string, message: string, data?: any) {
        this.log('error', category, title, message, data);
    }

    debug(category: string, title: string, message: string, data?: any) {
        this.log('debug', category, title, message, data);
    }

    getLogs(limit: number = 50): LogEntry[] {
        return this.logs.slice(0, limit);
    }

    getLogsByCategory(category: string, limit: number = 50): LogEntry[] {
        return this.logs.filter(l => l.category === category).slice(0, limit);
    }

    clear() {
        this.logs = [];
        this.emit('logs-cleared');
    }

    private broadcastToRenderers(entry: LogEntry) {
        const windows = BrowserWindow.getAllWindows();
        windows.forEach((win: BrowserWindow) => {
            win.webContents.send('log-entry', entry);
        });
    }
}

// Singleton instance
export const logManager = new LogManager();
