import React from 'react';
import { Key, Plus, Trash2, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { SecretsSidebar } from './components/SecretsSidebar';

export const activate = (context: any) => {
  console.log('[Secrets Manager] Activated');
  const { ui, useAppStore } = context;

  const cleanups: Array<() => void> = [];

  // Register as a Panel (Sidebar)
  if (ui?.registerPanel) {
    cleanups.push(ui.registerPanel({
      id: 'secrets-manager-panel',
      name: 'Secrets Manager',
      icon: Key,
      component: SecretsSidebar,
      defaultLocation: 'left',
      defaultWeight: 20,
      enableClose: true
    }));
  }

  // Register Commands for Command Menu
  if (ui?.registerCommand) {
    cleanups.push(ui.registerCommand({
      id: 'secrets:open',
      label: 'Open Secrets Manager',
      icon: Key,
      category: 'Secrets',
      action: () => {
        // Open the secrets panel
        const store = useAppStore?.getState?.();
        store?.setActiveSidebarView?.('secrets');
      }
    }));

    cleanups.push(ui.registerCommand({
      id: 'secrets:add',
      label: 'Add New Secret',
      icon: Plus,
      category: 'Secrets',
      action: () => {
        context.ipc?.invoke?.('secrets:openAddDialog');
      }
    }));

    cleanups.push(ui.registerCommand({
      id: 'secrets:delete',
      label: 'Delete Secret',
      icon: Trash2,
      category: 'Secrets',
      action: () => {
        context.ipc?.invoke?.('secrets:openDeleteDialog');
      }
    }));

    cleanups.push(ui.registerCommand({
      id: 'secrets:reveal',
      label: 'Reveal Secret Value',
      icon: Eye,
      category: 'Secrets',
      action: () => {
        // Trigger reveal mode in the panel
        context.ipc?.send?.('secrets:toggleReveal', { reveal: true });
      }
    }));

    cleanups.push(ui.registerCommand({
      id: 'secrets:hide',
      label: 'Hide Secret Values',
      icon: EyeOff,
      category: 'Secrets',
      action: () => {
        context.ipc?.send?.('secrets:toggleReveal', { reveal: false });
      }
    }));

    cleanups.push(ui.registerCommand({
      id: 'secrets:lock',
      label: 'Lock Secrets Manager',
      icon: Lock,
      category: 'Secrets',
      action: () => {
        context.ipc?.invoke?.('secrets:lock');
      }
    }));

    cleanups.push(ui.registerCommand({
      id: 'secrets:unlock',
      label: 'Unlock Secrets Manager',
      icon: Unlock,
      category: 'Secrets',
      action: () => {
        context.ipc?.invoke?.('secrets:unlock');
      }
    }));
  }

  context._cleanups = cleanups;
};

export const deactivate = (context: any) => {
    console.log('[Secrets Manager] Deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};
