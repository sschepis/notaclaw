import React from 'react';
import { Badge } from '../ui/badge';
import type { MemoryField, MemoryScope } from '../../../shared/alephnet-types';

// Scope configuration
const SCOPE_CONFIG: Record<MemoryScope, { label: string; color: string; description: string }> = {
    global: {
        label: 'Global',
        color: 'emerald',
        description: 'Shared across the entire network'
    },
    user: {
        label: 'User',
        color: 'blue',
        description: 'Personal memory for this identity'
    },
    conversation: {
        label: 'Conversation',
        color: 'purple',
        description: 'Scoped to a specific conversation'
    },
    organization: {
        label: 'Shared',
        color: 'amber',
        description: 'Shared by another node'
    }
};

interface MemoryFieldDetailProps {
    field: MemoryField;
}

export const MemoryFieldDetail: React.FC<MemoryFieldDetailProps> = ({ field }) => {
    const config = SCOPE_CONFIG[field.scope];
    const entropyPercent = Math.round(field.entropy * 100);
    
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-100">{field.name}</h3>
                    {field.locked && (
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Badge className={`bg-${config.color}-500/20 text-${config.color}-400 border-${config.color}-500/30`}>
                        {config.label}
                    </Badge>
                    <Badge variant="outline" className="text-gray-400 border-gray-600">
                        {field.visibility}
                    </Badge>
                </div>
            </div>
            
            {/* Description */}
            {field.description && (
                <p className="text-sm text-gray-400">{field.description}</p>
            )}
            
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    label="Fragments"
                    value={field.contributionCount}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                />
                
                <StatCard
                    label="Entropy"
                    value={`${entropyPercent}%`}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    }
                    color={entropyPercent < 30 ? 'emerald' : entropyPercent < 70 ? 'amber' : 'red'}
                />
                
                <StatCard
                    label="Consensus"
                    value={`${Math.round(field.consensusThreshold * 100)}%`}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                
                <StatCard
                    label="Primes"
                    value={field.primeSignature?.length ?? 0}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                    }
                />
            </div>
            
            {/* Entropy bar */}
            <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Entropy Level</span>
                    <span className={`text-${entropyPercent < 30 ? 'emerald' : entropyPercent < 70 ? 'amber' : 'red'}-400`}>
                        {entropyPercent < 30 ? 'Stable' : entropyPercent < 70 ? 'Active' : 'Chaotic'}
                    </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            entropyPercent < 30 ? 'bg-emerald-500' : 
                            entropyPercent < 70 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${entropyPercent}%` }}
                    />
                </div>
            </div>
            
            {/* Prime signature preview */}
            {field.primeSignature && field.primeSignature.length > 0 && (
                <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Prime Signature</h4>
                    <div className="flex items-end gap-1 h-12 bg-gray-900/50 rounded p-2">
                        {field.primeSignature.map((val, idx) => (
                            <div
                                key={idx}
                                className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm"
                                style={{ height: `${Math.max(10, Math.abs(val) * 100)}%` }}
                                title={`P${idx}: ${val.toFixed(2)}`}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            {/* Timestamps */}
            <div className="pt-2 border-t border-white/5 space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Created</span>
                    <span className="text-gray-400">{formatDate(field.createdAt)}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Updated</span>
                    <span className="text-gray-400">{formatDate(field.updatedAt)}</span>
                </div>
            </div>
            
            {/* Field ID */}
            <div className="pt-2 border-t border-white/5">
                <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Field ID</span>
                    <code className="text-gray-400 font-mono text-[10px]">{field.id}</code>
                </div>
            </div>
            
            {/* Locked notice */}
            {field.locked && (
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 text-sm text-gray-400">
                    <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-emerald-400">Folded</span>
                    </div>
                    <p className="text-xs">
                        This memory field has been folded into your user memory. 
                        Its contents are preserved in the target field.
                    </p>
                </div>
            )}
        </div>
    );
};

// Stat card component
const StatCard: React.FC<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color?: string;
}> = ({ label, value, icon, color = 'blue' }) => (
    <div className="p-3 rounded-lg bg-gray-900/50 border border-white/5">
        <div className="flex items-center gap-2 mb-1">
            <span className={`text-${color}-400`}>{icon}</span>
            <span className="text-xs text-gray-500">{label}</span>
        </div>
        <span className="text-lg font-semibold text-gray-200">{value}</span>
    </div>
);
