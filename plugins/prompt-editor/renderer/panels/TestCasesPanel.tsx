import React, { useState, useCallback } from 'react';
import { usePromptEditorStore } from '../store';

/**
 * Test Case Management Panel (Enhancement 2.2)
 * Define, save, and run test inputs for chains.
 */

interface TestCase {
    id: string;
    name: string;
    input: string;
    expectedOutput?: string;
    lastResult?: string;
    lastStatus?: 'pass' | 'fail' | 'pending';
    lastRunAt?: string;
}

const TestCasesPanel: React.FC = () => {
    const { selectedChain, isRunning } = usePromptEditorStore();
    const [testCases, setTestCases] = useState<TestCase[]>([]);
    const [editing, setEditing] = useState<string | null>(null);
    const [running, setRunning] = useState<string | null>(null);

    const addTestCase = useCallback(() => {
        const id = `test-${Date.now()}`;
        const newCase: TestCase = {
            id,
            name: `Test ${testCases.length + 1}`,
            input: '{\n  "query": ""\n}',
            lastStatus: 'pending',
        };
        setTestCases(prev => [...prev, newCase]);
        setEditing(id);
    }, [testCases.length]);

    const updateTestCase = useCallback((id: string, updates: Partial<TestCase>) => {
        setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, ...updates } : tc));
    }, []);

    const deleteTestCase = useCallback((id: string) => {
        setTestCases(prev => prev.filter(tc => tc.id !== id));
        if (editing === id) setEditing(null);
    }, [editing]);

    const runTestCase = useCallback(async (tc: TestCase) => {
        const store = usePromptEditorStore.getState();
        if (!store.selectedChain) return;

        setRunning(tc.id);
        try {
            // Use the store's IPC reference implicitly through runChain pattern
            // For now, we simulate by storing the result
            updateTestCase(tc.id, { lastStatus: 'pending', lastRunAt: new Date().toISOString() });

            // TODO: Wire up actual chain execution via IPC when context is available
            updateTestCase(tc.id, {
                lastResult: 'Test execution requires IPC context. Use the Run button with this input.',
                lastStatus: 'pending',
                lastRunAt: new Date().toISOString(),
            });
        } finally {
            setRunning(null);
        }
    }, [updateTestCase]);

    const runAllTests = useCallback(async () => {
        for (const tc of testCases) {
            await runTestCase(tc);
        }
    }, [testCases, runTestCase]);

    if (!selectedChain) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                Select a chain to manage test cases
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
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                        Test Cases ({testCases.length})
                    </span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                        for {selectedChain}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        onClick={runAllTests}
                        disabled={testCases.length === 0 || isRunning}
                        style={{
                            padding: '4px 10px',
                            background: '#2a6a2a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: testCases.length === 0 ? 'not-allowed' : 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                            opacity: testCases.length === 0 ? 0.5 : 1,
                        }}
                    >▶ Run All</button>
                    <button
                        onClick={addTestCase}
                        style={{
                            padding: '4px 10px',
                            background: 'hsl(var(--primary))',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                        }}
                    >+ Add Test</button>
                </div>
            </div>

            {/* Test Case List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                {testCases.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'hsl(var(--muted-foreground))' }}>
                        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>🧪</div>
                        <div style={{ fontSize: 13 }}>No test cases yet</div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>Add test inputs to validate your chain as it evolves</div>
                    </div>
                ) : (
                    testCases.map(tc => (
                        <div
                            key={tc.id}
                            style={{
                                marginBottom: 8,
                                background: 'hsl(var(--card))',
                                border: `1px solid ${editing === tc.id ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                                borderRadius: 6,
                                overflow: 'hidden',
                            }}
                        >
                            {/* Test case header */}
                            <div
                                style={{
                                    padding: '8px 12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    background: editing === tc.id ? 'rgba(99,102,241,0.05)' : 'transparent',
                                }}
                                onClick={() => setEditing(editing === tc.id ? null : tc.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: tc.lastStatus === 'pass' ? '#22c55e' : tc.lastStatus === 'fail' ? '#ef4444' : '#6b7280',
                                    }} />
                                    {editing === tc.id ? (
                                        <input
                                            value={tc.name}
                                            onChange={e => updateTestCase(tc.id, { name: e.target.value })}
                                            onClick={e => e.stopPropagation()}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'hsl(var(--foreground))',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                outline: 'none',
                                                padding: 0,
                                            }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{tc.name}</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); runTestCase(tc); }}
                                        disabled={running === tc.id}
                                        style={{
                                            padding: '3px 8px',
                                            background: '#2a6a2a',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 3,
                                            cursor: 'pointer',
                                            fontSize: 10,
                                        }}
                                    >{running === tc.id ? '...' : '▶'}</button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteTestCase(tc.id); }}
                                        style={{
                                            padding: '3px 8px',
                                            background: 'rgba(239,68,68,0.15)',
                                            color: '#f87171',
                                            border: 'none',
                                            borderRadius: 3,
                                            cursor: 'pointer',
                                            fontSize: 10,
                                        }}
                                    >✕</button>
                                </div>
                            </div>

                            {/* Expanded edit area */}
                            {editing === tc.id && (
                                <div style={{ padding: '0 12px 12px', borderTop: '1px solid hsl(var(--border))' }}>
                                    <div style={{ marginTop: 8 }}>
                                        <label style={{ display: 'block', fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4, fontWeight: 500 }}>Input JSON</label>
                                        <textarea
                                            value={tc.input}
                                            onChange={e => updateTestCase(tc.id, { input: e.target.value })}
                                            style={{
                                                width: '100%',
                                                height: 80,
                                                padding: 8,
                                                fontFamily: 'monospace',
                                                fontSize: 11,
                                                background: 'hsl(var(--input))',
                                                color: 'hsl(var(--foreground))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: 4,
                                                resize: 'vertical',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                    <div style={{ marginTop: 8 }}>
                                        <label style={{ display: 'block', fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4, fontWeight: 500 }}>Expected Output (optional, for comparison)</label>
                                        <textarea
                                            value={tc.expectedOutput || ''}
                                            onChange={e => updateTestCase(tc.id, { expectedOutput: e.target.value })}
                                            placeholder="Leave empty to skip output comparison"
                                            style={{
                                                width: '100%',
                                                height: 60,
                                                padding: 8,
                                                fontFamily: 'monospace',
                                                fontSize: 11,
                                                background: 'hsl(var(--input))',
                                                color: 'hsl(var(--foreground))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: 4,
                                                resize: 'vertical',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                    {tc.lastResult && (
                                        <div style={{ marginTop: 8 }}>
                                            <label style={{ display: 'block', fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4, fontWeight: 500 }}>
                                                Last Result {tc.lastRunAt && <span style={{ fontWeight: 400 }}>({new Date(tc.lastRunAt).toLocaleTimeString()})</span>}
                                            </label>
                                            <pre style={{
                                                padding: 8,
                                                fontFamily: 'monospace',
                                                fontSize: 11,
                                                background: 'hsl(var(--input))',
                                                color: 'hsl(var(--foreground))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: 4,
                                                overflow: 'auto',
                                                maxHeight: 100,
                                                margin: 0,
                                            }}>
                                                {tc.lastResult}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TestCasesPanel;
