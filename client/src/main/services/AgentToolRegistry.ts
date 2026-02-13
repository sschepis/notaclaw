/**
 * AgentToolRegistry — Centralized tool registry for Resonant Agents.
 *
 * Replaces the inline tool construction scattered across AgentTaskRunner
 * and PersonalityManager. Tools are registered once, then filtered per-agent
 * based on that agent's declared capabilities and permissions.
 */

import { ToolDefinition } from './prompt-engine/types';
import { ToolRegistration, ResonantAgent } from '../../shared/resonant-agent-types';

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
   */
  registerCoreTools(): void {
    const { exec } = require('child_process');
    const fs = require('fs');
    const pathModule = require('path');

    // Shell tool
    this.register({
      id: 'core:shell',
      name: 'shell',
      description: 'Execute a shell command and return its output.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute' },
        },
        required: ['command'],
      },
      handler: async ({ command }: { command: string }) => {
        return new Promise((resolve) => {
          exec(command, { cwd: process.cwd(), timeout: 30000 }, (error: any, stdout: string, stderr: string) => {
            resolve({
              stdout: stdout?.substring(0, 5000),
              stderr: stderr?.substring(0, 2000),
              exitCode: error ? error.code : 0,
              error: error ? error.message : null,
            });
          });
        });
      },
      source: 'core',
      permissions: ['shell'],
      category: 'shell',
    });

    // File read tool
    this.register({
      id: 'core:read_file',
      name: 'read_file',
      description: 'Read the contents of a file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to read' },
        },
        required: ['path'],
      },
      handler: async ({ path: filePath }: { path: string }) => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          return { content: content.substring(0, 10000) };
        } catch (err: any) {
          return { error: err.message };
        }
      },
      source: 'core',
      permissions: ['fs:read'],
      category: 'filesystem',
    });

    // File write tool
    this.register({
      id: 'core:write_file',
      name: 'write_file',
      description: 'Write content to a file. Creates the file if it does not exist.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to write' },
          content: { type: 'string', description: 'Content to write to the file' },
        },
        required: ['path', 'content'],
      },
      handler: async ({ path: filePath, content }: { path: string; content: string }) => {
        try {
          const dir = pathModule.dirname(filePath);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, content, 'utf-8');
          return { success: true, path: filePath };
        } catch (err: any) {
          return { error: err.message };
        }
      },
      source: 'core',
      permissions: ['fs:write'],
      category: 'filesystem',
    });

    // List directory tool
    this.register({
      id: 'core:list_directory',
      name: 'list_directory',
      description: 'List files and directories at a given path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path to list' },
        },
        required: ['path'],
      },
      handler: async ({ path: dirPath }: { path: string }) => {
        try {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          return {
            entries: entries.map((e: any) => ({
              name: e.name,
              type: e.isDirectory() ? 'directory' : 'file',
            })),
          };
        } catch (err: any) {
          return { error: err.message };
        }
      },
      source: 'core',
      permissions: ['fs:read'],
      category: 'filesystem',
    });
  }
}
