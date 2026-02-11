/**
 * Git Service for Agent Control
 * Provides Git operations through VS Code's built-in Git extension API
 */

import * as vscode from 'vscode';
import { ErrorCode } from '../protocol/types';
import { ProtocolError } from '../protocol/errors';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface GitStatusResult {
  branch: string;
  ahead: number;
  behind: number;
  staged: Array<{ path: string; status: string }>;
  modified: Array<{ path: string; status: string }>;
  untracked: string[];
}

export interface GitDiffParams {
  path?: string;
  staged?: boolean;
}

export interface GitDiffResult {
  diff: string;
}

export interface GitLogParams {
  maxCount?: number;
  path?: string;
}

export interface GitLogEntry {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitLogResult {
  commits: GitLogEntry[];
}

export interface GitStageParams {
  paths: string[];
}

export interface GitUnstageParams {
  paths: string[];
}

export interface GitCommitParams {
  message: string;
  amend?: boolean;
}

export interface GitCommitResult {
  success: boolean;
}

export interface GitCheckoutParams {
  branch: string;
  create?: boolean;
}

export interface GitBranchesResult {
  current: string;
  branches: string[];
}

// ============================================================================
// Git Extension API types (from VS Code built-in git extension)
// ============================================================================

interface GitExtension {
  getAPI(version: number): GitAPI;
}

interface GitAPI {
  repositories: Repository[];
}

interface Repository {
  state: RepositoryState;
  diff(cached?: boolean): Promise<string>;
  diffWith(ref: string, path: string): Promise<string>;
  log(options?: { maxEntries?: number; path?: string }): Promise<Commit[]>;
  add(paths: string[]): Promise<void>;
  revert(paths: string[]): Promise<void>;
  commit(message: string, opts?: { amend?: boolean }): Promise<void>;
  checkout(treeish: string): Promise<void>;
  createBranch(name: string, checkout: boolean): Promise<void>;
  getBranches(query?: { remote?: boolean }): Promise<Branch[]>;
}

interface RepositoryState {
  HEAD: Branch | undefined;
  remotes: Remote[];
  indexChanges: Change[];
  workingTreeChanges: Change[];
  untrackedChanges: Change[];
}

interface Branch {
  name?: string;
  commit?: string;
  ahead?: number;
  behind?: number;
  type?: number;
}

interface Remote {
  name: string;
  fetchUrl?: string;
  pushUrl?: string;
}

interface Change {
  uri: vscode.Uri;
  status: number;
}

interface Commit {
  hash: string;
  message: string;
  authorName?: string;
  authorDate?: Date;
}

// ============================================================================
// Service
// ============================================================================

export class GitService {
  /**
   * Get the Git API from the built-in Git extension
   */
  private getGitAPI(): GitAPI {
    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (!gitExtension) {
      throw new ProtocolError(ErrorCode.FeatureDisabled, 'Git extension not available');
    }
    if (!gitExtension.isActive) {
      throw new ProtocolError(ErrorCode.FeatureDisabled, 'Git extension not activated');
    }
    return gitExtension.exports.getAPI(1);
  }

  /**
   * Get the primary repository
   */
  private getRepository(): Repository {
    const api = this.getGitAPI();
    if (api.repositories.length === 0) {
      throw new ProtocolError(ErrorCode.InternalError, 'No Git repository found');
    }
    return api.repositories[0];
  }

  /**
   * Map Change status number to string
   */
  private statusToString(status: number): string {
    const statusMap: Record<number, string> = {
      0: 'modified',
      1: 'added',
      2: 'deleted',
      3: 'renamed',
      4: 'copied',
      5: 'unmerged',
      6: 'ignored',
      7: 'intent-to-add',
    };
    return statusMap[status] || 'unknown';
  }

  /**
   * Get repository status
   */
  async status(): Promise<GitStatusResult> {
    const repo = this.getRepository();
    const state = repo.state;

    const branch = state.HEAD?.name || 'detached';
    const ahead = state.HEAD?.ahead || 0;
    const behind = state.HEAD?.behind || 0;

    const staged = state.indexChanges.map(c => ({
      path: vscode.workspace.asRelativePath(c.uri),
      status: this.statusToString(c.status),
    }));

    const modified = state.workingTreeChanges.map(c => ({
      path: vscode.workspace.asRelativePath(c.uri),
      status: this.statusToString(c.status),
    }));

    const untracked = state.untrackedChanges.map(c =>
      vscode.workspace.asRelativePath(c.uri)
    );

    logger.info(`Git status: ${branch} (+${ahead}/-${behind}), ${staged.length} staged, ${modified.length} modified`);

    return { branch, ahead, behind, staged, modified, untracked };
  }

  /**
   * Get diff output
   */
  async diff(params?: GitDiffParams): Promise<GitDiffResult> {
    const repo = this.getRepository();
    const cached = params?.staged ?? false;

    const diff = await repo.diff(cached);

    logger.debug(`Git diff (cached=${cached}): ${diff.length} chars`);

    return { diff };
  }

  /**
   * Get commit log
   */
  async log(params?: GitLogParams): Promise<GitLogResult> {
    const repo = this.getRepository();

    const commits = await repo.log({
      maxEntries: params?.maxCount || 20,
      path: params?.path,
    });

    return {
      commits: commits.map(c => ({
        hash: c.hash,
        message: c.message,
        author: c.authorName || 'unknown',
        date: c.authorDate?.toISOString() || '',
      })),
    };
  }

  /**
   * Stage files
   */
  async stage(params: GitStageParams): Promise<{ success: boolean }> {
    const repo = this.getRepository();
    await repo.add(params.paths);
    logger.info(`Staged ${params.paths.length} files`);
    return { success: true };
  }

  /**
   * Unstage files
   */
  async unstage(params: GitUnstageParams): Promise<{ success: boolean }> {
    const repo = this.getRepository();
    await repo.revert(params.paths);
    logger.info(`Unstaged ${params.paths.length} files`);
    return { success: true };
  }

  /**
   * Create a commit
   */
  async commit(params: GitCommitParams): Promise<GitCommitResult> {
    const repo = this.getRepository();
    await repo.commit(params.message, { amend: params.amend });
    logger.info(`Created commit: ${params.message.substring(0, 50)}`);
    return { success: true };
  }

  /**
   * Checkout a branch
   */
  async checkout(params: GitCheckoutParams): Promise<{ success: boolean }> {
    const repo = this.getRepository();
    if (params.create) {
      await repo.createBranch(params.branch, true);
      logger.info(`Created and checked out branch: ${params.branch}`);
    } else {
      await repo.checkout(params.branch);
      logger.info(`Checked out branch: ${params.branch}`);
    }
    return { success: true };
  }

  /**
   * List branches
   */
  async branches(): Promise<GitBranchesResult> {
    const repo = this.getRepository();
    const state = repo.state;
    const current = state.HEAD?.name || 'detached';

    const allBranches = await repo.getBranches({});
    const branchNames = allBranches
      .map(b => b.name)
      .filter((n): n is string => !!n);

    return { current, branches: branchNames };
  }

  dispose(): void {
    // No resources to dispose
  }
}
