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
}

export const activate = (context: PluginContext) => {
  console.log('[Theme Studio] Main process activated');
};

export const deactivate = () => {
  console.log('[Theme Studio] Deactivated');
};
