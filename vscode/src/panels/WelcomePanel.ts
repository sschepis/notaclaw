/**
 * Welcome Page Webview Panel for Aleph Agent Control
 *
 * Shows on first install or version upgrade, and can be opened
 * manually via the "Show Welcome Page" command.
 */

import * as vscode from 'vscode';

export class WelcomePanel {
  public static readonly viewType = 'agentControl.welcome';

  private static currentPanel: WelcomePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  /** Show the welcome panel (singleton). */
  public static show(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (WelcomePanel.currentPanel) {
      WelcomePanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      WelcomePanel.viewType,
      'Welcome — Aleph Agent Control',
      column,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'images')],
      },
    );

    WelcomePanel.currentPanel = new WelcomePanel(panel, extensionUri);
  }

  /** Optionally show the welcome page on first install / version upgrade. */
  public static showIfNew(context: vscode.ExtensionContext): void {
    const previousVersion = context.globalState.get<string>('agentControl.welcomeVersion');
    const currentVersion =
      (vscode.extensions.getExtension('notaclaw.aleph-agent-control')?.packageJSON as { version?: string })?.version ??
      '0.0.0';

    if (previousVersion !== currentVersion) {
      WelcomePanel.show(context.extensionUri);
      context.globalState.update('agentControl.welcomeVersion', currentVersion);
    }
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtml();
    this._panel.iconPath = vscode.Uri.joinPath(extensionUri, 'images', 'icon.png');

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (msg: { command: string }) => {
        switch (msg.command) {
          case 'openSettings':
            vscode.commands.executeCommand('workbench.action.openSettings', 'agentControl');
            return;
          case 'startServer':
            vscode.commands.executeCommand('agentControl.start');
            return;
          case 'generateToken':
            vscode.commands.executeCommand('agentControl.generateToken');
            return;
          case 'openDocs':
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/notaclaw/aleph-agent-control'));
            return;
          case 'pairDevice':
            vscode.commands.executeCommand('agentControl.pairDevice');
            return;
        }
      },
      null,
      this._disposables,
    );
  }

  public dispose(): void {
    WelcomePanel.currentPanel = undefined;
    this._panel.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];
  }

  /* ------------------------------------------------------------------ */
  /*  HTML Generation                                                    */
  /* ------------------------------------------------------------------ */

  private _getHtml(): string {
    const webview = this._panel.webview;
    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'images', 'icon.png'),
    );

    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src ${webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
  <title>Welcome — Aleph Agent Control</title>
  <style nonce="${nonce}">
    :root {
      --accent: #7c4dff;
      --accent-dim: #5c3dcc;
      --cyan: #00e5ff;
      --bg-card: rgba(255,255,255,0.04);
      --border: rgba(255,255,255,0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      color: var(--vscode-foreground, #cccccc);
      background: var(--vscode-editor-background, #1e1e2e);
      line-height: 1.6;
      padding: 0;
    }

    .container {
      max-width: 780px;
      margin: 0 auto;
      padding: 48px 32px 64px;
    }

    /* ---- Hero ---- */
    .hero {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 40px;
    }
    .hero img {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(124,77,255,0.25);
    }
    .hero h1 {
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.5px;
      color: var(--vscode-foreground, #e0e0e0);
    }
    .hero p {
      font-size: 14px;
      opacity: 0.7;
      margin-top: 2px;
    }

    /* ---- Section ---- */
    h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 36px 0 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h2 .icon { font-size: 20px; }

    p, li { font-size: 14px; }

    /* ---- Cards Grid ---- */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      border-color: var(--accent);
      box-shadow: 0 0 20px rgba(124,77,255,0.12);
    }
    .card h3 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .card p {
      font-size: 13px;
      opacity: 0.75;
      line-height: 1.5;
    }

    /* ---- Quick Start Steps ---- */
    .steps {
      counter-reset: step;
      list-style: none;
      padding: 0;
      margin-top: 12px;
    }
    .steps li {
      counter-increment: step;
      padding: 12px 0 12px 48px;
      position: relative;
      border-left: 2px solid var(--border);
      margin-left: 14px;
    }
    .steps li::before {
      content: counter(step);
      position: absolute;
      left: -15px;
      top: 10px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .steps li:last-child { border-left-color: transparent; }

    code {
      font-family: var(--vscode-editor-font-family, 'Fira Code', 'Cascadia Code', monospace);
      font-size: 12px;
      background: rgba(255,255,255,0.06);
      padding: 2px 6px;
      border-radius: 4px;
    }
    pre {
      background: rgba(0,0,0,0.25);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      margin: 12px 0;
      font-size: 12px;
      line-height: 1.6;
    }
    pre code {
      background: none;
      padding: 0;
    }

    /* ---- Buttons ---- */
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 20px;
    }
    button {
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 18px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    button:active { transform: scale(0.97); }

    .btn-primary {
      background: var(--accent);
      color: #fff;
    }
    .btn-primary:hover { background: var(--accent-dim); }

    .btn-secondary {
      background: rgba(255,255,255,0.08);
      color: var(--vscode-foreground, #ccc);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.12);
    }

    /* ---- Footer ---- */
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      opacity: 0.5;
      text-align: center;
    }

    /* ---- Connection Example ---- */
    .example-block {
      margin-top: 16px;
    }
    .tab-bar {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border);
    }
    .tab {
      padding: 6px 16px;
      font-size: 12px;
      opacity: 0.5;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      background: none;
      color: inherit;
      border-radius: 0;
    }
    .tab.active {
      opacity: 1;
      border-bottom-color: var(--accent);
    }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* ---- Pairing Section ---- */
    .pairing-section {
      margin-bottom: 40px;
    }
    .pairing-card {
      background: rgba(124, 77, 255, 0.05);
      border: 1px solid rgba(124, 77, 255, 0.2);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .pairing-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    .step {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .step-num {
      width: 24px;
      height: 24px;
      background: var(--accent);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }
    .step-content {
      font-size: 13px;
      opacity: 0.9;
    }
    .pairing-actions {
      display: flex;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Hero -->
    <div class="hero">
      <img src="${iconUri}" alt="Aleph Agent Control icon" />
      <div>
        <h1>Aleph Agent Control</h1>
        <p>WebSocket-based remote control for AI agents &amp; automation</p>
      </div>
    </div>

    <!-- Pairing Section -->
    <div class="pairing-section">
      <h2><span class="icon">🔗</span> Connect Your Aleph Agent</h2>
      <div class="card pairing-card">
        <div class="pairing-steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-content">Server is running on <code>:19876</code></div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-content">Click <strong>Pair a Device</strong> below</div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-content">Enter the 6-digit code in your Aleph app's <strong>VS Code Control</strong> panel</div>
          </div>
          <div class="step">
            <div class="step-num">4</div>
            <div class="step-content">Approve the connection</div>
          </div>
        </div>
        <div class="pairing-actions">
           <button class="btn-primary" id="btn-pair-hero">$(link) Pair a Device</button>
           <button class="btn-secondary" id="btn-settings-hero">$(gear) Settings</button>
        </div>
      </div>
    </div>

    <!-- Feature Cards -->
    <h2><span class="icon">✦</span> Key Features</h2>
    <div class="cards">
      <div class="card">
        <h3>🔌 WebSocket Server</h3>
        <p>JSON-RPC 2.0 server running inside VS Code, controllable from any WebSocket client.</p>
      </div>
      <div class="card">
        <h3>📝 Editor Control</h3>
        <p>Open, edit, and navigate files programmatically. Full text-editing and selection control.</p>
      </div>
      <div class="card">
        <h3>📂 File System</h3>
        <p>Read, write, delete, search, and watch files and directories in the workspace.</p>
      </div>
      <div class="card">
        <h3>💻 Terminal</h3>
        <p>Create terminals, run commands, and capture output — all remotely.</p>
      </div>
      <div class="card">
        <h3>🔍 Git Integration</h3>
        <p>Check status, view diffs, stage, commit, and manage branches from your agent.</p>
      </div>
      <div class="card">
        <h3>🔒 Security First</h3>
        <p>Token-based auth, TLS support, rate limiting, path restrictions, and command allow-lists.</p>
      </div>
    </div>

    <!-- Quick Start -->
    <h2><span class="icon">🚀</span> Quick Start</h2>
    <ol class="steps">
      <li><strong>Start the server</strong> — The server starts automatically, or use the command palette: <code>Aleph Agent Control: Start Agent Control Server</code></li>
      <li><strong>Get your auth token</strong> — Run <code>Aleph Agent Control: Generate New Authentication Token</code> to create and copy a token.</li>
      <li><strong>Connect a client</strong> — Open a WebSocket connection to <code>ws://127.0.0.1:19876</code> and authenticate with the token.</li>
      <li><strong>Send JSON-RPC calls</strong> — Call methods like <code>editor.openFile</code>, <code>fs.readFile</code>, or <code>terminal.execute</code>.</li>
    </ol>

    <!-- Connection Example -->
    <h2><span class="icon">⚡</span> Connection Example</h2>
    <div class="example-block">
      <div class="tab-bar">
        <button class="tab active" data-tab="node">Node.js</button>
        <button class="tab" data-tab="python">Python</button>
      </div>
      <div class="tab-content active" id="tab-node">
<pre><code>const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:19876');

ws.on('open', () => {
  // 1. Authenticate
  ws.send(JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'auth.authenticate',
    params: { token: 'YOUR_TOKEN' }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.id === 1 && msg.result?.authenticated) {
    // 2. Open a file
    ws.send(JSON.stringify({
      jsonrpc: '2.0', id: 2,
      method: 'editor.openFile',
      params: { path: './src/index.ts' }
    }));
  }
});</code></pre>
      </div>
      <div class="tab-content" id="tab-python">
<pre><code>import asyncio, websockets, json

async def main():
    async with websockets.connect('ws://127.0.0.1:19876') as ws:
        # 1. Authenticate
        await ws.send(json.dumps({
            'jsonrpc': '2.0', 'id': 1,
            'method': 'auth.authenticate',
            'params': {'token': 'YOUR_TOKEN'}
        }))
        resp = json.loads(await ws.recv())

        if resp.get('result', {}).get('authenticated'):
            # 2. Open a file
            await ws.send(json.dumps({
                'jsonrpc': '2.0', 'id': 2,
                'method': 'editor.openFile',
                'params': {'path': './src/index.ts'}
            }))
            print(json.loads(await ws.recv()))

asyncio.run(main())</code></pre>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="btn-primary" id="btn-start">$(play) Start Server</button>
      <button class="btn-secondary" id="btn-token">$(key) Generate Token</button>
      <button class="btn-secondary" id="btn-settings">$(gear) Open Settings</button>
      <button class="btn-secondary" id="btn-docs">$(book) Documentation</button>
    </div>

    <!-- Footer -->
    <div class="footer">
      Aleph Agent Control &bull; MIT License &bull; notaclaw
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.getElementById('btn-start').addEventListener('click', () => {
      vscode.postMessage({ command: 'startServer' });
    });
    document.getElementById('btn-pair-hero').addEventListener('click', () => {
      vscode.postMessage({ command: 'pairDevice' });
    });
    document.getElementById('btn-settings-hero').addEventListener('click', () => {
      vscode.postMessage({ command: 'openSettings' });
    });
    document.getElementById('btn-token').addEventListener('click', () => {
      vscode.postMessage({ command: 'generateToken' });
    });
    document.getElementById('btn-settings').addEventListener('click', () => {
      vscode.postMessage({ command: 'openSettings' });
    });
    document.getElementById('btn-docs').addEventListener('click', () => {
      vscode.postMessage({ command: 'openDocs' });
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });
  </script>
</body>
</html>`;
  }
}

/** Generate a random nonce for CSP. */
function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
