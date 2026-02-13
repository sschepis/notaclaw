import React, { useMemo } from 'react';
import { usePromptEditorStore } from '../store';

/**
 * Cost & Token Estimation Panel (Enhancement 2.3)
 * Displays estimated token usage and cost per node based on prompt length.
 */

// Rough token estimation: ~4 chars per token for English text
const estimateTokens = (text: string): number => {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
};

// Cost per 1M tokens (approximate, by model family)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 30, output: 60 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-4o': { input: 5, output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'claude-3-opus': { input: 15, output: 75 },
    'claude-3-sonnet': { input: 3, output: 15 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    'default': { input: 5, output: 15 },
};

interface NodeEstimate {
    nodeId: string;
    name: string;
    type: string;
    systemTokens: number;
    userTokens: number;
    totalInputTokens: number;
    estimatedOutputTokens: number;
    totalTokens: number;
    estimatedCost: number;
}

const TokenEstimationPanel: React.FC = () => {
    const { nodes, selectedChain } = usePromptEditorStore();
    const [selectedModel, setSelectedModel] = React.useState('gpt-4o');

    const estimates: NodeEstimate[] = useMemo(() => {
        const costs = MODEL_COSTS[selectedModel] || MODEL_COSTS['default'];

        return nodes
            .filter(n => n.data.nodeType === 'prompt')
            .map(n => {
                const systemTokens = estimateTokens(n.data.system || '');
                const userTokens = estimateTokens(n.data.user || '');
                const formatTokens = estimateTokens(JSON.stringify(n.data.requestFormat || '') + JSON.stringify(n.data.responseFormat || ''));
                const totalInputTokens = systemTokens + userTokens + formatTokens;
                // Rough estimate: output is ~60% of input for most tasks
                const estimatedOutputTokens = Math.ceil(totalInputTokens * 0.6);
                const totalTokens = totalInputTokens + estimatedOutputTokens;
                const estimatedCost = (totalInputTokens / 1_000_000 * costs.input) + (estimatedOutputTokens / 1_000_000 * costs.output);

                return {
                    nodeId: n.id,
                    name: n.data.name || n.data.label || n.id,
                    type: n.data.nodeType,
                    systemTokens,
                    userTokens,
                    totalInputTokens,
                    estimatedOutputTokens,
                    totalTokens,
                    estimatedCost,
                };
            });
    }, [nodes, selectedModel]);

    const totals = useMemo(() => {
        return estimates.reduce(
            (acc, e) => ({
                inputTokens: acc.inputTokens + e.totalInputTokens,
                outputTokens: acc.outputTokens + e.estimatedOutputTokens,
                totalTokens: acc.totalTokens + e.totalTokens,
                totalCost: acc.totalCost + e.estimatedCost,
            }),
            { inputTokens: 0, outputTokens: 0, totalTokens: 0, totalCost: 0 }
        );
    }, [estimates]);

    if (!selectedChain) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                Select a chain to estimate costs
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
            {/* Summary Bar */}
            <div style={{
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid hsl(var(--border))',
            }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>Total Tokens</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{totals.totalTokens.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>Input</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>{totals.inputTokens.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>Output (est.)</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>{totals.outputTokens.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>Est. Cost</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>${totals.totalCost.toFixed(6)}</div>
                    </div>
                </div>
                <select
                    value={selectedModel}
                    onChange={e => setSelectedModel(e.target.value)}
                    style={{
                        padding: '4px 8px',
                        background: 'hsl(var(--input))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 4,
                        fontSize: 11,
                        outline: 'none',
                    }}
                >
                    {Object.keys(MODEL_COSTS).filter(k => k !== 'default').map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                </select>
            </div>

            {/* Per-Node Breakdown */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                {estimates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'hsl(var(--muted-foreground))' }}>
                        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>💰</div>
                        <div style={{ fontSize: 13 }}>No prompt nodes to estimate</div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>Add prompt nodes to see token and cost estimates</div>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>Node</th>
                                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>System</th>
                                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>User</th>
                                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>Input</th>
                                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>Output</th>
                                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>Total</th>
                                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estimates.map(est => {
                                const pct = totals.totalTokens > 0 ? (est.totalTokens / totals.totalTokens * 100) : 0;
                                return (
                                    <tr key={est.nodeId} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                                        <td style={{ padding: '6px 8px', color: 'hsl(var(--foreground))', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span>{est.name}</span>
                                                <div style={{
                                                    width: 40,
                                                    height: 4,
                                                    background: 'hsl(var(--border))',
                                                    borderRadius: 2,
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        width: `${pct}%`,
                                                        height: '100%',
                                                        background: '#6366f1',
                                                        borderRadius: 2,
                                                    }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px', color: 'hsl(var(--muted-foreground))' }}>{est.systemTokens}</td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px', color: 'hsl(var(--muted-foreground))' }}>{est.userTokens}</td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px', color: '#60a5fa' }}>{est.totalInputTokens}</td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px', color: '#34d399' }}>{est.estimatedOutputTokens}</td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px', color: 'hsl(var(--foreground))', fontWeight: 600 }}>{est.totalTokens}</td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px', color: '#fbbf24', fontWeight: 600 }}>${est.estimatedCost.toFixed(6)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {/* Info note */}
                <div style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: 'rgba(99,102,241,0.05)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 4,
                    fontSize: 10,
                    color: 'hsl(var(--muted-foreground))',
                    lineHeight: 1.5,
                }}>
                    💡 Estimates use ~4 chars/token and assume output ≈ 60% of input. Actual costs vary based on model, variable interpolation, and response length. Template variables (e.g. {'{{query}}'}) contribute minimal tokens until runtime.
                </div>
            </div>
        </div>
    );
};

export default TokenEstimationPanel;
