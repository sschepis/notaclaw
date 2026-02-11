/**
 * Secrets Manager - Main Process Entry
 */

export interface PluginContext {
  ui?: {
    registerPanel: (options: any) => () => void;
    registerCommand: (options: any) => () => void;
  };
  useAppStore?: {
    getState: () => any;
  };
  ipc?: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    send: (channel: string, ...args: any[]) => void;
  };
  _cleanups?: Array<() => void>;
}

export const activate = (context: PluginContext) => {
  console.log('[Secrets Manager] Main process activated');
};

export const deactivate = () => {
  console.log('[Secrets Manager] Deactivated');
};
