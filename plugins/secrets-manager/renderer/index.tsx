import React from 'react';
import { Key } from 'lucide-react';
import { SecretsSidebar } from './components/SecretsSidebar';

export const activate = (context: any) => {
  console.log('[Secrets Manager] Activated');
  const { ui } = context;

  // 1. Register the Sidebar Component to the 'sidebar:view:secrets' slot
  // This allows Sidebar.tsx to render it when activeSidebarView === 'secrets'
  const cleanupSlot = ui.registerSlot('sidebar:view:secrets', {
    component: SecretsSidebar,
    priority: 100
  });

  // 2. Register Navigation Button
  // We use view.id = 'secrets' so that when clicked, activeSidebarView becomes 'secrets'
  // Sidebar.tsx then sees 'secrets' and renders the slot we registered above.
  const cleanupNav = ui.registerNavigation({
    id: 'secrets-nav-btn',
    label: 'Secrets',
    icon: Key,
    view: {
        id: 'secrets',
        name: 'Secrets Manager',
        icon: Key,
        // We provide a dummy component here because registerNavigation expects one,
        // but Sidebar.tsx uses the slot mechanism for the 'secrets' view ID.
        component: () => null 
    },
    order: 900
  });

  context._cleanups = [cleanupSlot, cleanupNav];
};

export const deactivate = (context: any) => {
    console.log('[Secrets Manager] Deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};
