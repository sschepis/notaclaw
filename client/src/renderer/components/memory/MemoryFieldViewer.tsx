import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemoryStore, MemoryViewMode } from '../../store/useMemoryStore';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { MemoryFieldDetail } from './MemoryFieldDetail';
import { FragmentBrowser } from './FragmentBrowser';
import { SMFRadarChart } from '../visualizations/SMFRadarChart';
import type { MemoryScope } from '../../../shared/alephnet-types';

// Scope colors for consistency
const SCOPE_COLORS: Record<MemoryScope, string> = {
    global: 'emerald',
    user: 'blue',
    conversation: 'purple',
    organization: 'amber'
};

// View mode buttons
const ViewModeButton: React.FC<{
    mode: MemoryViewMode;
    currentMode: MemoryViewMode;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}> = ({ mode, currentMode, icon, label, onClick }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    className={`
                        p-2 rounded-lg transition-all duration-200
                        ${currentMode === mode 
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                            : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'}
                    `}
                >
                    {icon}
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

// Main viewer component
export const MemoryFieldViewer: React.FC = () => {
    const {
        fields,
        selectedFieldId,
        activeView,
        loading,
        syncing,
        error,
        fragments,
        loadFields,
        setActiveView,
        foldToUserField
    } = useMemoryStore();
    
    const selectedField = selectedFieldId ? fields[selectedFieldId] : null;
    const fieldFragments = selectedFieldId ? fragments[selectedFieldId] ?? [] : [];
    
    // Load fields on mount if empty
    useEffect(() => {
        if (Object.keys(fields).length === 0) {
            loadFields({ includePublic: true });
        }
    }, [fields, loadFields]);
    
    // Handle fold action
    const handleFold = async () => {
        if (!selectedFieldId || !selectedField || selectedField.scope !== 'conversation') return;
        
        try {
            const result = await foldToUserField(selectedFieldId);
            console.log('Fold complete:', result);
        } catch (err) {
            console.error('Fold failed:', err);
        }
    };
    
    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    <h1 className="text-lg font-semibold text-foreground">Memory Fields</h1>
                    
                    {selectedField && (
                        <>
                            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-foreground">{selectedField.name}</span>
                            <Badge className={`bg-${SCOPE_COLORS[selectedField.scope]}-500/20 text-${SCOPE_COLORS[selectedField.scope]}-400 border-${SCOPE_COLORS[selectedField.scope]}-500/30`}>
                                {selectedField.scope}
                            </Badge>
                        </>
                    )}
                </div>
                
                {/* View mode switcher */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white/5 rounded-lg p-1">
                        <ViewModeButton
                            mode="list"
                            currentMode={activeView}
                            onClick={() => setActiveView('list')}
                            label="List View"
                            icon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                            }
                        />
                        <ViewModeButton
                            mode="semantic"
                            currentMode={activeView}
                            onClick={() => setActiveView('semantic')}
                            label="Semantic View"
                            icon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            }
                        />
                        <ViewModeButton
                            mode="graph"
                            currentMode={activeView}
                            onClick={() => setActiveView('graph')}
                            label="Dependency Graph"
                            icon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            }
                        />
                    </div>
                    
                    {/* Fold button for conversation fields */}
                    {selectedField?.scope === 'conversation' && !selectedField.locked && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleFold}
                            disabled={syncing}
                            className="gap-2"
                        >
                            {syncing ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                            )}
                            Fold to User Memory
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Loading state */}
            {loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                        <p className="text-gray-500">Loading memory fields...</p>
                    </div>
                </div>
            )}
            
            {/* Error state */}
            {error && (
                <div className="m-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                </div>
            )}
            
            {/* No field selected */}
            {!loading && !selectedField && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        <h2 className="text-xl font-semibold text-gray-300 mb-2">No Memory Field Selected</h2>
                        <p className="text-gray-500 mb-4">
                            Select a memory field from the sidebar to view its contents and manage fragments.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center text-sm">
                            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">Global</Badge>
                            <Badge variant="outline" className="text-blue-400 border-blue-500/30">User</Badge>
                            <Badge variant="outline" className="text-purple-400 border-purple-500/30">Conversation</Badge>
                            <Badge variant="outline" className="text-amber-400 border-amber-500/30">Shared</Badge>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Main content area */}
            {!loading && selectedField && (
                <div className="flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeView === 'list' && (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="h-full flex flex-col lg:flex-row"
                            >
                                {/* Field detail sidebar */}
                                <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/5 overflow-y-auto">
                                    <MemoryFieldDetail field={selectedField} />
                                </div>
                                
                                {/* Fragment browser */}
                                <div className="flex-1 overflow-hidden">
                                    <FragmentBrowser 
                                        fieldId={selectedField.id} 
                                        fragments={fieldFragments}
                                    />
                                </div>
                            </motion.div>
                        )}
                        
                        {activeView === 'semantic' && (
                            <motion.div
                                key="semantic"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="h-full p-4"
                            >
                                <SemanticView field={selectedField} />
                            </motion.div>
                        )}
                        
                        {activeView === 'graph' && (
                            <motion.div
                                key="graph"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="h-full p-4"
                            >
                                <DependencyGraphView />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

// Semantic view using SMFRadarChart
const SemanticView: React.FC<{ field: any }> = ({ field }) => {
    const entropyPercent = Math.round((field.entropy ?? 0) * 100);
    
    // Map prime signature to SMF (padding to 16)
    const smf = useMemo(() => {
        const signature = field.primeSignature || [];
        const padded = [...signature];
        while (padded.length < 16) padded.push(0);
        return padded.slice(0, 16);
    }, [field.primeSignature]);
    
    return (
        <div className="h-full flex flex-col items-center justify-center">
            <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <div className="bg-card rounded-xl p-6 border border-border flex flex-col items-center justify-center min-h-[400px]">
                    <h4 className="text-sm font-medium text-muted-foreground mb-4">Semantic Field Signature</h4>
                    <SMFRadarChart smf={smf} size="md" />
                </div>
                
                <div className="space-y-6">
                    {/* Entropy gauge */}
                    <div className="bg-card rounded-xl p-6 border border-border">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Entropy Level</h4>
                        <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                                    entropyPercent < 30 ? 'bg-emerald-500' :
                                    entropyPercent < 70 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${entropyPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>Low (Stable)</span>
                            <span className="font-medium text-foreground">{entropyPercent}%</span>
                            <span>High (Chaotic)</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            {entropyPercent < 30
                                ? 'This field is highly coherent and stable. Good for long-term storage.'
                                : entropyPercent < 70
                                ? 'This field shows normal activity levels. Some consolidation may be needed.'
                                : 'High entropy detected. Consider folding or summarizing fragments.'}
                        </p>
                    </div>
                    
                    {/* Stats */}
                    <div className="bg-card rounded-xl p-6 border border-border">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Field Statistics</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-muted-foreground">Fragments</div>
                                <div className="text-xl font-semibold text-foreground">{field.contributionCount}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Scope</div>
                                <Badge variant="outline" className="mt-1 capitalize">{field.scope}</Badge>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Created</div>
                                <div className="text-sm text-foreground">{new Date(field.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Updated</div>
                                <div className="text-sm text-foreground">{new Date(field.updatedAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Dependency graph view using SVG
const DependencyGraphView: React.FC = () => {
    const { getFieldsByScope } = useMemoryStore();
    
    const userFields = getFieldsByScope('user');
    const conversationFields = getFieldsByScope('conversation');
    
    // Calculate layout
    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const userY = 100;
    const convY = 300;
    
    const userNode = userFields[0]; // Assume primary user field for now
    
    // Distribute conversation nodes
    const convNodes = conversationFields.map((field, i) => {
        const total = conversationFields.length;
        const x = centerX + (i - (total - 1) / 2) * 120;
        return { ...field, x, y: convY };
    });

    return (
        <div className="h-full flex flex-col items-center justify-center overflow-hidden">
            <h3 className="text-lg font-semibold text-foreground mb-4">Memory Dependency Graph</h3>
            
            <div className="bg-card rounded-xl border border-border overflow-hidden relative" style={{ width, height }}>
                <svg width={width} height={height} className="absolute inset-0">
                    <defs>
                        <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L9,3 z" fill="currentColor" className="text-muted-foreground" />
                        </marker>
                    </defs>
                    
                    {/* Links */}
                    {userNode && convNodes.map(node => (
                        <g key={node.id}>
                            <path
                                d={`M${node.x},${node.y - 20} C${node.x},${node.y - 80} ${centerX},${userY + 80} ${centerX},${userY + 20}`}
                                fill="none"
                                stroke={node.locked ? "currentColor" : "currentColor"}
                                className={node.locked ? "text-primary" : "text-muted-foreground"}
                                strokeWidth={node.locked ? 2 : 1}
                                strokeDasharray={node.locked ? "none" : "5,5"}
                                markerEnd={node.locked ? "url(#arrow)" : ""}
                                opacity={0.6}
                            />
                        </g>
                    ))}
                    
                    {/* User Node */}
                    {userNode && (
                        <g transform={`translate(${centerX}, ${userY})`}>
                            <circle r="30" className="fill-primary stroke-primary/50" strokeWidth="2" />
                            <text y="5" textAnchor="middle" fill="white" fontSize="20">👤</text>
                            <text y="45" textAnchor="middle" className="fill-muted-foreground" fontSize="12">{userNode.name}</text>
                        </g>
                    )}
                    
                    {/* Conversation Nodes */}
                    {convNodes.map(node => (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                            <circle
                                r="20"
                                className={node.locked ? "fill-emerald-900 stroke-emerald-500" : "fill-secondary stroke-secondary-foreground"}
                                strokeWidth="2"
                            />
                            <text y="5" textAnchor="middle" fill="white" fontSize="14">💬</text>
                            <text y="35" textAnchor="middle" className="fill-muted-foreground" fontSize="10" style={{ maxWidth: 100 }}>
                                {node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name}
                            </text>
                            {node.locked && (
                                <text y="-25" textAnchor="middle" className="fill-primary" fontSize="10">FOLDED</text>
                            )}
                        </g>
                    ))}
                    
                    {!userNode && (
                        <text x={centerX} y={height/2} textAnchor="middle" className="fill-muted-foreground">
                            No user memory field found
                        </text>
                    )}
                </svg>
            </div>
            
            <div className="flex gap-6 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary border border-primary/50"></div>
                    <span>User Field</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-secondary border border-secondary-foreground"></div>
                    <span>Active Conversation</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-900 border border-emerald-500"></div>
                    <span>Folded Conversation</span>
                </div>
            </div>
        </div>
    );
};
