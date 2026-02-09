import { useSlotRegistry } from '../../../src/renderer/services/SlotRegistry';
import React from 'react';

// Helper to reset store between tests
const resetStore = () => {
  // Reset to initial state with default definitions
  useSlotRegistry.setState({
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
  });
};

// Mock React component for testing
const MockComponent: React.FC = () => React.createElement('div', null, 'Mock');

describe('SlotRegistry', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('Panel Registration', () => {
    it('should register a panel', () => {
      const options = {
        id: 'test-panel',
        name: 'Test Panel',
        icon: MockComponent,
        component: MockComponent,
        defaultLocation: 'right' as const,
      };

      const unregister = useSlotRegistry.getState().registerPanel('test-plugin', options);

      expect(useSlotRegistry.getState().getPanel('test-panel')).toBeDefined();
      expect(useSlotRegistry.getState().getPanels().length).toBe(1);
      expect(typeof unregister).toBe('function');
    });

    it('should unregister a panel', () => {
      const options = {
        id: 'test-panel',
        name: 'Test Panel',
        icon: MockComponent,
        component: MockComponent,
      };

      useSlotRegistry.getState().registerPanel('test-plugin', options);
      useSlotRegistry.getState().unregisterPanel('test-panel');

      expect(useSlotRegistry.getState().getPanel('test-panel')).toBeUndefined();
    });

    it('should return cleanup function that unregisters', () => {
      const options = {
        id: 'test-panel',
        name: 'Test Panel',
        icon: MockComponent,
        component: MockComponent,
      };

      const unregister = useSlotRegistry.getState().registerPanel('test-plugin', options);
      expect(useSlotRegistry.getState().getPanel('test-panel')).toBeDefined();

      unregister();
      expect(useSlotRegistry.getState().getPanel('test-panel')).toBeUndefined();
    });
  });

  describe('Stage View Registration', () => {
    it('should register a stage view', () => {
      const options = {
        id: 'test-view',
        name: 'Test View',
        icon: MockComponent,
        component: MockComponent,
      };

      const unregister = useSlotRegistry.getState().registerStageView('test-plugin', options);

      expect(useSlotRegistry.getState().getStageView('test-view')).toBeDefined();
      expect(useSlotRegistry.getState().getStageViews().length).toBe(1);
      expect(typeof unregister).toBe('function');
    });

    it('should unregister a stage view', () => {
      const options = {
        id: 'test-view',
        name: 'Test View',
        icon: MockComponent,
        component: MockComponent,
      };

      useSlotRegistry.getState().registerStageView('test-plugin', options);
      useSlotRegistry.getState().unregisterStageView('test-view');

      expect(useSlotRegistry.getState().getStageView('test-view')).toBeUndefined();
    });
  });

  describe('Navigation Registration', () => {
    it('should register navigation with associated stage view', () => {
      const options = {
        id: 'test-nav',
        label: 'Test Nav',
        icon: MockComponent,
        view: {
          id: 'test-nav-view',
          name: 'Test Nav View',
          icon: MockComponent,
          component: MockComponent,
        },
        order: 50,
      };

      useSlotRegistry.getState().registerNavigation('test-plugin', options);

      const navigations = useSlotRegistry.getState().getNavigations();
      expect(navigations.length).toBe(1);
      expect(navigations[0].id).toBe('test-nav');
      
      // Also registers the associated stage view
      expect(useSlotRegistry.getState().getStageView('test-nav-view')).toBeDefined();
    });

    it('should sort navigations by order', () => {
      useSlotRegistry.getState().registerNavigation('test-plugin', {
        id: 'nav-1',
        label: 'Nav 1',
        icon: MockComponent,
        view: { id: 'view-1', name: 'View 1', icon: MockComponent, component: MockComponent },
        order: 100,
      });

      useSlotRegistry.getState().registerNavigation('test-plugin', {
        id: 'nav-2',
        label: 'Nav 2',
        icon: MockComponent,
        view: { id: 'view-2', name: 'View 2', icon: MockComponent, component: MockComponent },
        order: 50,
      });

      const navigations = useSlotRegistry.getState().getNavigations();
      expect(navigations[0].id).toBe('nav-2');
      expect(navigations[1].id).toBe('nav-1');
    });

    it('should unregister navigation and associated view', () => {
      useSlotRegistry.getState().registerNavigation('test-plugin', {
        id: 'test-nav',
        label: 'Test Nav',
        icon: MockComponent,
        view: { id: 'test-nav-view', name: 'Test Nav View', icon: MockComponent, component: MockComponent },
      });

      useSlotRegistry.getState().unregisterNavigation('test-nav');

      expect(useSlotRegistry.getState().getNavigations().length).toBe(0);
      expect(useSlotRegistry.getState().getStageView('test-nav-view')).toBeUndefined();
    });
  });

  describe('Inspector Tab Registration', () => {
    it('should register inspector tab', () => {
      const options = {
        id: 'test-tab',
        label: 'Test Tab',
        icon: MockComponent,
        component: MockComponent,
        priority: 25,
      };

      useSlotRegistry.getState().registerInspectorTab('test-plugin', options);

      const tabs = useSlotRegistry.getState().getInspectorTabs();
      expect(tabs.length).toBe(1);
      expect(tabs[0].id).toBe('test-tab');
    });

    it('should sort tabs by priority', () => {
      useSlotRegistry.getState().registerInspectorTab('test-plugin', {
        id: 'tab-1',
        label: 'Tab 1',
        icon: MockComponent,
        component: MockComponent,
        priority: 100,
      });

      useSlotRegistry.getState().registerInspectorTab('test-plugin', {
        id: 'tab-2',
        label: 'Tab 2',
        icon: MockComponent,
        component: MockComponent,
        priority: 25,
      });

      const tabs = useSlotRegistry.getState().getInspectorTabs();
      expect(tabs[0].id).toBe('tab-2');
      expect(tabs[1].id).toBe('tab-1');
    });
  });

  describe('Inspector Section Registration', () => {
    it('should register inspector section', () => {
      useSlotRegistry.getState().registerInspectorSection('test-plugin', {
        targetTab: 'context',
        component: MockComponent,
        location: 'top',
      });

      const sections = useSlotRegistry.getState().getInspectorSections('context');
      expect(sections.length).toBe(1);
    });

    it('should filter sections by target tab', () => {
      useSlotRegistry.getState().registerInspectorSection('test-plugin', {
        targetTab: 'context',
        component: MockComponent,
      });

      useSlotRegistry.getState().registerInspectorSection('test-plugin', {
        targetTab: 'memory',
        component: MockComponent,
      });

      expect(useSlotRegistry.getState().getInspectorSections('context').length).toBe(1);
      expect(useSlotRegistry.getState().getInspectorSections('memory').length).toBe(1);
      expect(useSlotRegistry.getState().getInspectorSections('other').length).toBe(0);
    });
  });

  describe('Settings Tab Registration', () => {
    it('should register settings tab', () => {
      useSlotRegistry.getState().registerSettingsTab('test-plugin', {
        id: 'test-settings',
        label: 'Test Settings',
        icon: MockComponent,
        component: MockComponent,
        order: 50,
      });

      const tabs = useSlotRegistry.getState().getSettingsTabs();
      expect(tabs.length).toBe(1);
      expect(tabs[0].id).toBe('test-settings');
    });

    it('should sort settings tabs by order', () => {
      useSlotRegistry.getState().registerSettingsTab('test-plugin', {
        id: 'settings-1',
        label: 'Settings 1',
        icon: MockComponent,
        component: MockComponent,
        order: 100,
      });

      useSlotRegistry.getState().registerSettingsTab('test-plugin', {
        id: 'settings-2',
        label: 'Settings 2',
        icon: MockComponent,
        component: MockComponent,
        order: 25,
      });

      const tabs = useSlotRegistry.getState().getSettingsTabs();
      expect(tabs[0].id).toBe('settings-2');
    });
  });

  describe('Command Registration', () => {
    it('should register command', () => {
      const action = jest.fn();
      useSlotRegistry.getState().registerCommand('test-plugin', {
        id: 'test-command',
        label: 'Test Command',
        action,
        shortcut: 'Ctrl+T',
      });

      const commands = useSlotRegistry.getState().getCommands();
      expect(commands.length).toBe(1);
      expect(commands[0].id).toBe('test-command');
      expect(commands[0].shortcut).toBe('Ctrl+T');
    });
  });

  describe('Toast Management', () => {
    it('should show toast', () => {
      useSlotRegistry.getState().showToast({
        title: 'Test Toast',
        message: 'This is a test',
        type: 'success',
      });

      expect(useSlotRegistry.getState().toasts.length).toBe(1);
    });

    it('should dismiss toast', () => {
      useSlotRegistry.getState().showToast({
        id: 'test-toast',
        title: 'Test Toast',
        message: 'This is a test',
      });

      useSlotRegistry.getState().dismissToast('test-toast');

      expect(useSlotRegistry.getState().toasts.length).toBe(0);
    });

    it('should limit toast queue', () => {
      // Add more than the max toasts
      for (let i = 0; i < 10; i++) {
        useSlotRegistry.getState().showToast({
          title: `Toast ${i}`,
          duration: 0, // Don't auto-dismiss
        });
      }

      // Should be limited to MAX_TOASTS (5)
      expect(useSlotRegistry.getState().toasts.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Plugin Cleanup', () => {
    it('should unregister all extensions for a plugin', () => {
      // Register various items for a plugin
      useSlotRegistry.getState().registerPanel('test-plugin', {
        id: 'panel-1',
        name: 'Panel 1',
        icon: MockComponent,
        component: MockComponent,
      });

      useSlotRegistry.getState().registerStageView('test-plugin', {
        id: 'view-1',
        name: 'View 1',
        icon: MockComponent,
        component: MockComponent,
      });

      useSlotRegistry.getState().registerCommand('test-plugin', {
        id: 'cmd-1',
        label: 'Command 1',
        action: jest.fn(),
      });

      // Also register items for another plugin
      useSlotRegistry.getState().registerPanel('other-plugin', {
        id: 'panel-2',
        name: 'Panel 2',
        icon: MockComponent,
        component: MockComponent,
      });

      // Unregister all for test-plugin
      useSlotRegistry.getState().unregisterAllForPlugin('test-plugin');

      // Verify test-plugin items are gone
      expect(useSlotRegistry.getState().getPanel('panel-1')).toBeUndefined();
      expect(useSlotRegistry.getState().getStageView('view-1')).toBeUndefined();
      expect(useSlotRegistry.getState().getCommands().find(c => c.id === 'cmd-1')).toBeUndefined();

      // Verify other-plugin items remain
      expect(useSlotRegistry.getState().getPanel('panel-2')).toBeDefined();
    });
  });

  describe('Slot Definitions', () => {
    it('should list all slot definitions', () => {
      const slots = useSlotRegistry.getState().listSlots();
      
      // Should have default slot definitions
      expect(slots.length).toBeGreaterThan(0);
      expect(slots.some(s => s.id === 'layout:panel')).toBe(true);
      expect(slots.some(s => s.id === 'chat:message-before')).toBe(true);
    });

    it('should allow defining new slots', () => {
      useSlotRegistry.getState().defineSlot({
        id: 'custom:slot',
        category: 'custom',
        description: 'A custom slot',
        allowMultiple: true,
      });

      const slots = useSlotRegistry.getState().listSlots();
      expect(slots.some(s => s.id === 'custom:slot')).toBe(true);
    });
  });
});
