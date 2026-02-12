import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, Wrench, Repeat, GitBranch } from 'lucide-react';

export const PromptNode = memo(({ data, selected }: NodeProps) => {
    return (
        <div style={{ 
            padding: 10, 
            borderRadius: 5, 
            background: 'hsl(var(--card))', 
            border: `1px solid ${selected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
            boxShadow: selected ? '0 0 5px hsl(var(--primary))' : '0 1px 3px rgba(0,0,0,0.1)',
            minWidth: 150,
            color: 'hsl(var(--card-foreground))'
        }}>
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

export const ToolNode = memo(({ data, selected }: NodeProps) => {
    return (
        <div style={{ 
            padding: 10, 
            borderRadius: 5, 
            background: 'hsl(var(--card))', 
            border: `1px solid ${selected ? 'hsl(var(--accent))' : 'hsl(var(--border))'}`,
            boxShadow: selected ? '0 0 5px hsl(var(--accent))' : '0 1px 3px rgba(0,0,0,0.1)',
            minWidth: 150,
            color: 'hsl(var(--card-foreground))'
        }}>
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

export const LoopNode = memo(({ data, selected }: NodeProps) => {
    return (
        <div style={{ 
            padding: 10, 
            borderRadius: 5, 
            background: 'hsl(var(--card))', 
            border: `1px solid ${selected ? 'hsl(var(--secondary))' : 'hsl(var(--border))'}`,
            boxShadow: selected ? '0 0 5px hsl(var(--secondary))' : '0 1px 3px rgba(0,0,0,0.1)',
            minWidth: 150,
            color: 'hsl(var(--card-foreground))'
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

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
    return (
        <div style={{ 
            padding: 10, 
            borderRadius: 5, 
            background: 'hsl(var(--card))', 
            border: `1px solid ${selected ? 'hsl(var(--destructive))' : 'hsl(var(--border))'}`,
            boxShadow: selected ? '0 0 5px hsl(var(--destructive))' : '0 1px 3px rgba(0,0,0,0.1)',
            minWidth: 150,
            color: 'hsl(var(--card-foreground))'
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

