import * as vscode from 'vscode';
import { AgentControlServer } from '../server/WebSocketServer';
import { PairingService } from '../services/PairingService';

export class ConnectionSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'agentControl.sidebarView';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _serverProvider: () => AgentControlServer | null,
        private readonly _pairingServiceProvider: () => PairingService | null
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'pair':
                    vscode.commands.executeCommand('agentControl.pairDevice');
                    break;
                case 'refresh':
                    this.update();
                    break;
            }
        });

        // Initial update
        this.update();
        
        // Periodic update
        const interval = setInterval(() => this.update(), 5000);
        webviewView.onDidDispose(() => clearInterval(interval));
    }

    public update() {
        if (this._view) {
            const server = this._serverProvider();
            const pairingService = this._pairingServiceProvider();
            
            const status = server ? server.getStatus() : { running: false, port: 0, clients: 0 };
            const devices = pairingService ? pairingService.getPairedDevices() : [];

            this._view.webview.postMessage({
                type: 'update',
                status,
                devices
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Agent Control</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 10px; }
                    .status-card {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        padding: 10px;
                        border-radius: 4px;
                        margin-bottom: 15px;
                    }
                    .status-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .label { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
                    .value { font-weight: 600; }
                    .running { color: var(--vscode-testing-iconPassed); }
                    .stopped { color: var(--vscode-testing-iconFailed); }
                    
                    .device-list { list-style: none; padding: 0; margin: 0; }
                    .device-item { 
                        padding: 8px; 
                        border-bottom: 1px solid var(--vscode-widget-border);
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .device-name { font-weight: 600; }
                    .device-meta { font-size: 0.8em; color: var(--vscode-descriptionForeground); }
                    
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 6px 12px;
                        width: 100%;
                        cursor: pointer;
                        border-radius: 2px;
                    }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                </style>
            </head>
            <body>
                <div class="status-card">
                    <div class="status-row">
                        <span class="label">Status</span>
                        <span class="value" id="server-status">Checking...</span>
                    </div>
                    <div class="status-row">
                        <span class="label">Port</span>
                        <span class="value" id="server-port">-</span>
                    </div>
                    <div class="status-row">
                        <span class="label">Clients</span>
                        <span class="value" id="client-count">-</span>
                    </div>
                </div>

                <h3>Paired Devices</h3>
                <ul class="device-list" id="device-list">
                    <li style="padding: 10px; color: var(--vscode-descriptionForeground); text-align: center;">No devices paired</li>
                </ul>

                <div style="margin-top: 20px;">
                    <button id="pair-btn">Pair New Device</button>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('pair-btn').addEventListener('click', () => {
                        vscode.postMessage({ type: 'pair' });
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'update':
                                updateUI(message.status, message.devices);
                                break;
                        }
                    });

                    function updateUI(status, devices) {
                        const statusEl = document.getElementById('server-status');
                        statusEl.textContent = status.running ? 'Running' : 'Stopped';
                        statusEl.className = 'value ' + (status.running ? 'running' : 'stopped');
                        
                        document.getElementById('server-port').textContent = status.port || '-';
                        document.getElementById('client-count').textContent = status.clients || 0;

                        const list = document.getElementById('device-list');
                        list.innerHTML = '';
                        
                        if (devices.length === 0) {
                            list.innerHTML = '<li style="padding: 10px; color: var(--vscode-descriptionForeground); text-align: center;">No devices paired</li>';
                        } else {
                            devices.forEach(d => {
                                const li = document.createElement('li');
                                li.className = 'device-item';
                                const lastSeen = new Date(d.lastSeen).toLocaleString();
                                li.innerHTML = \`
                                    <div class="device-name">\${d.name}</div>
                                    <div class="device-meta">Last seen: \${lastSeen}</div>
                                \`;
                                list.appendChild(li);
                            });
                        }
                    }
                    
                    // Request initial state
                    vscode.postMessage({ type: 'refresh' });
                </script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
