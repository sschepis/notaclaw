/**
 * Terminal Service for Agent Control
 * Handles terminal creation, command execution, and output streaming
 */

import * as vscode from 'vscode';
import {
  CreateTerminalParams,
  DisposeTerminalParams,
  SendTextParams,
  ShowTerminalParams,
  CreateTerminalResult,
  ListTerminalsResult,
  GetActiveTerminalResult,
  SuccessResult,
  TerminalInfo,
  ErrorCode,
} from '../protocol/types';
import { ProtocolError } from '../protocol/errors';
import { logger } from '../utils/logger';
import { getConfig } from '../utils/config';

// Map our terminal IDs to VS Code terminals
type TerminalId = string;

export class TerminalService {
  private terminals: Map<TerminalId, vscode.Terminal> = new Map();
  private terminalIdCounter = 0;
  private disposables: vscode.Disposable[] = [];
  
  // Callback for terminal output (used by WebSocket server to send notifications)
  private outputCallback?: (terminalId: string, data: string) => void;
  private closeCallback?: (terminalId: string) => void;

  constructor() {
    // Listen for terminal close events
    this.disposables.push(
      vscode.window.onDidCloseTerminal((terminal) => {
        for (const [id, t] of this.terminals) {
          if (t === terminal) {
            this.terminals.delete(id);
            this.closeCallback?.(id);
            logger.debug(`Terminal closed: ${id}`);
            break;
          }
        }
      })
    );
  }

  /**
   * Set callbacks for terminal events
   */
  setCallbacks(
    outputCallback: (terminalId: string, data: string) => void,
    closeCallback: (terminalId: string) => void
  ): void {
    this.outputCallback = outputCallback;
    this.closeCallback = closeCallback;
  }

  /**
   * Check if terminal access is allowed
   */
  private checkAccess(): void {
    const config = getConfig();
    
    if (!config.security.allowTerminalAccess) {
      throw new ProtocolError(
        ErrorCode.FeatureDisabled,
        'Terminal access is disabled'
      );
    }
  }

  /**
   * Get a terminal by ID
   */
  private getTerminal(terminalId: string): vscode.Terminal {
    const terminal = this.terminals.get(terminalId);
    
    if (!terminal) {
      throw new ProtocolError(
        ErrorCode.TerminalNotFound,
        `Terminal not found: ${terminalId}`,
        { terminalId }
      );
    }
    
    return terminal;
  }

  /**
   * Generate a unique terminal ID
   */
  private generateId(): string {
    return `term-${++this.terminalIdCounter}-${Date.now()}`;
  }

  /**
   * Create a new terminal
   */
  async create(params: CreateTerminalParams): Promise<CreateTerminalResult> {
    this.checkAccess();
    
    const terminalId = this.generateId();
    
    const terminalOptions: vscode.TerminalOptions = {
      name: params.name || `Agent Terminal ${this.terminalIdCounter}`,
      cwd: params.cwd,
      env: params.env,
    };
    
    const terminal = vscode.window.createTerminal(terminalOptions);
    this.terminals.set(terminalId, terminal);
    
    logger.info(`Created terminal: ${terminalId} (${terminalOptions.name})`);
    
    return { terminalId };
  }

  /**
   * Dispose (close) a terminal
   */
  async dispose(params: DisposeTerminalParams): Promise<SuccessResult> {
    this.checkAccess();
    
    const terminal = this.getTerminal(params.terminalId);
    terminal.dispose();
    this.terminals.delete(params.terminalId);
    
    logger.debug(`Disposed terminal: ${params.terminalId}`);
    
    return { success: true };
  }

  /**
   * Send text to a terminal
   */
  async sendText(params: SendTextParams): Promise<SuccessResult> {
    this.checkAccess();
    
    const terminal = this.getTerminal(params.terminalId);
    const addNewLine = params.addNewLine ?? true;
    
    terminal.sendText(params.text, addNewLine);
    
    logger.debug(`Sent text to terminal ${params.terminalId}: ${params.text.substring(0, 50)}...`);
    
    return { success: true };
  }

  /**
   * Show a terminal (bring to front)
   */
  async show(params: ShowTerminalParams): Promise<SuccessResult> {
    this.checkAccess();
    
    const terminal = this.getTerminal(params.terminalId);
    const preserveFocus = params.preserveFocus ?? false;
    
    terminal.show(preserveFocus);
    
    logger.debug(`Showed terminal: ${params.terminalId}`);
    
    return { success: true };
  }

  /**
   * List all terminals
   */
  async list(): Promise<ListTerminalsResult> {
    this.checkAccess();
    
    const terminals: TerminalInfo[] = [];
    
    for (const [id, terminal] of this.terminals) {
      terminals.push({
        id,
        name: terminal.name,
        processId: await terminal.processId,
      });
    }
    
    // Also include terminals not created by us
    for (const terminal of vscode.window.terminals) {
      const existsInMap = Array.from(this.terminals.values()).includes(terminal);
      if (!existsInMap) {
        // Generate an ID for untracked terminals
        const id = `ext-${terminal.name}-${await terminal.processId || 'unknown'}`;
        terminals.push({
          id,
          name: terminal.name,
          processId: await terminal.processId,
        });
      }
    }
    
    return { terminals };
  }

  /**
   * Get the active terminal
   */
  async getActive(): Promise<GetActiveTerminalResult> {
    this.checkAccess();
    
    const activeTerminal = vscode.window.activeTerminal;
    
    if (!activeTerminal) {
      throw new ProtocolError(
        ErrorCode.TerminalNotFound,
        'No active terminal'
      );
    }
    
    // Find our ID for this terminal
    let terminalId: string | undefined;
    for (const [id, terminal] of this.terminals) {
      if (terminal === activeTerminal) {
        terminalId = id;
        break;
      }
    }
    
    // If not in our map, generate an ID
    if (!terminalId) {
      terminalId = `ext-${activeTerminal.name}-${await activeTerminal.processId || 'unknown'}`;
    }
    
    return {
      terminalId,
      name: activeTerminal.name,
    };
  }

  /**
   * Hide all terminals
   */
  async hideAll(): Promise<SuccessResult> {
    // VS Code doesn't have a direct API to hide the terminal panel
    // We can use commands instead
    await vscode.commands.executeCommand('workbench.action.closePanel');
    
    return { success: true };
  }

  /**
   * Run a command in a new terminal and optionally wait for it
   * This is a convenience method combining create + sendText
   */
  async runCommand(command: string, options?: { name?: string; cwd?: string; show?: boolean }): Promise<CreateTerminalResult> {
    this.checkAccess();
    
    const result = await this.create({
      name: options?.name || 'Command Terminal',
      cwd: options?.cwd,
    });
    
    if (options?.show !== false) {
      await this.show({ terminalId: result.terminalId, preserveFocus: true });
    }
    
    await this.sendText({
      terminalId: result.terminalId,
      text: command,
      addNewLine: true,
    });
    
    return result;
  }

  /**
   * Dispose of all resources (cleanup method)
   */
  disposeAll(): void {
    // Close all terminals we created
    for (const terminal of this.terminals.values()) {
      terminal.dispose();
    }
    this.terminals.clear();
    
    // Dispose of event listeners
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
