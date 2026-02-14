/**
 * SoftwareFactoryService — Core service that integrates the Software Factory
 * prompt chain as a first-class component of Aleph.
 *
 * This service:
 * 1. Loads and parses the software-factory.json chain at startup
 * 2. Compiles all string-based tool scripts into live executable functions
 * 3. Registers compiled tools into the AgentToolRegistry so the agent loop
 *    can use them alongside core tools (shell, read_file, etc.)
 * 4. Exposes the chain's prompt structure for system prompt injection
 * 5. Provides a WorkflowEngine runner for full DAG execution when needed
 *
 * The chain's tools (callStructuredPrompt, completeWithFunction, etc.) enable
 * the agent to recursively invoke sub-prompts and decompose complex tasks —
 * the "brain" of the system.
 */

import { EventEmitter } from 'events';
import { loadPromptChain, buildChainSystemSection, ParsedPromptChain, ChainToolDef } from './agent-runner/PromptChainLoader';
import { AgentToolRegistry } from './AgentToolRegistry';
import { AIProviderManager } from './AIProviderManager';
import { ToolDefinition } from './prompt-engine/types';
import { AgentPermission } from '../../shared/resonant-agent-types';

/**
 * Cache for compiled script functions to avoid re-compiling on every invocation.
 */
const compiledScriptCache = new Map<string, (parameters: any, context: any) => Promise<any>>();

/**
 * Compile a string-form script from a JSON chain tool definition into a callable function.
 *
 * Scripts are stored as arrow function strings, e.g.:
 *   "async ({ command }, context) => { ... }"
 *
 * The `require` global is passed into the compilation sandbox so tools can
 * import Node.js built-in modules (e.g., `child_process`).
 */
function compileToolScript(scriptSource: string): (parameters: any, context: any) => Promise<any> {
  const cached = compiledScriptCache.get(scriptSource);
  if (cached) return cached;

  const factory = new Function('require', `"use strict"; return (${scriptSource});`);
  const compiled = factory(require);

  if (typeof compiled !== 'function') {
    throw new Error(`Compiled script is not a function (got ${typeof compiled})`);
  }

  compiledScriptCache.set(scriptSource, compiled);
  return compiled;
}

export class SoftwareFactoryService extends EventEmitter {
  private chain: ParsedPromptChain | null = null;
  private compiledTools: Map<string, ToolDefinition> = new Map();
  private toolRegistry: AgentToolRegistry;
  private aiManager: AIProviderManager;
  private initialized = false;

  constructor(toolRegistry: AgentToolRegistry, aiManager: AIProviderManager) {
    super();
    this.toolRegistry = toolRegistry;
    this.aiManager = aiManager;
  }

  /**
   * Initialize the service: load chain, compile tools, register in AgentToolRegistry.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1. Load the chain
      this.chain = loadPromptChain('software-factory');
      if (!this.chain) {
        console.warn('[SoftwareFactoryService] Chain file "software-factory.json" not found — service disabled');
        return;
      }

      console.log(
        `[SoftwareFactoryService] Loaded chain: ${this.chain.meta._name || 'software-factory'} ` +
        `(${this.chain.prompts.length} prompts, ${this.chain.tools.length} tools)`
      );

      // 2. Compile and register tools
      this.compileAndRegisterTools();

      this.initialized = true;
      this.emit('initialized', {
        promptCount: this.chain.prompts.length,
        toolCount: this.compiledTools.size,
      });

      console.log(`[SoftwareFactoryService] Registered ${this.compiledTools.size} tools into AgentToolRegistry`);
    } catch (error: any) {
      console.error('[SoftwareFactoryService] Initialization failed:', error.message);
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Get the loaded chain (for system prompt injection, visualization, etc.)
   */
  getChain(): ParsedPromptChain | null {
    return this.chain;
  }

  /**
   * Build the system prompt section describing the chain's capabilities.
   * Injected into the agent's context so it knows about available sub-prompts.
   */
  getSystemPromptSection(): string {
    if (!this.chain) return '';
    return buildChainSystemSection(this.chain);
  }

  /**
   * Get a compiled tool by name (for direct invocation outside the agent loop).
   */
  getCompiledTool(name: string): ToolDefinition | undefined {
    return this.compiledTools.get(name);
  }

  /**
   * Check if the service is initialized and has a loaded chain.
   */
  isReady(): boolean {
    return this.initialized && this.chain !== null;
  }

  /**
   * Get the list of prompt names available in the chain.
   */
  getPromptNames(): string[] {
    return this.chain?.prompts.map(p => p.name) || [];
  }

  /**
   * Get a specific prompt definition by name.
   */
  getPrompt(name: string) {
    return this.chain?.prompts.find(p => p.name === name) || null;
  }

  // ─── Private ────────────────────────────────────────────────────────────

  /**
   * Compile all tool scripts from the chain and register them in AgentToolRegistry.
   */
  private compileAndRegisterTools(): void {
    if (!this.chain) return;

    for (const chainTool of this.chain.tools) {
      try {
        const toolDef = this.compileChainTool(chainTool);
        this.compiledTools.set(chainTool.function.name, toolDef);

        // Register in AgentToolRegistry so the agent loop can use it.
        // The handler signature expects (args) => Promise<any>, which our
        // wrapped compiledFn already provides (context is captured in closure).
        const handler = toolDef.function.script!;
        this.toolRegistry.register({
          id: `software-factory:${chainTool.function.name}`,
          name: chainTool.function.name,
          description: chainTool.function.description || `Software Factory tool: ${chainTool.function.name}`,
          parameters: chainTool.function.parameters || {
            type: 'object',
            properties: {},
            required: [],
          },
          handler: (args: any) => handler(args, {} as any),
          source: 'core' as const,
          permissions: this.getToolPermissions(chainTool.function.name),
          category: 'custom' as const,
        });
      } catch (error: any) {
        console.error(
          `[SoftwareFactoryService] Failed to compile tool "${chainTool.function.name}":`,
          error.message
        );
      }
    }
  }

  /**
   * Compile a single chain tool definition into a ToolDefinition with a live script.
   */
  private compileChainTool(chainTool: ChainToolDef): ToolDefinition {
    let handler: ((parameters: any, context: any) => Promise<any>) | undefined;

    if (chainTool.function.script) {
      // Compile the string script into a live function
      const compiledFn = compileToolScript(chainTool.function.script);

      // Wrap the compiled function to inject a proper execution context
      // that bridges the AgentToolRegistry handler signature (single args object)
      // with the chain's expected signature (parameters, context)
      handler = async (args: any) => {
        // Build a context similar to what WorkflowEngine provides
        const context: Record<string, any> = {
          require,
          // State management — provide a simple in-memory state object
          // that tools can read/write during a single agent session
          state: this.getSessionState(),
          // Tools registry — allows tools to call other tools by name
          tools: this.buildToolFunctions(),
          // Runner — enables callStructuredPrompt to invoke sub-prompts
          runner: this.buildRunnerProxy(),
        };

        return compiledFn(args, context);
      };
    }

    return {
      type: 'function',
      function: {
        name: chainTool.function.name,
        description: chainTool.function.description,
        parameters: (chainTool.function.parameters as any) || {
          type: 'object',
          properties: {},
          required: [],
        },
        script: handler,
      },
    };
  }

  /**
   * Build a map of tool functions for cross-tool invocation.
   * This allows tools like completeWithFunction to call other tools by name.
   */
  private buildToolFunctions(): Record<string, (args: any) => Promise<any>> {
    const fns: Record<string, (args: any) => Promise<any>> = {};

    // Include all compiled software-factory tools
    for (const [name, toolDef] of this.compiledTools) {
      if (toolDef.function.script) {
        fns[name] = (args: any) => toolDef.function.script!(args, {} as any);
      }
    }

    // Include core tools from the registry
    const coreTools = this.toolRegistry.getToolsByCategory('filesystem');
    const shellTools = this.toolRegistry.getToolsByCategory('shell');
    for (const reg of [...coreTools, ...shellTools]) {
      fns[reg.name] = reg.handler;
    }

    return fns;
  }

  /**
   * Build a runner proxy that enables callStructuredPrompt to invoke sub-prompts.
   * This creates a simplified runner that can execute prompts from the chain
   * using the AI provider.
   */
  private buildRunnerProxy(): { run: (promptName: string, args: any) => Promise<any> } {
    return {
      run: async (promptName: string, args: any) => {
        if (!this.chain) {
          throw new Error('Software Factory chain not loaded');
        }

        const prompt = this.chain.prompts.find(p => p.name === promptName);
        if (!prompt) {
          throw new Error(
            `Prompt "${promptName}" not found. Available: ${this.chain.prompts.map(p => p.name).join(', ')}`
          );
        }

        // Build messages from the prompt template
        const systemMessage = this.interpolateTemplate(prompt.system, args);
        const userMessage = this.interpolateTemplate(prompt.user, args);

        const messages = [
          { role: 'system' as const, content: systemMessage },
          { role: 'user' as const, content: userMessage },
        ];

        // Get available tools for this prompt
        const toolDefs = (prompt.tools || [])
          .map(toolRef => {
            if (typeof toolRef === 'string') {
              const toolDef = this.compiledTools.get(toolRef);
              if (!toolDef) return null;
              return {
                type: 'function' as const,
                function: {
                  name: toolDef.function.name,
                  description: toolDef.function.description,
                  parameters: toolDef.function.parameters || { type: 'object', properties: {} },
                },
              };
            }
            return null;
          })
          .filter(Boolean);

        // Call AI with the prompt
        const response = await this.aiManager.processChatRequest(
          messages,
          toolDefs as any[],
          {
            contentType: 'agent',
            temperature: 0.7,
            maxTokens: 4096,
          }
        );

        // Process tool calls if any
        if (response.toolCalls && response.toolCalls.length > 0) {
          const toolCall = response.toolCalls[0];
          const toolName = toolCall.function?.name || toolCall.name;
          const toolArgs = typeof toolCall.function?.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function?.arguments || toolCall.args || {};

          const tool = this.compiledTools.get(toolName);
          if (tool && tool.function.script) {
            return tool.function.script(toolArgs, {} as any);
          }
        }

        // Parse JSON response
        if (response.content) {
          try {
            let contentStr = response.content.trim();
            if (contentStr.startsWith('```json')) {
              contentStr = contentStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (contentStr.startsWith('```')) {
              contentStr = contentStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            return JSON.parse(contentStr);
          } catch {
            return { response: response.content };
          }
        }

        return { response: 'No response generated' };
      },
    };
  }

  /**
   * Simple template interpolation for prompt templates.
   * Replaces {key} and {state.key} patterns with values from args.
   */
  private interpolateTemplate(template: string, args: Record<string, any>): string {
    return template.replace(/\{([\w.]+)\}/g, (match, key) => {
      // Try direct key lookup
      if (key in args) {
        const val = args[key];
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
      }

      // Try nested lookup (e.g., state.primaryTask)
      const parts = key.split('.');
      let current: any = args;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return match; // Keep original if not found
        }
      }
      return typeof current === 'object' ? JSON.stringify(current) : String(current);
    });
  }

  /**
   * Get/create the session state object for tool execution.
   * This is a simple in-memory state that persists across tool calls
   * within a single agent session.
   */
  private sessionState: SessionState | null = null;

  private getSessionState(): SessionState {
    if (!this.sessionState) {
      this.sessionState = new SessionState();
    }
    return this.sessionState;
  }

  /**
   * Reset the session state (e.g., between agent tasks).
   */
  resetSession(): void {
    this.sessionState = null;
  }

  /**
   * Determine what permissions a tool requires based on its name.
   */
  private getToolPermissions(toolName: string): AgentPermission[] {
    switch (toolName) {
      case 'executeBash':
        return ['shell' as AgentPermission];
      case 'callStructuredPrompt':
      case 'completeWithFunction':
      case 'completeTask':
      case 'respond':
        return []; // These are agent-internal, no OS permissions needed
      case 'getState':
      case 'setState':
      case 'listStateKeys':
        return []; // State management is internal
      default:
        return [];
    }
  }
}

/**
 * Simple in-memory state object that provides .get(), .set(), .getAll()
 * methods matching the WorkflowState API that chain tool scripts expect.
 */
class SessionState {
  private data: Record<string, any> = {};

  get(key: string): any {
    return this.data[key];
  }

  set(key: string, value: any): void {
    this.data[key] = value;
  }

  getAll(): Record<string, any> {
    return { ...this.data };
  }

  update(newState: Record<string, any>): void {
    Object.assign(this.data, newState);
  }
}
