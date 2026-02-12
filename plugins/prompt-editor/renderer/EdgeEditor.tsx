import React, { useState, useEffect } from 'react';
import { Edge } from 'reactflow';

interface EdgeEditorProps {
    edge: Edge;
    onChange: (edgeId: string, newData: any) => void;
}

const EdgeEditor: React.FC<EdgeEditorProps> = ({ edge, onChange }) => {
    const [data, setData] = useState(edge.data || {});
    const [label, setLabel] = useState(edge.label as string || '');

    useEffect(() => {
        setData(edge.data || {});
        setLabel(edge.label as string || '');
    }, [edge]);

    const handleConditionChange = (newCondition: string) => {
        setLabel(newCondition === 'true' ? 'Always' : newCondition);
        const newData = { ...data, condition: newCondition };
        setData(newData);
        onChange(edge.id, { ...newData, label: newCondition === 'true' ? 'Always' : newCondition });
    };

    const handleArgumentsChange = (value: string) => {
        try {
            const parsed = JSON.parse(value);
            const newData = { ...data, arguments: parsed };
            setData(newData);
            onChange(edge.id, newData);
        } catch (e) {
            // Allow invalid JSON while typing
            setData({ ...data, arguments: value }); // This is risky if parent expects object, but edge data is flexible
        }
    };

    return (
        <div style={{ padding: 10, background: 'hsl(var(--card))', height: '100%', overflowY: 'auto', color: 'hsl(var(--foreground))' }}>
            <h3 style={{ marginTop: 0 }}>Edge Editor</h3>
            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))' }}>Condition (JS Expression)</label>
                <input
                    type="text"
                    value={data.condition || ''}
                    onChange={(e) => handleConditionChange(e.target.value)}
                    placeholder="e.g. state.success === true"
                    style={{ width: '100%', padding: 5, fontFamily: 'monospace', background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4 }}
                />
                <small style={{ color: 'hsl(var(--muted-foreground))' }}>Use 'true' for unconditional transition.</small>
            </div>

            <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: 'hsl(var(--foreground))' }}>Arguments (JSON)</label>
                <textarea
                    value={typeof data.arguments === 'string' ? data.arguments : JSON.stringify(data.arguments || {}, null, 2)}
                    onChange={(e) => handleArgumentsChange(e.target.value)}
                    style={{ width: '100%', height: 150, padding: 5, fontFamily: 'monospace', background: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 4 }}
                />
                <small style={{ color: 'hsl(var(--muted-foreground))' }}>Arguments to pass to the next prompt/function.</small>
            </div>
        </div>
    );
};

export default EdgeEditor;
