import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Search, ChevronDown, ChevronRight, Zap,
    FileText, Eye, EyeOff, ArrowDownToLine, Database,
    Activity, BarChart3, Lock
} from 'lucide-react';
import { useMemoryStore } from '../../store/useMemoryStore';
import type { MemoryFragment, MemoryScope } from '../../../shared/alephnet-types';

// ─── Constants ───────────────────────────────────────────────────────────

const SCOPE_STYLES: Record<MemoryScope, { color: string; bg: string; label: string }> = {
    global: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Global' },
    user: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'User' },
    conversation: { color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Conversation' },
    organization: { color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Shared' }
};

// ─── Mini Radar Visualization ────────────────────────────────────────────

const MiniRadarViz: React.FC<{ primeSignature: number[]; size?: number }> = ({ 
    primeSignature, 
    size = 120 
}) => {
    const center = size / 2;
    const radius = (size / 2) - 12;
    const axes = 8; // Show first 8 axes for compact view
    
    const points = useMemo(() => {
        const sig = primeSignature?.length >= axes 
            ? primeSignature.slice(0, axes) 
            : Array(axes).fill(0);
        
        return sig.map((val, i) => {
            const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
            const r = Math.abs(val) * radius;
            return {
                x: center + r * Math.cos(angle),
                y: center + r * Math.sin(angle),
                value: val,
                gridX: center + radius * Math.cos(angle),
                gridY: center + radius * Math.sin(angle)
            };
        });
    }, [primeSignature, center, radius, axes]);

    const pathData = points.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ') + ' Z';

    const gridRings = [0.25, 0.5, 0.75, 1.0];

    return (
        <svg width={size} height={size} className="mx-auto">
            {/* Grid rings */}
            {gridRings.map(scale => (
                <circle
                    key={scale}
                    cx={center}
                    cy={center}
                    r={radius * scale}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.5}
                />
            ))}
            
            {/* Grid axes */}
            {points.map((p, i) => (
                <line
                    key={`axis-${i}`}
                    x1={center}
                    y1={center}
                    x2={p.gridX}
                    y2={p.gridY}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.5}
                />
            ))}

            {/* Data polygon */}
            <path
                d={pathData}
                fill="rgba(139, 92, 246, 0.15)"
                stroke="rgba(139, 92, 246, 0.6)"
                strokeWidth={1.5}
            />

            {/* Data points */}
            {points.map((p, i) => (
                <circle
                    key={`point-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={2}
                    fill="#a855f7"
                    opacity={0.8}
                />
            ))}

            {/* Center dot */}
            <circle cx={center} cy={center} r={1.5} fill="rgba(255,255,255,0.2)" />
        </svg>
    );
};

// ─── Entropy Bar ─────────────────────────────────────────────────────────

const EntropyBar: React.FC<{ entropy: number; compact?: boolean }> = ({ entropy, compact = false }) => {
    const percent = Math.round(entropy * 100);
    const color = percent < 30 ? 'bg-emerald-500' : percent < 70 ? 'bg-amber-500' : 'bg-red-500';
    const textColor = percent < 30 ? 'text-emerald-400' : percent < 70 ? 'text-amber-400' : 'text-red-400';
    const label = percent < 30 ? 'Stable' : percent < 70 ? 'Active' : 'Chaotic';

    return (
        <div className={compact ? 'flex items-center gap-2' : ''}>
            <div className="flex items-center gap-2 mb-1">
                <Zap size={10} className={textColor} />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Entropy</span>
                <span className={`text-[10px] font-mono font-medium ${textColor}`}>{percent}%</span>
                {!compact && (
                    <span className="text-[10px] text-gray-600">({label})</span>
                )}
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full rounded-full ${color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
};

// ─── Fragment Mini Card ──────────────────────────────────────────────────

const FragmentMiniCard: React.FC<{ fragment: MemoryFragment }> = ({ fragment }) => {
    const significancePercent = Math.round((fragment.significance ?? 0.5) * 100);
    const date = new Date(fragment.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2 rounded-lg border border-white/5 bg-black/20 hover:bg-white/5 
                       hover:border-white/10 transition-all cursor-default group"
        >
            <div className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                {fragment.content}
            </div>
            <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-gray-600 font-mono">{timeStr}</span>
                <div className="flex items-center gap-2">
                    {fragment.primeFactors && fragment.primeFactors.length > 0 && (
                        <span className="text-[10px] text-gray-700 font-mono">
                            P[{fragment.primeFactors.slice(0, 2).join(',')}]
                        </span>
                    )}
                    <span className={`text-[10px] font-mono ${
                        significancePercent >= 70 ? 'text-blue-400' : 
                        significancePercent >= 40 ? 'text-blue-500/60' : 'text-gray-600'
                    }`}>
                        {significancePercent}%
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

// ─── Collapsible Section ─────────────────────────────────────────────────

const CollapsibleSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    count?: number;
    defaultOpen?: boolean;
    children: React.ReactNode;
}> = ({ title, icon, count, defaultOpen = true, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div className="border-t border-white/5 first:border-t-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-gray-500">{icon}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {title}
                    </span>
                    {count !== undefined && (
                        <span className="text-[10px] text-gray-600 font-mono">({count})</span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronDown size={12} className="text-gray-600" />
                ) : (
                    <ChevronRight size={12} className="text-gray-600" />
                )}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── View Mode Toggle ────────────────────────────────────────────────────

type ExplorerView = 'overview' | 'fragments' | 'visualization';

const ViewToggle: React.FC<{
    activeView: ExplorerView;
    onChange: (view: ExplorerView) => void;
}> = ({ activeView, onChange }) => {
    const views: { id: ExplorerView; icon: React.ReactNode; label: string }[] = [
        { id: 'overview', icon: <Database size={12} />, label: 'Overview' },
        { id: 'fragments', icon: <FileText size={12} />, label: 'Fragments' },
        { id: 'visualization', icon: <BarChart3 size={12} />, label: 'Visual' },
    ];
    
    return (
        <div className="flex items-center bg-black/30 rounded-lg p-0.5 border border-white/5">
            {views.map(v => (
                <button
                    key={v.id}
                    onClick={() => onChange(v.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                        activeView === v.id
                            ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                            : 'text-gray-500 hover:text-gray-300'
                    }`}
                    title={v.label}
                >
                    {v.icon}
                    <span className="hidden sm:inline">{v.label}</span>
                </button>
            ))}
        </div>
    );
};

// ─── Main Memory Field Explorer ──────────────────────────────────────────

export const MemoryFieldExplorer: React.FC<{ conversationId: string }> = ({ conversationId }) => {
    const { fields, loadFragments, fragments, loadFields, foldToUserField, syncing } = useMemoryStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState<ExplorerView>('overview');
    const [showAllFragments, setShowAllFragments] = useState(false);

    // Load fields if not loaded
    useEffect(() => {
        if (Object.keys(fields).length === 0) {
            loadFields({ scope: 'conversation' });
        }
    }, [loadFields, fields]);

    // Find field for this conversation
    const field = useMemo(() =>
        Object.values(fields).find(f => f.conversationId === conversationId && f.scope === 'conversation'),
    [fields, conversationId]);

    const fieldFragments = field ? (fragments[field.id] || []) : [];

    useEffect(() => {
        if (field) {
            loadFragments(field.id);
        }
    }, [field?.id, loadFragments]);

    const filteredFragments = useMemo(() => {
        if (!searchQuery) return fieldFragments;
        return fieldFragments.filter(f => f.content.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [fieldFragments, searchQuery]);

    const displayedFragments = showAllFragments 
        ? filteredFragments 
        : filteredFragments.slice(0, 5);

    const handleFold = useCallback(async () => {
        if (!field) return;
        try {
            await foldToUserField(field.id);
        } catch (err) {
            console.error('Failed to fold memory field:', err);
        }
    }, [field, foldToUserField]);

    // Compute field stats
    const stats = useMemo(() => {
        if (!field) return null;
        const totalSignificance = fieldFragments.reduce((sum, f) => sum + (f.significance ?? 0.5), 0);
        const avgSignificance = fieldFragments.length > 0 ? totalSignificance / fieldFragments.length : 0;
        const highSigCount = fieldFragments.filter(f => (f.significance ?? 0.5) >= 0.7).length;
        
        return {
            fragmentCount: fieldFragments.length,
            avgSignificance: Math.round(avgSignificance * 100),
            highSigCount,
            entropy: field.entropy ?? 0,
            lastUpdated: field.updatedAt ? new Date(field.updatedAt).toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'N/A',
        };
    }, [field, fieldFragments]);

    // No field found — show placeholder
    if (!field) {
        return (
            <div className="py-4">
                <div className="flex items-center gap-2 px-2 mb-3">
                    <Brain size={12} className="text-gray-500" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Memory Field
                    </span>
                </div>
                <div className="text-center py-6 px-3">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-purple-500/10 
                                    flex items-center justify-center border border-purple-500/20">
                        <Brain size={18} className="text-purple-500/40" />
                    </div>
                    <p className="text-xs text-gray-500">No memory field</p>
                    <p className="text-[10px] text-gray-600 mt-1">
                        Memories will appear as the conversation progresses
                    </p>
                </div>
            </div>
        );
    }

    const scopeStyle = SCOPE_STYLES[field.scope];

    return (
        <div className="py-2">
            {/* Header with title and view toggle */}
            <div className="px-2 mb-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Brain size={12} className="text-purple-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Memory Field
                        </span>
                    </div>
                    <ViewToggle activeView={activeView} onChange={setActiveView} />
                </div>

                {/* Field title card */}
                <div className="p-2.5 rounded-lg border border-white/5 bg-gradient-to-br from-purple-500/5 to-transparent">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${scopeStyle.bg} ${scopeStyle.color}`}>
                            {scopeStyle.label}
                        </span>
                        {field.locked && (
                            <Lock size={10} className="text-gray-500" />
                        )}
                        <span className="text-xs font-medium text-gray-200 truncate flex-1">
                            {field.name}
                        </span>
                    </div>
                    {field.description && (
                        <p className="text-[10px] text-gray-500 line-clamp-1 mb-2">
                            {field.description}
                        </p>
                    )}
                    <EntropyBar entropy={field.entropy ?? 0} />
                </div>
            </div>

            {/* Overview View */}
            <AnimatePresence mode="wait">
                {activeView === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                    >
                        {/* Stats Grid */}
                        <CollapsibleSection
                            title="Field Stats"
                            icon={<Activity size={10} />}
                            defaultOpen={true}
                        >
                            {stats && (
                                <div className="grid grid-cols-2 gap-2">
                                    <StatCard 
                                        label="Fragments" 
                                        value={stats.fragmentCount.toString()} 
                                        icon={<FileText size={10} />}
                                    />
                                    <StatCard 
                                        label="Avg Significance" 
                                        value={`${stats.avgSignificance}%`} 
                                        icon={<Activity size={10} />}
                                    />
                                    <StatCard 
                                        label="High Value" 
                                        value={stats.highSigCount.toString()} 
                                        icon={<Zap size={10} />}
                                    />
                                    <StatCard 
                                        label="Updated" 
                                        value={stats.lastUpdated} 
                                        icon={<Database size={10} />}
                                        small
                                    />
                                </div>
                            )}
                        </CollapsibleSection>

                        {/* Recent Fragments Preview */}
                        <CollapsibleSection
                            title="Recent Memories"
                            icon={<FileText size={10} />}
                            count={fieldFragments.length}
                            defaultOpen={true}
                        >
                            <div className="space-y-1.5">
                                {fieldFragments.slice(0, 3).map(fragment => (
                                    <FragmentMiniCard key={fragment.id} fragment={fragment} />
                                ))}
                                {fieldFragments.length === 0 && (
                                    <p className="text-[10px] text-gray-600 text-center py-2">
                                        No memories stored yet
                                    </p>
                                )}
                                {fieldFragments.length > 3 && (
                                    <button
                                        onClick={() => setActiveView('fragments')}
                                        className="w-full text-center text-[10px] text-purple-400 
                                                   hover:text-purple-300 py-1 transition-colors"
                                    >
                                        View all {fieldFragments.length} fragments →
                                    </button>
                                )}
                            </div>
                        </CollapsibleSection>

                        {/* Fold Action */}
                        {field.scope === 'conversation' && !field.locked && (
                            <div className="px-3 pt-2">
                                <button
                                    onClick={handleFold}
                                    disabled={syncing}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 
                                             rounded-lg bg-emerald-500/10 border border-emerald-500/20
                                             text-emerald-400 text-xs font-medium
                                             hover:bg-emerald-500/20 hover:border-emerald-500/30
                                             disabled:opacity-50 transition-all"
                                >
                                    {syncing ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-400" />
                                    ) : (
                                        <ArrowDownToLine size={12} />
                                    )}
                                    Fold to User Memory
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Fragments View */}
                {activeView === 'fragments' && (
                    <motion.div
                        key="fragments"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="px-2"
                    >
                        {/* Search bar */}
                        <div className="relative mb-2">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search memories..."
                                className="w-full bg-black/20 border border-white/10 rounded-lg 
                                         px-2 py-1.5 pl-7 text-xs text-gray-300 
                                         focus:outline-none focus:border-purple-500/50 
                                         placeholder:text-gray-600 transition-colors"
                            />
                        </div>

                        {/* Fragment count */}
                        <div className="flex items-center justify-between px-1 mb-2 text-[10px] text-gray-600">
                            <span>
                                {filteredFragments.length} fragment{filteredFragments.length !== 1 ? 's' : ''}
                                {searchQuery && ` matching "${searchQuery}"`}
                            </span>
                            {filteredFragments.length > 5 && (
                                <button
                                    onClick={() => setShowAllFragments(!showAllFragments)}
                                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                                >
                                    {showAllFragments ? <EyeOff size={10} /> : <Eye size={10} />}
                                    {showAllFragments ? 'Less' : 'All'}
                                </button>
                            )}
                        </div>

                        {/* Fragment list */}
                        <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
                            {displayedFragments.map(fragment => (
                                <FragmentMiniCard key={fragment.id} fragment={fragment} />
                            ))}
                            {filteredFragments.length === 0 && (
                                <div className="text-center py-4">
                                    <Search size={16} className="mx-auto text-gray-700 mb-2" />
                                    <p className="text-xs text-gray-600">
                                        {searchQuery ? 'No matches found' : 'No memories yet'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Visualization View */}
                {activeView === 'visualization' && (
                    <motion.div
                        key="visualization"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="px-2"
                    >
                        {/* Radar chart */}
                        <div className="p-3 rounded-lg border border-white/5 bg-black/20 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 size={10} className="text-purple-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Semantic Signature
                                </span>
                            </div>
                            <MiniRadarViz 
                                primeSignature={field.primeSignature || []} 
                                size={140} 
                            />
                            {/* Domain labels */}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3">
                                {['Perceptual', 'Cognitive', 'Temporal', 'Meta'].map((domain, i) => {
                                    const sig = field.primeSignature || [];
                                    const start = i * 2;
                                    const vals = sig.slice(start, start + 2);
                                    const avg = vals.length > 0 
                                        ? vals.reduce((a, b) => a + Math.abs(b), 0) / vals.length 
                                        : 0;
                                    const colors = ['text-blue-400', 'text-emerald-400', 'text-amber-400', 'text-purple-400'];
                                    
                                    return (
                                        <div key={domain} className="flex items-center justify-between">
                                            <span className="text-[9px] text-gray-500">{domain}</span>
                                            <span className={`text-[9px] font-mono ${colors[i]}`}>
                                                {avg.toFixed(3)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Entropy detail */}
                        <div className="p-3 rounded-lg border border-white/5 bg-black/20 mb-3">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity size={10} className="text-purple-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Field Health
                                </span>
                            </div>
                            
                            <EntropyBar entropy={field.entropy ?? 0} />
                            
                            <div className="mt-3 text-[10px] text-gray-500 leading-relaxed">
                                {(field.entropy ?? 0) < 0.3 ? (
                                    'This field is highly coherent. Memories are well-organized and stable for long-term retention.'
                                ) : (field.entropy ?? 0) < 0.7 ? (
                                    'Normal activity detected. The field is actively growing. Consider periodic consolidation.'
                                ) : (
                                    'High entropy detected. The field may benefit from folding or summarization to improve coherence.'
                                )}
                            </div>
                        </div>

                        {/* Prime signature raw */}
                        {field.primeSignature && field.primeSignature.length > 0 && (
                            <div className="p-3 rounded-lg border border-white/5 bg-black/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={10} className="text-purple-400" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Prime Signature
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {field.primeSignature.slice(0, 8).map((val, i) => (
                                        <span
                                            key={i}
                                            className="px-1.5 py-0.5 rounded text-[9px] font-mono 
                                                     bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                        >
                                            {val.toFixed(3)}
                                        </span>
                                    ))}
                                    {field.primeSignature.length > 8 && (
                                        <span className="px-1.5 py-0.5 text-[9px] text-gray-600">
                                            +{field.primeSignature.length - 8}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Stat Card ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
    label: string;
    value: string;
    icon: React.ReactNode;
    small?: boolean;
}> = ({ label, value, icon, small }) => (
    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
        <div className="flex items-center gap-1.5 mb-1">
            <span className="text-gray-600">{icon}</span>
            <span className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</span>
        </div>
        <span className={`font-medium text-gray-200 ${small ? 'text-[10px]' : 'text-sm'} font-mono`}>
            {value}
        </span>
    </div>
);

export default MemoryFieldExplorer;
