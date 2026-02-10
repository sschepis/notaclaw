import { StateCreator } from 'zustand';
import { AppState, GenerationProgress, Attachment } from './types';

export interface AISlice {
  isGenerating: boolean;
  generationProgress: GenerationProgress | null;
  pendingAttachments: Attachment[];
  abortController: AbortController | null;
  editingMessageId: string | null;
  selectedModel: string | null;

  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: GenerationProgress | null) => void;
  addPendingAttachment: (attachment: Attachment) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
  setAbortController: (controller: AbortController | null) => void;
  setEditingMessageId: (id: string | null) => void;
  setSelectedModel: (model: string | null) => void;
  loadSelectedModelFromSettings: () => Promise<void>;
}

export const createAISlice: StateCreator<AppState, [], [], AISlice> = (set) => ({
  isGenerating: false,
  generationProgress: null,
  pendingAttachments: [],
  abortController: null,
  editingMessageId: null,
  selectedModel: null,

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
});
