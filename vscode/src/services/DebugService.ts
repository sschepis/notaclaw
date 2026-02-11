/**
 * Debug Service for Agent Control
 * Provides debugging capabilities through VS Code's debug API
 */

import * as vscode from 'vscode';
import { ErrorCode } from '../protocol/types';
import { ProtocolError } from '../protocol/errors';
import { logger } from '../utils/logger';

// ============================================================================
// Parameter & result types
// ============================================================================

export interface StartDebugSessionParams {
  name?: string;
  type: string;           // e.g. 'node', 'python', 'cppdbg'
  request: string;        // 'launch' or 'attach'
  configuration?: Record<string, unknown>;
}

export interface StopDebugSessionParams {
  sessionId?: string;  // if omitted, stops active session
}

export interface SetBreakpointsParams {
  path: string;
  breakpoints: Array<{
    line: number;
    condition?: string;
    hitCondition?: string;
    logMessage?: string;
  }>;
}

export interface RemoveBreakpointsParams {
  path: string;
  lines: number[];
}

export interface DebugSessionInfo {
  id: string;
  name: string;
  type: string;
}

export interface BreakpointInfo {
  id?: string;
  verified: boolean;
  line: number;
  source?: string;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}

export interface StartDebugSessionResult {
  sessionId: string;
  name: string;
}

export interface SetBreakpointsResult {
  breakpoints: BreakpointInfo[];
}

export interface GetBreakpointsResult {
  breakpoints: BreakpointInfo[];
}

export interface ListDebugSessionsResult {
  sessions: DebugSessionInfo[];
}

// ============================================================================
// Service
// ============================================================================

export class DebugService {
  private disposables: vscode.Disposable[] = [];

  /**
   * Start a new debug session
   */
  async startSession(params: StartDebugSessionParams): Promise<StartDebugSessionResult> {
    const config: vscode.DebugConfiguration = {
      name: params.name || `Agent Debug (${params.type})`,
      type: params.type,
      request: params.request,
      ...(params.configuration || {}),
    };

    const started = await vscode.debug.startDebugging(
      vscode.workspace.workspaceFolders?.[0],
      config
    );

    if (!started) {
      throw new ProtocolError(
        ErrorCode.InternalError,
        'Failed to start debug session'
      );
    }

    // The active debug session should now be set
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      throw new ProtocolError(
        ErrorCode.InternalError,
        'Debug session started but no active session found'
      );
    }

    logger.info(`Started debug session: ${session.id} (${session.name})`);

    return {
      sessionId: session.id,
      name: session.name,
    };
  }

  /**
   * Stop a debug session
   */
  async stopSession(params?: StopDebugSessionParams): Promise<{ success: boolean }> {
    if (params?.sessionId) {
      // Find the specific session — VS Code doesn't expose a direct lookup,
      // so we stop all sessions if we can't match (VS Code limitation)
      await vscode.debug.stopDebugging();
    } else {
      await vscode.debug.stopDebugging();
    }

    logger.info('Stopped debug session');
    return { success: true };
  }

  /**
   * Set breakpoints in a file (replaces existing breakpoints for that file)
   */
  async setBreakpoints(params: SetBreakpointsParams): Promise<SetBreakpointsResult> {
    const uri = vscode.Uri.file(params.path);

    const breakpoints = params.breakpoints.map(bp => {
      const location = new vscode.Location(uri, new vscode.Position(bp.line, 0));
      return new vscode.SourceBreakpoint(
        location,
        true,         // enabled
        bp.condition,
        bp.hitCondition,
        bp.logMessage
      );
    });

    // Remove existing breakpoints for this file
    const existingForFile = vscode.debug.breakpoints.filter(
      bp => bp instanceof vscode.SourceBreakpoint && bp.location.uri.fsPath === uri.fsPath
    );
    if (existingForFile.length > 0) {
      vscode.debug.removeBreakpoints(existingForFile);
    }

    // Add new breakpoints
    vscode.debug.addBreakpoints(breakpoints);

    logger.info(`Set ${breakpoints.length} breakpoints in ${params.path}`);

    return {
      breakpoints: breakpoints.map(bp => ({
        verified: bp.enabled,
        line: bp.location.range.start.line,
        source: uri.fsPath,
        condition: bp.condition,
        hitCondition: bp.hitCondition,
        logMessage: bp.logMessage,
      })),
    };
  }

  /**
   * Remove breakpoints at specific lines in a file
   */
  async removeBreakpoints(params: RemoveBreakpointsParams): Promise<{ success: boolean; removed: number }> {
    const uri = vscode.Uri.file(params.path);
    const lineSet = new Set(params.lines);

    const toRemove = vscode.debug.breakpoints.filter(
      bp =>
        bp instanceof vscode.SourceBreakpoint &&
        bp.location.uri.fsPath === uri.fsPath &&
        lineSet.has(bp.location.range.start.line)
    );

    if (toRemove.length > 0) {
      vscode.debug.removeBreakpoints(toRemove);
    }

    logger.info(`Removed ${toRemove.length} breakpoints from ${params.path}`);

    return { success: true, removed: toRemove.length };
  }

  /**
   * Get all breakpoints (optionally filtered by file)
   */
  async getBreakpoints(params?: { path?: string }): Promise<GetBreakpointsResult> {
    let breakpoints = vscode.debug.breakpoints;

    if (params?.path) {
      const uri = vscode.Uri.file(params.path);
      breakpoints = breakpoints.filter(
        bp => bp instanceof vscode.SourceBreakpoint && bp.location.uri.fsPath === uri.fsPath
      );
    }

    return {
      breakpoints: breakpoints
        .filter((bp): bp is vscode.SourceBreakpoint => bp instanceof vscode.SourceBreakpoint)
        .map(bp => ({
          id: bp.id,
          verified: bp.enabled,
          line: bp.location.range.start.line,
          source: bp.location.uri.fsPath,
          condition: bp.condition,
          hitCondition: bp.hitCondition,
          logMessage: bp.logMessage,
        })),
    };
  }

  /**
   * List active debug sessions
   */
  async listSessions(): Promise<ListDebugSessionsResult> {
    const activeSession = vscode.debug.activeDebugSession;

    // VS Code doesn't provide a list of all sessions easily,
    // but we can return the active one
    const sessions: DebugSessionInfo[] = [];
    if (activeSession) {
      sessions.push({
        id: activeSession.id,
        name: activeSession.name,
        type: activeSession.type,
      });
    }

    return { sessions };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
