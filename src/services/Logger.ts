import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Structured Logger (2.1.4)
// Replaces raw console.log with level-aware, structured JSON logging.
// ---------------------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    component: string;
    message: string;
    data?: Record<string, unknown>;
    error?: { name: string; message: string; stack?: string };
}

export interface LoggerConfig {
    level: LogLevel;
    format: 'json' | 'pretty';
    outputFile?: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
    level: 'info',
    format: 'pretty',
};

class LoggerInstance {
    private config: LoggerConfig = DEFAULT_CONFIG;
    private component: string;
    private fileStream: fs.WriteStream | null = null;

    constructor(component: string, config?: Partial<LoggerConfig>) {
        this.component = component;
        if (config) this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /** Update the logger config (typically called after ConfigManager loads). */
    configure(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };

        // Open file stream if outputFile is specified
        if (this.config.outputFile && !this.fileStream) {
            const dir = path.dirname(this.config.outputFile);
            fs.mkdirSync(dir, { recursive: true });
            this.fileStream = fs.createWriteStream(this.config.outputFile, { flags: 'a' });
        }
    }

    /** Create a child logger with a sub-component name. */
    child(subComponent: string): LoggerInstance {
        const child = new LoggerInstance(`${this.component}:${subComponent}`, this.config);
        child.fileStream = this.fileStream; // Share file stream
        return child;
    }

    debug(message: string, data?: Record<string, unknown>): void {
        this.log('debug', message, data);
    }

    info(message: string, data?: Record<string, unknown>): void {
        this.log('info', message, data);
    }

    warn(message: string, data?: Record<string, unknown>): void {
        this.log('warn', message, data);
    }

    error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: 'error',
            component: this.component,
            message,
            data,
        };

        if (error instanceof Error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        } else if (error !== undefined) {
            entry.error = {
                name: 'UnknownError',
                message: String(error),
            };
        }

        if (LOG_LEVELS['error'] >= LOG_LEVELS[this.config.level]) {
            this.emit(entry);
        }
    }

    private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
        if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            component: this.component,
            message,
            data,
        };

        this.emit(entry);
    }

    private emit(entry: LogEntry): void {
        const formatted = this.config.format === 'json'
            ? JSON.stringify(entry)
            : this.formatPretty(entry);

        // Console output
        switch (entry.level) {
            case 'debug': console.debug(formatted); break;
            case 'info':  console.info(formatted);  break;
            case 'warn':  console.warn(formatted);  break;
            case 'error': console.error(formatted); break;
        }

        // File output
        if (this.fileStream) {
            this.fileStream.write(
                (this.config.format === 'pretty' ? JSON.stringify(entry) : formatted) + '\n'
            );
        }
    }

    private formatPretty(entry: LogEntry): string {
        const ts = entry.timestamp.substring(11, 23); // HH:MM:SS.mmm
        const lvl = entry.level.toUpperCase().padEnd(5);
        const comp = entry.component;
        let line = `${ts} ${lvl} [${comp}] ${entry.message}`;

        if (entry.data && Object.keys(entry.data).length > 0) {
            line += ' ' + JSON.stringify(entry.data);
        }
        if (entry.error) {
            line += ` ERROR: ${entry.error.name}: ${entry.error.message}`;
            if (entry.error.stack) {
                line += '\n' + entry.error.stack;
            }
        }

        return line;
    }

    /** Flush and close the file stream. */
    close(): void {
        if (this.fileStream) {
            this.fileStream.end();
            this.fileStream = null;
        }
    }
}

// ---------------------------------------------------------------------------
// Factory — create loggers with a shared root config
// ---------------------------------------------------------------------------

let rootConfig: LoggerConfig = DEFAULT_CONFIG;

export function configureRootLogger(config: Partial<LoggerConfig>): void {
    rootConfig = { ...rootConfig, ...config };
}

export function createLogger(component: string): LoggerInstance {
    return new LoggerInstance(component, rootConfig);
}

// Convenience: default logger
export const logger = createLogger('app');

export { LoggerInstance };
