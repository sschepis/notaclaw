import { desktopCapturer, globalShortcut, BrowserWindow, screen } from 'electron';

// RobotJS wrapper to handle missing types and potential load issues
let robot: any;
try {
    robot = require('robotjs');
} catch (e) {
    console.warn('RobotJS not found. Session automation will be disabled.', e);
}

export type SessionState = 'IDLE' | 'OBSERVING' | 'ACTING' | 'LOCKED';

export interface SessionAction {
    type: 'MOUSE_MOVE' | 'CLICK' | 'TYPE' | 'KEY_TAP';
    x?: number;
    y?: number;
    text?: string;
    key?: string;
    modifiers?: string[];
}

export class SessionManager {
    private state: SessionState = 'IDLE';
    private lastSnapshot: string | null = null;
    private overlayWindow: BrowserWindow | null = null;

    constructor() {
        if (robot) {
            robot.setMouseDelay(2);
        }
    }

    public initialize() {
        this.registerGlobalShortcuts();
    }

    private registerGlobalShortcuts() {
        // Dead Man's Switch: Command+Escape (Mac) or Control+Escape (Win/Linux)
        const ret = globalShortcut.register('CommandOrControl+Escape', () => {
            console.log('Dead Man\'s Switch Activated!');
            this.emergencyStop();
        });

        if (!ret) {
            console.warn('Registration of Dead Man\'s Switch failed.');
        }
    }

    private async emergencyStop() {
        this.state = 'LOCKED';
        this.toggleOverlay(false);
        // TODO: Notify Renderer
        console.log('Session LOCKED via Emergency Stop');
    }

    private setupOverlay() {
        if (this.overlayWindow) return;

        const { width, height } = screen.getPrimaryDisplay().workAreaSize;

        this.overlayWindow = new BrowserWindow({
            width,
            height,
            x: 0,
            y: 0,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            focusable: false,
            hasShadow: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        this.overlayWindow.setIgnoreMouseEvents(true);
        
        // Load a simple HTML page with a border
        const html = `
            <html>
                <body style="margin: 0; padding: 0; border: 5px solid #ff00ff; box-sizing: border-box; height: 100vh; overflow: hidden; pointer-events: none;">
                </body>
            </html>
        `;
        this.overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    }

    private toggleOverlay(visible: boolean) {
        if (visible) {
            if (!this.overlayWindow) this.setupOverlay();
            this.overlayWindow?.show();
        } else {
            this.overlayWindow?.hide();
        }
    }

    public getState(): SessionState {
        return this.state;
    }

    public async startSession(): Promise<boolean> {
        if (this.state === 'LOCKED') return false;
        
        this.state = 'OBSERVING';
        this.toggleOverlay(true);
        return true;
    }

    public async stopSession(): Promise<boolean> {
        this.state = 'IDLE';
        this.toggleOverlay(false);
        return true;
    }

    public async getSnapshot(): Promise<string> {
        if (this.state === 'LOCKED') throw new Error('Session is locked');
        
        const sources = await desktopCapturer.getSources({ 
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 } 
        });
        
        // Assume primary display for now
        if (sources.length > 0) {
            this.lastSnapshot = sources[0].thumbnail.toDataURL();
            return this.lastSnapshot;
        }
        return '';
    }

    public async executeAction(action: SessionAction): Promise<boolean> {
        if (!robot) {
            console.error('RobotJS not available');
            return false;
        }

        if (this.state === 'LOCKED' || this.state === 'IDLE') {
            console.warn('Attempted action in invalid state:', this.state);
            return false;
        }

        if (!this.validateRequest(action)) {
            console.warn('Action validation failed');
            return false;
        }

        this.state = 'ACTING';
        // Overlay stays visible during action
        
        try {
            switch (action.type) {
                case 'MOUSE_MOVE':
                    if (action.x !== undefined && action.y !== undefined) {
                        robot.moveMouse(action.x, action.y);
                    }
                    break;
                case 'CLICK':
                    robot.mouseClick();
                    break;
                case 'TYPE':
                    if (action.text) {
                        robot.typeString(action.text);
                    }
                    break;
                case 'KEY_TAP':
                    if (action.key) {
                        // RobotJS expects modifiers as an array of strings
                        robot.keyTap(action.key, action.modifiers || []);
                    }
                    break;
            }
        } catch (error) {
            console.error('Action execution failed:', error);
            return false;
        } finally {
            if ((this.state as SessionState) !== 'LOCKED') {
                this.state = 'OBSERVING';
            }
        }

        return true;
    }

    private validateRequest(action: SessionAction): boolean {
        // 1. Basic Bounds Check
        if (action.type === 'MOUSE_MOVE' && (action.x !== undefined && action.y !== undefined)) {
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;
            if (action.x < 0 || action.x > width || action.y < 0 || action.y > height) {
                return false;
            }
        }

        // 2. Rate Limiting (Simple implementation)
        // TODO: Implement token bucket or sliding window

        return true;
    }
}
