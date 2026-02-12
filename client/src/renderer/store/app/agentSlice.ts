import { StateCreator } from 'zustand';
import { AppState } from './types';
import { AgentTask } from '../../../shared/agent-types';

export interface AgentSlice {
  activeTaskByConversation: Record<string, AgentTask>;
  startAgentTask: (conversationId: string, message: string, metadata: any) => Promise<string>;
  stopAgentTask: (taskId: string) => Promise<void>;
  respondToAgent: (taskId: string, response: string) => Promise<void>;
  handleTaskUpdate: (task: AgentTask) => void;
}

export const createAgentSlice: StateCreator<AppState, [], [], AgentSlice> = (set, _get) => ({
  activeTaskByConversation: {},

  startAgentTask: async (conversationId: string, message: string, metadata: any) => {
    try {
      set({ isGenerating: true });
      const taskId = await window.electronAPI.agentStartTask({
        conversationId,
        message,
        metadata
      });
      return taskId;
    } catch (error) {
      console.error('Failed to start agent task:', error);
      set({ isGenerating: false });
      throw error;
    }
  },

  stopAgentTask: async (taskId: string) => {
    try {
      await window.electronAPI.agentStopTask({ taskId });
      // State update will happen via handleTaskUpdate when the cancelled event comes back
    } catch (error) {
      console.error('Failed to stop agent task:', error);
    }
  },

  respondToAgent: async (taskId: string, response: string) => {
    try {
      await window.electronAPI.agentUserResponse({ taskId, response });
    } catch (error) {
      console.error('Failed to respond to agent:', error);
    }
  },

  handleTaskUpdate: (task: AgentTask) => {
    set((state) => {
      const newActiveTasks = { ...state.activeTaskByConversation };
      
      // If terminal status, we might want to keep it for a bit or clear it depending on UI needs
      // For now, we update it in place
      newActiveTasks[task.conversationId] = task;

      // Update isGenerating flag based on task status
      // If this task belongs to the active conversation
      const isActiveConversation = state.activeConversationId === task.conversationId;
      let isGenerating = state.isGenerating;

      if (isActiveConversation) {
        if (task.status === 'running' || task.status === 'thinking' || task.status === 'tool_executing') {
          isGenerating = true;
        } else if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'error' || task.status === 'waiting_user') {
          isGenerating = false;
        }
      }

      return {
        activeTaskByConversation: newActiveTasks,
        isGenerating
      };
    });
  }
});
