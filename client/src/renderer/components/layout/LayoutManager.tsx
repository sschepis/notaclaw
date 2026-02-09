import React, { useCallback, useState, useEffect } from 'react';
import { Layout, Model, TabNode, IJsonModel, Actions, Action, DockLocation } from 'flexlayout-react';
import { Sidebar as SidebarIcon, Activity, Users, Box, MessageSquare, Database, Zap, Bot, AppWindow } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Stage } from './Stage';
import { Inspector } from './Inspector';
import { GroupsStage } from '../groups/GroupsStage';
import { MemoryFieldViewer } from '../memory/MemoryFieldViewer';
import { ServicesPanel } from '../services/ServicesPanel';
import { defaultLayout } from './layout-config';
import { useAppStore } from '../../store/useAppStore';
import { useSlotRegistry, usePluginPanels } from '../../services/SlotRegistry';
import { SlotErrorBoundary } from '../ui/SlotErrorBoundary';

interface LayoutManagerProps {
    mode: 'chat' | 'canvas';
    inspectorOpen: boolean;
    setInspectorOpen: (open: boolean) => void;
}

export const LayoutManager: React.FC<LayoutManagerProps> = ({ mode, inspectorOpen, setInspectorOpen }) => {
    const [model, setModel] = useState<Model | null>(null);
    const { activeSidebarView, layoutAction, setLayoutAction } = useAppStore();

    useEffect(() => {
        // Load from local storage or use default
        const savedLayout = localStorage.getItem('alephnet-layout-v4');
        let jsonModel: IJsonModel = defaultLayout;

        if (savedLayout) {
            try {
                jsonModel = JSON.parse(savedLayout);
            } catch (e) {
                console.error("Failed to parse saved layout", e);
            }
        }

        const newModel = Model.fromJson(jsonModel);
        setModel(newModel);
    }, []);

    // Handle Layout Actions (Open Tabs)
    useEffect(() => {
        if (!model || !layoutAction) return;

        if (layoutAction.type === 'open') {
            const existingNode = model.getNodeById(layoutAction.component);
            if (existingNode) {
                model.doAction(Actions.selectTab(layoutAction.component));
            } else {
                // Add to stage-panel (center)
                // If stage-panel doesn't exist (e.g. user closed all tabs), add to root
                const parentId = model.getNodeById("stage-panel") ? "stage-panel" : "root";
                
                model.doAction(Actions.addNode({
                    type: "tab",
                    name: layoutAction.name,
                    component: layoutAction.component,
                    enableClose: true,
                    id: layoutAction.component,
                    // @ts-ignore
                    icon: layoutAction.icon || "stage"
                }, parentId, DockLocation.CENTER, -1));
            }
            setLayoutAction(null);
        }
    }, [layoutAction, model, setLayoutAction]);

    // Sync Sidebar Tab Name with Active View
    useEffect(() => {
        if (!model) return;
        const sidebarNode = model.getNodeById('sidebar') as TabNode;
        if (sidebarNode) {
            const nameMap: Record<string, string> = {
                'extensions': 'EXTENSIONS',
                'friends': 'FRIENDS',
                'tasks': 'TASKS',
                'messages': 'MESSAGES',
                'groups': 'GROUPS',
                'memory': 'MEMORY',
                'coherence': 'COHERENCE',
                'agents': 'AGENTS'
            };
            const newName = nameMap[activeSidebarView] || 'SIDEBAR';
            if (sidebarNode.getName() !== newName) {
                model.doAction(Actions.renameTab("sidebar", newName));
            }
        }
    }, [activeSidebarView, model]);

    useEffect(() => {
        if (!model) return;
        
        const inspectorNode = model.getNodeById('inspector');
        
        if (inspectorOpen && !inspectorNode) {
            model.doAction(Actions.addNode({
                type: "tab",
                name: "INSPECTOR",
                component: "inspector",
                enableClose: true,
                id: "inspector",
                // @ts-ignore
                icon: "inspector"
            }, "root", DockLocation.RIGHT, 0.25));
        } else if (!inspectorOpen && inspectorNode) {
            model.doAction(Actions.deleteTab("inspector"));
        } else if (inspectorOpen && inspectorNode) {
             model.doAction(Actions.selectTab("inspector"));
        }
    }, [inspectorOpen, model]);

    // Get plugin-registered panels
    const pluginPanels = usePluginPanels();
    const stageViews = useSlotRegistry((state) => state.stageViews);

    const factory = useCallback((node: TabNode) => {
        const component = node.getComponent();
        
        // Check built-in components first
        switch (component) {
            case "sidebar":
                return <div className="flex-1 min-h-0 w-full overflow-hidden bg-background/50 flex flex-col"><Sidebar /></div>;
            case "stage":
                return <div className="h-full w-full overflow-hidden bg-background flex flex-col"><Stage mode={mode} /></div>;
            case "inspector":
                return <div className="flex-1 min-h-0 w-full overflow-hidden bg-background/50 flex flex-col"><Inspector /></div>;
            case "groups":
                return <div className="flex-1 min-h-0 w-full overflow-hidden bg-background flex flex-col"><GroupsStage /></div>;
            case "memory-viewer":
                return <div className="flex-1 min-h-0 w-full overflow-hidden bg-background flex flex-col"><MemoryFieldViewer /></div>;
        }
        
        // Check for plugin-registered panels
        const pluginPanel = pluginPanels.find(p => p.id === component);
        if (pluginPanel) {
            const PanelComponent = pluginPanel.component;
            return (
                <div className="flex-1 min-h-0 w-full overflow-hidden bg-background/50 flex flex-col">
                    <SlotErrorBoundary slotId="layout:panel" extensionId={pluginPanel.id}>
                        <PanelComponent />
                    </SlotErrorBoundary>
                </div>
            );
        }
        
        // Check for plugin-registered stage views
        const stageView = component ? stageViews[component] : undefined;
        if (stageView) {
            const ViewComponent = stageView.component;
            return (
                <div className="flex-1 min-h-0 w-full overflow-hidden bg-background flex flex-col">
                    <SlotErrorBoundary slotId="layout:stage-view" extensionId={stageView.id}>
                        <ViewComponent />
                    </SlotErrorBoundary>
                </div>
            );
        }
        
        return <div className="p-4 text-muted-foreground">Unknown Component: {component}</div>;
    }, [mode, pluginPanels, stageViews]);

    const onRenderTab = useCallback((node: TabNode, renderValues: any) => {
        const iconName = node.getIcon();
        const nodeName = node.getName();
        let Icon = null;
        
        // Dynamic icons based on name or ID
        if (node.getId() === "sidebar") {
             // Map sidebar icons based on name (synced from store)
             if (nodeName === 'EXTENSIONS') Icon = Box;
             else if (nodeName === 'FRIENDS') Icon = Users;
             else if (nodeName === 'MESSAGES') Icon = MessageSquare;
             else if (nodeName === 'MEMORY') Icon = Database;
             else if (nodeName === 'AGENTS') Icon = Bot;
             else if (nodeName === 'COHERENCE') Icon = Zap;
             else Icon = SidebarIcon;
        }
        else if (iconName === "stage") Icon = AppWindow;
        else if (iconName === "groups") Icon = Users;
        else if (iconName === "inspector") Icon = Activity;
        
        if (Icon) {
             renderValues.content = (
                 <div className="flex items-center gap-2 select-none">
                     <Icon size={13} className="text-muted-foreground opacity-70" />
                     <span className="mt-[1px] font-semibold">{nodeName}</span>
                 </div>
             );
        } else {
             renderValues.content = (
                 <div className="flex items-center gap-2 select-none">
                     <span className="mt-[1px] font-semibold">{nodeName}</span>
                 </div>
             );
        }
    }, []);

    const onModelChange = useCallback((newModel: Model) => {
        localStorage.setItem('alephnet-layout-v4', JSON.stringify(newModel.toJson()));
    }, []);

    const onAction = useCallback((action: Action) => {
        if (action.type === "FlexLayout_DeleteTab") {
             // @ts-ignore
             if (action.data.node === "inspector") {
                 setInspectorOpen(false);
             }
        }
        return action;
    }, [setInspectorOpen]);

    if (!model) return null;

    return (
        <div className="flex-1 relative h-full w-full bg-background">
            <Layout
                model={model}
                factory={factory}
                onRenderTab={onRenderTab}
                onModelChange={onModelChange}
                onAction={onAction}
                classNameMapper={(className) => {
                    if (className === "flexlayout__tab_set_header") return "bg-card border-b border-border";
                    return className;
                }}
            />
        </div>
    );
};
