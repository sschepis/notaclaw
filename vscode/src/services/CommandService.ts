/**
 * Command Service for Agent Control
 * Handles VS Code command execution
 */

import * as vscode from 'vscode';
import {
  ExecuteCommandParams,
  ListCommandsParams,
  ExecuteCommandResult,
  ListCommandsResult,
  ErrorCode,
} from '../protocol/types';
import { ProtocolError } from '../protocol/errors';
import { logger } from '../utils/logger';
import { getConfig, isCommandRestricted } from '../utils/config';

export class CommandService {
  /**
   * Check if command execution is allowed
   */
  private checkAccess(command: string): void {
    const config = getConfig();
    
    if (!config.security.allowCommandExecution) {
      throw new ProtocolError(
        ErrorCode.FeatureDisabled,
        'Command execution is disabled'
      );
    }
    
    if (isCommandRestricted(command)) {
      throw new ProtocolError(
        ErrorCode.CommandRestricted,
        `Command is restricted: ${command}`,
        { command }
      );
    }
  }

  /**
   * Execute a VS Code command
   */
  async execute(params: ExecuteCommandParams): Promise<ExecuteCommandResult> {
    this.checkAccess(params.command);
    
    try {
      const result = await vscode.commands.executeCommand(
        params.command,
        ...(params.args || [])
      );
      
      logger.debug(`Executed command: ${params.command}`);
      
      return { result };
    } catch (error) {
      logger.error(`Failed to execute command: ${params.command}`, error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to execute command '${params.command}': ${String(error)}`,
        { command: params.command }
      );
    }
  }

  /**
   * List available VS Code commands
   */
  async list(params: ListCommandsParams): Promise<ListCommandsResult> {
    try {
      let commands = await vscode.commands.getCommands(true);
      
      // Filter if a filter pattern is provided
      if (params.filter) {
        const filterLower = params.filter.toLowerCase();
        commands = commands.filter((cmd: string) => 
          cmd.toLowerCase().includes(filterLower)
        );
      }
      
      // Sort alphabetically
      commands.sort();
      
      logger.debug(`Listed ${commands.length} commands`);
      
      return { commands };
    } catch (error) {
      logger.error('Failed to list commands', error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to list commands: ${String(error)}`
      );
    }
  }

  /**
   * Execute a built-in VS Code action by name
   * This is a convenience method for common operations
   */
  async executeAction(action: string, ...args: unknown[]): Promise<unknown> {
    const actionMap: Record<string, string> = {
      // File operations
      'save': 'workbench.action.files.save',
      'saveAll': 'workbench.action.files.saveAll',
      'newFile': 'workbench.action.files.newUntitledFile',
      'closeFile': 'workbench.action.closeActiveEditor',
      'closeAllFiles': 'workbench.action.closeAllEditors',
      
      // Editor operations
      'undo': 'undo',
      'redo': 'redo',
      'cut': 'editor.action.clipboardCutAction',
      'copy': 'editor.action.clipboardCopyAction',
      'paste': 'editor.action.clipboardPasteAction',
      'selectAll': 'editor.action.selectAll',
      'find': 'actions.find',
      'replace': 'editor.action.startFindReplaceAction',
      'format': 'editor.action.formatDocument',
      'comment': 'editor.action.commentLine',
      'uncomment': 'editor.action.removeCommentLine',
      
      // Navigation
      'goToLine': 'workbench.action.gotoLine',
      'goToSymbol': 'workbench.action.gotoSymbol',
      'goToDefinition': 'editor.action.revealDefinition',
      'goToReferences': 'editor.action.goToReferences',
      'goBack': 'workbench.action.navigateBack',
      'goForward': 'workbench.action.navigateForward',
      
      // View
      'zoomIn': 'workbench.action.zoomIn',
      'zoomOut': 'workbench.action.zoomOut',
      'toggleSidebar': 'workbench.action.toggleSidebarVisibility',
      'togglePanel': 'workbench.action.togglePanel',
      'toggleTerminal': 'workbench.action.terminal.toggleTerminal',
      'focusExplorer': 'workbench.view.explorer',
      'focusSearch': 'workbench.view.search',
      
      // Terminal
      'newTerminal': 'workbench.action.terminal.new',
      'closeTerminal': 'workbench.action.terminal.kill',
      'clearTerminal': 'workbench.action.terminal.clear',
      
      // Debugging
      'startDebugging': 'workbench.action.debug.start',
      'stopDebugging': 'workbench.action.debug.stop',
      'toggleBreakpoint': 'editor.debug.action.toggleBreakpoint',
      
      // Source control
      'openSourceControl': 'workbench.view.scm',
      
      // Extensions
      'openExtensions': 'workbench.view.extensions',
      
      // Settings
      'openSettings': 'workbench.action.openSettings',
      'openKeybindings': 'workbench.action.openGlobalKeybindings',
    };

    const command = actionMap[action];
    
    if (!command) {
      throw new ProtocolError(
        ErrorCode.InvalidParams,
        `Unknown action: ${action}. Use the full command name instead.`,
        { action, availableActions: Object.keys(actionMap) }
      );
    }

    return this.execute({ command, args });
  }

  /**
   * Show an information message
   */
  async showMessage(message: string, type: 'info' | 'warning' | 'error' = 'info', items?: string[]): Promise<string | undefined> {
    let result: string | undefined;
    
    switch (type) {
      case 'info':
        result = await vscode.window.showInformationMessage(message, ...(items || []));
        break;
      case 'warning':
        result = await vscode.window.showWarningMessage(message, ...(items || []));
        break;
      case 'error':
        result = await vscode.window.showErrorMessage(message, ...(items || []));
        break;
    }
    
    return result;
  }

  /**
   * Show an input box for user input
   */
  async showInputBox(options?: {
    prompt?: string;
    placeholder?: string;
    value?: string;
    password?: boolean;
  }): Promise<string | undefined> {
    return vscode.window.showInputBox({
      prompt: options?.prompt,
      placeHolder: options?.placeholder,
      value: options?.value,
      password: options?.password,
    });
  }

  /**
   * Show a quick pick selection
   */
  async showQuickPick(items: string[], options?: {
    title?: string;
    placeholder?: string;
    canPickMany?: boolean;
  }): Promise<string | string[] | undefined> {
    return vscode.window.showQuickPick(items, {
      title: options?.title,
      placeHolder: options?.placeholder,
      canPickMany: options?.canPickMany,
    });
  }
}
