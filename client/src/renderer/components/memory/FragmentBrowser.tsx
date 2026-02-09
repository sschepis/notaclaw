import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useMemoryStore } from '../../store/useMemoryStore';
import type { MemoryFragment } from '../../../shared/alephnet-types';

interface FragmentBrowserProps {
    fieldId: string;
    fragments: MemoryFragment[];
}

export const FragmentBrowser: React.FC<FragmentBrowserProps> = ({ fieldId, fragments }) => {
    const { storeFragment, loadFragments } = useMemoryStore();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [sortBy, setSortBy] = useState<'timestamp' | 'significance'>('timestamp');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    
    // Filter and sort fragments
    const filteredFragments = useMemo(() => {
        let result = [...fragments];
        
        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f => 
                f.content.toLowerCase().includes(query)
            );
        }
        
        // Sort
        result.sort((a, b) => {
            const aVal = sortBy === 'timestamp' ? a.timestamp : (a.significance ?? 0.5);
            const bVal = sortBy === 'timestamp' ? b.timestamp : (b.significance ?? 0.5);
            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        });
        
        return result;
    }, [fragments, searchQuery, sortBy, sortOrder]);
    
    // Add new fragment
    const handleAddFragment = async () => {
        if (!newContent.trim()) return;
        
        setIsAdding(true);
        try {
            await storeFragment(fieldId, newContent.trim());
            setNewContent('');
        } catch (err) {
            console.error('Failed to add fragment:', err);
        } finally {
            setIsAdding(false);
        }
    };
    
    // Refresh fragments
    const handleRefresh = async () => {
        await loadFragments(fieldId);
    };
    
    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-white/5 space-y-3">
                {/* Search and sort */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <Input
                            placeholder="Search fragments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-9 bg-white/5 border-white/10"
                        />
                    </div>
                    
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'significance')}
                        className="h-9 px-3 rounded-md bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="timestamp">By Time</option>
                        <option value="significance">By Significance</option>
                    </select>
                    
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                        className="h-9 w-9 p-0"
                    >
                        {sortOrder === 'desc' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                            </svg>
                        )}
                    </Button>
                    
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRefresh}
                        className="h-9 w-9 p-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </Button>
                </div>
                
                {/* Add new fragment */}
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Add new fragment..."
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFragment()}
                        className="flex-1 h-9 bg-white/5 border-white/10"
                    />
                    <Button
                        size="sm"
                        onClick={handleAddFragment}
                        disabled={isAdding || !newContent.trim()}
                        className="h-9"
                    >
                        {isAdding ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add
                            </>
                        )}
                    </Button>
                </div>
            </div>
            
            {/* Stats bar */}
            <div className="px-4 py-2 bg-gray-900/30 border-b border-white/5 flex items-center justify-between text-xs text-gray-500">
                <span>
                    {filteredFragments.length} fragment{filteredFragments.length !== 1 ? 's' : ''}
                    {searchQuery && ` matching "${searchQuery}"`}
                </span>
                <span>Total: {fragments.length}</span>
            </div>
            
            {/* Fragment list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredFragments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 mb-2">
                            {searchQuery ? 'No fragments match your search' : 'No fragments yet'}
                        </p>
                        <p className="text-xs text-gray-600">
                            {searchQuery ? 'Try a different search term' : 'Add content to this memory field'}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence>
                        <div className="p-4 space-y-3">
                            {filteredFragments.map((fragment, index) => (
                                <FragmentCard 
                                    key={fragment.id} 
                                    fragment={fragment}
                                    index={index}
                                />
                            ))}
                        </div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

// Fragment card component
const FragmentCard: React.FC<{ fragment: MemoryFragment; index: number }> = ({ fragment, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Type-safe metadata access
    const syncedFrom = typeof fragment.metadata?.syncedFrom === 'string' 
        ? fragment.metadata.syncedFrom 
        : undefined;
    
    const significancePercent = Math.round((fragment.significance ?? 0.5) * 100);
    const formattedDate = new Date(fragment.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const isLongContent = fragment.content.length > 200;
    const displayContent = isExpanded ? fragment.content : fragment.content.slice(0, 200);
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.02 }}
            className="group p-4 rounded-lg bg-gray-900/50 border border-white/5 hover:border-white/10 transition-all"
        >
            {/* Content */}
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {displayContent}
                {isLongContent && !isExpanded && '...'}
            </div>
            
            {isLongContent && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                >
                    {isExpanded ? 'Show less' : 'Show more'}
                </button>
            )}
            
            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formattedDate}
                    </span>
                    
                    <span className="flex items-center gap-1" title={`Significance: ${significancePercent}%`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {significancePercent}%
                    </span>
                </div>
                
                {/* Prime factors */}
                {fragment.primeFactors && fragment.primeFactors.length > 0 && (
                    <div className="flex items-center gap-1">
                        {fragment.primeFactors.slice(0, 4).map((prime, idx) => (
                            <Badge
                                key={idx}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 text-gray-400 border-gray-600"
                            >
                                {String(prime)}
                            </Badge>
                        ))}
                        {fragment.primeFactors.length > 4 && (
                            <span className="text-[10px] text-gray-500">+{fragment.primeFactors.length - 4}</span>
                        )}
                    </div>
                )}
            </div>
            
            {/* Source info if synced */}
            {syncedFrom && (
                <div className="mt-2 text-[10px] text-gray-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Synced from: {syncedFrom.slice(0, 12)}...
                </div>
            )}
        </motion.div>
    );
};
