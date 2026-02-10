import { create } from 'zustand';
import { AppState } from './app/types';
import { createConversationSlice } from './app/conversationSlice';
import { createTabSlice } from './app/tabSlice';
import { createUISlice } from './app/uiSlice';
import { createDataSlice } from './app/dataSlice';
import { createAISlice } from './app/aiSlice';

// Re-export types for compatibility
export * from './app/types';

export const useAppStore = create<AppState>((...a) => ({
  ...createConversationSlice(...a),
  ...createTabSlice(...a),
  ...createUISlice(...a),
  ...createDataSlice(...a),
  ...createAISlice(...a),
}));
