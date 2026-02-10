// simpleLogger.ts
export interface Logger {
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

export const createLogger = (options?: any): Logger => {
    return {
        info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
        warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
        error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
        debug: (msg, meta) => console.debug(`[DEBUG] ${msg}`, meta || '')
    };
};
