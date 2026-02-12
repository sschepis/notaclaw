import * as puppeteer from 'puppeteer-core';
import * as fs from 'fs';
import * as os from 'os';

export class BrowserService {
    private browser: puppeteer.Browser | null = null;

    private getExecutablePath(): string {
        const platform = os.platform();
        if (platform === 'darwin') {
            const paths = [
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
                '/Applications/Chromium.app/Contents/MacOS/Chromium',
                '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
            ];
            for (const p of paths) {
                if (fs.existsSync(p)) return p;
            }
        } else if (platform === 'win32') {
             const paths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
            ];
            for (const p of paths) {
                if (fs.existsSync(p)) return p;
            }
        } else if (platform === 'linux') {
            const paths = [
                '/usr/bin/google-chrome',
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium'
            ];
             for (const p of paths) {
                if (fs.existsSync(p)) return p;
            }
        }
        throw new Error('Browser executable not found. Please install Google Chrome, Chromium, or Microsoft Edge.');
    }

    private async getBrowser(): Promise<puppeteer.Browser> {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                executablePath: this.getExecutablePath(),
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this.browser;
    }

    public async browsePage(url: string): Promise<string> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            const content = await page.evaluate(() => document.body.innerText);
            return content;
        } finally {
            await page.close();
        }
    }

    public async screenshotPage(url: string): Promise<string> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(url, { waitUntil: 'networkidle2' });
            const buffer = await page.screenshot({ encoding: 'base64' });
            return buffer as string;
        } finally {
            await page.close();
        }
    }

    public async extractData(url: string, selector: string): Promise<string[]> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            const texts = await page.evaluate((sel) => {
                const elements = document.querySelectorAll(sel);
                return Array.from(elements).map(el => (el as HTMLElement).innerText);
            }, selector);
            return texts;
        } finally {
            await page.close();
        }
    }

    public async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
