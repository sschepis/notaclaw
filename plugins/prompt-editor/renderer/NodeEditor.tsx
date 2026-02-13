import React, { useState, useEffect, useCallback } from 'react';
import { Node } from 'reactflow';

interface NodeEditorProps {
    node: Node;
    onChange: (nodeId: string, newData: any) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// JSON Schema Visual Editor (Enhancement 3.3)
// ═══════════════════════════════════════════════════════════════════════════

interface SchemaField {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description?: string;
    required?: boolean;
    enumValues?: string;
}

const SchemaEditor: React.FC<{
    label: string;
    value: any;
    onChange: (schema: any) => void;
}> = ({ label, value, onChange }) => {
    const [mode, setMode] = useState<'visual' | 'json'>('visual');
    const [fields, setFields] = useState<SchemaField[]>([]);
    const [jsonText, setJsonText] = useState('');

    useEffect(() => {
        const schema = typeof value === 'string' ? tryParse(value) : (value || {});
        setJsonText(JSON.stringify(schema, null, 2));
        // Parse schema into fields
        if (schema?.properties) {
            const requiredFields = schema.required || [];
            const parsed = Object.entries(schema.properties).map(([name, prop]: [string, any]) => ({
                name,
                type: prop.type || 'string',
                description: prop.description || '',
                required: requiredFields.includes(name),
                enumValues: prop.enum ? prop.enum.join(', ') : '',
            }));
            setFields(parsed);
        } else {
            setFields([]);
        }
    }, [value]);

    const fieldsToSchema = useCallback((f: SchemaField[]) => {
        if (f.length === 0) return {};
        const properties: Record<string, any> = {};
        const required: string[] = [];
        f.forEach(field => {
            const prop: any = { type: field.type };
            if (field.description) prop.description = field.description;
            if (field.enumValues) {
                prop.enum = field.enumValues.split(',').map(v => v.trim()).filter(Boolean);
            }
            properties[field.name] = prop;
            if (field.required) required.push(field.name);
        });
        return {
            type: 'object' as const,
            properties,
            ...(required.length > 0 ? { required } : {}),
        };
    }, []);

    const updateField = (idx: number, updates: Partial<SchemaField>) => {
        const newFields = fields.map((f, i) => i === idx ? { ...f, ...updates } : f);
        setFields(newFields);
        onChange(fieldsToSchema(newFields));
    };

    const addField = () => {
        const newFields = [...fields, { name: `field${fields.length + 1}`, type: 'string' as const, required: false }];
        setFields(newFields);
        onChange(fieldsToSchema(newFields));
    };

    const removeField = (idx: number) => {
        const newFields = fields.filter((_, i) => i !== idx);
        setFields(newFields);
        onChange(fieldsToSchema(newFields));
    };

    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontWeight: 'bold', color: 'hsl(var(--foreground))', fontSize: 12 }}>{label}</label>
                <div style={{ display: 'flex', gap: 2, borderRadius: 3, overflow: 'hidden', border: '1px solid hsl(var(--border))' }}>
                    <button
                        onClick={() => setMode('visual')}
                        style={{
                            padding: '2px 8px',
                            fontSize: 10,
                            background: mode === 'visual' ? 'hsl(var(--primary))' : 'transparent',
                            color: mode === 'visual' ? '#fff' : 'hsl(var(--muted-foreground))',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >Visual</button>
                    <button
                        onClick={() => setMode('json')}
                        style={{
                            padding: '2px 8px',
                            fontSize: 10,
                            background: mode === 'json' ? 'hsl(var(--primary))' : 'transparent',
                            color: mode === 'json' ? '#fff' : 'hsl(var(--muted-foreground))',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >JSON</button>
                </div>
            </div>

            {mode === 'json' ? (
                <textarea
                    value={jsonText}
                    onChange={(e) => {
                        setJsonText(e.target.value);
                        try {
                            const parsed = JSON.parse(e.target.value);
                            onChange(parsed);
                        } catch (err) { /* allow typing invalid JSON */ }
                    }}
                    style={{
                        width: '100%',
                        height: 120,
                        padding: 5,
                        fontFamily: 'monospace',
                        fontSize: 11,
                        background: 'hsl(var(--input))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 4,
                        boxSizing: 'border-box',
                        outline: 'none',
                        resize: 'vertical',
                    }}
                />
            ) : (
                <div style={{
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 4,
                    overflow: 'hidden',
                }}>
                    {fields.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 80px 24px 24px',
                            gap: 0,
                            fontSize: 10,
                            color: 'hsl(var(--muted-foreground))',
                            padding: '3px 6px',
                            background: 'hsl(var(--card))',
                            borderBottom: '1px solid hsl(var(--border))',
                        }}>
                            <span>Name</span>
                            <span>Type</span>
                            <span title="Required">Req</span>
                            <span></span>
                        </div>
                    )}
                    {fields.map((field, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 80px 24px 24px',
                                gap: 4,
                                padding: '4px 6px',
                                borderBottom: '1px solid hsl(var(--border))',
                                alignItems: 'center',
                            }}
                        >
                            <input
                                value={field.name}
                                onChange={e => updateField(idx, { name: e.target.value })}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'hsl(var(--foreground))',
                                    fontSize: 11,
                                    outline: 'none',
                                    padding: '2px 0',
                                }}
                                placeholder="name"
                            />
                            <select
                                value={field.type}
                                onChange={e => updateField(idx, { type: e.target.value as any })}
                                style={{
                                    background: 'hsl(var(--input))',
                                    border: '1px solid hsl(var(--border))',
                                    color: 'hsl(var(--foreground))',
                                    fontSize: 10,
                                    borderRadius: 2,
                                    outline: 'none',
                                    padding: '1px 2px',
                                }}
                            >
                                <option value="string">string</option>
                                <option value="number">number</option>
                                <option value="boolean">boolean</option>
                                <option value="object">object</option>
                                <option value="array">array</option>
                            </select>
                            <input
                                type="checkbox"
                                checked={field.required || false}
                                onChange={e => updateField(idx, { required: e.target.checked })}
                                style={{ margin: 0, cursor: 'pointer' }}
                            />
                            <button
                                onClick={() => removeField(idx)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    padding: 0,
                                    lineHeight: 1,
                                }}
                            >✕</button>
                        </div>
                    ))}
                    <button
                        onClick={addField}
                        style={{
                            width: '100%',
                            padding: '4px 0',
                            background: 'transparent',
                            border: 'none',
                            color: 'hsl(var(--primary))',
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 500,
                        }}
                    >+ Add Field</button>
                </div>
            )}
        </div>
    );
};

function tryParse(str: string): any {
    try { return JSON.parse(str); } catch { return {}; }
}

// ═══════════════════════════════════════════════════════════════════════════
// Tool Mocking (Enhancement 4.3)
// ═══════════════════════════════════════════════════════════════════════════

const MockOutputEditor: React.FC<{
    mockEnabled: boolean;
    mockOutput: string;
    onToggle: (enabled: boolean) => void;
    onOutputChange: (output: string) => void;
}> = ({ mockEnabled, mockOutput, onToggle, onOutputChange }) => (
    <div style={{
        marginBottom: 10,
        padding: 8,
        border: `1px solid ${mockEnabled ? '#f59e0b44' : 'hsl(var(--border))'}`,
        borderRadius: 4,
        background: mockEnabled ? 'rgba(245,158,11,0.05)' : 'transparent',
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mockEnabled ? 8 : 0 }}>
            <label style={{ fontWeight: 'bold', color: 'hsl(var(--foreground))', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                🎭 Mock Output
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: mockEnabled ? '#f59e0b' : 'hsl(var(--muted-foreground))' }}>
                <input
                    type="checkbox"
                    checked={mockEnabled}
                    onChange={e => onToggle(e.target.checked)}
                    style={{ margin: 0 }}
                />
                {mockEnabled ? 'Enabled' : 'Disabled'}
            </label>
        </div>
        {mockEnabled && (
            <>
                <textarea
                    value={mockOutput}
                    onChange={e => onOutputChange(e.target.value)}
                    placeholder='{"result": "mocked response"}'
                    style={{
                        width: '100%',
                        height: 80,
                        padding: 5,
                        fontFamily: 'monospace',
                        fontSize: 11,
                        background: 'hsl(var(--input))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid #f59e0b44',
                        borderRadius: 4,
                        boxSizing: 'border-box',
                        outline: 'none',
                        resize: 'vertical',
                    }}
                />
                <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>
                    When enabled, this tool returns the mock output instead of executing the script.
                </div>
            </>
        )}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Prompt Versioning (Enhancement 3.1)
// ═══════════════════════════════════════════════════════════════════════════

interface PromptVersion {
    id: string;
    label: string;
    system: string;
    user: string;
    savedAt: string;
}

const VersionManager: React.FC<{
    nodeId: string;
    data: any;
    onRestore: (version: PromptVersion) => void;
}> = ({ nodeId, data, onRestore }) => {
    const [versions, setVersions] = useState<PromptVersion[]>(data._versions || []);
    const [expanded, setExpanded] = useState(false);

    const saveVersion = () => {
        const newVersion: PromptVersion = {
            id: `v-${Date.now()}`,
            label: `v${versions.length + 1}`,
            system: data.system || '',
            user: data.user || '',
            savedAt: new Date().toISOString(),
        };
        const newVersions = [...versions, newVersion];
        setVersions(newVersions);
        // Store versions in node data
        onRestore({ ...data, _versions: newVersions } as any);
    };

    return (
        <div style={{
            marginBottom: 10,
            border: '1px solid hsl(var(--border))',
            borderRadius: 4,
            overflow: 'hidden',
        }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    background: 'hsl(var(--card))',
                    cursor: 'pointer',
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <span style={{ fontSize: 12, fontWeight: 'bold', color: 'hsl(var(--foreground))', display: 'flex', alignItems: 'center', gap: 4 }}>
                    📋 Versions ({versions.length})
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); saveVersion(); }}
                    style={{
                        padding: '2px 8px',
                        fontSize: 10,
                        background: 'hsl(var(--primary))',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 3,
                        cursor: 'pointer',
                    }}
                >Save Version</button>
            </div>
            {expanded && versions.length > 0 && (
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {versions.map((v, idx) => (
                        <div
                            key={v.id}
                            style={{
                                padding: '4px 8px',
                                borderTop: '1px solid hsl(var(--border))',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: 11,
                            }}
                        >
                            <div>
                                <span style={{ fontWeight: 500, color: 'hsl(var(--foreground))' }}>{v.label}</span>
                                <span style={{ color: 'hsl(var(--muted-foreground))', marginLeft: 8 }}>
                                    {new Date(v.savedAt).toLocaleString()}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    onRestore({
                                        ...data,
                                        system: v.system,
                                        user: v.user,
                                        _versions: versions,
                                    } as any);
                                }}
                                style={{
                                    padding: '2px 6px',
                                    fontSize: 10,
                                    background: 'rgba(16,185,129,0.15)',
                                    color: '#34d399',
                                    border: 'none',
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                }}
                            >Restore</button>
                        </div>
                    ))}
                </div>
            )}
            {expanded && versions.length === 0 && (
                <div style={{ padding: 12, textAlign: 'center', fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                    No versions saved yet. Click "Save Version" to snapshot the current prompt.
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main NodeEditor Component
// ═══════════════════════════════════════════════════════════════════════════

const NodeEditor: React.FC<NodeEditorProps> = ({ node, onChange }) => {
    const [data, setData] = useState(node.data);

    useEffect(() => {
        setData(node.data);
    }, [node]);

    const handleChange = (key: string, value: any) => {
        const newData = { ...data, [key]: value };
        setData(newData);
        onChange(node.id, newData);
    };

    // Helper for rendering labeled inputs
    const renderInput = (label: string, key: string, type: 'text' | 'textarea' = 'text') => (
        <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))', fontSize: 12 }}>{label}</label>
            {type === 'textarea' ? (
                <textarea
                    value={data[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    style={{ width: '100%', height: 100, padding: 5, fontFamily: 'monospace', fontSize: 11, background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
                />
            ) : (
                <input
                    type="text"
                    value={data[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    style={{ width: '100%', padding: 5, background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4, fontSize: 11, boxSizing: 'border-box', outline: 'none' }}
                />
            )}
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────
    // Tool Node Editor (with Mocking support - Enhancement 4.3)
    // ─────────────────────────────────────────────────────────────────────
    if (data.nodeType === 'tool') {
        return (
            <div style={{ padding: 10, background: 'hsl(var(--card))', height: '100%', overflowY: 'auto', color: 'hsl(var(--foreground))' }}>
                <h3 style={{ marginTop: 0, fontSize: 14 }}>🔧 Tool Editor: {data.function?.name || data.label}</h3>
                {renderInput('Name', 'label')}
                <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))', fontSize: 12 }}>Description</label>
                    <textarea
                        value={data.function?.description || ''}
                        onChange={(e) => {
                            const newFunc = { ...data.function, description: e.target.value };
                            handleChange('function', newFunc);
                        }}
                        style={{ width: '100%', height: 60, padding: 5, fontSize: 11, background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
                    />
                </div>
                {/* Parameters — use visual schema editor */}
                <SchemaEditor
                    label="Parameters Schema"
                    value={data.function?.parameters}
                    onChange={(schema) => {
                        const newFunc = { ...data.function, parameters: schema };
                        onChange(node.id, { ...data, function: newFunc });
                    }}
                />
                {/* Script Editor (Enhancement 4.2 — enhanced textarea, Monaco placeholder) */}
                <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))', fontSize: 12 }}>Script (JS)</label>
                    <textarea
                        value={data.function?.script || ''}
                        onChange={(e) => {
                             const newFunc = { ...data.function, script: e.target.value };
                             handleChange('function', newFunc);
                        }}
                        style={{
                            width: '100%',
                            height: 200,
                            padding: 8,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            lineHeight: 1.6,
                            background: '#0d1117',
                            color: '#c9d1d9',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 4,
                            boxSizing: 'border-box',
                            outline: 'none',
                            resize: 'vertical',
                            tabSize: 2,
                        }}
                        onKeyDown={(e) => {
                            // Tab key inserts spaces instead of switching focus
                            if (e.key === 'Tab') {
                                e.preventDefault();
                                const target = e.target as HTMLTextAreaElement;
                                const start = target.selectionStart;
                                const end = target.selectionEnd;
                                const val = target.value;
                                target.value = val.substring(0, start) + '  ' + val.substring(end);
                                target.selectionStart = target.selectionEnd = start + 2;
                                const newFunc = { ...data.function, script: target.value };
                                handleChange('function', newFunc);
                            }
                        }}
                        placeholder="// Write tool logic here\n// Available: args (parameters), state (workflow state)\nreturn { result: 'done' };"
                    />
                </div>
                {/* Tool Mocking */}
                <MockOutputEditor
                    mockEnabled={data._mockEnabled || false}
                    mockOutput={data._mockOutput || ''}
                    onToggle={(enabled) => handleChange('_mockEnabled', enabled)}
                    onOutputChange={(output) => handleChange('_mockOutput', output)}
                />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Loop Node Editor
    // ─────────────────────────────────────────────────────────────────────
    if (data.nodeType === 'loop') {
        return (
            <div style={{ padding: 10, background: 'hsl(var(--card))', height: '100%', overflowY: 'auto', color: 'hsl(var(--foreground))' }}>
                <h3 style={{ marginTop: 0, fontSize: 14 }}>🔁 Loop Editor: {data.label}</h3>
                {renderInput('Label', 'label')}
                {renderInput('List Variable', 'variable')}
                {renderInput('Item Variable', 'itemVariable')}
                <div style={{ marginTop: 10, fontSize: 11, color: 'hsl(var(--muted-foreground))', background: 'rgba(99,102,241,0.05)', padding: 8, borderRadius: 4, border: '1px solid rgba(99,102,241,0.15)' }}>
                    💡 Iterates over the list in <code style={{ background: 'rgba(99,102,241,0.15)', padding: '1px 4px', borderRadius: 2 }}>{data.variable || 'items'}</code>, assigning each item to <code style={{ background: 'rgba(99,102,241,0.15)', padding: '1px 4px', borderRadius: 2 }}>{data.itemVariable || 'item'}</code>.
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Condition Node Editor
    // ─────────────────────────────────────────────────────────────────────
    if (data.nodeType === 'condition') {
        return (
            <div style={{ padding: 10, background: 'hsl(var(--card))', height: '100%', overflowY: 'auto', color: 'hsl(var(--foreground))' }}>
                <h3 style={{ marginTop: 0, fontSize: 14 }}>🔀 Condition Editor: {data.label}</h3>
                {renderInput('Label', 'label')}
                {renderInput('Expression (JS)', 'expression')}
                <div style={{ marginTop: 10, fontSize: 11, color: 'hsl(var(--muted-foreground))', background: 'rgba(99,102,241,0.05)', padding: 8, borderRadius: 4, border: '1px solid rgba(99,102,241,0.15)' }}>
                    💡 Evaluates the JavaScript expression against <code style={{ background: 'rgba(99,102,241,0.15)', padding: '1px 4px', borderRadius: 2 }}>state</code>. If true, follows the green path. If false, follows the red path.
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Sub-Chain Node Editor (Enhancement 1.4)
    // ─────────────────────────────────────────────────────────────────────
    if (data.nodeType === 'subchain') {
        return (
            <div style={{ padding: 10, background: 'hsl(var(--card))', height: '100%', overflowY: 'auto', color: 'hsl(var(--foreground))' }}>
                <h3 style={{ marginTop: 0, fontSize: 14 }}>📦 Sub-Chain: {data.label}</h3>
                {renderInput('Label', 'label')}
                {renderInput('Chain Reference', 'chainRef')}
                <div style={{ marginTop: 10, fontSize: 11, color: 'hsl(var(--muted-foreground))', background: 'rgba(16,185,129,0.05)', padding: 8, borderRadius: 4, border: '1px solid rgba(16,185,129,0.15)' }}>
                    💡 Executes another chain as a sub-workflow. The current state is passed as input, and the sub-chain's output is merged back into the state.
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Prompt Node Editor (with Versioning & Schema Editor)
    // ─────────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: 10, background: 'hsl(var(--card))', height: '100%', overflowY: 'auto', color: 'hsl(var(--foreground))' }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>💬 Prompt Editor: {data.name}</h3>
            {renderInput('Name', 'name')}

            {/* Prompt Versioning (Enhancement 3.1) */}
            <VersionManager
                nodeId={node.id}
                data={data}
                onRestore={(restoredData) => {
                    setData(restoredData);
                    onChange(node.id, restoredData);
                }}
            />

            {renderInput('System Prompt', 'system', 'textarea')}
            {renderInput('User Prompt', 'user', 'textarea')}

            {/* JSON Schema Visual Editor for Request/Response Format (Enhancement 3.3) */}
            <SchemaEditor
                label="Request Format"
                value={data.requestFormat}
                onChange={(schema) => {
                    const newData = { ...data, requestFormat: schema };
                    setData(newData);
                    onChange(node.id, newData);
                }}
            />
            <SchemaEditor
                label="Response Format"
                value={data.responseFormat}
                onChange={(schema) => {
                    const newData = { ...data, responseFormat: schema };
                    setData(newData);
                    onChange(node.id, newData);
                }}
            />

            {/* Tools Selection */}
            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))', fontSize: 12 }}>Tools (JSON array of names)</label>
                <textarea
                    value={typeof data.tools === 'string' ? data.tools : JSON.stringify(data.tools || [], null, 2)}
                    onChange={(e) => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            onChange(node.id, { ...data, tools: parsed });
                        } catch (err) { /* invalid JSON, keep local */ }
                        setData((prev: any) => ({ ...prev, tools: e.target.value }));
                    }}
                    style={{ width: '100%', height: 60, padding: 5, fontFamily: 'monospace', fontSize: 11, background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
                />
            </div>
        </div>
    );
};

export default NodeEditor;
