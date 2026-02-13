import React, { useState, useMemo } from 'react';

/**
 * Template Library Panel (Enhancement 3.2)
 * Drag-and-drop library of common prompt patterns.
 */

interface PromptTemplate {
    id: string;
    name: string;
    category: string;
    description: string;
    icon: string;
    nodes: Array<{
        type: string;
        data: any;
        offsetX: number;
        offsetY: number;
    }>;
    edges: Array<{
        sourceIdx: number;
        targetIdx: number;
        label?: string;
    }>;
}

const TEMPLATES: PromptTemplate[] = [
    {
        id: 'chain-of-thought',
        name: 'Chain of Thought',
        category: 'Reasoning',
        description: 'Step-by-step reasoning before answering. Improves accuracy on complex tasks.',
        icon: '🧠',
        nodes: [
            {
                type: 'prompt',
                data: {
                    label: 'Think Step-by-Step',
                    name: 'cot_reasoning',
                    nodeType: 'prompt',
                    system: 'You are a careful reasoner. Break down problems step by step before answering.',
                    user: 'Think through this step by step:\n\n{{query}}\n\nFirst, identify the key components. Then reason through each one. Finally, synthesize your answer.',
                },
                offsetX: 0,
                offsetY: 0,
            },
            {
                type: 'prompt',
                data: {
                    label: 'Extract Answer',
                    name: 'cot_extract',
                    nodeType: 'prompt',
                    system: 'Extract the final answer from the reasoning below. Be concise and direct.',
                    user: 'Given this reasoning:\n\n{{cot_reasoning}}\n\nProvide only the final, concise answer.',
                },
                offsetX: 300,
                offsetY: 0,
            },
        ],
        edges: [{ sourceIdx: 0, targetIdx: 1 }],
    },
    {
        id: 'react-agent',
        name: 'ReAct (Reason + Act)',
        category: 'Agents',
        description: 'Interleave reasoning with actions. The agent thinks, acts, observes, and repeats.',
        icon: '⚡',
        nodes: [
            {
                type: 'prompt',
                data: {
                    label: 'Reason & Plan',
                    name: 'react_reason',
                    nodeType: 'prompt',
                    system: 'You are a ReAct agent. For each step:\n1. Thought: reason about what to do\n2. Action: choose a tool/action\n3. Observation: note the result\n\nRepeat until the task is complete.',
                    user: 'Task: {{query}}\n\nAvailable tools: {{tools}}\n\nBegin reasoning and acting.',
                },
                offsetX: 0,
                offsetY: 0,
            },
            {
                type: 'tool',
                data: {
                    label: 'Execute Action',
                    nodeType: 'tool',
                    function: {
                        name: 'react_execute',
                        description: 'Execute the action decided by the reasoning step',
                        parameters: { type: 'object', properties: { action: { type: 'string' }, params: { type: 'object' } } },
                        script: '// Implement action execution logic\nreturn { result: "action completed" };',
                    },
                },
                offsetX: 300,
                offsetY: 0,
            },
            {
                type: 'prompt',
                data: {
                    label: 'Synthesize',
                    name: 'react_synthesize',
                    nodeType: 'prompt',
                    system: 'Synthesize the final answer from the reasoning and action results.',
                    user: 'Reasoning: {{react_reason}}\nAction result: {{react_execute}}\n\nProvide a final answer.',
                },
                offsetX: 600,
                offsetY: 0,
            },
        ],
        edges: [
            { sourceIdx: 0, targetIdx: 1 },
            { sourceIdx: 1, targetIdx: 2 },
        ],
    },
    {
        id: 'reflection',
        name: 'Reflection / Critique',
        category: 'Quality',
        description: 'Generate a response, then critique and improve it. Self-refinement loop.',
        icon: '🔄',
        nodes: [
            {
                type: 'prompt',
                data: {
                    label: 'Initial Draft',
                    name: 'draft',
                    nodeType: 'prompt',
                    system: 'Generate your best initial response to the query.',
                    user: '{{query}}',
                },
                offsetX: 0,
                offsetY: 0,
            },
            {
                type: 'prompt',
                data: {
                    label: 'Critique',
                    name: 'critique',
                    nodeType: 'prompt',
                    system: 'You are a critical reviewer. Analyze the following response for:\n- Accuracy\n- Completeness\n- Clarity\n- Potential issues\n\nBe specific about what needs improvement.',
                    user: 'Original query: {{query}}\n\nDraft response:\n{{draft}}\n\nProvide a detailed critique.',
                },
                offsetX: 300,
                offsetY: 0,
            },
            {
                type: 'prompt',
                data: {
                    label: 'Refined Answer',
                    name: 'refined',
                    nodeType: 'prompt',
                    system: 'Improve the response based on the critique. Address each point raised.',
                    user: 'Original query: {{query}}\nDraft: {{draft}}\nCritique: {{critique}}\n\nProvide an improved response addressing all critique points.',
                },
                offsetX: 600,
                offsetY: 0,
            },
        ],
        edges: [
            { sourceIdx: 0, targetIdx: 1 },
            { sourceIdx: 1, targetIdx: 2 },
        ],
    },
    {
        id: 'summarization',
        name: 'Summarization Pipeline',
        category: 'Processing',
        description: 'Multi-stage summarization: extract key points, then synthesize a coherent summary.',
        icon: '📝',
        nodes: [
            {
                type: 'prompt',
                data: {
                    label: 'Extract Key Points',
                    name: 'extract_points',
                    nodeType: 'prompt',
                    system: 'Extract the most important key points from the given text. List them as bullet points.',
                    user: 'Extract key points from:\n\n{{input_text}}',
                },
                offsetX: 0,
                offsetY: 0,
            },
            {
                type: 'prompt',
                data: {
                    label: 'Synthesize Summary',
                    name: 'synthesize',
                    nodeType: 'prompt',
                    system: 'Create a well-structured, coherent summary from the key points. The summary should flow naturally and cover all important aspects.',
                    user: 'Key points:\n{{extract_points}}\n\nWrite a cohesive summary paragraph.',
                },
                offsetX: 300,
                offsetY: 0,
            },
        ],
        edges: [{ sourceIdx: 0, targetIdx: 1 }],
    },
    {
        id: 'guard-rail',
        name: 'Input Guard Rail',
        category: 'Safety',
        description: 'Validate input before processing. Route safe inputs to the main chain, reject harmful ones.',
        icon: '🛡️',
        nodes: [
            {
                type: 'prompt',
                data: {
                    label: 'Safety Check',
                    name: 'safety_check',
                    nodeType: 'prompt',
                    system: 'You are a safety classifier. Analyze the input and respond ONLY with JSON: {"safe": true/false, "reason": "explanation"}',
                    user: 'Classify this input:\n\n{{query}}',
                    responseFormat: { type: 'object', properties: { safe: { type: 'boolean' }, reason: { type: 'string' } } },
                },
                offsetX: 0,
                offsetY: 0,
            },
            {
                type: 'condition',
                data: {
                    label: 'Is Safe?',
                    nodeType: 'condition',
                    expression: 'state.safety_check?.safe === true',
                },
                offsetX: 300,
                offsetY: 0,
            },
            {
                type: 'prompt',
                data: {
                    label: 'Process Query',
                    name: 'process',
                    nodeType: 'prompt',
                    system: 'You are a helpful assistant.',
                    user: '{{query}}',
                },
                offsetX: 600,
                offsetY: -60,
            },
            {
                type: 'prompt',
                data: {
                    label: 'Reject',
                    name: 'reject',
                    nodeType: 'prompt',
                    system: 'Politely decline the request and explain why.',
                    user: 'The user asked: {{query}}\nReason for rejection: {{safety_check.reason}}\n\nPolitely decline.',
                },
                offsetX: 600,
                offsetY: 60,
            },
        ],
        edges: [
            { sourceIdx: 0, targetIdx: 1 },
            { sourceIdx: 1, targetIdx: 2, label: 'true' },
            { sourceIdx: 1, targetIdx: 3, label: 'false' },
        ],
    },
    {
        id: 'map-reduce',
        name: 'Map-Reduce',
        category: 'Processing',
        description: 'Process items in parallel (map), then combine results (reduce). Great for batch processing.',
        icon: '🗺️',
        nodes: [
            {
                type: 'prompt',
                data: {
                    label: 'Split Input',
                    name: 'split',
                    nodeType: 'prompt',
                    system: 'Split the input into individual items. Return a JSON array of strings.',
                    user: 'Split this into separate items:\n\n{{input}}',
                    responseFormat: { type: 'array', items: { type: 'string' } },
                },
                offsetX: 0,
                offsetY: 0,
            },
            {
                type: 'loop',
                data: {
                    label: 'Process Each',
                    nodeType: 'loop',
                    variable: 'split',
                    itemVariable: 'item',
                },
                offsetX: 300,
                offsetY: 0,
            },
            {
                type: 'prompt',
                data: {
                    label: 'Process Item',
                    name: 'process_item',
                    nodeType: 'prompt',
                    system: 'Process the given item.',
                    user: 'Process: {{item}}',
                },
                offsetX: 450,
                offsetY: 80,
            },
            {
                type: 'prompt',
                data: {
                    label: 'Combine Results',
                    name: 'combine',
                    nodeType: 'prompt',
                    system: 'Combine all the processed results into a single coherent response.',
                    user: 'Results:\n{{process_item_results}}\n\nCombine into a final answer.',
                },
                offsetX: 700,
                offsetY: 0,
            },
        ],
        edges: [
            { sourceIdx: 0, targetIdx: 1 },
            { sourceIdx: 1, targetIdx: 2 },
            { sourceIdx: 2, targetIdx: 3 },
        ],
    },
];

const TemplateLibraryPanel: React.FC = () => {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const categories = useMemo(() => {
        const cats = new Set<string>();
        TEMPLATES.forEach(t => cats.add(t.category));
        return ['all', ...Array.from(cats)];
    }, []);

    const filtered = useMemo(() => {
        return TEMPLATES.filter(t => {
            const q = search.toLowerCase();
            const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
            const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [search, selectedCategory]);

    const onDragStart = (event: React.DragEvent, template: PromptTemplate) => {
        event.dataTransfer.setData('application/reactflow', 'template');
        event.dataTransfer.setData('application/template-data', JSON.stringify(template));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
            {/* Search & Filter */}
            <div style={{ padding: '8px 12px', display: 'flex', gap: 8, borderBottom: '1px solid hsl(var(--border))' }}>
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '5px 10px',
                        background: 'hsl(var(--input))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 4,
                        fontSize: 12,
                        outline: 'none',
                    }}
                />
                <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    style={{
                        padding: '5px 8px',
                        background: 'hsl(var(--input))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 4,
                        fontSize: 12,
                        outline: 'none',
                    }}
                >
                    {categories.map(c => (
                        <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                    ))}
                </select>
            </div>

            {/* Template Cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start' }}>
                {filtered.map(template => (
                    <div
                        key={template.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, template)}
                        style={{
                            width: 'calc(33.333% - 6px)',
                            minWidth: 200,
                            padding: '12px 14px',
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 6,
                            cursor: 'grab',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = '#10b981';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 8px rgba(16,185,129,0.3)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(var(--border))';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 18 }}>{template.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--foreground))' }}>{template.name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', lineHeight: 1.4, marginBottom: 8 }}>
                            {template.description}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(16,185,129,0.15)', color: '#34d399', borderRadius: 3 }}>
                                {template.category}
                            </span>
                            <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>
                                {template.nodes.length} nodes
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TemplateLibraryPanel;
