import { Node, Edge } from 'reactflow';

export const jsonToGraph = (json: any): { nodes: Node[], edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let y = 0;

    // Create Prompt Nodes
    if (json.prompts) {
        json.prompts.forEach((prompt: any, index: number) => {
            nodes.push({
                id: prompt.name,
                type: 'prompt', // Custom type we will register
                data: { ...prompt, label: prompt.name, nodeType: 'prompt' },
                position: { x: 250, y: y }
            });
            y += 200;
        });
    }

    // Create Loop Nodes
    if (json.loops) {
        json.loops.forEach((loop: any, index: number) => {
            nodes.push({
                id: loop.id || `loop-${index}`,
                type: 'loop',
                data: { ...loop, label: loop.label || 'Loop', nodeType: 'loop' },
                position: { x: 400, y: index * 200 } // Basic positioning
            });
        });
    }

    // Create Tool Nodes
    if (json.tools) {
        json.tools.forEach((tool: any, index: number) => {
            const funcName = tool.function?.name || `tool-${index}`;
            nodes.push({
                id: `tool-${funcName}`,
                type: 'tool',
                data: { ...tool, label: funcName, nodeType: 'tool' },
                position: { x: 500, y: y }
            });
            y += 200;
        });
    }

    // Create Condition Nodes
    if (json.conditions) {
        json.conditions.forEach((cond: any, index: number) => {
            nodes.push({
                id: cond.id || `condition-${index}`,
                type: 'condition',
                data: { ...cond, label: cond.label || 'Condition', nodeType: 'condition' },
                position: { x: 400, y: index * 200 + 100 } // Basic positioning
            });
        });
    }

    // Create Sub-Chain Nodes
    if (json.subchains) {
        json.subchains.forEach((sc: any, index: number) => {
            nodes.push({
                id: sc.id || `subchain-${index}`,
                type: 'subchain',
                data: { ...sc, label: sc.label || 'Sub-Chain', nodeType: 'subchain' },
                position: { x: 100, y: index * 200 }
            });
        });
    }

    // Create Edges
    // ... existing logic needs to be expanded to handle edges from/to loops and conditions
    // This is complex because the current JSON structure nests transitions in 'prompts'.
    // If we are introducing top-level loops/conditions, we need a way to represent connections.
    // For now, let's assume the JSON has an 'edges' array if it's using the new format, 
    // or we reconstruct it from 'then' for legacy support.
    
    if (json.edges) {
        json.edges.forEach((edge: any) => {
             edges.push({
                 id: edge.id,
                 source: edge.source,
                 target: edge.target,
                 sourceHandle: edge.sourceHandle,
                 targetHandle: edge.targetHandle,
                 label: edge.label,
                 data: edge.data
             });
        });
    } else if (json.prompts) {
        // Legacy 'then' support
        json.prompts.forEach((prompt: any) => {
            if (prompt.then) {
                Object.entries(prompt.then).forEach(([condition, action]: [string, any]) => {
                    if (action.prompt) {
                        edges.push({
                            id: `e-${prompt.name}-${action.prompt}-${condition}`,
                            source: prompt.name,
                            target: action.prompt,
                            label: condition === 'true' ? 'Always' : condition,
                            data: { condition, arguments: action.arguments }
                        });
                    } else if (action.function) {
                        edges.push({
                            id: `e-${prompt.name}-tool-${action.function}-${condition}`,
                            source: prompt.name,
                            target: `tool-${action.function}`,
                            label: condition === 'true' ? 'Always' : condition,
                            animated: true,
                            style: { stroke: '#ff0072' },
                            data: { condition, arguments: action.arguments }
                        });
                    }
                });
            }
        });
    }

    return { nodes, edges };
};

export const graphToJson = (nodes: Node[], edges: Edge[], originalJson: any): any => {
    const newJson = { ...originalJson, prompts: [], tools: [], loops: [], conditions: [], subchains: [], edges: [] };
    
    // Filter nodes by type
    const promptNodes = nodes.filter(n => n.data.nodeType === 'prompt' || n.type === 'prompt' || !n.data.nodeType);
    const toolNodes = nodes.filter(n => n.data.nodeType === 'tool' || n.type === 'tool');
    const loopNodes = nodes.filter(n => n.data.nodeType === 'loop' || n.type === 'loop');
    const conditionNodes = nodes.filter(n => n.data.nodeType === 'condition' || n.type === 'condition');
    const subchainNodes = nodes.filter(n => n.data.nodeType === 'subchain' || n.type === 'subchain');

    // Reconstruct Prompts
    newJson.prompts = promptNodes.map(node => {
        const prompt = { ...node.data };
        delete prompt.label;
        delete prompt.nodeType;
        
        // Reconstruct 'then' from edges for backward compatibility
        const outgoing = edges.filter(e => e.source === node.id);
        if (outgoing.length > 0) {
            prompt.then = {};
            outgoing.forEach(edge => {
                const condition = edge.data?.condition || 'true';
                const targetNode = nodes.find(n => n.id === edge.target);
                if (targetNode && (targetNode.type === 'tool' || targetNode.data?.nodeType === 'tool')) {
                    // Edge to a tool node — extract function name from the tool-* id
                    const funcName = edge.target.startsWith('tool-') ? edge.target.slice(5) : edge.target;
                    prompt.then[condition] = { function: funcName, arguments: edge.data?.arguments || {} };
                } else {
                    // Edge to a prompt node
                    prompt.then[condition] = { prompt: edge.target, arguments: edge.data?.arguments || {} };
                }
            });
        }
        
        return prompt;
    });

    // Reconstruct Tools
    newJson.tools = toolNodes.map(node => {
        const tool = { ...node.data };
        delete tool.label;
        delete tool.nodeType;
        return tool;
    });

    // Save Loops
    newJson.loops = loopNodes.map(node => {
        const loop = { ...node.data };
        delete loop.nodeType;
        return { ...loop, id: node.id };
    });

    // Save Conditions
    newJson.conditions = conditionNodes.map(node => {
        const cond = { ...node.data };
        delete cond.nodeType;
        return { ...cond, id: node.id };
    });

    // Save Sub-Chains
    newJson.subchains = subchainNodes.map(node => {
        const sc = { ...node.data };
        delete sc.nodeType;
        return { ...sc, id: node.id };
    });

    // Save Edges explicitly to support new node types
    newJson.edges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
        data: edge.data
    }));

    return newJson;
};

export const validateChain = (json: any): string[] => {
    const errors: string[] = [];
    if (!json.prompts || !Array.isArray(json.prompts)) {
        errors.push("Missing 'prompts' array.");
    } else {
        const names = new Set();
        json.prompts.forEach((p: any, i: number) => {
            if (!p.name) {
                errors.push(`Prompt at index ${i} missing 'name'.`);
            } else {
                if (names.has(p.name)) {
                    errors.push(`Duplicate prompt name: '${p.name}'.`);
                }
                names.add(p.name);
            }
            if (!p.system) errors.push(`Prompt '${p.name || i}' missing 'system' prompt.`);
            // User prompt can be empty if it relies purely on history, but usually needed.
        });
    }
    return errors;
};
