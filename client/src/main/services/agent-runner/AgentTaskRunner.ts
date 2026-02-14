/**
 * AgentTaskRunner - Main process service that orchestrates agentic tasks.
 * 
 * Responsibilities:
 * - Task lifecycle management (create, cancel, track)
 * - Wiring up dependencies for the AgentLoop
 * - IPC event emission
 * - User response resolution for ask_user
 * 
 * This service is instantiated once in services-setup.ts and exposed via IPC.
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { AgentTask, AgentTaskStatus } from '../../../shared/agent-types';
import { AIProviderManager } from '../AIProviderManager';
import { PersonalityManager } from '../PersonalityManager';
import { ConversationManager } from '../ConversationManager';
import { AlephNetClient } from '../AlephNetClient';
import { AgentToolRegistry } from '../AgentToolRegistry';
import { ToolDefinition } from '../prompt-engine/types';
import { AgentLoopConfig, AgentLoopDeps, AgentStepResult, AIMessage, DEFAULT_LOOP_CONFIG } from './types';
import { withRetry, withTimeout, DEFAULT_RETRY_CONFIG, TIMEOUT_DEFAULTS } from '../../../shared/utils/retry';
import { buildAgenticSystemPrompt, buildInitialMessages, buildUIContextSection } from './AgentContextBuilder';
import { buildFullToolkit } from './AgentToolkit';
import { buildMemoryTools } from './MemoryTools';
import { buildUITools } from './UIContextTools';
import { buildPromptTemplateTools, listPromptTemplateFiles } from './PromptTemplateTools';
import { buildConversationHistoryTools } from './ConversationHistoryTools';
import { runAgentLoop } from './AgentLoop';
import { UIContextSnapshot } from '../../../shared/ui-context-types';
import { loadPromptChain, buildChainSystemSection } from './PromptChainLoader';
import { configManager } from '../ConfigManager';

export class AgentTaskRunner extends EventEmitter {
  private aiManager: AIProviderManager;
  private personalityManager: PersonalityManager;
  private conversationManager: ConversationManager;
  private alephNetClient: AlephNetClient;
  private toolRegistry: AgentToolRegistry;

  /** Active tasks indexed by task ID */
  private activeTasks: Map<string, AgentTask> = new Map();

  /** AbortControllers indexed by task ID */
  private abortControllers: Map<string, AbortController> = new Map();

  /** Pending user response resolvers indexed by task ID */
  private userResponseResolvers: Map<string, (response: string) => void> = new Map();

  /** Loop configuration */
  private config: AgentLoopConfig = DEFAULT_LOOP_CONFIG;

  /** IPC bridge for querying the renderer process */
  private invokeRenderer: ((channel: string, data?: any) => Promise<any>) | null = null;

  constructor(
    aiManager: AIProviderManager,
    personalityManager: PersonalityManager,
    conversationManager: ConversationManager,
    alephNetClient: AlephNetClient,
    toolRegistry: AgentToolRegistry
  ) {
    super();
    this.aiManager = aiManager;
    this.personalityManager = personalityManager;
    this.conversationManager = conversationManager;
    this.alephNetClient = alephNetClient;
    this.toolRegistry = toolRegistry;
  }

  /**
   * Set the IPC bridge for querying the renderer process.
   * Called from ipc-setup.ts after the main window is ready.
   */
  setInvokeRenderer(fn: (channel: string, data?: any) => Promise<any>): void {
    this.invokeRenderer = fn;
  }

  /**
   * Start a new agentic task for a conversation.
   * Returns the task ID immediately; the loop runs asynchronously.
   */
  async startTask(
    conversationId: string,
    userMessage: string,
    metadata: any
  ): Promise<string> {
    const taskId = randomUUID();
    const abortController = new AbortController();

    const task: AgentTask = {
      id: taskId,
      conversationId,
      status: 'running',
      originalPrompt: userMessage,
      scratchpad: [],
      stepCount: 0,
      startedAt: Date.now(),
    };

    this.activeTasks.set(taskId, task);
    this.abortControllers.set(taskId, abortController);

    // Emit initial status
    this.emitTaskUpdate(task);

    // Run the loop asynchronously — do NOT await
    this.executeLoop(task, metadata, abortController).catch((err) => {
      console.error(`[AgentTaskRunner] Unhandled loop error for task ${taskId}:`, err);
      task.status = 'error';
      task.errorMessage = err.message || String(err);
      task.endedAt = Date.now();
      this.emitTaskUpdate(task);
      this.cleanup(taskId);
    });

    return taskId;
  }

  /**
   * Stop a running task.
   */
  stopTask(taskId: string): void {
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
    }

    const task = this.activeTasks.get(taskId);
    if (task && !isTerminal(task.status)) {
      task.status = 'cancelled';
      task.endedAt = Date.now();
      this.emitTaskUpdate(task);
      this.cleanup(taskId);
    }

    // Also resolve any pending user response with empty string to unblock
    const resolver = this.userResponseResolvers.get(taskId);
    if (resolver) {
      resolver('');
      this.userResponseResolvers.delete(taskId);
    }
  }

  /**
   * Provide a user response to an ask_user question.
   */
  resolveUserResponse(taskId: string, response: string): void {
    const resolver = this.userResponseResolvers.get(taskId);
    if (resolver) {
      resolver(response);
      this.userResponseResolvers.delete(taskId);
    } else {
      console.warn(`[AgentTaskRunner] No pending user response resolver for task ${taskId}`);
    }
  }

  /**
   * Get the current state of a task.
   */
  getTask(taskId: string): AgentTask | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * Get the active task for a conversation, if any.
   */
  getActiveTaskForConversation(conversationId: string): AgentTask | undefined {
    for (const task of this.activeTasks.values()) {
      if (task.conversationId === conversationId && !isTerminal(task.status)) {
        return task;
      }
    }
    return undefined;
  }

  /**
   * Check if a conversation has an active (non-terminal) task.
   */
  hasActiveTask(conversationId: string): boolean {
    return this.getActiveTaskForConversation(conversationId) !== undefined;
  }

  /**
   * Shutdown all running tasks.
   */
  shutdown(): void {
    for (const [taskId] of this.activeTasks) {
      this.stopTask(taskId);
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────

  /**
   * Generate a quick initial plan/acknowledgement.
   */
  private async generatePlan(
    task: AgentTask,
    metadata: any,
    systemPrompt: string
  ): Promise<string> {
    const planningPrompt = `
You are an AI assistant about to start a task.
User Request: "${task.originalPrompt}"

Briefly acknowledge the request and outline your plan in 1-2 sentences.
Do NOT execute tools yet. Just state what you are going to do.
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: planningPrompt }
    ];

    // Convert to provider format
    const providerMessages = messages.map(m => ({
      role: m.role as any,
      content: m.content
    }));

    const result = await this.aiManager.processChatRequest(
      providerMessages,
      [], // No tools for planning phase
      {
        contentType: metadata.contentType || 'agent',
        providerId: metadata.providerId,
        model: metadata.model,
        temperature: 0.7,
        maxTokens: 500,
      }
    );

    return result.content || "I will start working on your request immediately.";
  }

  private async executeLoop(
    task: AgentTask,
    metadata: any,
    abortController: AbortController
  ): Promise<void> {
    try {
      // 1. Build personality system prompt
      const systemPrompt = await this.getSystemPrompt(task, metadata);

      // 1.0.5. Process attachments from metadata into the user message
      let enrichedUserMessage = task.originalPrompt;
      if (metadata.attachments && Array.isArray(metadata.attachments) && metadata.attachments.length > 0) {
        const attachmentParts: string[] = [];
        for (const att of metadata.attachments) {
          if (att.content) {
            // Text/document/file attachments — inline their content
            attachmentParts.push(
              `--- Attached file: ${att.name} ---\n${att.content}\n--- End of ${att.name} ---`
            );
          } else if (att.type === 'image' && att.dataUrl) {
            // For images, note their presence (the AI can't see raw base64 in text context,
            // but the user should know the attachment was acknowledged)
            attachmentParts.push(`[Image attached: ${att.name}]`);
          }
        }
        if (attachmentParts.length > 0) {
          enrichedUserMessage = enrichedUserMessage + '\n\n' + attachmentParts.join('\n\n');
        }
        console.log(`[AgentTaskRunner] Processed ${metadata.attachments.length} attachment(s) into user message`);
      }

      // 1.1. Load default prompt chain (if configured)
      let chainContext = '';
      const defaultChainName = configManager.getDefaultPromptChain();
      if (defaultChainName) {
        try {
          const chain = loadPromptChain(defaultChainName);
          if (chain) {
            chainContext = buildChainSystemSection(chain);
            console.log(`[AgentTaskRunner] Loaded default chain: ${chain.meta._name || defaultChainName}`);
          } else {
            console.warn(`[AgentTaskRunner] Default chain "${defaultChainName}" not found — proceeding without it`);
          }
        } catch (err) {
          console.warn('[AgentTaskRunner] Failed to load default chain (non-fatal):', err);
        }
      }
      
      // 1.5. Planning Phase (Immediate Response) — with retry for timeout resilience
      let plan = '';
      try {
        plan = await withRetry(
          () => this.generatePlan(task, metadata, systemPrompt),
          { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 },
          {
            operationName: 'generatePlan',
            onRetry: (attempt, error) => {
              console.warn(`[AgentTaskRunner] Planning phase failed (attempt ${attempt}), retrying...`, error.message);
            }
          }
        );
        await this.sendAgentMessage(task.conversationId, plan, task.id, 0, { isPlan: true });
        
        // Add plan to scratchpad so it's recorded
        task.scratchpad.push(`Initial Plan: ${plan}`);
        this.emitTaskUpdate(task);
      } catch (err) {
        console.warn('[AgentTaskRunner] Planning phase failed after retries, proceeding to loop:', err);
      }

      const agenticPrompt = buildAgenticSystemPrompt(systemPrompt);

      // 2. Get situational context from memory
      const situationalContext = await this.getSituationalContext(
        task.conversationId,
        task.originalPrompt
      );

      // 2.5. Gather UI context snapshot (non-fatal)
      let uiContextSection = '';
      if (this.invokeRenderer) {
        try {
          const uiSnapshot: UIContextSnapshot = await this.invokeRenderer('ui:getContext');
          if (uiSnapshot) {
            // Enrich with prompt template filenames from main-process filesystem
            // (renderer can't access fs, so this field arrives empty from gatherUIContext)
            if (!uiSnapshot.promptTemplates || uiSnapshot.promptTemplates.length === 0) {
              try {
                uiSnapshot.promptTemplates = listPromptTemplateFiles();
              } catch {
                // Non-fatal: template listing may fail in some environments
              }
            }
            uiContextSection = buildUIContextSection(uiSnapshot);
          }
        } catch (err) {
          console.warn('[AgentTaskRunner] Failed to gather UI context (non-fatal):', err);
        }
      }

      // 3. Build initial messages (with chain context, UI context appended to situational context)
      //    Use enrichedUserMessage which includes inlined attachment content
      const fullContext = [situationalContext, chainContext, uiContextSection]
        .filter(Boolean)
        .join('\n\n');
      const initialMessages = buildInitialMessages(
        agenticPrompt,
        enrichedUserMessage,
        fullContext || undefined
      );
      
      // Inject the plan into the history so the agent knows what it promised
      if (plan) {
         initialMessages.push({ role: 'assistant', content: plan });
      }

      // 4. Build tools (control + personality tools + memory tools + conversation history + UI tools)
      const personalityTools = this.getPersonalityTools(task.conversationId, metadata);
      const memoryTools = buildMemoryTools(this.alephNetClient, task.conversationId);
      const conversationHistoryTools = buildConversationHistoryTools(this.conversationManager, task.conversationId);
      const uiTools = this.buildUIAndPromptTools();
      const allTools = buildFullToolkit(personalityTools, [...memoryTools, ...conversationHistoryTools], uiTools);

      // 5. Build loop dependencies
      const deps: AgentLoopDeps = {
        callAI: (msgs, tools, meta, signal) =>
          this.callAI(msgs, tools, meta, signal),
        executeTool: (name, args, tools, signal) =>
          this.executeTool(name, args, tools, signal),
        sendMessage: (convId, content, msgMeta) =>
          this.sendAgentMessage(convId, content, task.id, task.stepCount, msgMeta),
        emitUpdate: (t) => this.emitTaskUpdate(t),
      };

      // 6. Run the loop
      await runAgentLoop(
        task,
        initialMessages,
        allTools,
        metadata,
        abortController.signal,
        deps,
        this.config,
        (taskId) => this.waitForUserResponse(taskId)
      );
    } finally {
      this.cleanup(task.id);
    }
  }

  /**
   * Get the system prompt for this conversation/personality.
   * Reuses PersonalityManager's prompt-building logic.
   */
  private async getSystemPrompt(task: AgentTask, metadata: any): Promise<string> {
    const conversationId = task.conversationId;
    let personalityId = metadata.personalityId;

    // Check if conversation has a personality set
    if (!personalityId && conversationId) {
      try {
        const conversation = await this.conversationManager.getConversation(conversationId);
        if (conversation && conversation.personalityId) {
          personalityId = conversation.personalityId;
        }
      } catch {
        // Ignore
      }
    }

    // Try explicit personality
    if (personalityId) {
      const personality = this.personalityManager.getPersonality(personalityId);
      if (personality) return personality.systemPrompt;
    }

    // Try auto-suggested personality
    const suggestion = this.personalityManager.suggestPersonality(task.originalPrompt);
    if (suggestion) return suggestion.systemPrompt;

    // Fall back to core personality from memory
    try {
      const coreField = await this.personalityManager.getCorePersonality();
      const coreFragments = await this.alephNetClient.memoryQuery({
        fieldId: coreField.id,
        query: '',
        limit: 50,
        threshold: 0.0,
      });
      const prompt = coreFragments.fragments
        .sort((a: any, b: any) => (b.significance || 0) - (a.significance || 0))
        .map((f: any) => f.content)
        .join('\n\n');
      if (prompt) return prompt;
    } catch {
      // Ignore memory errors
    }

    return 'You are a helpful AI assistant.';
  }

  /**
   * Get situational context from conversation memory.
   */
  private async getSituationalContext(conversationId: string, query: string): Promise<string> {
    return this.personalityManager.getSituationalContext(conversationId, query);
  }

  /**
   * Build personality tools for the agent.
   *
   * Resolves tools from the centralized AgentToolRegistry, optionally
   * filtering by the agent's declared capabilities when metadata is present.
   */
  private getPersonalityTools(_conversationId: string, metadata: any): ToolDefinition[] {
    // When metadata carries a ResonantAgent personality config,
    // resolve tools from the registry based on agent capabilities.
    if (metadata.agentId) {
      const agentPersonality = metadata.agentPersonality;
      const agentCaps = agentPersonality?.capabilities || metadata.capabilities;
      if (agentCaps) {
        // Build a minimal ResonantAgent-like object for getToolsForAgent
        const agentLike = {
          id: metadata.agentId,
          name: metadata.agentName || 'agent',
          capabilities: {
            tools: agentCaps.tools || ['shell', 'read_file', 'write_file', 'list_directory'],
            permissions: agentCaps.permissions || ['fs:read', 'fs:write', 'shell'],
            maxSteps: agentCaps.maxSteps || 50,
            maxDurationMs: agentCaps.maxDurationMs || 30 * 60 * 1000,
          },
        };
        return this.toolRegistry.getToolsForAgent(agentLike as any);
      }
    }

    // No agent-specific filtering — return all registered tools.
    const allRegs = this.toolRegistry.listAll();
    return allRegs.map(reg => ({
      type: 'function' as const,
      function: {
        name: reg.name,
        description: reg.description,
        parameters: reg.parameters as { type: string; properties: Record<string, any>; required: string[] },
        script: this.toolRegistry.getByName(reg.name)?.handler,
      },
    }));
  }

  /**
   * Build UI context tools and prompt template tools.
   * Requires invokeRenderer for the UI tools; prompt template tools work on FS.
   */
  private buildUIAndPromptTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];

    // UI interaction tools (need renderer bridge)
    if (this.invokeRenderer) {
      tools.push(...buildUITools(this.invokeRenderer));
    }

    // Prompt template tools (filesystem-only, always available)
    const commandInterface = this.personalityManager
      ? (this.personalityManager as any).commandInterface ?? null
      : null;
    tools.push(...buildPromptTemplateTools(commandInterface));

    return tools;
  }

  /**
   * Call the AI provider with messages and tools.
   */
  private async callAI(
    messages: AIMessage[],
    tools: ToolDefinition[],
    metadata: any,
    _signal: AbortSignal
  ): Promise<AgentStepResult> {
    // Convert our AIMessage format to what processChatRequest expects
    const providerMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      ...(m.toolName ? { name: m.toolName } : {}),
    }));

    // Actually pass all tools — the AI needs to see control tools too
    const toolDefs = tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters || { type: 'object', properties: {} },
      },
    }));

    const response = await this.aiManager.processChatRequest(
      providerMessages,
      toolDefs,
      {
        contentType: metadata.contentType || 'agent',
        providerId: metadata.providerId,
        model: metadata.model,
        temperature: metadata.temperature ?? 0.7,
        maxTokens: metadata.maxTokens ?? 4096,
        timeoutMs: this.config.aiTimeoutMs,
      }
    );

    // Parse tool calls from response
    const toolCalls = (response.toolCalls || []).map((tc: any) => ({
      id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: tc.function?.name || tc.name,
      args: typeof tc.function?.arguments === 'string'
        ? JSON.parse(tc.function.arguments)
        : tc.function?.arguments || tc.args || {},
    }));

    return {
      text: response.content || '',
      toolCalls,
      raw: response,
    };
  }

  /**
   * Execute a tool by name, with timeout enforcement.
   */
  private async executeTool(
    toolName: string,
    args: Record<string, any>,
    tools: ToolDefinition[],
    _signal: AbortSignal
  ): Promise<any> {
    const toolDef = tools.find((t) => t.function.name === toolName);
    if (!toolDef) {
      return { error: `Tool "${toolName}" not found` };
    }
    if (!toolDef.function.script) {
      return { error: `Tool "${toolName}" has no implementation` };
    }

    console.log(`[AgentTaskRunner] Executing tool: ${toolName}`, JSON.stringify(args).substring(0, 200));

    try {
      const toolTimeoutMs = this.config.toolTimeoutMs || TIMEOUT_DEFAULTS.tool;
      const result = await withTimeout(
        toolDef.function.script(args, {} as any),
        toolTimeoutMs,
        `Tool ${toolName}`
      );
      console.log(`[AgentTaskRunner] Tool ${toolName} result:`, JSON.stringify(result)?.substring(0, 300));
      return result;
    } catch (err: any) {
      console.error(`[AgentTaskRunner] Tool ${toolName} error:`, err);
      return { error: err.message || String(err) };
    }
  }

  /**
   * Send an agent message to the conversation.
   * Persists via ConversationManager and emits IPC event.
   */
  private async sendAgentMessage(
    conversationId: string,
    content: string,
    taskId: string,
    stepNumber: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const messageId = randomUUID();
    const timestamp = Date.now();

    // Persist to conversation
    try {
      await this.conversationManager.addMessage(conversationId, {
        id: messageId,
        role: 'assistant',
        content,
        timestamp,
      });
    } catch (err) {
      console.error('[AgentTaskRunner] Failed to persist agent message:', err);
    }

    // Emit event for IPC forwarding to renderer
    this.emit('taskMessage', {
      taskId,
      conversationId,
      message: {
        id: messageId,
        content,
        type: 'cognitive',
        sender: 'agent',
        timestamp: new Date(timestamp).toISOString(),
        metadata: {
          agentTaskId: taskId,
          stepNumber,
          ...metadata,
        },
      },
    });
  }

  /**
   * Emit a task update event.
   */
  private emitTaskUpdate(task: AgentTask): void {
    this.emit('taskUpdate', { task: { ...task } });
  }

  /**
   * Wait for a user response. Returns a promise that resolves when
   * resolveUserResponse() is called for this task.
   */
  private waitForUserResponse(taskId: string): Promise<string> {
    return new Promise<string>((resolve) => {
      this.userResponseResolvers.set(taskId, resolve);
    });
  }

  /**
   * Clean up resources for a completed/cancelled/errored task.
   */
  private cleanup(taskId: string): void {
    this.abortControllers.delete(taskId);
    this.userResponseResolvers.delete(taskId);
    // Keep the task in activeTasks for a while so getTask still works
    // Could add a TTL-based cleanup later
    const task = this.activeTasks.get(taskId);
    if (task && isTerminal(task.status)) {
      // Remove after 5 minutes
      setTimeout(() => {
        this.activeTasks.delete(taskId);
      }, 5 * 60 * 1000);
    }
  }
}

/** Check if a task status is terminal (no more state transitions possible) */
function isTerminal(status: AgentTaskStatus): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'error';
}
