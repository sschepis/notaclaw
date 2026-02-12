import screenshot from 'screenshot-desktop';
import notifier from 'node-notifier';
import * as path from 'path';
import * as os from 'os';

export class ClipboardService {
    
    public async readClipboard(): Promise<string> {
        const clipboardy = (await import('clipboardy')).default;
        return clipboardy.read();
    }

    public async writeClipboard(text: string): Promise<void> {
        const clipboardy = (await import('clipboardy')).default;
        return clipboardy.write(text);
    }

    public async captureScreenshot(outputPath?: string): Promise<string> {
        const absolutePath = outputPath ? path.resolve(outputPath) : path.resolve(os.tmpdir(), `screenshot-${Date.now()}.png`);
        await screenshot({ filename: absolutePath });
        return absolutePath;
    }

    public async sendNotification(title: string, message: string): Promise<void> {
        return new Promise((resolve, reject) => {
            notifier.notify({
                title,
                message,
                wait: false
            }, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}
