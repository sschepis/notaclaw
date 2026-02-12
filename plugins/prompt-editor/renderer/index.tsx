import React from 'react';
import { Workflow } from 'lucide-react';
import { ChainEditor } from './ChainEditor';
import { ChainListSidebar } from './ChainListSidebar';
import { usePromptEditorStore } from './store';

export function activate(context: any) {
    const { ui, useAppStore } = context;
    const cleanups: Array<() => void> = [];

    // Register Sidebar Panel
    if (ui.registerPanel) {
        cleanups.push(ui.registerPanel({
            id: 'prompt-editor-sidebar',
            name: 'Chains',
            icon: Workflow,
            component: () => <ChainListSidebar context={context} />,
            defaultLocation: 'left',
            defaultWeight: 0.2,
            enableClose: true
        }));
    }

    // Register Main View
    if (ui.registerNavigation) {
        cleanups.push(ui.registerNavigation({
            id: 'prompt-editor-nav',
            label: 'Prompt Editor',
            icon: Workflow,
            view: {
                id: 'prompt-editor-main',
                name: 'Prompt Editor',
                icon: Workflow,
                component: () => {
                    // When this component mounts, ensure the sidebar is open
                    React.useEffect(() => {
                         const store = useAppStore.getState();
                         store.setLayoutAction({
                             type: 'open',
                             component: 'prompt-editor-sidebar',
                             name: 'Chains',
                             icon: 'workflow'
                         });
                    }, []);
                    return <ChainEditor context={context} />;
                }
            },
            order: 40
        }));
    }

    // Ensure default chain exists
    if (context.ipc) {
        const store = usePromptEditorStore.getState();
        // We check if default chain exists, if not create it
        context.ipc.invoke('get-chain', 'default-agent-chain').catch(async () => {
            console.log('[PromptEditor] Creating default chain...');
            const defaultConfig = {
                prompts: [{ 
                    name: 'start', 
                    system: 'You are a helpful AI assistant.', 
                    user: '{{query}}' 
                }],
                tools: []
            };
            await context.ipc.invoke('save-chain', { id: 'default-agent-chain', config: defaultConfig });
            // Reload chains if the store is already initialized
            store.loadChains(context.ipc);
        });
    }

    context._cleanups = cleanups;
}

export function deactivate(context: any) {
    context._cleanups?.forEach((fn: any) => fn());
}
