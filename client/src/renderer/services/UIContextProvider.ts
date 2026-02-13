/**
 * UIContextProvider
 *
 * Gathers a serializable snapshot of the renderer's current UI state.
 * Called via IPC from the main process when the agent needs to know
 * what the user is viewing.
 */

import { UIContextSnapshot, UIContextMessage } from '../../shared/ui-context-types';
import { useAppStore } from '../store/useAppStore';
import type { SidebarView } from '../store/app/types';

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript',
  py: 'python', json: 'json', html: 'html',
  css: 'css', md: 'markdown', rs: 'rust',
  go: 'go', java: 'java', c: 'cpp', cpp: 'cpp',
  h: 'cpp', sh: 'bash', bash: 'bash',
  yml: 'yaml', yaml: 'yaml',
};

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_MAP[ext] || 'text';
}

/**
 * Gather the current UI state as a serializable snapshot.
 */
export function gatherUIContext(): UIContextSnapshot {
  const state = useAppStore.getState();
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  const activeConv = state.activeConversationId
    ? state.conversations[state.activeConversationId]
    : null;

  // Active agent task for current conversation
  const activeTask = state.activeConversationId
    ? state.activeTaskByConversation[state.activeConversationId]
    : null;

  const snapshot: UIContextSnapshot = {
    activeView: {
      tabId: state.activeTabId,
      tabType: (activeTab?.type as UIContextSnapshot['activeView']['tabType']) ?? null,
      tabTitle: activeTab?.title ?? null,
    },
    conversation: activeConv
      ? {
          id: activeConv.id,
          title: activeConv.title,
          messageCount: activeConv.messages.length,
          recentMessages: activeConv.messages.slice(-5).map(
            (m): UIContextMessage => ({
              sender: m.sender,
              content: m.content.substring(0, 500),
              timestamp: m.timestamp,
            })
          ),
          personalityId: (activeConv as any).personalityId ?? null,
        }
      : null,
    editor:
      activeTab?.type === 'file'
        ? {
            filePath: activeTab.data?.path || '',
            language: getLanguageFromPath(activeTab.data?.path || ''),
            lineCount: ((activeTab.data?.content as string) || '').split('\n').length,
            isDirty: false,
            cursorPosition: { line: 1, col: 1 },
            contentPreview: ((activeTab.data?.content as string) || '')
              .split('\n')
              .slice(0, 200)
              .join('\n'),
            selection: null,
          }
        : null,
    sidebar: {
      activeView: state.activeSidebarView,
    },
    agentTask: activeTask
      ? {
          id: activeTask.id,
          status: activeTask.status,
          stepCount: activeTask.stepCount,
          currentTool: activeTask.currentTool ?? null,
        }
      : null,
    promptTemplates: [], // Enriched by AgentTaskRunner from main-process filesystem
    timestamp: Date.now(),
  };

  return snapshot;
}

/**
 * Get the full content of the currently open text editor tab.
 * Returns null if no file tab is active.
 */
export function getEditorContent(): { content: string; filePath: string } | null {
  const state = useAppStore.getState();
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  if (!activeTab || activeTab.type !== 'file') return null;
  return {
    content: (activeTab.data?.content as string) || '',
    filePath: activeTab.data?.path || '',
  };
}

/**
 * Set the content of the currently open text editor tab.
 * Returns success/error. Note: actual file saving still requires Ctrl+S
 * or the save parameter.
 */
export function setEditorContent(data: {
  content: string;
  save?: boolean;
}): { success: boolean; error?: string } {
  const state = useAppStore.getState();
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  if (!activeTab || activeTab.type !== 'file') {
    return { success: false, error: 'No file tab is currently active' };
  }

  // Update the tab data in the store
  state.updateTabData(activeTab.id, { content: data.content });

  // If save requested, trigger file write via electronAPI
  if (data.save && activeTab.data?.path) {
    (window as any).electronAPI
      ?.fsWrite?.({ path: activeTab.data.path, content: data.content })
      .catch((err: any) => {
        console.error('[UIContextProvider] Failed to auto-save:', err);
      });
  }

  return { success: true };
}

/**
 * Handle a navigation request from the agent.
 */
export function handleNavigate(data: {
  action: string;
  target: string;
}): { success: boolean; error?: string } {
  const store = useAppStore.getState();

  switch (data.action) {
    case 'openConversation':
      store.setActiveConversationId(data.target);
      return { success: true };
    case 'switchSidebar':
      store.setActiveSidebarView(data.target as SidebarView);
      return { success: true };
    case 'openFile':
      // Create a file tab — the content will be loaded asynchronously
      // by the TextEditorPanel component or by reading via IPC
      store.openTab({
        id: `file-${data.target}`,
        type: 'file',
        title: data.target.split('/').pop() || data.target,
        data: { path: data.target, content: '' },
      });
      return { success: true };
    case 'switchTab':
      store.setActiveTabId(data.target);
      return { success: true };
    default:
      return { success: false, error: `Unknown navigation action: ${data.action}` };
  }
}
