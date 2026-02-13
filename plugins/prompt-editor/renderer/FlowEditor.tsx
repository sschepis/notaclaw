import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Connection,
    Edge,
    Node,
    ReactFlowInstance
} from 'reactflow';
import { PromptNode, ToolNode, LoopNode, ConditionNode, SubChainNode } from './CustomNodes';
import AnimatedEdge, { EDGE_ANIMATION_CSS } from './CustomEdge';

// Essential ReactFlow base CSS — injected at runtime because the CSS import
// gets extracted to bundle.css which PluginLoader now loads, but we inline
// the critical subset as a safety net to ensure nodes render properly.
const REACTFLOW_BASE_CSS = `
.react-flow { direction: ltr; width: 100%; height: 100%; overflow: hidden; position: relative; }
.react-flow__container { position: absolute; width: 100%; height: 100%; top: 0; left: 0; }
.react-flow__pane { z-index: 1; cursor: grab; }
.react-flow__pane.dragging { cursor: grabbing; }
.react-flow__viewport { transform-origin: 0 0; z-index: 2; pointer-events: none; }
.react-flow__renderer { z-index: 4; }
.react-flow__selection { z-index: 6; }
.react-flow .react-flow__edges { pointer-events: none; overflow: visible; }
.react-flow__edge-path, .react-flow__connection-path { stroke: #b1b1b7; stroke-width: 1; fill: none; }
.react-flow__edge { pointer-events: visibleStroke; cursor: pointer; }
.react-flow__edge.animated path { stroke-dasharray: 5; animation: dashdraw 0.5s linear infinite; }
.react-flow__edge.selected, .react-flow__edge:focus, .react-flow__edge:focus-visible { outline: none; }
.react-flow__edge-textwrapper { pointer-events: all; }
.react-flow__edge .react-flow__edge-text { pointer-events: none; user-select: none; }
.react-flow__connection { pointer-events: none; }
.react-flow__connectionline { z-index: 1001; }
.react-flow__nodes { pointer-events: none; transform-origin: 0 0; }
.react-flow__node { position: absolute; user-select: none; pointer-events: all; transform-origin: 0 0; box-sizing: border-box; cursor: grab; }
.react-flow__node.dragging { cursor: grabbing; }
.react-flow__nodesselection { z-index: 3; transform-origin: left top; pointer-events: none; }
.react-flow__nodesselection-rect { position: absolute; pointer-events: all; cursor: grab; }
.react-flow__handle { position: absolute; pointer-events: none; min-width: 5px; min-height: 5px; width: 6px; height: 6px; background: #1a192b; border: 1px solid white; border-radius: 100%; }
.react-flow__handle.connectionindicator { pointer-events: all; cursor: crosshair; }
.react-flow__handle-bottom { top: auto; left: 50%; bottom: -4px; transform: translate(-50%, 0); }
.react-flow__handle-top { left: 50%; top: -4px; transform: translate(-50%, 0); }
.react-flow__handle-left { top: 50%; left: -4px; transform: translate(0, -50%); }
.react-flow__handle-right { right: -4px; top: 50%; transform: translate(0, -50%); }
.react-flow__edgeupdater { cursor: move; pointer-events: all; }
.react-flow__panel { position: absolute; z-index: 5; margin: 15px; }
.react-flow__panel.top { top: 0; }
.react-flow__panel.bottom { bottom: 0; }
.react-flow__panel.left { left: 0; }
.react-flow__panel.right { right: 0; }
.react-flow__panel.center { left: 50%; transform: translateX(-50%); }
.react-flow__attribution { font-size: 10px; background: rgba(255,255,255,0.5); padding: 2px 3px; margin: 0; }
.react-flow__attribution a { text-decoration: none; color: #999; }
@keyframes dashdraw { from { stroke-dashoffset: 10; } }
.react-flow__edgelabel-renderer { position: absolute; width: 100%; height: 100%; pointer-events: none; user-select: none; }
.react-flow__node.selectable:focus, .react-flow__node.selectable:focus-visible { outline: none; }
.react-flow__nodesselection-rect:focus, .react-flow__nodesselection-rect:focus-visible { outline: none; }
.react-flow__controls { box-shadow: 0 0 2px 1px rgba(0,0,0,0.08); }
.react-flow__controls-button { border: none; background: #fefefe; border-bottom: 1px solid #eee; box-sizing: content-box; display: flex; justify-content: center; align-items: center; width: 16px; height: 16px; cursor: pointer; user-select: none; padding: 5px; }
.react-flow__controls-button:hover { background: #f4f4f4; }
.react-flow__controls-button svg { width: 100%; max-width: 12px; max-height: 12px; }
.react-flow__minimap { background-color: #fff; }
.react-flow__minimap svg { display: block; }
`;

// Dark theme overrides — uses hardcoded dark colors for reliability
// (CSS vars --card and --background are identical in the default dark theme,
// so nodes must use a distinct, brighter background to be visible)
const REACTFLOW_THEME_OVERRIDES = `
.react-flow {
    background: #0d0d1a !important;
}
.react-flow__pane {
    background: #0d0d1a !important;
}
.react-flow__background {
    background: #0d0d1a !important;
}
.react-flow__node {
    color: #e0e0f0;
}
.react-flow__node.selected {
    outline: none;
}
.react-flow__edge-path {
    stroke: #666688;
}
.react-flow__edge.selected .react-flow__edge-path {
    stroke: #6366f1;
}
.react-flow__edge-text {
    fill: #d0d0e0;
}
.react-flow__edge-textbg {
    fill: #1e1e38;
}
.react-flow__controls {
    background: #1e1e38 !important;
    border: 1px solid #3a3a5a !important;
    border-radius: 4px;
    box-shadow: none !important;
}
.react-flow__controls-button {
    background: #1e1e38 !important;
    border-bottom: 1px solid #3a3a5a !important;
    fill: #d0d0e0 !important;
    color: #d0d0e0 !important;
}
.react-flow__controls-button:hover {
    background: #2a2a5a !important;
}
.react-flow__controls-button svg {
    fill: #d0d0e0 !important;
}
.react-flow__controls-button svg path {
    fill: #d0d0e0 !important;
}
.react-flow__minimap {
    background: #1e1e38 !important;
    border: 1px solid #3a3a5a !important;
    border-radius: 4px;
}
.react-flow__minimap-mask {
    fill: #0d0d1a;
    opacity: 0.6;
}
.react-flow__attribution {
    background: transparent !important;
}
.react-flow__attribution a {
    color: #555 !important;
}
.react-flow__handle {
    background: #888 !important;
    border: 1px solid #3a3a5a !important;
}
.react-flow__background pattern line {
    stroke: #2a2a4a !important;
}
`;

// V7: Connection validation — which node types can connect to which
const VALID_TARGETS: Record<string, string[]> = {
    prompt: ['prompt', 'tool', 'loop', 'condition', 'subchain'],
    tool: ['prompt', 'tool', 'loop', 'condition', 'subchain'],
    loop: ['prompt', 'tool', 'loop', 'condition', 'subchain'],
    condition: ['prompt', 'tool', 'loop', 'condition', 'subchain'],
    subchain: ['prompt', 'tool', 'loop', 'condition', 'subchain'],
};

// V8: Minimap coloring by node type
const NODE_TYPE_COLORS: Record<string, string> = {
    prompt: '#6366f1',    // indigo
    tool: '#f59e0b',      // amber
    loop: '#8b5cf6',      // violet
    condition: '#ef4444', // red
    subchain: '#10b981',  // emerald
};

interface FlowEditorProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: any;
    onEdgesChange: any;
    onConnect: (connection: Connection) => void;
    onNodeClick: (event: React.MouseEvent, node: Node) => void;
    onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
    onPaneClick: (event: React.MouseEvent) => void;
    onInit: (instance: ReactFlowInstance) => void;
    onDrop: (event: React.DragEvent) => void;
    onDragOver: (event: React.DragEvent) => void;
    snapToGrid?: boolean;
    onNodeContextMenu?: (event: React.MouseEvent, node: Node) => void;
    onEdgeContextMenu?: (event: React.MouseEvent, edge: Edge) => void;
    onPaneContextMenu?: (event: React.MouseEvent) => void;
}

const FlowEditor: React.FC<FlowEditorProps> = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onInit,
    onDrop,
    onDragOver,
    snapToGrid = false,
    onNodeContextMenu,
    onEdgeContextMenu,
    onPaneContextMenu,
}) => {
    const nodeTypes = useMemo(() => ({
        prompt: PromptNode,
        tool: ToolNode,
        loop: LoopNode,
        condition: ConditionNode,
        subchain: SubChainNode
    }), []);

    const edgeTypes = useMemo(() => ({
        default: AnimatedEdge,
    }), []);

    // V7: Connection validation
    const isValidConnection = useCallback((connection: Connection) => {
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        if (!sourceNode || !targetNode) return false;
        // Prevent self-connections
        if (connection.source === connection.target) return false;
        const sourceType = sourceNode.type || 'prompt';
        const targetType = targetNode.type || 'prompt';
        const validTargets = VALID_TARGETS[sourceType];
        return validTargets ? validTargets.includes(targetType) : true;
    }, [nodes]);

    // V8: Minimap node color by type
    const minimapNodeColor = useCallback((node: Node) => {
        return NODE_TYPE_COLORS[node.type || 'prompt'] || '#6366f1';
    }, []);

    // Track if initial fitView has been done
    const hasFitView = useRef(false);
    const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

    // Inject base ReactFlow CSS + theme overrides + edge animation CSS
    useEffect(() => {
        const baseId = 'reactflow-base-css';
        if (!document.getElementById(baseId)) {
            const baseStyle = document.createElement('style');
            baseStyle.id = baseId;
            baseStyle.textContent = REACTFLOW_BASE_CSS;
            document.head.appendChild(baseStyle);
        }
        const themeId = 'reactflow-theme-overrides';
        if (!document.getElementById(themeId)) {
            const style = document.createElement('style');
            style.id = themeId;
            style.textContent = REACTFLOW_THEME_OVERRIDES + '\n' + EDGE_ANIMATION_CSS;
            document.head.appendChild(style);
        }
        return () => {
            const existing = document.getElementById(themeId);
            if (existing) existing.remove();
        };
    }, []);

    // Handle onInit: store instance ref and call parent
    const handleInit = useCallback((instance: ReactFlowInstance) => {
        rfInstanceRef.current = instance;
        onInit(instance);
    }, [onInit]);

    // Auto-fitView when nodes change (only on first non-empty load)
    useEffect(() => {
        if (nodes.length > 0 && !hasFitView.current && rfInstanceRef.current) {
            requestAnimationFrame(() => {
                rfInstanceRef.current?.fitView({ padding: 0.2, duration: 300 });
            });
            hasFitView.current = true;
        }
        if (nodes.length === 0) {
            hasFitView.current = false;
        }
    }, [nodes]);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onPaneClick={onPaneClick}
                onInit={handleInit}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                isValidConnection={isValidConnection}
                snapToGrid={snapToGrid}
                snapGrid={[16, 16]}
                deleteKeyCode={['Backspace', 'Delete']}
                onNodeContextMenu={onNodeContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                onPaneContextMenu={onPaneContextMenu}
            >
                <Background color="#2a2a4a" gap={16} />
                <Controls />
                <MiniMap nodeColor={minimapNodeColor} />
            </ReactFlow>
        </div>
    );
};

export default FlowEditor;
