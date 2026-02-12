import { AutoBackupConfig } from '../types';

const INTERVAL_MS: Record<string, number> = {
  'hourly': 3_600_000,
  'daily': 86_400_000,
  'weekly': 604_800_000
};

export class BackupScheduler {
  private timer: NodeJS.Timeout | null = null;
  private onBackupCallback: (() => Promise<void>) | null = null;
  private running = false;

  /**
   * Start the scheduler with the given configuration.
   * The callback is invoked when it's time to run a backup.
   */
  start(config: AutoBackupConfig, onBackup: () => Promise<void>): void {
    this.stop();
    this.onBackupCallback = onBackup;

    if (!config.enabled || config.interval === 'on-shutdown') {
      // 'on-shutdown' is handled externally via context.on('stop')
      return;
    }

    const intervalMs = INTERVAL_MS[config.interval];
    if (!intervalMs) return;

    // Calculate delay until next run
    let delay: number;
    if (config.lastRun) {
      const elapsed = Date.now() - config.lastRun;
      delay = Math.max(0, intervalMs - elapsed);
    } else {
      // First run: trigger after a short delay
      delay = 5_000;
    }

    this.timer = setTimeout(() => {
      this.tick(intervalMs);
    }, delay);
  }

  /**
   * Stop the scheduler.
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  /**
   * Handle shutdown-triggered backup (for 'on-shutdown' interval).
   */
  async onShutdown(): Promise<void> {
    if (this.onBackupCallback && !this.running) {
      this.running = true;
      try {
        await this.onBackupCallback();
      } catch (err) {
        console.error('[Secure Backup] Shutdown backup failed:', err);
      } finally {
        this.running = false;
      }
    }
  }

  /**
   * Returns whether the scheduler is currently active.
   */
  isActive(): boolean {
    return this.timer !== null;
  }

  private async tick(intervalMs: number): Promise<void> {
    if (this.running || !this.onBackupCallback) return;

    this.running = true;
    try {
      await this.onBackupCallback();
    } catch (err) {
      console.error('[Secure Backup] Scheduled backup failed:', err);
    } finally {
      this.running = false;
    }

    // Schedule next run
    this.timer = setTimeout(() => {
      this.tick(intervalMs);
    }, intervalMs);
  }
}
