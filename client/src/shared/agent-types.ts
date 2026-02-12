/**
 * Agentic Task Types
 * 
 * Defines the data model for persistent, autonomous agent tasks.
 * An AgentTask represents a long-running task where the agent works
 * autonomously — sending multiple messages, executing tools, asking
 * questions, and deciding when the task is complete.
 */

// ─── Task Status ──────────────────────────────────────────────────────────

export type AgentTaskStatus =
  | 'running'        // Agent loop is active, processing next step
  | 'thinking'       // AI call in progress
  | 'tool_executing' // A tool is being executed
  | 'waiting_user'   // Agent asked a question, waiting for user reply
  | 'completed'      // Agent decided the task is done
  | 'cancelled'      // User cancelled the task
  | 'error';         // Unrecoverable error

// ─── Agent Task ───────────────────────────────────────────────────────────

export interface AgentTask {
  /** Unique task ID */
  id: string;
  /** Conversation this task is attached to */
  conversationId: string;
  /** Current status */
  status: AgentTaskStatus;
  /** The original user message that started this task */
  originalPrompt: string;
  /** Internal scratchpad — accumulated tool results and context the agent builds */
  scratchpad: string[];
  /** Number of AI calls (steps) made so far */
  stepCount: number;
  /** Timestamp when task started */
  startedAt: number;
  /** Timestamp when task completed/cancelled/errored */
  endedAt?: number;
  /** If status is waiting_user, this is the question the agent asked */
  pendingQuestion?: string;
  /** Error message if status is error */
  errorMessage?: string;
  /** Name of the tool currently being executed */
  currentTool?: string;
  /** Ephemeral memory for the next turn only (cleared after use) */
  immediateMemory?: string | null;
}

// ─── IPC Payloads ─────────────────────────────────────────────────────────

/** Payload for starting an agent task (renderer → main) */
export interface AgentStartTaskPayload {
  conversationId: string;
  message: string;
  metadata: {
    providerId?: string;
    model?: string;
    personalityId?: string;
    mode?: string;
    resonance?: number;
    [key: string]: any;
  };
}

/** Payload for stopping an agent task (renderer → main) */
export interface AgentStopTaskPayload {
  taskId: string;
}

/** Payload for user response to an agent question (renderer → main) */
export interface AgentUserResponsePayload {
  taskId: string;
  response: string;
}

/** Task status update event (main → renderer) */
export interface AgentTaskUpdateEvent {
  task: AgentTask;
}

/** New message from agent during a task (main → renderer) */
export interface AgentTaskMessageEvent {
  taskId: string;
  conversationId: string;
  message: {
    id: string;
    content: string;
    type: string;
    sender: 'agent';
    timestamp: string;
    metadata?: {
      agentTaskId?: string;
      stepNumber?: number;
      isCompletion?: boolean;
      [key: string]: any;
    };
  };
}

// ─── Agentic Control Tools ────────────────────────────────────────────────

/** Arguments for the task_complete tool */
export interface TaskCompleteArgs {
  summary: string;
}

/** Arguments for the ask_user tool */
export interface AskUserArgs {
  question: string;
}

/** Arguments for the send_update tool */
export interface SendUpdateArgs {
  message: string;
}
