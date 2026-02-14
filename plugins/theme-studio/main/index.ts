/**
 * Theme Studio - Main Process Entry
 */

export interface PluginContext {
  ui?: {
    registerComponent: (id: string, options: any) => void;
  };
  useAppStore?: () => {
    activeSidebarView: string;
    setActiveSidebarView: (view: string) => void;
  };
  ipc?: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    send: (channel: string, ...args: any[]) => void;
  };
  traits?: {
    register: (trait: any) => void;
  };
}

export const activate = (context: PluginContext) => {
  console.log('[Theme Studio] Main process activated');

  if (context.traits) {
    context.traits.register({
      id: 'theme-studio',
      name: 'Theme Generator',
      description: 'Generate and apply UI themes.',
      instruction: 'You can generate and apply UI themes using the Theme Studio. If the user asks to change the look and feel, colors, or style of the application, use this capability.',
      activationMode: 'dynamic',
      triggerKeywords: ['theme', 'style', 'color', 'dark mode', 'light mode', 'look and feel', 'design']
    });
  }
};

export const deactivate = () => {
  console.log('[Theme Studio] Deactivated');
};
