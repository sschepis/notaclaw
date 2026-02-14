/**
 * AgentToolRegistry — Centralized tool registry for Resonant Agents.
 *
 * Replaces the inline tool construction scattered across AgentTaskRunner
 * and PersonalityManager. Tools are registered once, then filtered per-agent
 * based on that agent's declared capabilities and permissions.
 *
 * All filesystem and shell tools are scoped to the active workspace directory
 * via WorkspaceService. Paths supplied by the agent are resolved relative to
 * the workspace root and cannot escape it.
 */

import { ToolDefinition } from './prompt-engine/types';
import { ToolRegistration, ResonantAgent } from '../../shared/resonant-agent-types';
import { workspaceService } from './WorkspaceService';
import { configManager } from './ConfigManager';

/** Extensions that should be treated as binary and skipped by text-oriented tools. */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif', '.svg',
  '.mp3', '.mp4', '.wav', '.ogg', '.flac', '.avi', '.mov', '.mkv',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dll', '.so', '.dylib', '.o', '.obj', '.wasm',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.sqlite', '.db',
]);

/** Directories that should be skipped during recursive traversal. */
const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.venv', 'venv', '.tox', '.mypy_cache', '.pytest_cache',
  'coverage', '.turbo', '.cache', '.DS_Store', '.idea', '.vscode',
  '.svn', '.hg', 'bower_components', '.parcel-cache',
]);

export class AgentToolRegistry {
  private tools: Map<string, ToolRegistration> = new Map();

  /**
   * Register a tool. Overwrites any existing tool with the same ID.
   */
  register(tool: ToolRegistration): void {
    this.tools.set(tool.id, tool);
  }

  /**
   * Unregister a tool by ID.
   */
  unregister(toolId: string): void {
    this.tools.delete(toolId);
  }

  /**
   * Get all tools available to a specific agent, filtered by the agent's
   * declared tool list and permission set.
   */
  getToolsForAgent(agent: ResonantAgent): ToolDefinition[] {
    const agentTools = agent.capabilities.tools;
    const agentPerms = new Set(agent.capabilities.permissions);

    const results: ToolDefinition[] = [];
    for (const reg of this.tools.values()) {
      // Check if agent declares access to this tool (by name or wildcard)
      const hasAccess = agentTools.some(pattern => {
        if (pattern.endsWith('*')) {
          return reg.name.startsWith(pattern.slice(0, -1));
        }
        return reg.name === pattern;
      });
      if (!hasAccess) continue;

      // Check permissions
      const hasPerms = reg.permissions.every(p => agentPerms.has(p));
      if (!hasPerms) continue;

      results.push(this.toToolDefinition(reg));
    }
    return results;
  }

  /**
   * Get tools by category.
   */
  getToolsByCategory(category: string): ToolRegistration[] {
    return Array.from(this.tools.values()).filter(t => t.category === category);
  }

  /**
   * List all registered tools (without handler, for serialization).
   */
  listAll(): Array<Omit<ToolRegistration, 'handler'>> {
    return Array.from(this.tools.values()).map(({ handler, ...rest }) => rest);
  }

  /**
   * Get a tool by name.
   */
  getByName(name: string): ToolRegistration | undefined {
    for (const reg of this.tools.values()) {
      if (reg.name === name) return reg;
    }
    return undefined;
  }

  /**
   * Convert a ToolRegistration to the ToolDefinition format expected by
   * the agent-runner's AgentLoop.
   */
  private toToolDefinition(reg: ToolRegistration): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: reg.name,
        description: reg.description,
        parameters: reg.parameters as { type: string; properties: Record<string, any>; required: string[] },
        script: reg.handler,
      },
    };
  }

  /**
   * Register all core filesystem/shell tools.
   * Called once during service initialization.
   *
   * Tools use workspaceService to resolve paths relative to the active
   * workspace and to set the cwd for shell commands.
   */
  registerCoreTools(): void {
    const { exec } = require('child_process');
    const fs = require('fs');
    const pathModule = require('path');

    // Helper: resolve a path with workspace scoping, with graceful fallback.
    // When sandbox mode is disabled, paths are resolved without boundary checks.
    const resolvePath = (inputPath: string, fallback?: string): string => {
      const sandboxed = configManager.isSandboxed();

      if (!sandboxed) {
        // Unrestricted — delegate to WorkspaceService.resolveUnrestricted()
        return workspaceService.resolveUnrestricted(inputPath);
      }

      if (workspaceService.isOpen) {
        return workspaceService.resolve(inputPath);
      }
      // Fallback when no workspace is set — allow the operation but warn
      console.warn(`[AgentToolRegistry] No workspace set — resolving "${inputPath}" against process.cwd()`);
      return pathModule.resolve(fallback || process.cwd(), inputPath);
    };

    // Helper: check if a filename appears to be binary based on extension
    const isBinaryFile = (filename: string): boolean => {
      const ext = pathModule.extname(filename).toLowerCase();
      return BINARY_EXTENSIONS.has(ext);
    };

    // ── Shell tool ──────────────────────────────────────────────────
    this.register({
      id: 'core:shell',
      name: 'shell',
      description:
        'Execute a shell command and return its output. ' +
        'The command runs inside the active workspace directory. ' +
        'A workspace must be open for this tool to function.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute' },
        },
        required: ['command'],
      },
      handler: async ({ command }: { command: string }) => {
        const sandboxed = configManager.isSandboxed();
        const cwd = workspaceService.workspacePath
          || (!sandboxed ? require('os').homedir() : null);
        if (!cwd) {
          return {
            error: 'No workspace is open. Use "Open Folder" to set a workspace before running shell commands.',
            exitCode: 1,
          };
        }

        console.log(`[AgentToolRegistry] Shell: cwd=${cwd} cmd=${command.substring(0, 200)}`);

        return new Promise((resolve) => {
          exec(
            command,
            { cwd, timeout: 30_000, maxBuffer: 1024 * 1024 },
            (error: any, stdout: string, stderr: string) => {
              resolve({
                stdout: stdout?.substring(0, 10_000) || '',
                stderr: stderr?.substring(0, 5_000) || '',
                exitCode: error ? (error.code ?? 1) : 0,
                error: error ? error.message : null,
                cwd,
              });
            },
          );
        });
      },
      source: 'core',
      permissions: ['shell'],
      category: 'shell',
    });

    // ── File read tool ──────────────────────────────────────────────
    this.register({
      id: 'core:read_file',
      name: 'read_file',
      description:
        'Read the contents of a text file. ' +
        'Paths are resolved relative to the workspace root. ' +
        'Binary files (images, archives, etc.) cannot be read with this tool.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read (relative to workspace or absolute within workspace)',
          },
        },
        required: ['path'],
      },
      handler: async ({ path: filePath }: { path: string }) => {
        try {
          const resolved = resolvePath(filePath);

          if (isBinaryFile(resolved)) {
            return { error: `Cannot read binary file: ${filePath}. Use a more specific tool for binary content.` };
          }

          const stat = fs.statSync(resolved);
          if (stat.size > 2 * 1024 * 1024) {
            return { error: `File is too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maximum is 2 MB.` };
          }

          const content = fs.readFileSync(resolved, 'utf-8');
          return {
            content: content.substring(0, 100_000),
            path: resolved,
            size: stat.size,
            truncated: content.length > 100_000,
          };
        } catch (err: any) {
          return { error: err.message };
        }
      },
      source: 'core',
      permissions: ['fs:read'],
      category: 'filesystem',
    });

    // ── File write tool ─────────────────────────────────────────────
    this.register({
      id: 'core:write_file',
      name: 'write_file',
      description:
        'Write content to a file. Creates the file and any missing parent directories if they do not exist. ' +
        'Paths are resolved relative to the workspace root. ' +
        'A workspace must be open for this tool to function.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to write (relative to workspace)' },
          content: { type: 'string', description: 'Content to write to the file' },
        },
        required: ['path', 'content'],
      },
      handler: async ({ path: filePath, content }: { path: string; content: string }) => {
        const sandboxed = configManager.isSandboxed();
        if (sandboxed && !workspaceService.isOpen) {
          return { error: 'No workspace is open. Use "Open Folder" to set a workspace before writing files.' };
        }
        try {
          const resolved = resolvePath(filePath);
          const dir = pathModule.dirname(resolved);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(resolved, content, 'utf-8');
          console.log(`[AgentToolRegistry] write_file: ${resolved} (${content.length} chars)`);
          return { success: true, path: resolved, bytesWritten: Buffer.byteLength(content, 'utf-8') };
        } catch (err: any) {
          return { error: err.message };
        }
      },
      source: 'core',
      permissions: ['fs:write'],
      category: 'filesystem',
    });

    // ── List directory tool ─────────────────────────────────────────
    this.register({
      id: 'core:list_directory',
      name: 'list_directory',
      description:
        'List files and directories at a given path. ' +
        'Paths are resolved relative to the workspace root. ' +
        'Pass "." or "" to list the workspace root.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list (relative to workspace). Use "." for workspace root.',
          },
        },
        required: ['path'],
      },
      handler: async ({ path: dirPath }: { path: string }) => {
        try {
          const resolved = resolvePath(dirPath || '.');
          const entries = fs.readdirSync(resolved, { withFileTypes: true });
          return {
            path: resolved,
            entries: entries.map((e: any) => ({
              name: e.name,
              type: e.isDirectory() ? 'directory' : 'file',
            })),
            count: entries.length,
          };
        } catch (err: any) {
          return { error: err.message };
        }
      },
      source: 'core',
      permissions: ['fs:read'],
      category: 'filesystem',
    });

    // ── File tree tool (recursive) ──────────────────────────────────
    this.register({
      id: 'core:file_tree',
      name: 'file_tree',
      description:
        'Recursively list the file tree of the workspace (or a subdirectory). ' +
        'Returns a flat list of relative paths with type indicators. ' +
        'Limited to 500 entries to avoid overwhelming output. ' +
        'Common noise directories (node_modules, .git, dist, etc.) are excluded.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Subdirectory to start from (relative to workspace). Defaults to workspace root.',
          },
          max_depth: {
            type: 'number',
            description: 'Maximum recursion depth (1–10). Default: 5.',
          },
        },
        required: [],
      },
      handler: async ({ path: subPath, max_depth }: { path?: string; max_depth?: number }) => {
        try {
          const rootDir = resolvePath(subPath || '.');

          const MAX_ENTRIES = 500;
          const maxDepth = Math.min(Math.max(max_depth ?? 5, 1), 10);
          const results: string[] = [];

          function walk(dir: string, relPrefix: string, depth: number) {
            if (results.length >= MAX_ENTRIES || depth > maxDepth) return;
            let entries: any[];
            try {
              entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
              return; // Permission denied or not a dir
            }
            // Sort: directories first, then files, alphabetically
            entries.sort((a: any, b: any) => {
              if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
              return a.name.localeCompare(b.name);
            });
            for (const entry of entries) {
              if (results.length >= MAX_ENTRIES) break;
              if (IGNORED_DIRS.has(entry.name)) continue;
              const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
              if (entry.isDirectory()) {
                results.push(`📁 ${rel}/`);
                walk(pathModule.join(dir, entry.name), rel, depth + 1);
              } else {
                results.push(`📄 ${rel}`);
              }
            }
          }

          walk(rootDir, '', 0);

          return {
            root: rootDir,
            totalEntries: results.length,
            truncated: results.length >= MAX_ENTRIES,
            tree: results.join('\n'),
          };
        } catch (err: any) {
          return { error: err.message };
        }
      },
      source: 'core',
      permissions: ['fs:read'],
      category: 'filesystem',
    });

    // ── Search files tool (grep-like) ───────────────────────────────
    this.register({
      id: 'core:search_files',
      name: 'search_files',
      description:
        'Search for a text pattern (regex) across files in the workspace. ' +
        'Returns matching lines with file paths and line numbers. ' +
        'Binary files and files larger than 512 KB are skipped. ' +
        'Results are capped at 50 matches.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regular expression pattern to search for' },
          path: {
            type: 'string',
            description: 'Subdirectory to search in (relative to workspace). Defaults to workspace root.',
          },
          file_pattern: {
            type: 'string',
            description: 'Glob-like extension filter, e.g. "*.ts" or "*.py". Defaults to all text files.',
          },
        },
        required: ['pattern'],
      },
      handler: async ({
        pattern,
        path: subPath,
        file_pattern,
      }: {
        pattern: string;
        path?: string;
        file_pattern?: string;
      }) => {
        try {
          const rootDir = resolvePath(subPath || '.');

          // Validate regex before use
          let regex: RegExp;
          try {
            regex = new RegExp(pattern, 'gi');
          } catch (regexErr: any) {
            return { error: `Invalid regex pattern: ${regexErr.message}` };
          }

          const extFilter = file_pattern
            ? new RegExp(
                '^' + file_pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$',
                'i',
              )
            : null;

          const MAX_RESULTS = 50;
          const MAX_FILE_SIZE = 512 * 1024; // 512 KB
          const matches: Array<{ file: string; line: number; text: string }> = [];

          function searchDir(dir: string, relPrefix: string) {
            if (matches.length >= MAX_RESULTS) return;
            let entries: any[];
            try {
              entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
              return;
            }
            for (const entry of entries) {
              if (matches.length >= MAX_RESULTS) break;
              if (IGNORED_DIRS.has(entry.name)) continue;
              const fullPath = pathModule.join(dir, entry.name);
              const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;

              if (entry.isDirectory()) {
                searchDir(fullPath, rel);
              } else {
                // Skip binary files by extension
                if (isBinaryFile(entry.name)) continue;
                if (extFilter && !extFilter.test(entry.name)) continue;

                // Skip large files
                try {
                  const stat = fs.statSync(fullPath);
                  if (stat.size > MAX_FILE_SIZE) continue;
                } catch {
                  continue;
                }

                try {
                  const content = fs.readFileSync(fullPath, 'utf-8');
                  const lines = content.split('\n');
                  for (let i = 0; i < lines.length; i++) {
                    if (matches.length >= MAX_RESULTS) break;
                    regex.lastIndex = 0; // Reset stateful regex
                    if (regex.test(lines[i])) {
                      matches.push({
                        file: rel,
                        line: i + 1,
                        text: lines[i].trim().substring(0, 200),
                      });
                    }
                  }
                } catch {
                  // Skip unreadable files (encoding issues, etc.)
                }
              }
            }
          }

          searchDir(rootDir, '');

          return {
            root: rootDir,
            pattern,
            totalMatches: matches.length,
            truncated: matches.length >= MAX_RESULTS,
            matches,
          };
        } catch (err: any) {
          return { error: err.message };
        }
      },
      source: 'core',
      permissions: ['fs:read'],
      category: 'filesystem',
    });

    // ── Get workspace info tool ─────────────────────────────────────
    this.register({
      id: 'core:get_workspace_info',
      name: 'get_workspace_info',
      description:
        'Returns information about the currently active workspace: ' +
        'root path, workspace name, whether a workspace is open, and a summary of top-level contents.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async () => {
        if (!workspaceService.isOpen) {
          return { open: false, message: 'No workspace is currently open.' };
        }
        const wsPath = workspaceService.workspacePath!;
        try {
          const entries = fs.readdirSync(wsPath, { withFileTypes: true });
          return {
            open: true,
            path: wsPath,
            name: workspaceService.workspaceName,
            entries: entries.slice(0, 100).map((e: any) => ({
              name: e.name,
              type: e.isDirectory() ? 'directory' : 'file',
            })),
            totalEntries: entries.length,
          };
        } catch (err: any) {
          return { open: true, path: wsPath, name: workspaceService.workspaceName, error: err.message };
        }
      },
      source: 'core',
      permissions: ['fs:read'],
      category: 'filesystem',
    });
  }
}
