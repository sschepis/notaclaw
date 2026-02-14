// =============================================================================
// prompt-editor — Local Plugin Context Types
// =============================================================================
// Local interface matching the PluginContext API surface used by this plugin.
// Follows the same pattern as plugins/planman/main/types.ts to avoid
// cross-package imports to client/src/shared/plugin-types.ts.

export interface PluginContext {
  id: string;
  manifest: any;

  // Lifecycle
  on(event: string, callback: () => void): void;

  // Storage (Scoped)
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // IPC (Scoped)
  ipc: {
    send(channel: string, data: any): void;
    on(channel: string, handler: (data: any) => void): void;
    handle(channel: string, handler: (data: any) => Promise<any>): void;
    invoke(channel: string, data: any): Promise<any>;
  };

  // Service Registry
  services: {
    tools: {
      register(tool: {
        name: string;
        description: string;
        parameters: any;
        handler: (args: any) => Promise<any>;
      }): void;
      list(): Promise<any[]>;
    };
  };

  // AlephNet / DSN Extensions
  dsn: {
    registerTool(toolDefinition: any, handler: Function): void;
    registerService(serviceDef: any, handler: Function): void;
    invokeTool(toolName: string, args: any): Promise<any>;
    publishObservation(content: string, smf: number[]): void;
  };

  // Workflow Engine
  workflow: {
    createRunner(config: any, options: any): WorkflowRunner;
  };

  // AI Access
  ai: {
    complete(request: any): Promise<{ text: string; raw?: any }>;
  };

  // Trait Registry
  traits?: {
    register(trait: any): void;
    unregister?(traitId: string): void;
  };
}

export interface WorkflowRunner {
  on(event: string, handler: (data: any) => void): void;
  run(promptName: string, initialArgs: any, providerName?: string): Promise<any>;
}
