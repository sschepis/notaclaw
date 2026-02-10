import { StateCreator } from 'zustand';
import { AppState, Tab } from './types';

export interface TabSlice {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string | null) => void;
  updateTabData: (id: string, data: Partial<Tab['data']>) => void;
}

export const createTabSlice: StateCreator<AppState, [], [], TabSlice> = (set) => ({
  tabs: [],
  activeTabId: null,

  openTab: (tab) => set(state => {
      const exists = state.tabs.some(t => t.id === tab.id);
      const tabs = exists ? state.tabs : [...state.tabs, tab];
      
      // Sync legacy state if chat
      const openConversationIds = tab.type === 'chat' && !state.openConversationIds.includes(tab.id)
          ? [...state.openConversationIds, tab.id]
          : state.openConversationIds;

      return {
          tabs,
          activeTabId: tab.id,
          openConversationIds,
          activeConversationId: tab.type === 'chat' ? tab.id : state.activeConversationId
      };
  }),

  closeTab: (id) => set(state => {
      const newTabs = state.tabs.filter(t => t.id !== id);
      
      let newActiveTabId = state.activeTabId;
      if (state.activeTabId === id) {
          newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }
      
      // Sync legacy
      const newOpenConversationIds = state.openConversationIds.filter(cid => cid !== id);
      const newActiveConversationId = state.activeConversationId === id ? (newOpenConversationIds[newOpenConversationIds.length - 1] || null) : state.activeConversationId;

      return {
          tabs: newTabs,
          activeTabId: newActiveTabId,
          openConversationIds: newOpenConversationIds,
          activeConversationId: newActiveConversationId
      };
  }),

  setActiveTabId: (id) => set(state => {
      const tab = state.tabs.find(t => t.id === id);
      // Sync legacy state
      const activeConversationId = tab?.type === 'chat' ? id : (tab ? null : state.activeConversationId);
      
      return {
          activeTabId: id,
          activeConversationId
      };
  }),

  updateTabData: (id, data) => set(state => ({
      tabs: state.tabs.map(tab =>
          tab.id === id
              ? { ...tab, data: { ...tab.data, ...data } }
              : tab
      )
  })),
});
