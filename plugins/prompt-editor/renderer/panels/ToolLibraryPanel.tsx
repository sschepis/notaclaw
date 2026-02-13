import React, { useState, useMemo } from 'react';
import { usePromptEditorStore } from '../store';

/**
 * Tool Library Panel (Enhancement 4.1)
 * Shows available system tools with search, filtering, and drag-and-drop onto canvas.
 */
const ToolLibraryPanel: React.FC = () => {
    const { availableTools } = usePromptEditorStore();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string>('all');

    const categories = useMemo(() => {
        const cats = new Set<string>();
        (availableTools || []).forEach((t: any) => {
            if (t.category) cats.add(t.category);
        });
        return ['all', ...Array.from(cats)];
    }, [availableTools]);

    const filtered = useMemo(() => {
        return (availableTools || []).filter((t: any) => {
            const name = (t.name || t.function?.name || '').toLowerCase();
            const desc = (t.description || t.function?.description || '').toLowerCase();
            const q = search.toLowerCase();
            const matchesSearch = !q || name.includes(q) || desc.includes(q);
            const matchesCategory = category === 'all' || t.category === category;
            return matchesSearch && matchesCategory;
        });
    }, [availableTools, search, category]);

    const onDragStart = (event: React.DragEvent, tool: any) => {
        const toolData = JSON.stringify({
            type: 'tool',
            tool: {
                name: tool.name || tool.function?.name || 'unnamed_tool',
                description: tool.description || tool.function?.description || '',
                parameters: tool.parameters || tool.function?.parameters || {},
                script: tool.script || tool.function?.script || '',
            }
        });
        event.dataTransfer.setData('application/reactflow', 'tool');
        event.dataTransfer.setData('application/tool-data', toolData);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
            {/* Search & Filter Bar */}
            <div style={{ padding: '8px 12px', display: 'flex', gap: 8, borderBottom: '1px solid hsl(var(--border))' }}>
                <input
                    type="text"
                    placeholder="Search tools..."
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
                    value={category}
                    onChange={e => setCategory(e.target.value)}
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

            {/* Tool Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start' }}>
                {filtered.length === 0 ? (
                    <div style={{ width: '100%', textAlign: 'center', padding: 24, color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                        {availableTools.length === 0 ? 'No tools available. Tools will appear when plugins register them.' : 'No tools match your search.'}
                    </div>
                ) : (
                    filtered.map((tool: any, idx: number) => {
                        const name = tool.name || tool.function?.name || 'Unknown Tool';
                        const desc = tool.description || tool.function?.description || '';
                        return (
                            <div
                                key={`${name}-${idx}`}
                                draggable
                                onDragStart={(e) => onDragStart(e, tool)}
                                style={{
                                    width: 'calc(50% - 4px)',
                                    minWidth: 180,
                                    padding: '10px 12px',
                                    background: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 6,
                                    cursor: 'grab',
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f1';
                                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 8px rgba(99,102,241,0.3)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(var(--border))';
                                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 14 }}>🔧</span>
                                    <span style={{ fontWeight: 600, fontSize: 12, color: 'hsl(var(--foreground))' }}>{name}</span>
                                </div>
                                <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                                    {desc || 'No description'}
                                </div>
                                {tool.category && (
                                    <div style={{ marginTop: 6 }}>
                                        <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: 3 }}>
                                            {tool.category}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ToolLibraryPanel;
