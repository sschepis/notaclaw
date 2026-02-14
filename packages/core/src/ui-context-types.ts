/**
 * UI Context Types
 * 
 * Serializable snapshot of the renderer's current state,
 * gathered on-demand so the agent can reason about what
 * the user is viewing in the app.
 */

export interface UIContextSnapshot {
  /** What the user is currently looking at */
  activeView: {
    tabId: string | null;
    tabType: 'chat' | 'group' | 'feed' | 'file' | 'extension' | null;
    tabTitle: string | null;
  };

  /** Active conversation details */
  conversation: {
    id: string;
    title: string;
    messageCount: number;
    recentMessages: UIContextMessage[];
    personalityId: string | null;
  } | null;

  /** Text editor state — populated only when a file tab is active */
  editor: {
    filePath: string;
    language: string;
    lineCount: number;
    isDirty: boolean;
    cursorPosition: { line: number; col: number };
    /** First ~200 lines of content for context */
    contentPreview: string;
    /** Selected text, if any */
    selection: string | null;
  } | null;

  /** Sidebar state */
  sidebar: {
    activeView: string;
  };

  /** Active agent task, if any */
  agentTask: {
    id: string;
    status: string;
    stepCount: number;
    currentTool: string | null;
  } | null;

  /** Available prompt template filenames from data/prompt-chains/ */
  promptTemplates: string[];

  /** Timestamp of snapshot */
  timestamp: number;
}

export interface UIContextMessage {
  sender: 'user' | 'agent';
  /** Content truncated to 500 chars */
  content: string;
  timestamp: string;
}
