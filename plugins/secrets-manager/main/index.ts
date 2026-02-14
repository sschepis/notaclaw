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
  traits?: {
    register: (trait: any) => void;
  };
  _cleanups?: Array<() => void>;
}

export const activate = (context: PluginContext) => {
  console.log('[Secrets Manager] Main process activated');

  if (context.traits) {
    context.traits.register({
      id: 'secrets-management',
      name: 'Secrets Management',
      description: 'Manage secure credentials and keys.',
      instruction: 'You have access to a secrets management system. This system securely stores API keys, passwords, and tokens. Never output raw secrets. Use the `secrets-manager` capabilities to store or retrieve credentials securely.',
      activationMode: 'dynamic',
      triggerKeywords: ['secrets', 'api key', 'password', 'token', 'credential', 'auth', 'key']
    });
  }
};

export const deactivate = () => {
  console.log('[Secrets Manager] Deactivated');
};
