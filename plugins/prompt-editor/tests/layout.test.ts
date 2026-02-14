import { usePromptEditorStore } from '../renderer/store';
import dagre from 'dagre';
import { Position } from 'reactflow';

// Mock dagre
jest.mock('dagre', () => {
    const setGraphMock = jest.fn();
    return {
        graphlib: {
            Graph: jest.fn().mockImplementation(() => ({
                setDefaultEdgeLabel: jest.fn(),
                setGraph: setGraphMock,
                setNode: jest.fn(),
                setEdge: jest.fn(),
                node: jest.fn().mockReturnValue({ x: 100, y: 50 }),
                edges: jest.fn().mockReturnValue([]),
            })),
        },
        layout: jest.fn(),
    };
});

// Mock reactflow
jest.mock('reactflow', () => ({
    Position: {
        Left: 'left',
        Right: 'right',
        Top: 'top',
        Bottom: 'bottom',
    },
    // Add other exports if needed by store.ts
    addEdge: jest.fn(),
    applyNodeChanges: jest.fn(),
    applyEdgeChanges: jest.fn(),
}));

// Mock utils
jest.mock('../renderer/utils', () => ({
    jsonToGraph: jest.fn(),
    graphToJson: jest.fn(),
    validateChain: jest.fn(),
}));

describe('Layout Logic', () => {
    
    beforeEach(() => {
        usePromptEditorStore.setState({
            nodes: [
                { id: '1', position: { x: 0, y: 0 }, data: {} },
                { id: '2', position: { x: 0, y: 0 }, data: {} },
            ],
            edges: [
                { id: 'e1-2', source: '1', target: '2' },
            ],
        });
        
        // Clear mock calls
        jest.clearAllMocks();
    });

    test('layoutGraph uses LR by default', () => {
        const store = usePromptEditorStore.getState();
        store.layoutGraph();
        
        // Get the mock instance
        const MockGraph = dagre.graphlib.Graph as jest.Mock;
        const graphInstance = MockGraph.mock.results[0].value;
        
        expect(graphInstance.setGraph).toHaveBeenCalledWith({ rankdir: 'LR' });
    });

    test('layoutGraph uses TB when specified', () => {
        const store = usePromptEditorStore.getState();
        store.layoutGraph('TB');
        
        const MockGraph = dagre.graphlib.Graph as jest.Mock;
        const graphInstance = MockGraph.mock.results[0].value;
        
        expect(graphInstance.setGraph).toHaveBeenCalledWith({ rankdir: 'TB' });
    });
    
    test('layoutGraph updates handle positions for TB', () => {
         const store = usePromptEditorStore.getState();
         store.layoutGraph('TB');
         
         const nodes = usePromptEditorStore.getState().nodes;
         
         expect(nodes[0].sourcePosition).toBe('bottom'); // Position.Bottom
         expect(nodes[0].targetPosition).toBe('top'); // Position.Top
    });

    test('layoutGraph updates handle positions for LR', () => {
         const store = usePromptEditorStore.getState();
         store.layoutGraph('LR');
         
         const nodes = usePromptEditorStore.getState().nodes;
         
         expect(nodes[0].sourcePosition).toBe('right'); // Position.Right
         expect(nodes[0].targetPosition).toBe('left'); // Position.Left
    });
    
    test('layoutGraph updates handle positions for RL', () => {
         const store = usePromptEditorStore.getState();
         store.layoutGraph('RL');
         
         const nodes = usePromptEditorStore.getState().nodes;
         
         expect(nodes[0].sourcePosition).toBe('left');
         expect(nodes[0].targetPosition).toBe('right');
    });
    
    test('layoutGraph updates handle positions for BT', () => {
         const store = usePromptEditorStore.getState();
         store.layoutGraph('BT');
         
         const nodes = usePromptEditorStore.getState().nodes;
         
         expect(nodes[0].sourcePosition).toBe('top');
         expect(nodes[0].targetPosition).toBe('bottom');
    });
});
