import { StateCreator } from 'zustand';
import { AppState, GenerationProgress, Attachment } from './types';

export interface AISlice {
  isGenerating: boolean;
  generationProgress: GenerationProgress | null;
  pendingAttachments: Attachment[];
  pendingSuggestions: string[] | null;
  abortController: AbortController | null;
  editingMessageId: string | null;
  selectedModel: string | null;
  
  // Streaming state
  streamingMessageId: string | null;
  streamingContent: string;

  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: GenerationProgress | null) => void;
  addPendingAttachment: (attachment: Attachment) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
  setAbortController: (controller: AbortController | null) => void;
  setEditingMessageId: (id: string | null) => void;
  setSelectedModel: (model: string | null) => void;
  setPendingSuggestions: (suggestions: string[] | null) => void;
  loadSelectedModelFromSettings: () => Promise<void>;
  
  // Streaming actions
  startStreaming: (messageId: string) => void;
  appendStreamChunk: (chunk: string) => void;
  finalizeStream: () => void;
}

export const createAISlice: StateCreator<AppState, [], [], AISlice> = (set) => ({
  isGenerating: false,
  generationProgress: null,
  pendingAttachments: [],
  pendingSuggestions: null,
  abortController: null,
  editingMessageId: null,
  selectedModel: null,
  streamingMessageId: null,
  streamingContent: '',

  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationProgress: (generationProgress) => set({ generationProgress }),
  addPendingAttachment: (attachment) => set((state) => ({
    pendingAttachments: [...state.pendingAttachments, attachment]
  })),
  removePendingAttachment: (id) => set((state) => ({
    pendingAttachments: state.pendingAttachments.filter(a => a.id !== id)
  })),
  clearPendingAttachments: () => set({ pendingAttachments: [] }),
  setAbortController: (abortController) => set({ abortController }),
  setEditingMessageId: (editingMessageId) => set({ editingMessageId }),
  setPendingSuggestions: (pendingSuggestions) => set({ pendingSuggestions }),
  
  setSelectedModel: (selectedModel) => {
    set({ selectedModel });
    // Persist to settings asynchronously
    (async () => {
      try {
        const settings = await window.electronAPI.getAISettings();
        settings.selectedModel = selectedModel;
        await window.electronAPI.saveAISettings(settings);
      } catch (error) {
        console.error('Failed to persist selected model:', error);
      }
    })();
  },
  
  loadSelectedModelFromSettings: async () => {
    try {
      const settings = await window.electronAPI.getAISettings();
      if (settings.selectedModel) {
        set({ selectedModel: settings.selectedModel });
      }
    } catch (error) {
      console.error('Failed to load selected model from settings:', error);
    }
  },
  
  // Streaming actions
  startStreaming: (messageId: string) => set({
    streamingMessageId: messageId,
    streamingContent: '',
  }),
  
  appendStreamChunk: (chunk: string) => set((state) => ({
    streamingContent: state.streamingContent + chunk,
  })),
  
  finalizeStream: () => set({
    streamingMessageId: null,
    streamingContent: '',
  }),
});
