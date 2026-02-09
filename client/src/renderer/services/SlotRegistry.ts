/**
 * SlotRegistry - Central registry for UI extension slots
 * 
 * This service manages slot definitions and registrations, providing
 * a type-safe way for plugins to extend the UI.
 */

import { create } from 'zustand';
import type {
  SlotDefinition,
  SlotRegistration,
  SlotRegistrationOptions,
  SlotContextMap,
  SlotComponentProps,
  PanelDefinition,
  PanelOptions,
  StageViewDefinition,
  StageViewOptions,
  NavigationDefinition,
  NavigationOptions,
  InspectorTabDefinition,
  InspectorTabOptions,
  InspectorSectionDefinition,
  InspectorSectionOptions,
  MessageDecoratorDefinition,
  MessageDecoratorOptions,
  SettingsTabDefinition,
  SettingsTabOptions,
  CommandDefinition,
  CommandOptions,
  ModalOptions,
  ToastOptions,
} from '../../shared/slot-types';

// ═══════════════════════════════════════════════════════════════════════════
// Registry State
// ═══════════════════════════════════════════════════════════════════════════

interface SlotRegistryState {
  // Core slot system
  definitions: Record<string, SlotDefinition>;
  registrations: Record<string, SlotRegistration[]>;
  
  // Specialized registrations
  panels: Record<string, PanelDefinition>;
  stageViews: Record<string, StageViewDefinition>;
  navigations: Record<string, NavigationDefinition>;
  inspectorTabs: Record<string, InspectorTabDefinition>;
  inspectorSections: Record<string, InspectorSectionDefinition>;
  messageDecorators: Record<string, MessageDecoratorDefinition>;
  settingsTabs: Record<string, SettingsTabDefinition>;
  commands: Record<string, CommandDefinition>;
  
  // Overlay state
  modals: Array<{ id: string; options: ModalOptions; resolve: (result?: unknown) => void }>;
  toasts: Array<ToastOptions & { id: string }>;
  
  // Actions
  defineSlot: (definition: SlotDefinition) => void;
  registerSlot: <K extends keyof SlotContextMap>(
    slotId: K,
    pluginId: string,
    options: SlotRegistrationOptions<SlotContextMap[K]>
  ) => () => void;
  unregisterSlot: (registrationId: string) => void;
  getExtensions: <K extends keyof SlotContextMap>(
    slotId: K,
    context?: SlotContextMap[K]
  ) => SlotRegistration<SlotContextMap[K]>[];
  
  // Panel actions
  registerPanel: (pluginId: string, options: PanelOptions) => () => void;
  unregisterPanel: (panelId: string) => void;
  getPanel: (panelId: string) => PanelDefinition | undefined;
  getPanels: () => PanelDefinition[];
  
  // Stage view actions
  registerStageView: (pluginId: string, options: StageViewOptions) => () => void;
  unregisterStageView: (viewId: string) => void;
  getStageView: (viewId: string) => StageViewDefinition | undefined;
  getStageViews: () => StageViewDefinition[];
  
  // Navigation actions
  registerNavigation: (pluginId: string, options: NavigationOptions) => () => void;
  unregisterNavigation: (navId: string) => void;
  getNavigations: () => NavigationDefinition[];
  
  // Inspector actions
  registerInspectorTab: (pluginId: string, options: InspectorTabOptions) => () => void;
  unregisterInspectorTab: (tabId: string) => void;
  getInspectorTabs: () => InspectorTabDefinition[];
  registerInspectorSection: (pluginId: string, options: InspectorSectionOptions) => () => void;
  unregisterInspectorSection: (sectionId: string) => void;
  getInspectorSections: (targetTab: string) => InspectorSectionDefinition[];
  
  // Message decorator actions
  registerMessageDecorator: (pluginId: string, options: MessageDecoratorOptions) => () => void;
  unregisterMessageDecorator: (decoratorId: string) => void;
  getMessageDecorators: () => MessageDecoratorDefinition[];
  
  // Settings tab actions
  registerSettingsTab: (pluginId: string, options: SettingsTabOptions) => () => void;
  unregisterSettingsTab: (tabId: string) => void;
  getSettingsTabs: () => SettingsTabDefinition[];
  
  // Command actions
  registerCommand: (pluginId: string, options: CommandOptions) => () => void;
  unregisterCommand: (commandId: string) => void;
  getCommands: () => CommandDefinition[];
  
  // Overlay actions
  showModal: <T = unknown>(options: ModalOptions<T>) => Promise<T | undefined>;
  closeModal: (id: string, result?: unknown) => void;
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
  
  // View registration (standalone, not part of navigation)
  registerView: (pluginId: string, options: StageViewOptions) => () => void;
  unregisterView: (viewId: string) => void;
  
  // Utility
  listSlots: () => SlotDefinition[];
  unregisterAllForPlugin: (pluginId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const DEBUG = process.env.NODE_ENV === 'development';
const MAX_TOASTS = 5; // Limit toast queue to prevent memory issues
const MAX_MODALS = 10; // Limit modal stack

// ═══════════════════════════════════════════════════════════════════════════
// ID Generation
// ═══════════════════════════════════════════════════════════════════════════

let registrationCounter = 0;
const generateId = (prefix: string = 'reg'): string => {
  return `${prefix}_${++registrationCounter}_${Date.now().toString(36)}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// Validation Helpers
// ═══════════════════════════════════════════════════════════════════════════

const validateId = (id: string, type: string): boolean => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    console.error(`[SlotRegistry] Invalid ${type} ID: must be a non-empty string`);
    return false;
  }
  return true;
};

const log = (message: string, ...args: unknown[]) => {
  if (DEBUG) {
    console.log(`[SlotRegistry] ${message}`, ...args);
  }
};

const warn = (message: string, ...args: unknown[]) => {
  console.warn(`[SlotRegistry] ${message}`, ...args);
};

// ═══════════════════════════════════════════════════════════════════════════
// Default Slot Definitions
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SLOT_DEFINITIONS: SlotDefinition[] = [
  // Layout slots
  { id: 'layout:panel', category: 'layout', description: 'Custom dockable panels in FlexLayout', allowMultiple: true },
  { id: 'layout:stage-view', category: 'layout', description: 'Full-screen views in the Stage area', allowMultiple: true },
  { id: 'layout:sidebar-view', category: 'layout', description: 'Full sidebar takeover views', allowMultiple: true },
  
  // Navigation slots
  { id: 'nav:rail-item', category: 'navigation', description: 'NavRail icons with navigation targets', allowMultiple: true },
  { id: 'nav:rail-footer', category: 'navigation', description: 'Bottom of NavRail before settings', allowMultiple: true },
  { id: 'nav:menu-item', category: 'navigation', description: 'AppMenuBar menu items', allowMultiple: true },
  { id: 'nav:context-menu', category: 'navigation', description: 'Right-click context menu extensions', allowMultiple: true },
  
  // Inspector slots
  { id: 'inspector:tab', category: 'inspector', description: 'New inspector tabs with button + content', allowMultiple: true },
  { id: 'inspector:tab-button', category: 'inspector', description: 'Inspector tab buttons', allowMultiple: true },
  { id: 'inspector:tab-content', category: 'inspector', description: 'Inspector tab content', allowMultiple: true },
  { id: 'inspector:section', category: 'inspector', description: 'Sections within existing tabs', allowMultiple: true },
  
  // Chat/Message slots
  { id: 'chat:message-before', category: 'chat', description: 'Content before a message', allowMultiple: true },
  { id: 'chat:message-after', category: 'chat', description: 'Content after a message', allowMultiple: true },
  { id: 'chat:message-action', category: 'chat', description: 'Actions on message hover/menu', allowMultiple: true },
  { id: 'chat:input-before', category: 'chat', description: 'Content above input deck', allowMultiple: true },
  { id: 'chat:input-after', category: 'chat', description: 'Content below input deck', allowMultiple: true },
  { id: 'chat:empty-state', category: 'chat', description: 'Replace empty conversation state', allowMultiple: false, maxExtensions: 1 },
  
  // Overlay slots
  { id: 'overlay:command-palette', category: 'overlay', description: 'Command palette entries', allowMultiple: true },
  
  // Specialized slots
  { id: 'fence:renderer', category: 'specialized', description: 'Code fence rendering', allowMultiple: true },
  { id: 'settings:tab', category: 'specialized', description: 'Settings modal tabs', allowMultiple: true },
  { id: 'onboarding:step', category: 'specialized', description: 'Onboarding wizard steps', allowMultiple: true },
];

// ═══════════════════════════════════════════════════════════════════════════
// Store Implementation
// ═══════════════════════════════════════════════════════════════════════════

export const useSlotRegistry = create<SlotRegistryState>((set, get) => {
  // Initialize with default definitions
  const initialDefinitions: Record<string, SlotDefinition> = {};
  DEFAULT_SLOT_DEFINITIONS.forEach(def => {
    initialDefinitions[def.id] = def;
  });

  return {
    definitions: initialDefinitions,
    registrations: {},
    panels: {},
    stageViews: {},
    navigations: {},
    inspectorTabs: {},
    inspectorSections: {},
    messageDecorators: {},
    settingsTabs: {},
    commands: {},
    modals: [],
    toasts: [],

    // ─── Core Slot System ─────────────────────────────────────────────────
    
    defineSlot: (definition) => set((state) => ({
      definitions: { ...state.definitions, [definition.id]: definition }
    })),

    registerSlot: (slotId, pluginId, options) => {
      const id = generateId(`slot_${slotId}`);
      // Use type assertion since the generic constraints are validated at the API level
      const registration: SlotRegistration = {
        id,
        slotId,
        pluginId,
        component: options.component as React.ComponentType<SlotComponentProps<unknown>>,
        priority: options.priority ?? 50,
        filter: options.filter as ((context: unknown) => boolean) | undefined,
        metadata: options.metadata,
      };

      set((state) => {
        const existing = state.registrations[slotId] || [];
        const updated = [...existing, registration].sort((a, b) => a.priority - b.priority);
        return {
          registrations: { ...state.registrations, [slotId]: updated }
        };
      });

      // Return cleanup function
      return () => get().unregisterSlot(id);
    },

    unregisterSlot: (registrationId) => set((state) => {
      const newRegistrations = { ...state.registrations };
      for (const slotId of Object.keys(newRegistrations)) {
        newRegistrations[slotId] = newRegistrations[slotId].filter(r => r.id !== registrationId);
      }
      return { registrations: newRegistrations };
    }),

    getExtensions: (slotId, context) => {
      const registrations = get().registrations[slotId] || [];
      if (context === undefined) {
        return registrations as SlotRegistration<SlotContextMap[typeof slotId]>[];
      }
      return registrations.filter(r => {
        if (!r.filter) return true;
        try {
          return r.filter(context);
        } catch {
          console.warn(`Filter function failed for registration ${r.id}`);
          return true;
        }
      }) as SlotRegistration<SlotContextMap[typeof slotId]>[];
    },

    // ─── Panel Registration ───────────────────────────────────────────────
    
    registerPanel: (pluginId, options) => {
      if (!validateId(options.id, 'panel') || !validateId(pluginId, 'plugin')) {
        return () => {}; // Return no-op cleanup
      }
      
      const existing = get().panels[options.id];
      if (existing) {
        warn(`Panel "${options.id}" already registered by plugin "${existing.pluginId}", overwriting with "${pluginId}"`);
      }
      
      const definition: PanelDefinition = {
        id: options.id,
        pluginId,
        name: options.name,
        icon: options.icon,
        component: options.component,
        defaultLocation: options.defaultLocation ?? 'right',
        defaultWeight: options.defaultWeight ?? 25,
        enableClose: options.enableClose ?? true,
      };

      set((state) => ({
        panels: { ...state.panels, [options.id]: definition }
      }));
      
      log(`Panel registered: "${options.id}" by plugin "${pluginId}"`);

      return () => get().unregisterPanel(options.id);
    },

    unregisterPanel: (panelId) => set((state) => {
      const { [panelId]: _, ...rest } = state.panels;
      return { panels: rest };
    }),

    getPanel: (panelId) => get().panels[panelId],
    
    getPanels: () => Object.values(get().panels),

    // ─── Stage View Registration ──────────────────────────────────────────
    
    registerStageView: (pluginId, options) => {
      const definition: StageViewDefinition = {
        id: options.id,
        pluginId,
        name: options.name,
        icon: options.icon,
        component: options.component,
      };

      set((state) => ({
        stageViews: { ...state.stageViews, [options.id]: definition }
      }));

      return () => get().unregisterStageView(options.id);
    },

    unregisterStageView: (viewId) => set((state) => {
      const { [viewId]: _, ...rest } = state.stageViews;
      return { stageViews: rest };
    }),

    getStageView: (viewId) => get().stageViews[viewId],
    
    getStageViews: () => Object.values(get().stageViews),

    // ─── Navigation Registration ──────────────────────────────────────────
    
    registerNavigation: (pluginId, options) => {
      // First register the associated stage view
      const viewDef: StageViewDefinition = {
        id: options.view.id,
        pluginId,
        name: options.view.name,
        icon: options.view.icon,
        component: options.view.component,
      };

      const definition: NavigationDefinition = {
        id: options.id,
        pluginId,
        label: options.label,
        icon: options.icon,
        view: viewDef,
        badge: options.badge,
        order: options.order ?? 100,
      };

      set((state) => ({
        navigations: { ...state.navigations, [options.id]: definition },
        stageViews: { ...state.stageViews, [options.view.id]: viewDef },
      }));

      return () => get().unregisterNavigation(options.id);
    },

    unregisterNavigation: (navId) => set((state) => {
      const nav = state.navigations[navId];
      if (!nav) return state;

      const { [navId]: _, ...restNav } = state.navigations;
      const { [nav.view.id]: __, ...restViews } = state.stageViews;
      return { navigations: restNav, stageViews: restViews };
    }),

    getNavigations: () => Object.values(get().navigations).sort((a, b) => a.order - b.order),

    // ─── Inspector Tab Registration ───────────────────────────────────────
    
    registerInspectorTab: (pluginId, options) => {
      const definition: InspectorTabDefinition = {
        id: options.id,
        pluginId,
        label: options.label,
        icon: options.icon,
        component: options.component,
        priority: options.priority ?? 50,
        badge: options.badge,
      };

      set((state) => ({
        inspectorTabs: { ...state.inspectorTabs, [options.id]: definition }
      }));

      return () => get().unregisterInspectorTab(options.id);
    },

    unregisterInspectorTab: (tabId) => set((state) => {
      const { [tabId]: _, ...rest } = state.inspectorTabs;
      return { inspectorTabs: rest };
    }),

    getInspectorTabs: () => Object.values(get().inspectorTabs).sort((a, b) => a.priority - b.priority),

    // ─── Inspector Section Registration ───────────────────────────────────
    
    registerInspectorSection: (pluginId, options) => {
      const id = generateId('section');
      const definition: InspectorSectionDefinition = {
        id,
        pluginId,
        targetTab: options.targetTab,
        component: options.component,
        location: options.location ?? 'bottom',
        priority: options.priority ?? 50,
      };

      set((state) => ({
        inspectorSections: { ...state.inspectorSections, [id]: definition }
      }));

      return () => get().unregisterInspectorSection(id);
    },

    unregisterInspectorSection: (sectionId) => set((state) => {
      const { [sectionId]: _, ...rest } = state.inspectorSections;
      return { inspectorSections: rest };
    }),

    getInspectorSections: (targetTab) => 
      Object.values(get().inspectorSections)
        .filter(s => s.targetTab === targetTab)
        .sort((a, b) => a.priority - b.priority),

    // ─── Message Decorator Registration ───────────────────────────────────
    
    registerMessageDecorator: (pluginId, options) => {
      const definition: MessageDecoratorDefinition = {
        id: options.id,
        pluginId,
        match: options.match,
        wrapper: options.wrapper,
        before: options.before,
        after: options.after,
        actions: options.actions ?? [],
        priority: options.priority ?? 50,
      };

      set((state) => ({
        messageDecorators: { ...state.messageDecorators, [options.id]: definition }
      }));

      return () => get().unregisterMessageDecorator(options.id);
    },

    unregisterMessageDecorator: (decoratorId) => set((state) => {
      const { [decoratorId]: _, ...rest } = state.messageDecorators;
      return { messageDecorators: rest };
    }),

    getMessageDecorators: () => Object.values(get().messageDecorators).sort((a, b) => a.priority - b.priority),

    // ─── Settings Tab Registration ────────────────────────────────────────
    
    registerSettingsTab: (pluginId, options) => {
      const definition: SettingsTabDefinition = {
        id: options.id,
        pluginId,
        label: options.label,
        icon: options.icon,
        component: options.component,
        order: options.order ?? 100,
      };

      set((state) => ({
        settingsTabs: { ...state.settingsTabs, [options.id]: definition }
      }));

      return () => get().unregisterSettingsTab(options.id);
    },

    unregisterSettingsTab: (tabId) => set((state) => {
      const { [tabId]: _, ...rest } = state.settingsTabs;
      return { settingsTabs: rest };
    }),

    getSettingsTabs: () => Object.values(get().settingsTabs).sort((a, b) => a.order - b.order),

    // ─── Command Registration ─────────────────────────────────────────────
    
    registerCommand: (pluginId, options) => {
      const definition: CommandDefinition = {
        id: options.id,
        pluginId,
        label: options.label,
        shortcut: options.shortcut,
        icon: options.icon,
        action: options.action,
        category: options.category,
      };

      set((state) => ({
        commands: { ...state.commands, [options.id]: definition }
      }));

      return () => get().unregisterCommand(options.id);
    },

    unregisterCommand: (commandId) => set((state) => {
      const { [commandId]: _, ...rest } = state.commands;
      return { commands: rest };
    }),

    getCommands: () => Object.values(get().commands),

    // ─── Overlay Management ───────────────────────────────────────────────
    
    showModal: <T = unknown>(options: ModalOptions<T>): Promise<T | undefined> => {
      if (!validateId(options.id, 'modal')) {
        return Promise.resolve(undefined);
      }
      
      // Check if modal with same ID already exists
      const existing = get().modals.find(m => m.id === options.id);
      if (existing) {
        warn(`Modal "${options.id}" already open, returning existing promise`);
        return new Promise((resolve) => {
          // Return a promise that resolves when the existing modal closes
          const checkClosed = setInterval(() => {
            if (!get().modals.find(m => m.id === options.id)) {
              clearInterval(checkClosed);
              resolve(undefined);
            }
          }, 100);
        });
      }
      
      // Check modal stack limit
      if (get().modals.length >= MAX_MODALS) {
        warn(`Modal stack limit (${MAX_MODALS}) reached, rejecting new modal`);
        return Promise.resolve(undefined);
      }
      
      return new Promise((resolve) => {
        set((state) => ({
          modals: [...state.modals, {
            id: options.id,
            options: options as ModalOptions,
            resolve: resolve as (result?: unknown) => void
          }]
        }));
        
        log(`Modal opened: "${options.id}"`);
      });
    },

    closeModal: (id, result) => set((state) => {
      const modal = state.modals.find(m => m.id === id);
      if (modal) {
        modal.resolve(result);
      }
      return {
        modals: state.modals.filter(m => m.id !== id)
      };
    }),

    showToast: (options) => {
      const id = options.id ?? generateId('toast');
      const toast = { ...options, id };
      
      set((state) => {
        // Limit toast queue to prevent memory issues
        let newToasts = [...state.toasts, toast];
        if (newToasts.length > MAX_TOASTS) {
          // Remove oldest toasts
          newToasts = newToasts.slice(-MAX_TOASTS);
        }
        return { toasts: newToasts };
      });

      // Auto-dismiss after duration
      if (options.duration !== 0) {
        const duration = options.duration ?? 5000;
        setTimeout(() => {
          get().dismissToast(id);
        }, duration);
      }
      
      log(`Toast shown: "${options.title}"`);
    },

    dismissToast: (id) => set((state) => ({
      toasts: state.toasts.filter(t => t.id !== id)
    })),

    // ─── View Registration (Standalone) ────────────────────────────────────
    
    registerView: (pluginId, options) => {
      const definition: StageViewDefinition = {
        id: options.id,
        pluginId,
        name: options.name,
        icon: options.icon,
        component: options.component,
      };

      set((state) => ({
        stageViews: { ...state.stageViews, [options.id]: definition }
      }));

      return () => get().unregisterView(options.id);
    },

    unregisterView: (viewId) => set((state) => {
      const { [viewId]: _, ...rest } = state.stageViews;
      return { stageViews: rest };
    }),

    // ─── Utility ──────────────────────────────────────────────────────────
    
    listSlots: () => Object.values(get().definitions),
    
    /**
     * Unregister all extensions from a specific plugin.
     * Called during plugin unload.
     */
    unregisterAllForPlugin: (pluginId) => set((state) => {
      // Filter out all registrations for this plugin
      const newRegistrations: Record<string, SlotRegistration[]> = {};
      for (const [slotId, regs] of Object.entries(state.registrations)) {
        newRegistrations[slotId] = regs.filter(r => r.pluginId !== pluginId);
      }
      
      // Filter all specialized registrations
      const filterByPlugin = <T extends { pluginId: string }>(
        record: Record<string, T>
      ): Record<string, T> => {
        const result: Record<string, T> = {};
        for (const [key, value] of Object.entries(record)) {
          if (value.pluginId !== pluginId) {
            result[key] = value;
          }
        }
        return result;
      };
      
      return {
        registrations: newRegistrations,
        panels: filterByPlugin(state.panels),
        stageViews: filterByPlugin(state.stageViews),
        navigations: filterByPlugin(state.navigations),
        inspectorTabs: filterByPlugin(state.inspectorTabs),
        inspectorSections: filterByPlugin(state.inspectorSections),
        messageDecorators: filterByPlugin(state.messageDecorators),
        settingsTabs: filterByPlugin(state.settingsTabs),
        commands: filterByPlugin(state.commands),
      };
    }),
  };
});

// ═══════════════════════════════════════════════════════════════════════════
// Hook for accessing extensions
// ═══════════════════════════════════════════════════════════════════════════

export function useExtensions<K extends keyof SlotContextMap>(
  slotId: K,
  context?: SlotContextMap[K]
): SlotRegistration<SlotContextMap[K]>[] {
  return useSlotRegistry((state) => {
    const registrations = state.registrations[slotId] || [];
    if (context === undefined) {
      return registrations as SlotRegistration<SlotContextMap[K]>[];
    }
    return registrations.filter(r => {
      if (!r.filter) return true;
      try {
        return r.filter(context);
      } catch {
        return true;
      }
    }) as SlotRegistration<SlotContextMap[K]>[];
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook for message decorators
// ═══════════════════════════════════════════════════════════════════════════

import type { ChatMessage } from '../../shared/slot-types';

export function useMessageDecorators(message: ChatMessage): MessageDecoratorDefinition[] {
  const allDecorators = useSlotRegistry((state) => Object.values(state.messageDecorators));
  return allDecorators.filter(d => {
    try {
      return d.match(message);
    } catch {
      console.warn(`Message decorator match failed for ${d.id}`);
      return false;
    }
  }).sort((a, b) => a.priority - b.priority);
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook for inspector tabs
// ═══════════════════════════════════════════════════════════════════════════

export function useInspectorTabs(): InspectorTabDefinition[] {
  return useSlotRegistry((state) => 
    Object.values(state.inspectorTabs).sort((a, b) => a.priority - b.priority)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook for inspector sections
// ═══════════════════════════════════════════════════════════════════════════

export function useInspectorSections(targetTab: string): InspectorSectionDefinition[] {
  return useSlotRegistry((state) => 
    Object.values(state.inspectorSections)
      .filter(s => s.targetTab === targetTab)
      .sort((a, b) => a.priority - b.priority)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook for navigations
// ═══════════════════════════════════════════════════════════════════════════

export function usePluginNavigations(): NavigationDefinition[] {
  return useSlotRegistry((state) => 
    Object.values(state.navigations).sort((a, b) => a.order - b.order)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook for panels
// ═══════════════════════════════════════════════════════════════════════════

export function usePluginPanels(): PanelDefinition[] {
  return useSlotRegistry((state) => Object.values(state.panels));
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook for commands
// ═══════════════════════════════════════════════════════════════════════════

export function useCommands(): CommandDefinition[] {
  return useSlotRegistry((state) => Object.values(state.commands));
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook for settings tabs
// ═══════════════════════════════════════════════════════════════════════════

export function useSettingsTabs(): SettingsTabDefinition[] {
  return useSlotRegistry((state) => 
    Object.values(state.settingsTabs).sort((a, b) => a.order - b.order)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook for modals
// ═══════════════════════════════════════════════════════════════════════════

export function useModals() {
  return useSlotRegistry((state) => state.modals);
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook for toasts
// ═══════════════════════════════════════════════════════════════════════════

export function useToasts() {
  return useSlotRegistry((state) => state.toasts);
}
