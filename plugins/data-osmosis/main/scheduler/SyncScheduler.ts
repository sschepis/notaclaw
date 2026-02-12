import { DataSourceConfig } from '../types';

export class SyncScheduler {
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private syncCallback: (sourceId: string) => Promise<void>;

    constructor(syncCallback: (sourceId: string) => Promise<void>) {
        this.syncCallback = syncCallback;
    }

    schedule(source: DataSourceConfig) {
        if (this.intervals.has(source.id)) {
            clearInterval(this.intervals.get(source.id)!);
            this.intervals.delete(source.id);
        }

        if (source.syncIntervalMinutes && source.syncIntervalMinutes > 0) {
            const intervalMs = source.syncIntervalMinutes * 60 * 1000;
            const interval = setInterval(() => {
                this.syncCallback(source.id).catch(console.error);
            }, intervalMs);
            this.intervals.set(source.id, interval);
        }
    }

    unschedule(sourceId: string) {
        if (this.intervals.has(sourceId)) {
            clearInterval(this.intervals.get(sourceId)!);
            this.intervals.delete(sourceId);
        }
    }

    stopAll() {
        for (const interval of this.intervals.values()) {
            clearInterval(interval);
        }
        this.intervals.clear();
    }
}
