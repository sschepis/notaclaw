import React from 'react';
import { RendererPluginContext } from '../../../src/shared/plugin-types';
import { VSCodePanel } from './components/VSCodePanel';
import { VSCodePairingFence } from './components/VSCodePairingFence';
import { VSCodeFooterIcon } from './components/VSCodeFooterIcon';

export const renderer = (context: RendererPluginContext) => {
    // Register the VS Code Control Panel
    context.ui.registerPanel({
        id: 'vscode-control-panel',
        name: 'VS Code',
        icon: 'code', // Lucide icon name
        component: () => <VSCodePanel context={context} />,
        defaultLocation: 'right',
        defaultWeight: 25,
        enableClose: true
    });

    // Register footer icon indicator showing connection & activity state
    // Wrapper conforms to SlotComponentProps<undefined> expected by nav:rail-footer slot
    const FooterIconSlot: React.FC<{ context: undefined; metadata?: Record<string, unknown> }> = () => (
        <VSCodeFooterIcon context={context} />
    );
    context.ui.registerSlot('nav:rail-footer', {
        component: FooterIconSlot,
        priority: 10,
        metadata: { pluginId: 'vscode-control' },
    });

    // Register the vscode-pairing fence renderer for inline pairing forms
    // Usage: ```vscode-pairing\n{ "host": "127.0.0.1", "port": 19876 }\n```
    try {
        const { useFenceStore } = (context as any).require('alephnet');
        const { registerRenderer } = useFenceStore.getState();
        registerRenderer({
            id: 'vscode-pairing-renderer',
            languages: ['vscode-pairing', 'vscode_pairing', 'vscodepair'],
            component: VSCodePairingFence,
            priority: 10,
        });
        console.log('[VSCode Control] Fence renderer registered for: vscode-pairing, vscode_pairing, vscodepair');
    } catch (e) {
        console.warn('[VSCode Control] Could not register fence renderer:', e);
    }
};
