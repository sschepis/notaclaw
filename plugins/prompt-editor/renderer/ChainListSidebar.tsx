import React, { useEffect } from 'react';
import { usePromptEditorStore } from './store';

interface ChainListSidebarProps {
    context?: any;
}

export const ChainListSidebar: React.FC<ChainListSidebarProps> = ({ context }) => {
    const { 
        chains, 
        selectedChain, 
        sidebarFilter, 
        setSidebarFilter, 
        loadChains, 
        loadChain, 
        createChain,
        deleteConfirmId,
        setDeleteConfirmId,
        deleteChain,
        setShowNewChainModal,
        showNewChainModal,
        newChainId,
        setNewChainId
    } = usePromptEditorStore();

    useEffect(() => {
        if (context?.ipc) {
            loadChains(context.ipc);
        }
    }, [context]);

    const filteredChains = chains.filter(c => {
        if (!sidebarFilter) return true;
        const q = sidebarFilter.toLowerCase();
        return c.id.toLowerCase().includes(q) ||
               (c.description || '').toLowerCase().includes(q);
    });

    const handleCreateChain = () => {
        createChain(newChainId, context?.ipc);
    };

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#16162a',
            color: '#e0e0e0',
            fontFamily: 'sans-serif'
        }}>
            {/* Sidebar header */}
            <div style={{
                padding: '14px 16px 10px',
                borderBottom: '1px solid #2a2a4a',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f0f0f0' }}>Prompt Chains</h3>
                    <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{chains.length} total</span>
                </div>

                {/* Search / filter */}
                <input
                    type="text"
                    value={sidebarFilter}
                    onChange={e => setSidebarFilter(e.target.value)}
                    placeholder="Filter chains…"
                    style={{
                        width: '100%',
                        padding: '6px 10px',
                        background: '#1e1e3a',
                        color: '#d0d0d0',
                        border: '1px solid #2a2a4a',
                        borderRadius: 4,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        outline: 'none',
                    }}
                />
            </div>

            {/* Action buttons */}
            <div style={{ padding: '8px 12px', display: 'flex', gap: 6, borderBottom: '1px solid #2a2a4a' }}>
                <button
                    onClick={() => setShowNewChainModal(true)}
                    style={{
                        flex: 1,
                        padding: '6px 0',
                        background: '#3a3aff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                >
                    + New Chain
                </button>
            </div>

            {/* Chain list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredChains.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 13 }}>
                        {chains.length === 0 ? 'No chains yet. Create one!' : 'No matches'}
                    </div>
                )}
                {filteredChains.map(meta => {
                    const isSelected = selectedChain === meta.id;
                    const isDeleteTarget = deleteConfirmId === meta.id;
                    return (
                        <div
                            key={meta.id}
                            onClick={() => {
                                loadChain(meta.id, context?.ipc);
                                // Ensure the main editor is open when a chain is selected
                                if (context?.ui?.layoutAction) {
                                    // This assumes we can trigger layout actions from here
                                    // But we might need to use the store or context
                                    // For now, we rely on the main app logic or user action
                                }
                            }}
                            style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                background: isSelected ? '#2a2a5a' : 'transparent',
                                borderLeft: isSelected ? '3px solid #6c6cff' : '3px solid transparent',
                                borderBottom: '1px solid #1e1e38',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.background = '#1e1e40'); }}
                            onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.background = 'transparent'); }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: isSelected ? 600 : 400,
                                        color: isSelected ? '#fff' : '#d0d0e0',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {meta.id}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                                        {meta.promptCount !== undefined && (
                                            <span style={{ fontSize: 10, color: '#888' }}>
                                                {meta.promptCount}P · {meta.toolCount}T
                                            </span>
                                        )}
                                    </div>
                                    {meta.description && (
                                        <div style={{
                                            fontSize: 11,
                                            color: '#888',
                                            marginTop: 3,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {meta.description}
                                        </div>
                                    )}
                                </div>
                                {/* Delete button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isDeleteTarget) {
                                            deleteChain(meta.id, context?.ipc);
                                        } else {
                                            setDeleteConfirmId(meta.id);
                                            setTimeout(() => setDeleteConfirmId(null), 3000);
                                        }
                                    }}
                                    title={isDeleteTarget ? 'Click again to confirm deletion' : 'Delete chain'}
                                    style={{
                                        background: isDeleteTarget ? '#ff4444' : 'transparent',
                                        border: 'none',
                                        color: isDeleteTarget ? '#fff' : '#666',
                                        cursor: 'pointer',
                                        fontSize: isDeleteTarget ? 10 : 14,
                                        padding: isDeleteTarget ? '2px 6px' : '2px 4px',
                                        borderRadius: 3,
                                        marginLeft: 6,
                                        flexShrink: 0,
                                    }}
                                >
                                    {isDeleteTarget ? 'Confirm?' : '✕'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Draggable Nodes Palette */}
            <div style={{ borderTop: '1px solid #2a2a4a', padding: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Drag to Add</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {[
                        { type: 'prompt', icon: '💬', label: 'Prompt' },
                        { type: 'tool', icon: '🔧', label: 'Tool' },
                        { type: 'loop', icon: '🔁', label: 'Loop' },
                        { type: 'condition', icon: '🔀', label: 'Condition' },
                        { type: 'subchain', icon: '📦', label: 'Sub-Chain' },
                    ].map(item => (
                        <div
                            key={item.type}
                            onDragStart={(event) => onDragStart(event, item.type)}
                            draggable
                            style={{
                                padding: '6px 8px',
                                border: '1px solid #2a2a4a',
                                borderRadius: 4,
                                cursor: 'grab',
                                background: '#1e1e3a',
                                color: '#c0c0e0',
                                fontSize: 11,
                                textAlign: 'center',
                            }}
                        >
                            {item.icon} {item.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* New Chain Modal */}
            {showNewChainModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#1e1e38', color: '#e0e0e0', padding: 24, borderRadius: 8, width: 300, border: '1px solid #2a2a4a', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                        <h3 style={{ marginTop: 0, fontSize: 16, color: '#f0f0f0' }}>New Prompt Chain</h3>
                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: '#aaa', fontWeight: 500 }}>Chain ID:</label>
                            <input
                                type="text"
                                value={newChainId}
                                onChange={e => setNewChainId(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateChain(); }}
                                autoFocus
                                placeholder="my-chain"
                                style={{ width: '100%', padding: '8px 10px', background: '#16162a', color: '#d0d0e0', border: '1px solid #2a2a4a', borderRadius: 4, boxSizing: 'border-box', fontSize: 13, outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setShowNewChainModal(false)} style={{ padding: '8px 16px', background: '#2a2a4a', color: '#d0d0e0', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                            <button onClick={handleCreateChain} disabled={!newChainId.trim()} style={{ padding: '8px 16px', background: '#3a3aff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: newChainId.trim() ? 1 : 0.5, fontSize: 12, fontWeight: 600 }}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
