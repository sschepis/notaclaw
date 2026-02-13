import React from 'react';
import { Workflow, Wrench, BookTemplate, Bug, TestTube2, Coins } from 'lucide-react';
import { ChainEditor } from './ChainEditor';
import { ChainListSidebar } from './ChainListSidebar';
import { usePromptEditorStore } from './store';
import ToolLibraryPanel from './panels/ToolLibraryPanel';
import TemplateLibraryPanel from './panels/TemplateLibraryPanel';
import DebuggerPanel from './panels/DebuggerPanel';
import TestCasesPanel from './panels/TestCasesPanel';
import TokenEstimationPanel from './panels/TokenEstimationPanel';

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

    // Register Bottom Panel Tabs
    if (ui.registerBottomPanelTab) {
        cleanups.push(ui.registerBottomPanelTab({
            id: 'prompt-editor-tools',
            name: 'Tools',
            icon: Wrench,
            component: ToolLibraryPanel,
            priority: 10,
            enableClose: true,
        }));

        cleanups.push(ui.registerBottomPanelTab({
            id: 'prompt-editor-templates',
            name: 'Templates',
            icon: BookTemplate,
            component: TemplateLibraryPanel,
            priority: 20,
            enableClose: true,
        }));

        cleanups.push(ui.registerBottomPanelTab({
            id: 'prompt-editor-debugger',
            name: 'Debugger',
            icon: Bug,
            component: DebuggerPanel,
            priority: 30,
            enableClose: true,
        }));

        cleanups.push(ui.registerBottomPanelTab({
            id: 'prompt-editor-tests',
            name: 'Test Cases',
            icon: TestTube2,
            component: TestCasesPanel,
            priority: 40,
            enableClose: true,
        }));

        cleanups.push(ui.registerBottomPanelTab({
            id: 'prompt-editor-tokens',
            name: 'Tokens & Cost',
            icon: Coins,
            component: TokenEstimationPanel,
            priority: 50,
            enableClose: true,
        }));
    }

    // Ensure default chain exists
    if (context.ipc) {
        const store = usePromptEditorStore.getState();
        store.initListeners(context.ipc);
        store.loadTools(context.ipc);
        
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
