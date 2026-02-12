import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, Wrench, Repeat, GitBranch } from 'lucide-react';
import { usePromptEditorStore } from './store';

const useExecutionStatus = (id: string) => {
    return usePromptEditorStore(state => state.executionStatus[id]);
};

const getStatusStyle = (statusObj: any, selected: boolean, baseColor: string) => {
    const status = statusObj?.status;
    if (status === 'running') return { 
        borderColor: '#fbbf24', // Amber-400
        boxShadow: '0 0 15px rgba(251, 191, 36, 0.6)',
        transform: 'scale(1.02)',
        transition: 'all 0.2s ease'
    };
    if (status === 'completed') return { 
        borderColor: '#4ade80', // Green-400
        boxShadow: '0 0 8px rgba(74, 222, 128, 0.4)',
        transition: 'all 0.3s ease'
    };
    if (status === 'error') return { 
        borderColor: '#f87171', // Red-400
        boxShadow: '0 0 15px rgba(248, 113, 113, 0.6)' 
    };
    
    return {
        borderColor: selected ? baseColor : 'hsl(var(--border))',
        boxShadow: selected ? `0 0 5px ${baseColor}` : '0 1px 3px rgba(0,0,0,0.1)'
    };
};

const StateOverlay = ({ data }: { data: any }) => {
    if (!data) return null;
    return (
        <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            background: '#1e1e2e',
            border: '1px solid #444',
            padding: 8,
            borderRadius: 6,
            zIndex: 1000,
            width: 250,
            maxHeight: 200,
            overflow: 'auto',
            fontSize: 11,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            pointerEvents: 'none' // Prevent interfering with mouse
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#aaa' }}>Result State</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#e0e0e0' }}>
                {JSON.stringify(data.result || data.error, null, 2)}
            </pre>
        </div>
    );
};

export const PromptNode = memo(({ id, data, selected }: NodeProps) => {
    const statusObj = useExecutionStatus(id);
    const style = getStatusStyle(statusObj, selected, 'hsl(var(--primary))');
    const [hovered, setHovered] = useState(false);

    return (
        <div 
            style={{ 
                padding: 10, 
                borderRadius: 5, 
                background: 'hsl(var(--card))', 
                minWidth: 150,
                color: 'hsl(var(--card-foreground))',
                border: '1px solid transparent', // base
                position: 'relative',
                ...style
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {hovered && statusObj && (statusObj.result || statusObj.error) && <StateOverlay data={statusObj} />}
            
            <Handle type="target" position={Position.Top} style={{ background: 'hsl(var(--muted-foreground))' }} />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                <MessageSquare size={16} style={{ marginRight: 5, color: 'hsl(var(--primary))' }} />
                <div style={{ fontWeight: 'bold' }}>{data.label}</div>
            </div>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Prompt</div>
            <Handle type="source" position={Position.Bottom} style={{ background: 'hsl(var(--muted-foreground))' }} />
        </div>
    );
});

export const ToolNode = memo(({ id, data, selected }: NodeProps) => {
    const statusObj = useExecutionStatus(id);
    const style = getStatusStyle(statusObj, selected, 'hsl(var(--accent))');
    const [hovered, setHovered] = useState(false);

    return (
        <div 
            style={{ 
                padding: 10, 
                borderRadius: 5, 
                background: 'hsl(var(--card))', 
                minWidth: 150,
                color: 'hsl(var(--card-foreground))',
                border: '1px solid transparent',
                position: 'relative',
                ...style
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {hovered && statusObj && (statusObj.result || statusObj.error) && <StateOverlay data={statusObj} />}

            <Handle type="target" position={Position.Top} style={{ background: 'hsl(var(--muted-foreground))' }} />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                <Wrench size={16} style={{ marginRight: 5, color: 'hsl(var(--accent))' }} />
                <div style={{ fontWeight: 'bold' }}>{data.label}</div>
            </div>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Tool</div>
            <Handle type="source" position={Position.Bottom} style={{ background: 'hsl(var(--muted-foreground))' }} />
        </div>
    );
});

export const LoopNode = memo(({ id, data, selected }: NodeProps) => {
    const statusObj = useExecutionStatus(id);
    const style = getStatusStyle(statusObj, selected, 'hsl(var(--secondary))');

    return (
        <div style={{ 
            padding: 10, 
            borderRadius: 5, 
            background: 'hsl(var(--card))', 
            minWidth: 150,
            color: 'hsl(var(--card-foreground))',
            border: '1px solid transparent',
            ...style
        }}>
            <Handle type="target" position={Position.Top} style={{ background: 'hsl(var(--muted-foreground))' }} />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                <Repeat size={16} style={{ marginRight: 5, color: 'hsl(var(--secondary))' }} />
                <div style={{ fontWeight: 'bold' }}>{data.label}</div>
            </div>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Loop</div>
            <Handle type="source" position={Position.Bottom} style={{ background: 'hsl(var(--muted-foreground))' }} />
        </div>
    );
});

export const ConditionNode = memo(({ id, data, selected }: NodeProps) => {
    const statusObj = useExecutionStatus(id);
    const style = getStatusStyle(statusObj, selected, 'hsl(var(--destructive))');

    return (
        <div style={{ 
            padding: 10, 
            borderRadius: 5, 
            background: 'hsl(var(--card))', 
            minWidth: 150,
            color: 'hsl(var(--card-foreground))',
            border: '1px solid transparent',
            ...style
        }}>
            <Handle type="target" position={Position.Top} style={{ background: 'hsl(var(--muted-foreground))' }} />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                <GitBranch size={16} style={{ marginRight: 5, color: 'hsl(var(--destructive))' }} />
                <div style={{ fontWeight: 'bold' }}>{data.label}</div>
            </div>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Condition</div>
            <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%', background: 'green' }} />
            <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%', background: 'red' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 5, color: 'hsl(var(--muted-foreground))' }}>
                <span>True</span>
                <span>False</span>
            </div>
        </div>
    );
});

