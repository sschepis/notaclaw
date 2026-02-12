import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface NodeEditorProps {
    node: Node;
    onChange: (nodeId: string, newData: any) => void;
}

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

    const handleJsonChange = (key: string, value: string) => {
        try {
            const parsed = JSON.parse(value);
            handleChange(key, parsed);
        } catch (e) {
            // Just update local state to allow typing, but don't push up invalid JSON
            setData({ ...data, [key]: value }); // This might be tricky if parent expects object
        }
    };

    // Helper for rendering labeled inputs
    const renderInput = (label: string, key: string, type: 'text' | 'textarea' = 'text') => (
        <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))' }}>{label}</label>
            {type === 'textarea' ? (
                <textarea
                    value={data[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    style={{ width: '100%', height: 100, padding: 5, fontFamily: 'monospace', background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4 }}
                />
            ) : (
                <input
                    type="text"
                    value={data[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    style={{ width: '100%', padding: 5, background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4 }}
                />
            )}
        </div>
    );

    const renderJsonInput = (label: string, key: string) => {
        const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key], null, 2);
        return (
            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))' }}>{label} (JSON)</label>
                <textarea
                    value={value}
                    onChange={(e) => {
                        // We need to handle the raw string in local state, 
                        // but only propagate valid JSON to parent
                        try {
                            const parsed = JSON.parse(e.target.value);
                            onChange(node.id, { ...data, [key]: parsed });
                        } catch (err) {
                            // Invalid JSON, don't propagate yet
                        }
                        // Force update local state so user can type
                        setData((prev: any) => ({ ...prev, [key]: e.target.value })); 
                    }}
                    style={{ width: '100%', height: 150, padding: 5, fontFamily: 'monospace', background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4 }}
                />
            </div>
        );
    };

    if (data.nodeType === 'tool') {
        return (
            <div style={{ padding: 10, background: 'hsl(var(--card))', height: '100%', overflowY: 'auto', color: 'hsl(var(--foreground))' }}>
                <h3 style={{ marginTop: 0 }}>Tool Editor: {data.function?.name || data.label}</h3>
                {renderInput('Name', 'label')} {/* Should map to function.name */}
                <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))' }}>Description</label>
                    <textarea
                        value={data.function?.description || ''}
                        onChange={(e) => {
                            const newFunc = { ...data.function, description: e.target.value };
                            handleChange('function', newFunc);
                        }}
                        style={{ width: '100%', height: 60, padding: 5, background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4 }}
                    />
                </div>
                {/* Parameters JSON */}
                <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))' }}>Parameters (JSON Schema)</label>
                    <textarea
                        value={JSON.stringify(data.function?.parameters || {}, null, 2)}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                const newFunc = { ...data.function, parameters: parsed };
                                onChange(node.id, { ...data, function: newFunc });
                            } catch (err) {}
                        }}
                        style={{ width: '100%', height: 150, padding: 5, fontFamily: 'monospace', background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4 }}
                    />
                </div>
                {/* Script */}
                <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))' }}>Script (JS)</label>
                    <textarea
                        value={data.function?.script || ''}
                        onChange={(e) => {
                             const newFunc = { ...data.function, script: e.target.value };
                             handleChange('function', newFunc);
                        }}
                        style={{ width: '100%', height: 200, padding: 5, fontFamily: 'monospace', background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4 }}
                    />
                </div>
            </div>
        );
    }

    if (data.nodeType === 'loop') {
        return (
            <div style={{ padding: 10, background: 'hsl(var(--card))', height: '100%', overflowY: 'auto', color: 'hsl(var(--foreground))' }}>
                <h3 style={{ marginTop: 0 }}>Loop Editor: {data.label}</h3>
                {renderInput('Label', 'label')}
                {renderInput('List Variable', 'variable')}
                {renderInput('Item Variable', 'itemVariable')}
                <div style={{ marginTop: 10, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                    Iterates over the list in <code>{data.variable}</code>, assigning each item to <code>{data.itemVariable}</code>.
                </div>
            </div>
        );
    }

    if (data.nodeType === 'condition') {
        return (
            <div style={{ padding: 10, background: 'hsl(var(--card))', height: '100%', overflowY: 'auto', color: 'hsl(var(--foreground))' }}>
                <h3 style={{ marginTop: 0 }}>Condition Editor: {data.label}</h3>
                {renderInput('Label', 'label')}
                {renderInput('Expression (JS)', 'expression')}
                <div style={{ marginTop: 10, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                    Evaluates the JavaScript expression. If true, follows the green path. If false, follows the red path.
                </div>
            </div>
        );
    }

    // Default to Prompt Editor
    return (
        <div style={{ padding: 10, background: 'hsl(var(--card))', height: '100%', overflowY: 'auto', color: 'hsl(var(--foreground))' }}>
            <h3 style={{ marginTop: 0 }}>Prompt Editor: {data.name}</h3>
            {renderInput('Name', 'name')}
            {renderInput('System Prompt', 'system', 'textarea')}
            {renderInput('User Prompt', 'user', 'textarea')}
            {renderJsonInput('Request Format', 'requestFormat')}
            {renderJsonInput('Response Format', 'responseFormat')}
            
            {/* Tools Selection - Simplified as comma sep list for now or JSON */}
            {renderJsonInput('Tools (Array of names)', 'tools')}
        </div>
    );
};

export default NodeEditor;
