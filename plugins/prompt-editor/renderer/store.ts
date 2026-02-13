import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Position } from 'reactflow';
import { jsonToGraph, graphToJson, validateChain } from './utils';
import dagre from 'dagre';

export interface ChainMeta {
    id: string;
    description?: string;
    promptCount?: number;
    toolCount?: number;
}

// V5: Undo/Redo history entry
interface HistoryEntry {
    nodes: Node[];
    edges: Edge[];
}

const MAX_HISTORY = 50;

interface PromptEditorState {
    chains: ChainMeta[];
    selectedChain: string | null;
    chainConfig: string;
    status: string;
    viewMode: 'json' | 'graph';
    sidebarFilter: string;
    availableTools: any[];
    
    // Graph state
    nodes: Node[];
    edges: Edge[];
    selectedNodeId: string | null;
    selectedEdgeId: string | null;

    // Run state
    showRunModal: boolean;
    runInput: string;
    runResult: string;
    isRunning: boolean;
    executionStatus: Record<string, { status: 'pending' | 'running' | 'completed' | 'error', result?: any, error?: string }>;

    // New chain modal
    showNewChainModal: boolean;
    newChainId: string;
    
    // Delete confirm
    deleteConfirmId: string | null;

    // V5: Undo/redo
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];

    // V6: Snap to grid
    snapToGrid: boolean;

    // V3: Clipboard for copy/paste
    clipboard: { nodes: Node[]; edges: Edge[] } | null;

    // Actions
    setChains: (chains: ChainMeta[]) => void;
    loadChains: (ipc: any) => Promise<void>;
    loadTools: (ipc: any) => Promise<void>;
    initListeners: (ipc: any) => void;
    loadChain: (id: string, ipc: any) => Promise<void>;
    saveChain: (ipc: any) => Promise<void>;
    deleteChain: (id: string, ipc: any) => Promise<void>;
    createChain: (id: string, ipc: any) => Promise<void>;
    
    layoutGraph: () => void;
    
    setChainConfig: (config: string) => void;
    setViewMode: (mode: 'json' | 'graph') => void;
    setSidebarFilter: (filter: string) => void;
    
    // Graph actions
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
    setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
    updateNodeData: (id: string, data: any) => void;
    updateEdgeData: (id: string, data: any) => void;
    addNode: (node: Node) => void;
    deleteSelectedNodes: () => void;
    duplicateNode: (nodeId: string) => void;
    disconnectNode: (nodeId: string) => void;

    // V5: Undo/Redo
    pushHistory: () => void;
    undo: () => void;
    redo: () => void;

    // V6: Snap to grid
    toggleSnapToGrid: () => void;

    // V3: Copy/Paste
    copySelected: () => void;
    paste: (position?: { x: number; y: number }) => void;

    // UI actions
    setShowRunModal: (show: boolean) => void;
    setRunInput: (input: string) => void;
    runChain: (ipc: any) => Promise<void>;
    setShowNewChainModal: (show: boolean) => void;
    setNewChainId: (id: string) => void;
    setDeleteConfirmId: (id: string | null) => void;
    setStatus: (status: string) => void;
}

export const usePromptEditorStore = create<PromptEditorState>((set, get) => ({
    chains: [],
    selectedChain: null,
    chainConfig: '{}',
    status: '',
    viewMode: 'graph',
    sidebarFilter: '',
    availableTools: [],
    
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,

    showRunModal: false,
    runInput: '{\n  "query": "Hello world"\n}',
    runResult: '',
    isRunning: false,
    executionStatus: {},

    showNewChainModal: false,
    newChainId: '',
    deleteConfirmId: null,

    // V5: Undo/Redo
    undoStack: [],
    redoStack: [],

    // V6: Snap to grid
    snapToGrid: false,

    // V3: Clipboard
    clipboard: null,

    setChains: (chains) => set({ chains }),
    
    initListeners: (ipc) => {
        if (!ipc) return;
        
        // We need to be careful not to add multiple listeners
        // But the IPC wrapper usually handles this or we can just rely on this being called once
        
        ipc.on('chain-execution-update', (data: any) => {
             const { nodes } = get();
             const { type, nodeId, result, error } = data;
             
             // Find node by name (prompt name or function name)
             const targetNode = nodes.find(n => 
                 n.data.name === nodeId || 
                 (n.data.function && n.data.function.name === nodeId)
             );
             
             if (!targetNode) return;
             
             set(state => {
                 const newStatus = { ...state.executionStatus };
                 
                 if (type === 'node-start') {
                     newStatus[targetNode.id] = { status: 'running' };
                 } else if (type === 'node-complete') {
                     newStatus[targetNode.id] = { status: 'completed', result };
                 } else if (type === 'node-error') {
                     newStatus[targetNode.id] = { status: 'error', error };
                 }
                 
                 return { executionStatus: newStatus };
             });
        });
    },

    loadChains: async (ipc) => {
        if (!ipc) return;
        try {
            const list: string[] = await ipc.invoke('list-chains');
            console.log('[PromptEditor] Loaded chains list:', list);

            const metas = await Promise.all(
                (list || []).map(async (id: string) => {
                    // Filter out personality chains by ID
                    if (id.startsWith('personality-')) return null;

                    try {
                        const config = await ipc.invoke('get-chain', id);
                        // Filter out personality chains by source
                        if (config?._source === 'personality') return null;
                        
                        return {
                            id,
                            description: config?._description,
                            promptCount: config?.prompts?.length ?? 0,
                            toolCount: config?.tools?.length ?? 0,
                        } as ChainMeta;
                    } catch (e) {
                        console.error(`[PromptEditor] Failed to load chain ${id}:`, e);
                        return { id } as ChainMeta;
                    }
                })
            );
            set({ chains: metas.filter((m): m is ChainMeta => m !== null) });
        } catch (e) {
            console.error('[PromptEditor] Failed to load chains:', e);
            set({ chains: [] });
        }
    },

    loadTools: async (ipc) => {
        if (!ipc) return;
        try {
            const tools: any[] = await ipc.invoke('list-tools');
            set({ availableTools: tools || [] });
        } catch (e) {
            console.error('[PromptEditor] Failed to load tools:', e);
            set({ availableTools: [] });
        }
    },

    loadChain: async (id, ipc) => {
        set({ selectedChain: id, selectedNodeId: null, selectedEdgeId: null });
        if (!ipc) return;
        
        try {
            const config = await ipc.invoke('get-chain', id);
            const configStr = JSON.stringify(config, null, 2);
            set({ chainConfig: configStr });

            try {
                const { nodes, edges } = jsonToGraph(config);
                set({ nodes, edges });
            } catch (e) {
                console.error("Failed to parse chain for graph", e);
            }
        } catch (e) {
            console.error("Failed to load chain", e);
        }
    },

    saveChain: async (ipc) => {
        const { selectedChain, viewMode, chainConfig, nodes, edges, loadChains } = get();
        if (!selectedChain || !ipc) return;

        try {
            let configToSave;
            if (viewMode === 'graph') {
                const currentJson = JSON.parse(chainConfig || '{}');
                configToSave = graphToJson(nodes, edges, currentJson);
                set({ chainConfig: JSON.stringify(configToSave, null, 2) });
            } else {
                configToSave = JSON.parse(chainConfig);
            }

            const errors = validateChain(configToSave);
            if (errors.length > 0) {
                set({ status: `Error: ${errors[0]}` });
                return;
            }

            await ipc.invoke('save-chain', { id: selectedChain, config: configToSave });
            set({ status: 'Saved!' });
            await loadChains(ipc);
            setTimeout(() => set({ status: '' }), 2000);
        } catch (e) {
            set({ status: 'Error: Invalid Configuration' });
        }
    },

    deleteChain: async (id, ipc) => {
        if (!ipc) return;
        try {
            await ipc.invoke('delete-chain', id);
            const { selectedChain, loadChains } = get();
            if (selectedChain === id) {
                set({ 
                    selectedChain: null, 
                    chainConfig: '{}', 
                    nodes: [], 
                    edges: [] 
                });
            }
            await loadChains(ipc);
            set({ deleteConfirmId: null });
        } catch (e: any) {
            set({ status: `Error: ${e.message}` });
        }
    },

    createChain: async (id, ipc) => {
        const chainId = id.trim();
        if (!chainId || !ipc) return;
        
        const defaultConfig = {
            prompts: [{ name: 'start', system: 'You are a helpful assistant.', user: '{{query}}' }],
            tools: []
        };
        
        await ipc.invoke('save-chain', { id: chainId, config: defaultConfig });
        const { loadChains, loadChain } = get();
        await loadChains(ipc);
        await loadChain(chainId, ipc);
        set({ showNewChainModal: false, newChainId: '' });
    },

    layoutGraph: () => {
        const { nodes, edges } = get();
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        const nodeWidth = 200;
        const nodeHeight = 100;

        dagreGraph.setGraph({ rankdir: 'LR' });

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const newNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            return {
                ...node,
                targetPosition: Position.Left,
                sourcePosition: Position.Right,
                position: {
                    x: nodeWithPosition.x - nodeWidth / 2,
                    y: nodeWithPosition.y - nodeHeight / 2,
                },
            };
        });

        set({ nodes: newNodes });
    },

    setChainConfig: (config) => set({ chainConfig: config }),
    
    setViewMode: (mode) => {
        const { viewMode, chainConfig, nodes, edges } = get();
        if (mode === viewMode) return;

        if (mode === 'json') {
            try {
                const currentJson = JSON.parse(chainConfig || '{}');
                const newJson = graphToJson(nodes, edges, currentJson);
                set({ chainConfig: JSON.stringify(newJson, null, 2), viewMode: mode });
            } catch (e) {
                console.error("Error syncing graph to json", e);
                set({ viewMode: mode });
            }
        } else {
            try {
                const json = JSON.parse(chainConfig);
                const { nodes: newNodes, edges: newEdges } = jsonToGraph(json);
                set({ nodes: newNodes, edges: newEdges, viewMode: mode });
            } catch (e) {
                set({ status: 'Error: Invalid JSON for Graph View' });
            }
        }
    },

    setSidebarFilter: (filter) => set({ sidebarFilter: filter }),

    onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
    onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
    onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),
    setNodes: (nodes) => set(state => ({ nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes })),
    setEdges: (edges) => set(state => ({ edges: typeof edges === 'function' ? edges(state.edges) : edges })),
    
    setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
    setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
    
    updateNodeData: (id, data) => set(state => ({
        nodes: state.nodes.map(node => node.id === id ? { ...node, data } : node)
    })),
    
    updateEdgeData: (id, data) => set(state => ({
        edges: state.edges.map(edge => edge.id === id ? { ...edge, data, label: data.label || edge.label } : edge)
    })),

    addNode: (node) => set(state => ({ nodes: [...state.nodes, node] })),

    // V4: Delete selected nodes/edges
    deleteSelectedNodes: () => {
        const { nodes, edges, selectedNodeId, selectedEdgeId, pushHistory } = get();
        pushHistory();
        if (selectedNodeId) {
            const newNodes = nodes.filter(n => n.id !== selectedNodeId);
            const newEdges = edges.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId);
            set({ nodes: newNodes, edges: newEdges, selectedNodeId: null });
        } else if (selectedEdgeId) {
            const newEdges = edges.filter(e => e.id !== selectedEdgeId);
            set({ edges: newEdges, selectedEdgeId: null });
        }
    },

    // V3: Duplicate a node
    duplicateNode: (nodeId: string) => {
        const { nodes, pushHistory } = get();
        pushHistory();
        const original = nodes.find(n => n.id === nodeId);
        if (!original) return;
        const newNode: Node = {
            ...original,
            id: `${original.type || 'node'}-${Date.now()}`,
            position: {
                x: original.position.x + 30,
                y: original.position.y + 30,
            },
            data: { ...original.data, label: `${original.data.label || ''} (copy)` },
            selected: false,
        };
        set(state => ({ nodes: [...state.nodes, newNode], selectedNodeId: newNode.id }));
    },

    // V3: Disconnect all edges from a node
    disconnectNode: (nodeId: string) => {
        const { edges, pushHistory } = get();
        pushHistory();
        set({ edges: edges.filter(e => e.source !== nodeId && e.target !== nodeId) });
    },

    // V5: Undo/Redo
    pushHistory: () => {
        const { nodes, edges, undoStack } = get();
        const entry: HistoryEntry = {
            nodes: nodes.map(n => ({ ...n, data: { ...n.data } })),
            edges: edges.map(e => ({ ...e })),
        };
        const newStack = [...undoStack, entry];
        if (newStack.length > MAX_HISTORY) newStack.shift();
        set({ undoStack: newStack, redoStack: [] });
    },

    undo: () => {
        const { undoStack, nodes, edges } = get();
        if (undoStack.length === 0) return;
        const newUndo = [...undoStack];
        const prev = newUndo.pop()!;
        const currentEntry: HistoryEntry = {
            nodes: nodes.map(n => ({ ...n, data: { ...n.data } })),
            edges: edges.map(e => ({ ...e })),
        };
        set(state => ({
            undoStack: newUndo,
            redoStack: [...state.redoStack, currentEntry],
            nodes: prev.nodes,
            edges: prev.edges,
        }));
    },

    redo: () => {
        const { redoStack, nodes, edges } = get();
        if (redoStack.length === 0) return;
        const newRedo = [...redoStack];
        const next = newRedo.pop()!;
        const currentEntry: HistoryEntry = {
            nodes: nodes.map(n => ({ ...n, data: { ...n.data } })),
            edges: edges.map(e => ({ ...e })),
        };
        set(state => ({
            redoStack: newRedo,
            undoStack: [...state.undoStack, currentEntry],
            nodes: next.nodes,
            edges: next.edges,
        }));
    },

    // V6: Snap to grid
    toggleSnapToGrid: () => set(state => ({ snapToGrid: !state.snapToGrid })),

    // V3: Copy/Paste
    copySelected: () => {
        const { nodes, edges, selectedNodeId } = get();
        if (!selectedNodeId) return;
        // Find all selected nodes (for now, single selection)
        const selectedNodes = nodes.filter(n => n.id === selectedNodeId || n.selected);
        const selectedIds = new Set(selectedNodes.map(n => n.id));
        const relatedEdges = edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target));
        set({ clipboard: { nodes: selectedNodes, edges: relatedEdges } });
    },

    paste: (position) => {
        const { clipboard, pushHistory } = get();
        if (!clipboard || clipboard.nodes.length === 0) return;
        pushHistory();
        const ts = Date.now();
        const idMap = new Map<string, string>();
        const newNodes = clipboard.nodes.map((n, idx) => {
            const newId = `${n.type || 'node'}-${ts}-${idx}`;
            idMap.set(n.id, newId);
            return {
                ...n,
                id: newId,
                position: {
                    x: (position?.x ?? n.position.x) + 40,
                    y: (position?.y ?? n.position.y) + 40,
                },
                data: { ...n.data, label: `${n.data.label || ''} (copy)` },
                selected: false,
            };
        });
        const newEdges = clipboard.edges
            .map((e, idx) => ({
                ...e,
                id: `edge-${ts}-${idx}`,
                source: idMap.get(e.source) || e.source,
                target: idMap.get(e.target) || e.target,
            }))
            .filter(e => idMap.has(e.source) || newNodes.find(n => n.id === e.source));
        set(state => ({
            nodes: [...state.nodes, ...newNodes],
            edges: [...state.edges, ...newEdges],
        }));
    },

    setShowRunModal: (show) => set({ showRunModal: show }),
    setRunInput: (input) => set({ runInput: input }),
    
    runChain: async (ipc) => {
        const { selectedChain, runInput } = get();
        if (!ipc || !selectedChain) return;
        
        set({ isRunning: true, runResult: 'Running...', executionStatus: {} });
        try {
            const input = JSON.parse(runInput);
            const result = await ipc.invoke('run-chain', { id: selectedChain, input });
            set({ runResult: JSON.stringify(result, null, 2) });
        } catch (e: any) {
            set({ runResult: `Error: ${e.message}` });
        } finally {
            set({ isRunning: false });
        }
    },

    setShowNewChainModal: (show) => set({ showNewChainModal: show }),
    setNewChainId: (id) => set({ newChainId: id }),
    setDeleteConfirmId: (id) => set({ deleteConfirmId: id }),
    setStatus: (status) => set({ status })
}));
