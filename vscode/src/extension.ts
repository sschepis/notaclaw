/**
 * VS Code Agent Control Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import { AgentControlServer } from './server/WebSocketServer';
import { logger } from './utils/logger';
import { getConfig, onConfigChange, getOrGenerateToken, validateConfig } from './utils/config';

let server: AgentControlServer | null = null;

/**
 * Called when the extension is activated
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger.info('Agent Control extension activating...');

  // Initialize configuration
  const config = getConfig();
  logger.configure(config.logging.level, config.logging.logToFile);

  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    for (const error of validation.errors) {
      logger.warn(`Configuration: ${error}`);
    }
  }

  // Create server instance
  server = new AgentControlServer();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('agentControl.start', async () => {
      if (server) {
        try {
          await server.start();
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to start server: ${error}`);
        }
      }
    }),

    vscode.commands.registerCommand('agentControl.stop', async () => {
      if (server) {
        await server.stop();
        vscode.window.showInformationMessage('Agent Control server stopped');
      }
    }),

    vscode.commands.registerCommand('agentControl.status', () => {
      if (server) {
        const status = server.getStatus();
        if (status.running) {
          vscode.window.showInformationMessage(
            `Agent Control server running on port ${status.port} with ${status.clients} client(s)`
          );
        } else {
          vscode.window.showInformationMessage('Agent Control server is not running');
        }
      }
    }),

    vscode.commands.registerCommand('agentControl.generateToken', async () => {
      const config = vscode.workspace.getConfiguration('agentControl');
      const crypto = await import('crypto');
      const newToken = crypto.randomBytes(32).toString('hex');
      
      await config.update('token', newToken, vscode.ConfigurationTarget.Global);
      
      const action = await vscode.window.showInformationMessage(
        'New token generated! Copy to clipboard?',
        'Copy',
        'Show in Settings'
      );
      
      if (action === 'Copy') {
        await vscode.env.clipboard.writeText(newToken);
        vscode.window.showInformationMessage('Token copied to clipboard');
      } else if (action === 'Show in Settings') {
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'agentControl.token'
        );
      }
    }),

    vscode.commands.registerCommand('agentControl.showConnections', () => {
      if (server) {
        const clients = server.getConnectedClients();
        if (clients.length === 0) {
          vscode.window.showInformationMessage('No clients connected');
        } else {
          const items = clients.map(c => ({
            label: c.id,
            description: c.authenticated ? '✓ Authenticated' : '○ Pending',
          }));
          vscode.window.showQuickPick(items, {
            title: 'Connected Clients',
            placeHolder: 'Select a client to see details',
          });
        }
      }
    })
  );

  // Watch for configuration changes
  context.subscriptions.push(
    onConfigChange((newConfig) => {
      logger.configure(newConfig.logging.level, newConfig.logging.logToFile);
      logger.info('Configuration updated');
      
      // If server is running and port changed, restart
      if (server) {
        const status = server.getStatus();
        if (status.running && status.port !== newConfig.port) {
          vscode.window.showInformationMessage(
            'Port configuration changed. Restart the server to apply.',
            'Restart'
          ).then(action => {
            if (action === 'Restart') {
              server?.stop().then(() => server?.start());
            }
          });
        }
      }
    })
  );

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'agentControl.status';
  updateStatusBar(statusBarItem);
  context.subscriptions.push(statusBarItem);

  // Update status bar periodically
  const statusInterval = setInterval(() => {
    updateStatusBar(statusBarItem);
  }, 5000);

  context.subscriptions.push({
    dispose: () => clearInterval(statusInterval),
  });

  // Auto-start if enabled
  if (config.enabled) {
    try {
      await server.start();
      updateStatusBar(statusBarItem);
    } catch (error) {
      logger.error('Failed to auto-start server', error);
    }
  }

  // Ensure token exists
  await getOrGenerateToken();

  logger.info('Agent Control extension activated');
}

/**
 * Update the status bar item
 */
function updateStatusBar(item: vscode.StatusBarItem): void {
  if (server) {
    const status = server.getStatus();
    if (status.running) {
      item.text = `$(broadcast) Agent: ${status.clients}`;
      item.tooltip = `Agent Control server running on port ${status.port}\n${status.clients} client(s) connected`;
      item.backgroundColor = undefined;
    } else {
      item.text = '$(circle-slash) Agent: Off';
      item.tooltip = 'Agent Control server is not running. Click for status.';
      item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    item.show();
  }
}

/**
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  logger.info('Agent Control extension deactivating...');
  
  if (server) {
    server.dispose();
    server = null;
  }
  
  logger.dispose();
}
