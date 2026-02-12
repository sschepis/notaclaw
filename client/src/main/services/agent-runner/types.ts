/**
 * Internal types for the agent-runner module.
 * Separated from shared/agent-types.ts because these types are
 * only used within the main process agent loop.
 */

import { ToolDefinition } from '../prompt-engine/types';
import { AgentTask } from '../../../shared/agent-types';

/** Configuration for the agent loop */
export interface AgentLoopConfig {
  /** Maximum number of AI call steps before forced termination */
  maxSteps: number;
  /** Minimum delay (ms) between AI calls to avoid rate-limiting */
  stepDelayMs: number;
  /** Maximum total duration (ms) before forced termination. 0 = no limit */
  maxDurationMs: number;
  /** Per-request timeout (ms) for AI provider calls. Default: 180s (agent context) */
  aiTimeoutMs: number;
  /** Per-execution timeout (ms) for tool scripts. Default: 60s */
  toolTimeoutMs: number;
}

export const DEFAULT_LOOP_CONFIG: AgentLoopConfig = {
  maxSteps: 50,
  stepDelayMs: 500,
  maxDurationMs: 30 * 60 * 1000, // 30 minutes
  aiTimeoutMs: 180_000,           // 3 minutes per AI call (agent tasks can be long)
  toolTimeoutMs: 60_000,          // 1 minute per tool execution
};

/** Result from a single AI call in the agentic loop */
export interface AgentStepResult {
  /** Text content from the AI response (may be empty if only tool calls) */
  text: string;
  /** Tool calls requested by the AI */
  toolCalls: AgentToolCall[];
  /** Raw provider response */
  raw?: any;
}

/** A tool call parsed from the AI response */
export interface AgentToolCall {
  /** Provider-assigned call ID */
  id: string;
  /** Tool function name */
  name: string;
  /** Parsed arguments */
  args: Record<string, any>;
}

/** Callback type for emitting task updates to the outside world */
export type TaskUpdateEmitter = (task: AgentTask) => void;

/** Callback type for sending messages to the conversation */
export type MessageSender = (
  conversationId: string,
  content: string,
  metadata?: Record<string, any>
) => Promise<void>;

/** Dependencies injected into the agent loop */
export interface AgentLoopDeps {
  /** Function to call the AI provider with messages and tools */
  callAI: (
    messages: AIMessage[],
    tools: ToolDefinition[],
    metadata: any,
    signal: AbortSignal
  ) => Promise<AgentStepResult>;

  /** Function to execute a tool by name */
  executeTool: (
    toolName: string,
    args: Record<string, any>,
    tools: ToolDefinition[],
    signal: AbortSignal
  ) => Promise<any>;

  /** Send a message to the conversation */
  sendMessage: MessageSender;

  /** Emit task status updates */
  emitUpdate: TaskUpdateEmitter;
}

/** Simple AI message format for the agent loop context */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** For tool result messages */
  toolCallId?: string;
  toolName?: string;
}
