import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ReactFlowProvider, Node, Edge } from 'reactflow';
import FlowEditor from './FlowEditor';
import NodeEditor from './NodeEditor';
import EdgeEditor from './EdgeEditor';
import { usePromptEditorStore } from './store';

// ═══════════════════════════════════════════════════════════════════════════
// V3: Context Menu Component
// ═══════════════════════════════════════════════════════════════════════════

interface ContextMenuProps {
    x: number;
    y: number;
    items: { label: string; icon: string; action: () => void; danger?: boolean }[];
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    useEffect(() => {
        const handler = () => onClose();
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [onClose]);

    return (
        <div
            style={{
                position: 'fixed',
                left: x,
                top: y,
                background: '#1e1e38',
                border: '1px solid #3a3a5a',
                borderRadius: 6,
                padding: 4,
                zIndex: 2000,
                minWidth: 160,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((item, idx) => (
                <button
                    key={idx}
                    onClick={() => { item.action(); onClose(); }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '6px 10px',
                        background: 'transparent',
                        border: 'none',
                        color: item.danger ? '#f87171' : '#d0d0e0',
                        cursor: 'pointer',
                        fontSize: 12,
                        textAlign: 'left',
                        borderRadius: 4,
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget.style.background = item.danger ? 'rgba(248,113,113,0.1)' : '#2a2a5a');
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget.style.background = 'transparent');
                    }}
                >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main ChainEditor
// ═══════════════════════════════════════════════════════════════════════════

interface ChainEditorProps {
    context?: any;
}

export const ChainEditor: React.FC<ChainEditorProps> = ({ context }) => {
    const {
        selectedChain,
        chainConfig,
        setChainConfig,
        status,
        viewMode,
        setViewMode,
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        setEdges,
        selectedNodeId,
        selectedEdgeId,
        setSelectedNodeId,
        setSelectedEdgeId,
        updateNodeData,
        updateEdgeData,
        saveChain,
        showRunModal,
        setShowRunModal,
        runInput,
        setRunInput,
        runResult,
        isRunning,
        runChain,
        layoutGraph,
        // V5: Undo/Redo
        undo,
        redo,
        undoStack,
        redoStack,
        pushHistory,
        // V6: Snap to grid
        snapToGrid,
        toggleSnapToGrid,
        // V3/V4: Node operations
        deleteSelectedNodes,
        duplicateNode,
        disconnectNode,
        copySelected,
        paste,
    } = usePromptEditorStore();

    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    // V3: Context menu state
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        type: 'node' | 'edge' | 'pane';
        targetId?: string;
    } | null>(null);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, [setSelectedNodeId]);

    const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        setSelectedEdgeId(edge.id);
    }, [setSelectedEdgeId]);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setContextMenu(null);
    }, [setSelectedNodeId, setSelectedEdgeId]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) {
                return;
            }

            if (!reactFlowInstance) {
                console.warn('[PromptEditor] reactFlowInstance not ready — cannot process drop');
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // Push undo history before changes
            pushHistory();

            // Handle template drops — creates multiple nodes and edges
            if (type === 'template') {
                const templateDataStr = event.dataTransfer.getData('application/template-data');
                if (templateDataStr) {
                    try {
                        const template = JSON.parse(templateDataStr);
                        const timestamp = Date.now();
                        const newNodes: Node[] = template.nodes.map((tn: any, idx: number) => ({
                            id: `${tn.type}-${timestamp}-${idx}`,
                            type: tn.type,
                            position: {
                                x: position.x + (tn.offsetX || idx * 250),
                                y: position.y + (tn.offsetY || 0),
                            },
                            data: { ...tn.data },
                        }));
                        const newEdges: Edge[] = (template.edges || []).map((te: any, idx: number) => ({
                            id: `edge-${timestamp}-${idx}`,
                            source: newNodes[te.sourceIdx]?.id,
                            target: newNodes[te.targetIdx]?.id,
                            label: te.label,
                            data: te.label ? { label: te.label } : undefined,
                        })).filter((e: any) => e.source && e.target);

                        setNodes((nds) => nds.concat(newNodes));
                        setEdges((eds) => eds.concat(newEdges));
                        return;
                    } catch (e) {
                        console.error('[PromptEditor] Failed to parse template data:', e);
                    }
                }
            }

            // Handle tool drops from Tool Library
            const toolDataStr = event.dataTransfer.getData('application/tool-data');
            if (type === 'tool' && toolDataStr) {
                try {
                    const toolInfo = JSON.parse(toolDataStr);
                    const newNode: Node = {
                        id: `tool-${Date.now()}`,
                        type: 'tool',
                        position,
                        data: {
                            label: toolInfo.tool.name || 'Tool',
                            nodeType: 'tool',
                            function: {
                                name: toolInfo.tool.name,
                                description: toolInfo.tool.description || '',
                                parameters: toolInfo.tool.parameters || {},
                                script: toolInfo.tool.script || '',
                            },
                        },
                    };
                    setNodes((nds) => nds.concat(newNode));
                    return;
                } catch (e) {
                    console.error('[PromptEditor] Failed to parse tool data:', e);
                }
            }

            // Default: create a simple node
            const newNode: Node = {
                id: `${type}-${Date.now()}`,
                type: type,
                position,
                data: {
                    label: type === 'prompt' ? 'New Prompt' : type === 'tool' ? 'New Tool' : type === 'loop' ? 'Loop' : type === 'condition' ? 'Condition' : 'Node',
                    name: type === 'prompt' ? `prompt_${Date.now()}` : undefined,
                    nodeType: type
                },
            };

            if (type === 'prompt') {
                newNode.data.system = '';
                newNode.data.user = '';
            } else if (type === 'tool') {
                newNode.data.function = { name: `tool_${Date.now()}`, script: '' };
            } else if (type === 'loop') {
                newNode.data.variable = 'items';
                newNode.data.itemVariable = 'item';
            } else if (type === 'condition') {
                newNode.data.expression = 'true';
            } else if (type === 'subchain') {
                newNode.data.label = 'Sub-Chain';
                newNode.data.chainRef = '';
            }

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes, setEdges, pushHistory]
    );

    // V3: Context menu handlers
    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        setSelectedNodeId(node.id);
        setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', targetId: node.id });
    }, [setSelectedNodeId]);

    const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.preventDefault();
        setSelectedEdgeId(edge.id);
        setContextMenu({ x: event.clientX, y: event.clientY, type: 'edge', targetId: edge.id });
    }, [setSelectedEdgeId]);

    const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, type: 'pane' });
    }, []);

    // V3: Build context menu items
    const getContextMenuItems = () => {
        if (!contextMenu) return [];
        const items: { label: string; icon: string; action: () => void; danger?: boolean }[] = [];

        if (contextMenu.type === 'node' && contextMenu.targetId) {
            const nodeId = contextMenu.targetId;
            items.push(
                { label: 'Duplicate', icon: '📋', action: () => duplicateNode(nodeId) },
                { label: 'Copy', icon: '📄', action: () => copySelected() },
                { label: 'Disconnect All', icon: '🔌', action: () => disconnectNode(nodeId) },
                { label: 'Delete', icon: '🗑️', action: () => deleteSelectedNodes(), danger: true },
            );
        } else if (contextMenu.type === 'edge') {
            items.push(
                { label: 'Delete Edge', icon: '🗑️', action: () => deleteSelectedNodes(), danger: true },
            );
        } else if (contextMenu.type === 'pane') {
            items.push(
                { label: 'Paste', icon: '📋', action: () => paste() },
                { label: 'Auto-Layout', icon: '✨', action: () => layoutGraph() },
                { label: 'Toggle Grid Snap', icon: snapToGrid ? '🔲' : '⬜', action: () => toggleSnapToGrid() },
            );
        }

        return items;
    };

    // V4: Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't intercept if user is typing in an input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            if (viewMode !== 'graph') return;

            const isMeta = e.metaKey || e.ctrlKey;

            // Delete/Backspace — delete selected
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedNodeId || selectedEdgeId) {
                    deleteSelectedNodes();
                    e.preventDefault();
                }
            }
            // Ctrl+Z — undo
            else if (isMeta && e.key === 'z' && !e.shiftKey) {
                undo();
                e.preventDefault();
            }
            // Ctrl+Shift+Z or Ctrl+Y — redo
            else if (isMeta && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
                redo();
                e.preventDefault();
            }
            // Ctrl+C — copy
            else if (isMeta && e.key === 'c') {
                copySelected();
                e.preventDefault();
            }
            // Ctrl+V — paste
            else if (isMeta && e.key === 'v') {
                paste();
                e.preventDefault();
            }
            // Ctrl+D — duplicate
            else if (isMeta && e.key === 'd' && selectedNodeId) {
                duplicateNode(selectedNodeId);
                e.preventDefault();
            }
            // Ctrl+S — save
            else if (isMeta && e.key === 's') {
                saveChain(context?.ipc);
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [viewMode, selectedNodeId, selectedEdgeId, undo, redo, copySelected, paste, duplicateNode, deleteSelectedNodes, saveChain, context]);

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    const selectedEdge = edges.find(e => e.id === selectedEdgeId);

    if (!selectedChain) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                gap: 12,
                background: '#1a1a2e',
                color: '#e0e0e0',
                fontFamily: 'sans-serif'
            }}>
                <div style={{ fontSize: 48, opacity: 0.15 }}>⛓</div>
                <div style={{ color: '#666', fontSize: 15 }}>Select a chain from the sidebar to begin editing</div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', background: '#1a1a2e', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
            {/* Detail header bar */}
            <div style={{
                padding: '8px 16px',
                background: '#1e1e38',
                borderBottom: '1px solid #2a2a4a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                minHeight: 44,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <strong style={{ fontSize: 15, color: '#f0f0f0' }}>{selectedChain}</strong>
                    <span style={{
                        fontSize: 12,
                        color: status.startsWith('Error') ? '#ff6666' : '#80ff80',
                        fontStyle: 'italic',
                    }}>{status}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* V5: Undo/Redo buttons */}
                    <button
                        onClick={undo}
                        disabled={undoStack.length === 0}
                        title="Undo (Ctrl+Z)"
                        style={{
                            padding: '5px 8px',
                            background: '#1e1e3a',
                            color: undoStack.length > 0 ? '#aaa' : '#444',
                            border: '1px solid #2a2a4a',
                            borderRadius: 4,
                            cursor: undoStack.length > 0 ? 'pointer' : 'default',
                            fontSize: 14,
                        }}
                    >↩</button>
                    <button
                        onClick={redo}
                        disabled={redoStack.length === 0}
                        title="Redo (Ctrl+Shift+Z)"
                        style={{
                            padding: '5px 8px',
                            background: '#1e1e3a',
                            color: redoStack.length > 0 ? '#aaa' : '#444',
                            border: '1px solid #2a2a4a',
                            borderRadius: 4,
                            cursor: redoStack.length > 0 ? 'pointer' : 'default',
                            fontSize: 14,
                        }}
                    >↪</button>

                    {/* Divider */}
                    <div style={{ width: 1, height: 20, background: '#2a2a4a' }} />

                    {/* V6: Snap to grid toggle */}
                    <button
                        onClick={toggleSnapToGrid}
                        title={`Snap to Grid: ${snapToGrid ? 'ON' : 'OFF'}`}
                        style={{
                            padding: '5px 10px',
                            background: snapToGrid ? '#3a3a8a' : '#1e1e3a',
                            color: snapToGrid ? '#8888ff' : '#666',
                            border: `1px solid ${snapToGrid ? '#4a4aaa' : '#2a2a4a'}`,
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                        }}
                    >⊞ Grid</button>

                    {/* Auto-layout */}
                    <button
                        onClick={layoutGraph}
                        style={{
                            padding: '5px 12px',
                            background: '#1e1e3a',
                            color: '#aaa',
                            border: '1px solid #2a2a4a',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                        }}
                        title="Auto-layout nodes"
                    >✨ Clean Up</button>

                    {/* View mode toggle */}
                    <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', border: '1px solid #2a2a4a' }}>
                        <button
                            onClick={() => setViewMode('graph')}
                            style={{
                                padding: '5px 12px',
                                background: viewMode === 'graph' ? '#3a3aff' : '#1e1e3a',
                                color: viewMode === 'graph' ? '#fff' : '#aaa',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 500,
                            }}
                        >Graph</button>
                        <button
                            onClick={() => setViewMode('json')}
                            style={{
                                padding: '5px 12px',
                                background: viewMode === 'json' ? '#3a3aff' : '#1e1e3a',
                                color: viewMode === 'json' ? '#fff' : '#aaa',
                                border: 'none',
                                borderLeft: '1px solid #2a2a4a',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 500,
                            }}
                        >JSON</button>
                    </div>

                    <button
                        onClick={() => setShowRunModal(true)}
                        style={{
                            padding: '5px 14px',
                            background: '#2a6a2a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    >▶ Run</button>

                    <button
                        onClick={() => saveChain(context?.ipc)}
                        style={{
                            padding: '5px 14px',
                            background: '#3a3aff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    >Save</button>
                </div>
            </div>

            {/* Editor content area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    {viewMode === 'graph' ? (
                        <ReactFlowProvider>
                            <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
                                <FlowEditor
                                    nodes={nodes}
                                    edges={edges}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange}
                                    onConnect={onConnect}
                                    onNodeClick={onNodeClick}
                                    onEdgeClick={onEdgeClick}
                                    onPaneClick={onPaneClick}
                                    onInit={setReactFlowInstance}
                                    onDrop={onDrop}
                                    onDragOver={onDragOver}
                                    snapToGrid={snapToGrid}
                                    onNodeContextMenu={onNodeContextMenu}
                                    onEdgeContextMenu={onEdgeContextMenu}
                                    onPaneContextMenu={onPaneContextMenu}
                                />
                            </div>
                        </ReactFlowProvider>
                    ) : (
                        <textarea
                            value={chainConfig}
                            onChange={e => setChainConfig(e.target.value)}
                            style={{
                                width: '100%',
                                height: '100%',
                                fontFamily: 'monospace',
                                padding: 14,
                                border: 'none',
                                resize: 'none',
                                background: '#1a1a2e',
                                color: '#d0d0e0',
                                fontSize: 13,
                                lineHeight: 1.5,
                                boxSizing: 'border-box',
                                outline: 'none',
                            }}
                        />
                    )}
                </div>

                {/* Property Panel (right edge) */}
                {viewMode === 'graph' && (selectedNode || selectedEdge) && (
                    <div style={{
                        width: 300,
                        borderLeft: '1px solid #2a2a4a',
                        background: '#16162a',
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto',
                    }}>
                        {selectedNode && (
                            <NodeEditor node={selectedNode} onChange={(id, data) => updateNodeData(id, data)} />
                        )}
                        {selectedEdge && (
                            <EdgeEditor edge={selectedEdge} onChange={(id, data) => updateEdgeData(id, data)} />
                        )}
                    </div>
                )}
            </div>

            {/* V3: Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getContextMenuItems()}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* Run Modal */}
            {showRunModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#1e1e38', color: '#e0e0e0', padding: 24, borderRadius: 8, width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid #2a2a4a', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                        <h3 style={{ marginTop: 0, fontSize: 16, color: '#f0f0f0' }}>Run Chain: {selectedChain}</h3>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>Input JSON:</label>
                            <textarea
                                value={runInput}
                                onChange={e => setRunInput(e.target.value)}
                                style={{ width: '100%', height: 100, fontFamily: 'monospace', marginTop: 5, background: '#16162a', color: '#d0d0e0', border: '1px solid #2a2a4a', borderRadius: 4, padding: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
                            />
                        </div>
                        <div style={{ marginBottom: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>Result:</label>
                            <pre style={{ background: '#16162a', color: '#d0d0e0', padding: 10, borderRadius: 4, overflow: 'auto', flex: 1, maxHeight: 200, border: '1px solid #2a2a4a', fontSize: 12, margin: '5px 0 0' }}>{runResult}</pre>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setShowRunModal(false)} style={{ padding: '8px 16px', background: '#2a2a4a', color: '#d0d0e0', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Close</button>
                            <button onClick={() => runChain(context?.ipc)} disabled={isRunning} style={{ padding: '8px 16px', background: '#2a6a2a', color: '#fff', border: 'none', borderRadius: 4, opacity: isRunning ? 0.7 : 1, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{isRunning ? 'Running...' : '▶ Run'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* V4: Keyboard shortcut hint bar */}
            {viewMode === 'graph' && (
                <div style={{
                    padding: '3px 16px',
                    background: '#12122a',
                    borderTop: '1px solid #2a2a4a',
                    display: 'flex',
                    gap: 16,
                    fontSize: 10,
                    color: '#555',
                    flexShrink: 0,
                }}>
                    <span>⌘Z Undo</span>
                    <span>⌘⇧Z Redo</span>
                    <span>⌘C Copy</span>
                    <span>⌘V Paste</span>
                    <span>⌘D Duplicate</span>
                    <span>⌫ Delete</span>
                    <span>⌘S Save</span>
                    <span style={{ marginLeft: 'auto', color: snapToGrid ? '#6366f1' : '#444' }}>
                        Grid: {snapToGrid ? 'ON' : 'OFF'}
                    </span>
                </div>
            )}
        </div>
    );
};
