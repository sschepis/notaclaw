/**
 * WorkspaceService — Centralized workspace state for the main process.
 *
 * A "workspace" is simply a folder on disk that the user has opened.
 * All agent filesystem tools (read, write, list, shell) are scoped to
 * this directory.  When the workspace changes, an event is emitted so
 * every consumer (AgentToolRegistry, PromptEngine, renderer) can react.
 *
 * The workspace path is persisted via ConfigManager so it survives restarts.
 */

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import { configManager } from './ConfigManager';

export interface WorkspaceChangedEvent {
  /** Absolute path of the new workspace, or null if closed. */
  path: string | null;
  /** Absolute path of the previous workspace, or null if none was set. */
  previousPath: string | null;
}

export class WorkspaceService extends EventEmitter {
  private _workspacePath: string | null = null;

  // ── Public API ──────────────────────────────────────────────────

  /** Current workspace directory (absolute path) or null if none set. */
  get workspacePath(): string | null {
    return this._workspacePath;
  }

  /** Whether a workspace folder is currently open. */
  get isOpen(): boolean {
    return this._workspacePath !== null;
  }

  /** The basename of the workspace folder (e.g. "my-project"), or null. */
  get workspaceName(): string | null {
    return this._workspacePath ? path.basename(this._workspacePath) : null;
  }

  /**
   * Initialize from persisted config.
   * Call once during app startup, before any agent task can run.
   */
  async initialize(): Promise<void> {
    try {
      const persisted = configManager.getWorkspacePath();
      if (persisted && fs.existsSync(persisted)) {
        const stat = fs.statSync(persisted);
        if (stat.isDirectory()) {
          this._workspacePath = persisted;
        } else {
          console.warn(`[WorkspaceService] Persisted workspace path is not a directory: ${persisted}`);
        }
      }
    } catch (err) {
      console.error('[WorkspaceService] Failed to initialize workspace from config:', err);
      // Non-fatal — the app continues without a workspace
    }
  }

  /**
   * Open a folder as the active workspace.
   * Persists the choice and emits `workspace:changed`.
   *
   * @throws {Error} If the path does not exist or is not a directory.
   */
  async openFolder(folderPath: string): Promise<void> {
    const resolved = path.resolve(folderPath);

    // Validate that it exists and is a directory
    if (!fs.existsSync(resolved)) {
      throw new Error(`Workspace path does not exist: ${resolved}`);
    }
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      throw new Error(`Workspace path is not a directory: ${resolved}`);
    }

    // Persist
    await configManager.setWorkspacePath(resolved);

    const oldPath = this._workspacePath;
    this._workspacePath = resolved;

    this.emit('workspace:changed', { path: resolved, previousPath: oldPath } as WorkspaceChangedEvent);
    console.log(`[WorkspaceService] Workspace set to: ${resolved}`);
  }

  /**
   * Close the current workspace (set to null).
   * Emits `workspace:changed` with path = null.
   */
  async closeWorkspace(): Promise<void> {
    const oldPath = this._workspacePath;
    if (!oldPath) return; // Already closed; no-op

    this._workspacePath = null;
    this.emit('workspace:changed', { path: null, previousPath: oldPath } as WorkspaceChangedEvent);
    console.log('[WorkspaceService] Workspace closed');
  }

  // ── Path helpers ────────────────────────────────────────────────

  /**
   * Resolve a potentially relative path against the workspace root.
   *
   * - If the input is relative, it is resolved against the workspace root.
   * - If the input is absolute, it is accepted **only if** it falls within
   *   the workspace boundary (prevents directory traversal attacks).
   *
   * @throws {Error} If no workspace is open.
   * @throws {Error} If the resolved path falls outside the workspace boundary.
   */
  resolve(inputPath: string): string {
    if (!this._workspacePath) {
      throw new Error('No workspace is open. Use "Open Folder" to set a workspace first.');
    }

    const resolved = path.isAbsolute(inputPath)
      ? path.resolve(inputPath)
      : path.resolve(this._workspacePath, inputPath);

    // Security: prevent directory traversal outside workspace
    if (!this.isWithinWorkspace(resolved)) {
      throw new Error(`Path "${inputPath}" resolves outside the workspace boundary`);
    }

    return resolved;
  }

  /**
   * Resolve a path without enforcing the workspace boundary.
   *
   * Used when sandbox mode is disabled (configManager.isSandboxed() === false).
   * - If the input is relative, it resolves against the workspace root when
   *   one is open, or the user's home directory otherwise.
   * - If the input is absolute, it is resolved as-is.
   *
   * Callers are responsible for checking the sandbox setting before choosing
   * between resolve() and resolveUnrestricted().
   */
  resolveUnrestricted(inputPath: string): string {
    if (path.isAbsolute(inputPath)) {
      return path.resolve(inputPath);
    }

    // Prefer workspace root when available, fall back to home dir
    const base = this._workspacePath || require('os').homedir();
    return path.resolve(base, inputPath);
  }

  /**
   * Check whether an absolute path falls within the current workspace.
   * Returns false if no workspace is open rather than throwing.
   */
  isWithinWorkspace(absolutePath: string): boolean {
    if (!this._workspacePath) return false;

    const normalizedWorkspace = path.resolve(this._workspacePath);
    const normalizedTarget = path.resolve(absolutePath);

    // Exact match (the workspace root itself) or starts with root + separator
    return (
      normalizedTarget === normalizedWorkspace ||
      normalizedTarget.startsWith(normalizedWorkspace + path.sep)
    );
  }

  /**
   * Get a human-readable workspace info block for agent system prompts.
   *
   * @param sandboxed - Whether the agent is sandboxed to the workspace.
   *   When false, the agent is told it may access any path on the filesystem.
   */
  getWorkspaceInfoBlock(sandboxed: boolean = true): string {
    if (!sandboxed) {
      // Unrestricted mode — agent can access the full filesystem
      const homeDir = require('os').homedir();
      const lines = [
        '## Filesystem Access',
        `**Home directory**: \`${homeDir}\``,
      ];
      if (this._workspacePath) {
        lines.push(`**Workspace**: \`${this._workspacePath}\` (${path.basename(this._workspacePath)})`);
      }
      lines.push(
        '',
        'You have unrestricted filesystem access. You may use absolute paths anywhere on disk.',
        'Relative paths resolve against the workspace root (if open) or the user\'s home directory.',
        'Exercise caution when modifying system files.',
      );
      return lines.join('\n');
    }

    // Sandboxed mode (default)
    if (!this._workspacePath) {
      return '## Workspace\nNo workspace is currently open. The user should open a folder first.';
    }
    return [
      '## Workspace',
      `**Root**: \`${this._workspacePath}\``,
      `**Name**: ${path.basename(this._workspacePath)}`,
      '',
      'All file paths you use in tools (read_file, write_file, list_directory, shell) are relative to this root.',
      'You may also use absolute paths within the workspace boundary.',
      'Never attempt to access files outside the workspace root.',
    ].join('\n');
  }
}

// Singleton
export const workspaceService = new WorkspaceService();
