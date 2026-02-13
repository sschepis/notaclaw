import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, Wrench, Repeat, GitBranch, Boxes } from 'lucide-react';
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
        borderColor: selected ? baseColor : '#3a3a5a',
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

// V2: Status badge component
const StatusBadge = ({ statusObj }: { statusObj: any }) => {
    if (!statusObj) return null;
    const { status } = statusObj;
    const badges: Record<string, { bg: string; color: string; label: string }> = {
        running: { bg: 'rgba(251,191,36,0.2)', color: '#fbbf24', label: '● Running' },
        completed: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', label: '✓ Done' },
        error: { bg: 'rgba(248,113,113,0.15)', color: '#f87171', label: '✕ Error' },
        pending: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: '○ Pending' },
    };
    const badge = badges[status];
    if (!badge) return null;
    return (
        <div style={{
            fontSize: 9,
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: 8,
            background: badge.bg,
            color: badge.color,
            display: 'inline-block',
            letterSpacing: 0.3,
        }}>
            {badge.label}
        </div>
    );
};

// V2: Truncated text preview for prompts
const TextPreview = ({ text, maxLen = 60 }: { text?: string; maxLen?: number }) => {
    if (!text) return null;
    const truncated = text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
    return (
        <div style={{
            fontSize: 10,
            color: '#888',
            marginTop: 3,
            lineHeight: 1.3,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            maxWidth: 200,
            fontFamily: 'monospace',
            opacity: 0.8,
        }}>
            {truncated}
        </div>
    );
};

export const PromptNode = memo(({ id, data, selected }: NodeProps) => {
    const statusObj = useExecutionStatus(id);
    const style = getStatusStyle(statusObj, selected, '#6366f1');
    const [hovered, setHovered] = useState(false);

    return (
        <div 
            style={{ 
                padding: 10, 
                borderRadius: 8, 
                background: '#1e1e38', 
                minWidth: 180,
                maxWidth: 240,
                color: '#e0e0f0',
                border: '2px solid transparent',
                position: 'relative',
                ...style
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {hovered && statusObj && (statusObj.result || statusObj.error) && <StateOverlay data={statusObj} />}
            
            <Handle type="target" position={Position.Top} style={{ background: '#888' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <MessageSquare size={14} style={{ marginRight: 5, color: '#6366f1' }} />
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{data.label || data.name}</div>
                </div>
                <StatusBadge statusObj={statusObj} />
            </div>
            {/* V2: Rich preview — system prompt snippet */}
            <TextPreview text={data.system} />
            {/* V2: User template preview */}
            {data.user && (
                <div style={{ fontSize: 10, color: '#6366f1', marginTop: 2, opacity: 0.7, fontFamily: 'monospace' }}>
                    {data.user.length > 40 ? data.user.slice(0, 40) + '…' : data.user}
                </div>
            )}
            {/* V2: Tool count badge */}
            {data.tools && data.tools.length > 0 && (
                <div style={{
                    fontSize: 9,
                    color: '#f59e0b',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                }}>
                    <Wrench size={9} /> {data.tools.length} tool{data.tools.length !== 1 ? 's' : ''}
                </div>
            )}
            {/* V2: Version count */}
            {data._versions && data._versions.length > 0 && (
                <div style={{
                    fontSize: 9,
                    color: '#818cf8',
                    marginTop: 2,
                    opacity: 0.7,
                }}>
                    📋 {data._versions.length} version{data._versions.length !== 1 ? 's' : ''}
                </div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: '#888' }} />
        </div>
    );
});

export const ToolNode = memo(({ id, data, selected }: NodeProps) => {
    const statusObj = useExecutionStatus(id);
    const style = getStatusStyle(statusObj, selected, '#f59e0b');
    const [hovered, setHovered] = useState(false);

    return (
        <div 
            style={{ 
                padding: 10, 
                borderRadius: 8, 
                background: '#1e1e38', 
                minWidth: 180,
                maxWidth: 240,
                color: '#e0e0f0',
                border: '2px solid transparent',
                position: 'relative',
                ...style
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {hovered && statusObj && (statusObj.result || statusObj.error) && <StateOverlay data={statusObj} />}

            <Handle type="target" position={Position.Top} style={{ background: '#888' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Wrench size={14} style={{ marginRight: 5, color: '#f59e0b' }} />
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{data.label}</div>
                </div>
                <StatusBadge statusObj={statusObj} />
            </div>
            {/* V2: Function name */}
            {data.function?.name && (
                <div style={{ fontSize: 10, color: '#f59e0b', opacity: 0.7, fontFamily: 'monospace' }}>
                    fn: {data.function.name}
                </div>
            )}
            {/* V2: Script preview */}
            {data.function?.script && (
                <TextPreview text={data.function.script} maxLen={50} />
            )}
            {/* V2: Mock badge */}
            {data._mockEnabled && (
                <div style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 8,
                    background: 'rgba(245,158,11,0.15)',
                    color: '#f59e0b',
                    display: 'inline-block',
                    marginTop: 4,
                }}>
                    🎭 Mocked
                </div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: '#888' }} />
        </div>
    );
});

export const LoopNode = memo(({ id, data, selected }: NodeProps) => {
    const statusObj = useExecutionStatus(id);
    const style = getStatusStyle(statusObj, selected, '#8b5cf6');

    return (
        <div style={{ 
            padding: 10, 
            borderRadius: 8, 
            background: '#1e1e38', 
            minWidth: 180,
            maxWidth: 240,
            color: '#e0e0f0',
            border: '2px solid transparent',
            ...style
        }}>
            <Handle type="target" position={Position.Top} style={{ background: '#888' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Repeat size={14} style={{ marginRight: 5, color: '#8b5cf6' }} />
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{data.label}</div>
                </div>
                <StatusBadge statusObj={statusObj} />
            </div>
            {/* V2: Loop config */}
            <div style={{ fontSize: 10, color: '#8b5cf6', opacity: 0.7, fontFamily: 'monospace' }}>
                for ({data.itemVariable || 'item'} in {data.variable || 'items'})
            </div>
            <Handle type="source" position={Position.Bottom} style={{ background: '#888' }} />
        </div>
    );
});

export const ConditionNode = memo(({ id, data, selected }: NodeProps) => {
    const statusObj = useExecutionStatus(id);
    const style = getStatusStyle(statusObj, selected, '#ef4444');

    return (
        <div style={{ 
            padding: 10, 
            borderRadius: 8, 
            background: '#1e1e38', 
            minWidth: 180,
            maxWidth: 240,
            color: '#e0e0f0',
            border: '2px solid transparent',
            ...style
        }}>
            <Handle type="target" position={Position.Top} style={{ background: '#888' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <GitBranch size={14} style={{ marginRight: 5, color: '#ef4444' }} />
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{data.label}</div>
                </div>
                <StatusBadge statusObj={statusObj} />
            </div>
            {/* V2: Expression preview */}
            {data.expression && (
                <div style={{ fontSize: 10, color: '#ef4444', opacity: 0.7, fontFamily: 'monospace', marginBottom: 4 }}>
                    if ({data.expression.length > 35 ? data.expression.slice(0, 35) + '…' : data.expression})
                </div>
            )}
            <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%', background: '#4ade80' }} />
            <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%', background: '#f87171' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginTop: 5, color: '#888' }}>
                <span style={{ color: '#4ade80' }}>✓ True</span>
                <span style={{ color: '#f87171' }}>✕ False</span>
            </div>
        </div>
    );
});

export const SubChainNode = memo(({ id, data, selected }: NodeProps) => {
    const statusObj = useExecutionStatus(id);
    const style = getStatusStyle(statusObj, selected, '#10b981');
    const [hovered, setHovered] = useState(false);

    return (
        <div 
            style={{ 
                padding: 10, 
                borderRadius: 8, 
                background: '#1e1e38', 
                minWidth: 180,
                maxWidth: 240,
                color: '#e0e0f0',
                border: '2px dashed transparent',
                position: 'relative',
                ...style,
                borderStyle: 'dashed',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {hovered && statusObj && (statusObj.result || statusObj.error) && <StateOverlay data={statusObj} />}
            
            <Handle type="target" position={Position.Top} style={{ background: '#888' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Boxes size={14} style={{ marginRight: 5, color: '#10b981' }} />
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{data.label}</div>
                </div>
                <StatusBadge statusObj={statusObj} />
            </div>
            {/* V2: Chain reference */}
            {data.chainRef && (
                <div style={{ fontSize: 10, color: '#10b981', opacity: 0.7, fontFamily: 'monospace' }}>
                    → {data.chainRef}
                </div>
            )}
            {!data.chainRef && (
                <div style={{ fontSize: 10, color: '#666', fontStyle: 'italic' }}>
                    No chain linked
                </div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: '#888' }} />
        </div>
    );
});
