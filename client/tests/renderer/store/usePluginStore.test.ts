import { usePluginStore, ComponentDefinition } from '../../../src/renderer/store/usePluginStore';
import { PluginManifest, SkillManifest } from '../../../src/shared/plugin-types';
import React from 'react';

// Helper to reset store between tests
const resetStore = () => {
  usePluginStore.setState({
    plugins: [],
    availableSkills: [],
    filter: 'all',
    extensions: {},
  });
};

// Mock component for testing
const MockComponent: React.FC = () => React.createElement('div');

describe('usePluginStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('setPlugins', () => {
    it('should set plugins array', () => {
      const plugins: PluginManifest[] = [
        {
          id: 'plugin-1',
          name: 'Test Plugin',
          version: '1.0.0',
          description: 'A test plugin',
          status: 'active',
        } as PluginManifest,
      ];

      usePluginStore.getState().setPlugins(plugins);

      expect(usePluginStore.getState().plugins).toEqual(plugins);
    });

    it('should replace existing plugins', () => {
      const plugins1: PluginManifest[] = [
        { id: 'plugin-1', name: 'Plugin 1', version: '1.0.0', description: '', status: 'active' } as PluginManifest,
      ];
      const plugins2: PluginManifest[] = [
        { id: 'plugin-2', name: 'Plugin 2', version: '2.0.0', description: '', status: 'inactive' } as PluginManifest,
      ];

      usePluginStore.getState().setPlugins(plugins1);
      usePluginStore.getState().setPlugins(plugins2);

      expect(usePluginStore.getState().plugins).toEqual(plugins2);
      expect(usePluginStore.getState().plugins.length).toBe(1);
    });
  });

  describe('setAvailableSkills', () => {
    it('should set available skills', () => {
      const skills: SkillManifest[] = [
        {
          id: 'skill-1',
          name: 'Test Skill',
          description: 'A test skill',
        } as SkillManifest,
      ];

      usePluginStore.getState().setAvailableSkills(skills);

      expect(usePluginStore.getState().availableSkills).toEqual(skills);
    });
  });

  describe('setFilter', () => {
    it('should set filter to installed', () => {
      usePluginStore.getState().setFilter('installed');

      expect(usePluginStore.getState().filter).toBe('installed');
    });

    it('should set filter to upgradeable', () => {
      usePluginStore.getState().setFilter('upgradeable');

      expect(usePluginStore.getState().filter).toBe('upgradeable');
    });

    it('should set filter to native', () => {
      usePluginStore.getState().setFilter('native');

      expect(usePluginStore.getState().filter).toBe('native');
    });

    it('should set filter to all', () => {
      usePluginStore.getState().setFilter('installed');
      usePluginStore.getState().setFilter('all');

      expect(usePluginStore.getState().filter).toBe('all');
    });
  });

  describe('updatePluginStatus', () => {
    it('should update plugin status by id', () => {
      const plugins: PluginManifest[] = [
        { id: 'plugin-1', name: 'Plugin 1', version: '1.0.0', description: '', status: 'active' } as PluginManifest,
        { id: 'plugin-2', name: 'Plugin 2', version: '1.0.0', description: '', status: 'active' } as PluginManifest,
      ];

      usePluginStore.getState().setPlugins(plugins);
      usePluginStore.getState().updatePluginStatus('plugin-1', 'disabled');

      const updatedPlugins = usePluginStore.getState().plugins;
      expect(updatedPlugins.find(p => p.id === 'plugin-1')?.status).toBe('disabled');
      expect(updatedPlugins.find(p => p.id === 'plugin-2')?.status).toBe('active');
    });

    it('should not modify plugins if id not found', () => {
      const plugins: PluginManifest[] = [
        { id: 'plugin-1', name: 'Plugin 1', version: '1.0.0', description: '', status: 'active' } as PluginManifest,
      ];

      usePluginStore.getState().setPlugins(plugins);
      usePluginStore.getState().updatePluginStatus('non-existent', 'disabled');

      expect(usePluginStore.getState().plugins).toEqual(plugins);
    });
  });

  describe('removePlugin', () => {
    it('should remove plugin by id', () => {
      const plugins: PluginManifest[] = [
        { id: 'plugin-1', name: 'Plugin 1', version: '1.0.0', description: '', status: 'active' } as PluginManifest,
        { id: 'plugin-2', name: 'Plugin 2', version: '1.0.0', description: '', status: 'active' } as PluginManifest,
      ];

      usePluginStore.getState().setPlugins(plugins);
      usePluginStore.getState().removePlugin('plugin-1');

      const remainingPlugins = usePluginStore.getState().plugins;
      expect(remainingPlugins.length).toBe(1);
      expect(remainingPlugins[0].id).toBe('plugin-2');
    });

    it('should handle removing non-existent plugin', () => {
      const plugins: PluginManifest[] = [
        { id: 'plugin-1', name: 'Plugin 1', version: '1.0.0', description: '', status: 'active' } as PluginManifest,
      ];

      usePluginStore.getState().setPlugins(plugins);
      usePluginStore.getState().removePlugin('non-existent');

      expect(usePluginStore.getState().plugins.length).toBe(1);
    });
  });

  describe('registerComponent', () => {
    it('should register a component to a slot', () => {
      const definition: ComponentDefinition = {
        id: 'component-1',
        component: MockComponent,
        order: 10,
      };

      usePluginStore.getState().registerComponent('sidebar', definition);

      expect(usePluginStore.getState().extensions['sidebar']).toBeDefined();
      expect(usePluginStore.getState().extensions['sidebar'].length).toBe(1);
      expect(usePluginStore.getState().extensions['sidebar'][0].id).toBe('component-1');
    });

    it('should not add duplicate components with same id', () => {
      const definition: ComponentDefinition = {
        id: 'component-1',
        component: MockComponent,
      };

      usePluginStore.getState().registerComponent('sidebar', definition);
      usePluginStore.getState().registerComponent('sidebar', definition);

      expect(usePluginStore.getState().extensions['sidebar'].length).toBe(1);
    });

    it('should sort components by order', () => {
      const definition1: ComponentDefinition = {
        id: 'component-1',
        component: MockComponent,
        order: 20,
      };

      const definition2: ComponentDefinition = {
        id: 'component-2',
        component: MockComponent,
        order: 10,
      };

      const definition3: ComponentDefinition = {
        id: 'component-3',
        component: MockComponent,
        order: 15,
      };

      usePluginStore.getState().registerComponent('toolbar', definition1);
      usePluginStore.getState().registerComponent('toolbar', definition2);
      usePluginStore.getState().registerComponent('toolbar', definition3);

      const extensions = usePluginStore.getState().extensions['toolbar'];
      expect(extensions[0].id).toBe('component-2'); // order: 10
      expect(extensions[1].id).toBe('component-3'); // order: 15
      expect(extensions[2].id).toBe('component-1'); // order: 20
    });

    it('should handle components without order (default to 0)', () => {
      const definition1: ComponentDefinition = {
        id: 'component-1',
        component: MockComponent,
        order: 10,
      };

      const definition2: ComponentDefinition = {
        id: 'component-2',
        component: MockComponent,
        // no order specified
      };

      usePluginStore.getState().registerComponent('panel', definition1);
      usePluginStore.getState().registerComponent('panel', definition2);

      const extensions = usePluginStore.getState().extensions['panel'];
      expect(extensions[0].id).toBe('component-2'); // order: 0 (default)
      expect(extensions[1].id).toBe('component-1'); // order: 10
    });
  });

  describe('unregisterComponent', () => {
    it('should unregister a component from a slot', () => {
      const definition: ComponentDefinition = {
        id: 'component-1',
        component: MockComponent,
      };

      usePluginStore.getState().registerComponent('sidebar', definition);
      usePluginStore.getState().unregisterComponent('sidebar', 'component-1');

      expect(usePluginStore.getState().extensions['sidebar'].length).toBe(0);
    });

    it('should not affect other slots', () => {
      const definition1: ComponentDefinition = {
        id: 'component-1',
        component: MockComponent,
      };

      const definition2: ComponentDefinition = {
        id: 'component-1',
        component: MockComponent,
      };

      usePluginStore.getState().registerComponent('sidebar', definition1);
      usePluginStore.getState().registerComponent('toolbar', definition2);
      usePluginStore.getState().unregisterComponent('sidebar', 'component-1');

      expect(usePluginStore.getState().extensions['sidebar'].length).toBe(0);
      expect(usePluginStore.getState().extensions['toolbar'].length).toBe(1);
    });

    it('should handle unregistering from non-existent slot', () => {
      expect(() => {
        usePluginStore.getState().unregisterComponent('non-existent', 'component-1');
      }).not.toThrow();
    });

    it('should handle unregistering non-existent component', () => {
      const definition: ComponentDefinition = {
        id: 'component-1',
        component: MockComponent,
      };

      usePluginStore.getState().registerComponent('sidebar', definition);
      usePluginStore.getState().unregisterComponent('sidebar', 'non-existent');

      expect(usePluginStore.getState().extensions['sidebar'].length).toBe(1);
    });
  });
});
