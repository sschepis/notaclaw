/**
 * AgentLoop - The core agentic execution loop.
 * 
 * This is a pure function that runs the agent loop given dependencies.
 * It does NOT manage task storage or IPC — those are handled by AgentTaskRunner.
 * 
 * The loop:
 * 1. Calls AI with conversation context + tools
 * 2. Processes tool calls (control tools change state, regular tools execute)
 * 3. Sends incremental messages to the user
 * 4. Repeats until task_complete, cancellation, or step limit
 */

import { AgentTask } from '../../../shared/agent-types';
import { ToolDefinition } from '../prompt-engine/types';
import { withRetry, AGENT_RETRY_CONFIG } from '../../../shared/utils/retry';
import {
  AgentLoopConfig,
  AgentLoopDeps,
  AgentToolCall,
  AIMessage,
  DEFAULT_LOOP_CONFIG,
} from './types';
import {
  appendAssistantMessage,
  appendToolResult,
  appendUserResponse,
} from './AgentContextBuilder';
import { CONTROL_TOOL_NAMES } from './AgentToolkit';

/**
 * Run the agentic loop. This is the heart of the system.
 * 
 * @param task - Mutable task object (status fields are updated in place)
 * @param messages - Initial message history (system + user)
 * @param tools - Full toolkit (control + personality tools)
 * @param metadata - AI provider metadata (model, providerId, etc.)
 * @param signal - AbortSignal for cancellation
 * @param deps - Injected dependencies
 * @param config - Loop configuration
 * @param waitForUser - Async function that resolves when user responds to ask_user
 */
export async function runAgentLoop(
  task: AgentTask,
  messages: AIMessage[],
  tools: ToolDefinition[],
  metadata: any,
  signal: AbortSignal,
  deps: AgentLoopDeps,
  config: AgentLoopConfig = DEFAULT_LOOP_CONFIG,
  waitForUser: (taskId: string) => Promise<string>
): Promise<void> {
  const startTime = Date.now();
  let currentMessages = messages;

  while (task.stepCount < config.maxSteps) {
    // ── Check cancellation ────────────────────────────────────────────
    if (signal.aborted) {
      task.status = 'cancelled';
      task.endedAt = Date.now();
      deps.emitUpdate(task);
      return;
    }

    // ── Check duration limit ──────────────────────────────────────────
    if (config.maxDurationMs > 0 && Date.now() - startTime > config.maxDurationMs) {
      await deps.sendMessage(
        task.conversationId,
        'I have reached the maximum time limit for this task. Here is where I stopped.',
        { agentTaskId: task.id, isCompletion: true }
      );
      task.status = 'completed';
      task.endedAt = Date.now();
      deps.emitUpdate(task);
      return;
    }

    // ── Step: Call AI ─────────────────────────────────────────────────
    task.status = 'thinking';
    task.stepCount++;
    deps.emitUpdate(task);

    // Inject immediate memory if available
    let messagesForAI = currentMessages;
    if (task.immediateMemory) {
      messagesForAI = [
        ...currentMessages,
        { 
          role: 'system', 
          content: `IMMEDIATE MEMORY (for this step only): ${task.immediateMemory}` 
        }
      ];
      // Clear it after injection so it doesn't persist to next step unless set again
      task.immediateMemory = null;
    }

    let stepResult;
    try {
      stepResult = await withRetry(
        () => deps.callAI(messagesForAI, tools, metadata, signal),
        AGENT_RETRY_CONFIG,
        {
          operationName: 'callAI',
          onRetry: (attempt, error) => {
            console.warn(`[AgentLoop] callAI failed (attempt ${attempt}/${AGENT_RETRY_CONFIG.maxAttempts}), retrying...`, error.message || error);
            // Update task status to show we're retrying
            task.status = 'thinking';
            deps.emitUpdate(task);
          }
        }
      );
    } catch (err: any) {
      if (signal.aborted) {
        task.status = 'cancelled';
        task.endedAt = Date.now();
        deps.emitUpdate(task);
        return;
      }
      // Non-abort error: report and terminate
      task.status = 'error';
      task.errorMessage = err.message || String(err);
      task.endedAt = Date.now();
      deps.emitUpdate(task);
      await deps.sendMessage(
        task.conversationId,
        `I encountered an error: ${task.errorMessage}`,
        { agentTaskId: task.id, isError: true }
      );
      return;
    }

    if (signal.aborted) {
      task.status = 'cancelled';
      task.endedAt = Date.now();
      deps.emitUpdate(task);
      return;
    }

    // ── Process tool calls ────────────────────────────────────────────
    if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
      // If the AI also produced text, send it as a message first
      if (stepResult.text && stepResult.text.trim()) {
        await deps.sendMessage(task.conversationId, stepResult.text, {
          agentTaskId: task.id,
          stepNumber: task.stepCount,
        });
        currentMessages = appendAssistantMessage(currentMessages, stepResult.text);
      }

      // Process each tool call
      for (const toolCall of stepResult.toolCalls) {
        if (signal.aborted) {
          task.status = 'cancelled';
          task.endedAt = Date.now();
          deps.emitUpdate(task);
          return;
        }

        const handled = await handleToolCall(
          toolCall,
          task,
          tools,
          currentMessages,
          signal,
          deps,
          waitForUser
        );

        if (handled.terminate) {
          return; // Task is completed, cancelled, or errored
        }

        // Update messages with tool result
        currentMessages = handled.updatedMessages;
      }

      // After processing all tool calls, delay and continue loop
      await delay(config.stepDelayMs);
      continue;
    }

    // ── Text-only response ────────────────────────────────────────────
    if (stepResult.text && stepResult.text.trim()) {
      await deps.sendMessage(task.conversationId, stepResult.text, {
        agentTaskId: task.id,
        stepNumber: task.stepCount,
      });
      currentMessages = appendAssistantMessage(currentMessages, stepResult.text);
    }

    // The AI produced a text response but no tool calls.
    // This means the agent is "talking" but hasn't signaled completion.
    // We'll continue the loop — the agent must call task_complete to finish.
    // However, if it produced neither text nor tools, that's unusual — break to avoid spinning.
    if (!stepResult.text?.trim() && (!stepResult.toolCalls || stepResult.toolCalls.length === 0)) {
      console.warn('[AgentLoop] AI returned empty response with no tool calls');
      // Give it one more chance
      currentMessages = appendAssistantMessage(
        currentMessages,
        '(No response produced. Continue working on the task or call task_complete if done.)'
      );
    }

    await delay(config.stepDelayMs);
  }

  // ── Step limit reached ────────────────────────────────────────────────
  await deps.sendMessage(
    task.conversationId,
    'I have reached the maximum number of steps for this task. Here is where I stopped.',
    { agentTaskId: task.id, isCompletion: true }
  );
  task.status = 'completed';
  task.endedAt = Date.now();
  deps.emitUpdate(task);
}

// ─── Tool Call Handler ────────────────────────────────────────────────────

interface ToolCallResult {
  /** Whether the loop should terminate */
  terminate: boolean;
  /** Updated message history */
  updatedMessages: AIMessage[];
}

async function handleToolCall(
  toolCall: AgentToolCall,
  task: AgentTask,
  tools: ToolDefinition[],
  messages: AIMessage[],
  signal: AbortSignal,
  deps: AgentLoopDeps,
  waitForUser: (taskId: string) => Promise<string>
): Promise<ToolCallResult> {
  // ── task_complete ──
  if (toolCall.name === CONTROL_TOOL_NAMES.TASK_COMPLETE) {
    const summary = toolCall.args.summary || 'Task completed.';
    await deps.sendMessage(task.conversationId, summary, {
      agentTaskId: task.id,
      isCompletion: true,
    });
    task.status = 'completed';
    task.endedAt = Date.now();
    deps.emitUpdate(task);
    return { terminate: true, updatedMessages: messages };
  }

  // ── ask_user ──
  if (toolCall.name === CONTROL_TOOL_NAMES.ASK_USER) {
    const question = toolCall.args.question || 'Could you provide more information?';
    await deps.sendMessage(task.conversationId, question, {
      agentTaskId: task.id,
      isQuestion: true,
    });

    task.status = 'waiting_user';
    task.pendingQuestion = question;
    deps.emitUpdate(task);

    // Wait for user response (this blocks the loop until resolved)
    const userAnswer = await waitForUser(task.id);

    if (signal.aborted) {
      task.status = 'cancelled';
      task.endedAt = Date.now();
      deps.emitUpdate(task);
      return { terminate: true, updatedMessages: messages };
    }

    // Add the question and answer to message history
    let updated = appendAssistantMessage(messages, question);
    updated = appendUserResponse(updated, userAnswer);

    task.status = 'running';
    task.pendingQuestion = undefined;
    task.scratchpad.push(`User answered: ${userAnswer}`);
    deps.emitUpdate(task);

    return { terminate: false, updatedMessages: updated };
  }

  // ── send_update ──
  if (toolCall.name === CONTROL_TOOL_NAMES.SEND_UPDATE) {
    const updateMsg = toolCall.args.message || 'Working...';
    await deps.sendMessage(task.conversationId, updateMsg, {
      agentTaskId: task.id,
      isUpdate: true,
    });
    // Add tool result to context
    const updated = appendToolResult(messages, toolCall.id, toolCall.name, { sent: true });
    return { terminate: false, updatedMessages: updated };
  }

  // ── Regular tool execution ──
  task.status = 'tool_executing';
  task.currentTool = toolCall.name;
  deps.emitUpdate(task);

  try {
    const result = await deps.executeTool(toolCall.name, toolCall.args, tools, signal);
    
    // Check for immediate memory special action
    if (result && typeof result === 'object' && result._system_action === 'set_immediate_memory') {
       task.immediateMemory = result.content;
       // Replace result with a confirmation message for the history
       const confirmation = "Immediate memory set for next step.";
       task.scratchpad.push(`Tool ${toolCall.name}: ${confirmation}`);
       task.currentTool = undefined;
       task.status = 'running';
       deps.emitUpdate(task);
       
       const updated = appendToolResult(messages, toolCall.id, toolCall.name, confirmation);
       return { terminate: false, updatedMessages: updated };
    }

    task.scratchpad.push(`Tool ${toolCall.name}: ${JSON.stringify(result)?.substring(0, 500)}`);
    task.currentTool = undefined;
    task.status = 'running';
    deps.emitUpdate(task);

    const updated = appendToolResult(messages, toolCall.id, toolCall.name, result);
    return { terminate: false, updatedMessages: updated };
  } catch (err: any) {
    task.currentTool = undefined;
    task.status = 'running';
    deps.emitUpdate(task);

    const errorMessage = err.message || String(err);
    const errorResult = { 
      error: errorMessage,
      hint: "The tool execution failed. Please check the error message and try a different approach or parameters."
    };
    task.scratchpad.push(`Tool ${toolCall.name} FAILED: ${errorMessage}`);
    const updated = appendToolResult(messages, toolCall.id, toolCall.name, errorResult);
    return { terminate: false, updatedMessages: updated };
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
