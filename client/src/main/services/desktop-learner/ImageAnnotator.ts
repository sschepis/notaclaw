/**
 * Image Annotator
 * Uses a hidden Electron window to draw debug overlays (targets, dots) on screenshots
 * for the AI verification loop.
 */

import { BrowserWindow } from 'electron';
import { DesktopTarget } from './types';

export class ImageAnnotator {
  private window: BrowserWindow | null = null;

  constructor() {
    // Lazy initialization to avoid "Cannot create BrowserWindow before app is ready"
  }

  private initialize() {
    this.window = new BrowserWindow({
      show: false,
      width: 1920,
      height: 1080,
      webPreferences: {
        offscreen: true,
        nodeIntegration: false,
        contextIsolation: true
      }
    });
  }

  /**
   * Draw targets on the screenshot.
   * @param screenshotBase64 Original screenshot
   * @param targets List of targets to visualize
   * @returns Base64 string of the annotated image
   */
  async annotate(screenshotBase64: string, targets: DesktopTarget[]): Promise<string> {
    if (!this.window) this.initialize();
    
    // HTML template to render image + canvas overlay
    const html = `
      <html>
        <body style="margin:0; overflow:hidden;">
          <canvas id="canvas"></canvas>
          <script>
            const img = new Image();
            img.onload = () => {
              const canvas = document.getElementById('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              
              // Draw background image
              ctx.drawImage(img, 0, 0);
              
              // Draw targets
              const targets = ${JSON.stringify(targets)};
              
              targets.forEach((t, i) => {
                const x = t.clickPoint.x;
                const y = t.clickPoint.y;
                
                // Draw red dot
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw ID label
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = 'red';
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.strokeText((i + 1).toString(), x + 8, y - 5);
                ctx.fillText((i + 1).toString(), x + 8, y - 5);
              });
              
              // Signal completion (in a real app we'd use IPC, here we just wait a bit)
            };
            img.src = "${screenshotBase64}";
          </script>
        </body>
      </html>
    `;

    // Load content
    await this.window!.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    // Wait for render (simple delay is usually enough for local data URI)
    await new Promise(r => setTimeout(r, 200));
    
    // Capture
    const image = await this.window!.webContents.capturePage();
    return image.toDataURL();
  }

  destroy() {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}
