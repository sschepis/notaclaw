import React, { useCallback, useState, useEffect } from 'react';
import { Layout, Model, TabNode, IJsonModel, Actions, Action, DockLocation } from 'flexlayout-react';
import { Sidebar as SidebarIcon, Activity, Users, Box, MessageSquare, Database, Zap, Bot, AppWindow } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Stage } from './Stage';
import { Inspector } from './Inspector';
import { GroupsStage } from '../groups/GroupsStage';
import { MemoryFieldViewer } from '../memory/MemoryFieldViewer';
import { MarketplaceStage } from '../marketplace/MarketplaceStage';
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
        // Clear old layout versions to ensure clean slate
        localStorage.removeItem('alephnet-layout-v4');
        localStorage.removeItem('alephnet-layout-v3');
        localStorage.removeItem('alephnet-layout-v2');
        localStorage.removeItem('alephnet-layout');
        
        // Load from local storage or use default
        // Bump version to v5 to reset corrupted layouts
        const savedLayout = localStorage.getItem('alephnet-layout-v5');
        let jsonModel: IJsonModel = defaultLayout;

        if (savedLayout) {
            try {
                const parsed = JSON.parse(savedLayout);
                // Validate that the layout has required structure - must have stage-panel
                if (parsed && parsed.layout && JSON.stringify(parsed).includes('stage-panel')) {
                    jsonModel = parsed;
                } else {
                    console.log("Saved layout missing stage-panel, using default");
                    localStorage.removeItem('alephnet-layout-v5');
                }
            } catch (e) {
                console.error("Failed to parse saved layout, using default", e);
                localStorage.removeItem('alephnet-layout-v5');
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
                // Find a suitable parent to add the tab to
                // Priority: stage-panel > sidebar's sibling area > root
                let parentId = "root";
                let dockLocation = DockLocation.CENTER;
                
                const stagePanelNode = model.getNodeById("stage-panel");
                if (stagePanelNode) {
                    parentId = "stage-panel";
                } else {
                    // No stage-panel exists - add to the right of sidebar's parent
                    const sidebarNode = model.getNodeById("sidebar");
                    if (sidebarNode) {
                        const sidebarParent = sidebarNode.getParent();
                        const sidebarGrandparent = sidebarParent?.getParent();
                        if (sidebarGrandparent) {
                            // Add to the row containing the sidebar, docking to the right
                            parentId = sidebarGrandparent.getId() || "root";
                            dockLocation = DockLocation.RIGHT;
                        }
                    }
                }
                
                model.doAction(Actions.addNode({
                    type: "tab",
                    name: layoutAction.name,
                    component: layoutAction.component,
                    enableClose: true,
                    id: layoutAction.component,
                    // @ts-ignore
                    icon: layoutAction.icon || "stage"
                }, parentId, dockLocation, -1));
            }
            setLayoutAction(null);
        }
    }, [layoutAction, model, setLayoutAction]);

    // Sync Sidebar Tab Name with Active View and ensure it's open
    useEffect(() => {
        if (!model) return;
        
        // Ensure sidebar exists
        let sidebarNode = model.getNodeById('sidebar') as TabNode;
        if (!sidebarNode) {
             model.doAction(Actions.addNode({
                type: "tab",
                name: "SIDEBAR",
                component: "sidebar",
                enableClose: true,
                id: "sidebar",
                // @ts-ignore
                icon: "sidebar"
            }, "root", DockLocation.LEFT, 0.2));
            sidebarNode = model.getNodeById('sidebar') as TabNode;
        } else {
            // Ensure it's visible/selected if it exists but might be in background
            model.doAction(Actions.selectTab("sidebar"));
        }

        if (sidebarNode) {
            const nameMap: Record<string, string> = {
                'extensions': 'EXTENSIONS',
                'friends': 'FRIENDS',
                'tasks': 'TASKS',
                'messages': 'MESSAGES',
                'groups': 'GROUPS',
                'memory': 'MEMORY',
                'coherence': 'COHERENCE',
                'agents': 'AGENTS',
                'services': 'SERVICES',
                'marketplace': 'MARKETPLACE'
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
            case "marketplace-stage":
                return <div className="flex-1 min-h-0 w-full overflow-hidden bg-background flex flex-col"><MarketplaceStage /></div>;
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
             else if (nodeName === 'MARKETPLACE') Icon = Zap;
             else Icon = SidebarIcon;
        }
        else if (iconName === "stage") Icon = AppWindow;
        else if (iconName === "groups") Icon = Users;
        else if (iconName === "inspector") Icon = Activity;
        else if (iconName === "zap") Icon = Zap;
        
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
        localStorage.setItem('alephnet-layout-v5', JSON.stringify(newModel.toJson()));
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
