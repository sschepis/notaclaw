import React, { useState, useMemo } from 'react';
import { usePromptEditorStore } from '../store';

/**
 * Step-Through Debugger Panel (Enhancement 2.1)
 * Displays execution state, allows pause/step, and live state editing.
 */

const DebuggerPanel: React.FC = () => {
    const { executionStatus, nodes, isRunning, selectedChain } = usePromptEditorStore();
    const [expandedNode, setExpandedNode] = useState<string | null>(null);

    const executionLog = useMemo(() => {
        return nodes
            .filter(n => executionStatus[n.id])
            .map(n => ({
                nodeId: n.id,
                name: n.data.name || n.data.label || n.id,
                type: n.data.nodeType || n.type,
                ...executionStatus[n.id],
            }))
            .sort((a, b) => {
                const statusOrder: Record<string, number> = { running: 0, completed: 1, error: 2, pending: 3 };
                return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
            });
    }, [executionStatus, nodes]);

    if (!selectedChain) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                Select a chain to debug
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
            {/* Toolbar */}
            <div style={{
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid hsl(var(--border))',
            }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: isRunning ? '#f59e0b' : executionLog.some(l => l.status === 'error') ? '#ef4444' : executionLog.length > 0 ? '#22c55e' : '#6b7280',
                        animation: isRunning ? 'pulse 1s infinite' : 'none',
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                        {isRunning ? 'Executing...' : executionLog.length > 0 ? 'Last Run' : 'Idle'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button
                        disabled
                        title="Step-through debugging (coming soon)"
                        style={{
                            padding: '4px 8px',
                            background: 'hsl(var(--card))',
                            color: 'hsl(var(--muted-foreground))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 3,
                            cursor: 'not-allowed',
                            fontSize: 10,
                            opacity: 0.5,
                        }}
                    >⏸ Pause</button>
                    <button
                        disabled
                        title="Step to next node (coming soon)"
                        style={{
                            padding: '4px 8px',
                            background: 'hsl(var(--card))',
                            color: 'hsl(var(--muted-foreground))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 3,
                            cursor: 'not-allowed',
                            fontSize: 10,
                            opacity: 0.5,
                        }}
                    >⏭ Step</button>
                    <button
                        onClick={() => usePromptEditorStore.setState({ executionStatus: {} })}
                        style={{
                            padding: '4px 8px',
                            background: 'rgba(239,68,68,0.1)',
                            color: '#f87171',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 3,
                            cursor: 'pointer',
                            fontSize: 10,
                        }}
                    >Clear</button>
                </div>
            </div>

            {/* Execution Log */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                {executionLog.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'hsl(var(--muted-foreground))' }}>
                        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>🐛</div>
                        <div style={{ fontSize: 13 }}>No execution data</div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>Run a chain to see execution details here</div>
                    </div>
                ) : (
                    executionLog.map(entry => {
                        const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
                            running: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', icon: '⏳' },
                            completed: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', icon: '✅' },
                            error: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', icon: '❌' },
                            pending: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', icon: '⏸' },
                        };
                        const colors = statusColors[entry.status] || statusColors.pending;
                        const isExpanded = expandedNode === entry.nodeId;

                        return (
                            <div
                                key={entry.nodeId}
                                style={{
                                    marginBottom: 4,
                                    background: colors.bg,
                                    border: `1px solid ${colors.text}33`,
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        padding: '6px 10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setExpandedNode(isExpanded ? null : entry.nodeId)}
                                >
                                    <span style={{ fontSize: 12 }}>{colors.icon}</span>
                                    <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--foreground))', flex: 1 }}>{entry.name}</span>
                                    <span style={{
                                        fontSize: 10,
                                        padding: '1px 6px',
                                        background: `${colors.text}22`,
                                        color: colors.text,
                                        borderRadius: 3,
                                    }}>{entry.type}</span>
                                    <span style={{ fontSize: 10, color: colors.text }}>{entry.status}</span>
                                </div>

                                {isExpanded && (entry.result || entry.error) && (
                                    <div style={{ padding: '0 10px 8px', borderTop: `1px solid ${colors.text}22` }}>
                                        {entry.error && (
                                            <div style={{ marginTop: 6 }}>
                                                <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginBottom: 2 }}>Error:</div>
                                                <pre style={{
                                                    fontSize: 10,
                                                    fontFamily: 'monospace',
                                                    color: '#fca5a5',
                                                    background: 'rgba(239,68,68,0.05)',
                                                    padding: 6,
                                                    borderRadius: 3,
                                                    margin: 0,
                                                    overflow: 'auto',
                                                    maxHeight: 80,
                                                }}>{entry.error}</pre>
                                            </div>
                                        )}
                                        {entry.result && (
                                            <div style={{ marginTop: 6 }}>
                                                <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, marginBottom: 2 }}>Result:</div>
                                                <pre style={{
                                                    fontSize: 10,
                                                    fontFamily: 'monospace',
                                                    color: 'hsl(var(--foreground))',
                                                    background: 'rgba(34,197,94,0.05)',
                                                    padding: 6,
                                                    borderRadius: 3,
                                                    margin: 0,
                                                    overflow: 'auto',
                                                    maxHeight: 80,
                                                }}>{typeof entry.result === 'string' ? entry.result : JSON.stringify(entry.result, null, 2)}</pre>
                                            </div>
                                        )}
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

export default DebuggerPanel;
