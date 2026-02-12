import React, { useCallback, useRef, useState } from 'react';
import { useNodesState, useEdgesState, ReactFlowProvider, Node, Edge, Connection } from 'reactflow';
import FlowEditor from './FlowEditor';
import NodeEditor from './NodeEditor';
import EdgeEditor from './EdgeEditor';
import { usePromptEditorStore } from './store';

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
        layoutGraph
    } = usePromptEditorStore();

    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, [setSelectedNodeId]);

    const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        setSelectedEdgeId(edge.id);
    }, [setSelectedEdgeId]);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
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

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: `${type}-${Date.now()}`,
                type: type,
                position,
                data: {
                    label: type === 'prompt' ? 'New Prompt' : 'New Tool',
                    name: type === 'prompt' ? `prompt_${Date.now()}` : undefined,
                    nodeType: type
                },
            };

            // Initialize defaults
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
            }

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* View mode toggle */}
                    <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', border: '1px solid #2a2a4a' }}>
                        <button
                            onClick={layoutGraph}
                            style={{
                                padding: '5px 12px',
                                background: '#1e1e3a',
                                color: '#aaa',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 500,
                                borderRight: '1px solid #2a2a4a'
                            }}
                            title="Auto-layout nodes"
                        >✨ Clean Up</button>
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
        </div>
    );
};
