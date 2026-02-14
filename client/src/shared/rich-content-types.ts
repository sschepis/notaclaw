/**
 * Rich Content Types for Chat Panel
 *
 * Defines structured content segments that can appear inline within
 * agent messages, enabling rich media responses with tool call cards,
 * status indicators, images, video, audio, diffs, and system messages.
 */

// ─── Tool Call Reporting ──────────────────────────────────────────────────

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error';

export interface ToolCallReport {
  /** Unique call ID */
  id: string;
  /** Tool name */
  toolName: string;
  /** Arguments passed to the tool (sanitized) */
  args: Record<string, any>;
  /** Execution status */
  status: ToolCallStatus;
  /** Result summary (truncated for display) */
  result?: any;
  /** Error message if status is 'error' */
  error?: string;
  /** Execution duration in milliseconds */
  durationMs?: number;
  /** When the call was made */
  timestamp: number;
}

// ─── Progress / Status ────────────────────────────────────────────────────

export interface ProgressStatus {
  /** Main label (e.g., "Writing files...") */
  label: string;
  /** Optional detail text */
  detail?: string;
  /** Current step number */
  step?: number;
  /** Total number of steps */
  totalSteps?: number;
  /** Completion percentage (0-100) */
  percentage?: number;
}

// ─── Content Segments ─────────────────────────────────────────────────────

export type ContentSegment =
  | { type: 'text'; content: string }
  | { type: 'markdown'; content: string }
  | { type: 'code'; lang: string; content: string; meta?: string }
  | { type: 'image'; src: string; alt?: string; caption?: string }
  | { type: 'video'; src: string; poster?: string; caption?: string }
  | { type: 'audio'; src: string; caption?: string }
  | { type: 'tool_call'; report: ToolCallReport }
  | { type: 'status'; status: ProgressStatus }
  | { type: 'system'; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'diff'; content: string; filename?: string }
  | { type: 'artifact'; lang: string; content: string; title?: string };

// ─── Extended Message Metadata ────────────────────────────────────────────

export interface RichMessageMetadata {
  // Existing metadata fields
  agentTaskId?: string;
  stepNumber?: number;
  isPlan?: boolean;
  isUpdate?: boolean;
  isCompletion?: boolean;
  isQuestion?: boolean;
  isError?: boolean;
  isToolCall?: boolean;

  // Rich content segments (parsed from fences or provided directly)
  contentSegments?: ContentSegment[];

  // Tool call reports for this message
  toolCalls?: ToolCallReport[];

  // Current progress status
  progressStatus?: ProgressStatus;
}

// ─── Fence Language → Content Type Mapping ────────────────────────────────

/** Fence languages that trigger special rendering */
export const RICH_FENCE_LANGUAGES = {
  image: ['image', 'img'],
  video: ['video', 'vid'],
  audio: ['audio'],
  tool_call: ['tool_call', 'tool-call', 'toolcall'],
  status: ['status', 'progress'],
  system: ['system', 'sys'],
  diff: ['diff', 'patch'],
} as const;

/** All rich fence language identifiers */
export const ALL_RICH_FENCE_LANGS = Object.values(RICH_FENCE_LANGUAGES).flat();

// ─── Streaming Types ──────────────────────────────────────────────────────

export interface StreamChunkEvent {
  conversationId: string;
  messageId: string;
  chunk: string;
  done?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Check if a fence language should be rendered as a rich content type.
 */
export function isRichFenceLanguage(lang: string): boolean {
  const lower = lang.toLowerCase();
  return ALL_RICH_FENCE_LANGS.includes(lower as any);
}

/**
 * Get the rich content type for a fence language.
 */
export function getRichContentType(lang: string): keyof typeof RICH_FENCE_LANGUAGES | null {
  const lower = lang.toLowerCase();
  for (const [type, langs] of Object.entries(RICH_FENCE_LANGUAGES)) {
    if ((langs as readonly string[]).includes(lower)) {
      return type as keyof typeof RICH_FENCE_LANGUAGES;
    }
  }
  return null;
}

/**
 * Safely parse JSON fence content with fallback.
 */
export function parseFenceJSON<T>(content: string, fallback: T): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

/**
 * Sanitize tool arguments for display (truncate large values).
 */
export function sanitizeToolArgs(args: Record<string, any>, maxValueLen = 200): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.length > maxValueLen) {
      sanitized[key] = value.substring(0, maxValueLen) + `... (${value.length} chars)`;
    } else if (typeof value === 'object' && value !== null) {
      const str = JSON.stringify(value);
      if (str.length > maxValueLen) {
        sanitized[key] = str.substring(0, maxValueLen) + '...';
      } else {
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Summarize a tool result for display (truncate if needed).
 */
export function summarizeToolResult(result: any, maxLen = 500): string {
  if (result === null || result === undefined) return 'null';
  if (typeof result === 'string') {
    return result.length > maxLen ? result.substring(0, maxLen) + '...' : result;
  }
  const str = JSON.stringify(result, null, 2);
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}
