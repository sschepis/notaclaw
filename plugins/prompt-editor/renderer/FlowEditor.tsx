import React, { useMemo, useEffect } from 'react';
import ReactFlow, { 
    Background, 
    Controls, 
    MiniMap, 
    Connection,
    Edge,
    Node,
    ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PromptNode, ToolNode, LoopNode, ConditionNode } from './CustomNodes';

// CSS overrides to align ReactFlow's default white theme with the app's dark theme
const REACTFLOW_THEME_OVERRIDES = `
.react-flow {
    background: hsl(var(--background)) !important;
}
.react-flow__pane {
    background: hsl(var(--background)) !important;
}
.react-flow__background {
    background: hsl(var(--background)) !important;
}
.react-flow__node {
    color: hsl(var(--foreground));
}
.react-flow__node.selected {
    outline: none;
}
.react-flow__edge-path {
    stroke: hsl(var(--muted-foreground));
}
.react-flow__edge.selected .react-flow__edge-path {
    stroke: hsl(var(--primary));
}
.react-flow__edge-text {
    fill: hsl(var(--foreground));
}
.react-flow__edge-textbg {
    fill: hsl(var(--card));
}
.react-flow__controls {
    background: hsl(var(--card)) !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: 4px;
    box-shadow: none !important;
}
.react-flow__controls-button {
    background: hsl(var(--card)) !important;
    border-bottom: 1px solid hsl(var(--border)) !important;
    fill: hsl(var(--foreground)) !important;
    color: hsl(var(--foreground)) !important;
}
.react-flow__controls-button:hover {
    background: hsl(var(--accent)) !important;
}
.react-flow__controls-button svg {
    fill: hsl(var(--foreground)) !important;
}
.react-flow__controls-button svg path {
    fill: hsl(var(--foreground)) !important;
}
.react-flow__minimap {
    background: hsl(var(--card)) !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: 4px;
}
.react-flow__minimap-mask {
    fill: hsl(var(--background));
    opacity: 0.6;
}
.react-flow__attribution {
    background: transparent !important;
}
.react-flow__attribution a {
    color: hsl(var(--muted-foreground)) !important;
}
.react-flow__handle {
    background: hsl(var(--muted-foreground)) !important;
    border: 1px solid hsl(var(--border)) !important;
}
`;

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
    onDragOver
}) => {
    const nodeTypes = useMemo(() => ({
        prompt: PromptNode,
        tool: ToolNode,
        loop: LoopNode,
        condition: ConditionNode
    }), []);

    // Inject theme overrides into the document to override ReactFlow's default white backgrounds
    useEffect(() => {
        const styleId = 'reactflow-theme-overrides';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = REACTFLOW_THEME_OVERRIDES;
            document.head.appendChild(style);
        }
        return () => {
            const existing = document.getElementById(styleId);
            if (existing) {
                existing.remove();
            }
        };
    }, []);

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
                onInit={onInit}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background color="hsl(var(--border))" gap={16} />
                <Controls />
                <MiniMap nodeColor={() => 'hsl(var(--primary))'} />
            </ReactFlow>
        </div>
    );
};

export default FlowEditor;
