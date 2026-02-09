import React, { useState } from 'react';
import { Button } from '../ui/button';
import { useMemoryStore } from '../../store/useMemoryStore';
import type { MemoryField } from '../../../shared/alephnet-types';

interface FoldFieldDialogProps {
    isOpen: boolean;
    sourceField: MemoryField | null;
    onClose: () => void;
    onFolded?: () => void;
}

export const FoldFieldDialog: React.FC<FoldFieldDialogProps> = ({ 
    isOpen, 
    sourceField, 
    onClose, 
    onFolded 
}) => {
    const { fields, foldToUserField, syncing } = useMemoryStore();
    
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');
    
    if (!isOpen || !sourceField) return null;
    
    // Get available target fields (user scope fields that aren't the source)
    const targetFields = Object.values(fields).filter(
        f => f.scope === 'user' && f.id !== sourceField.id && !f.locked
    );
    
    const handleFold = async () => {
        if (!sourceField) return;
        
        try {
            await foldToUserField(sourceField.id, selectedTargetId || undefined);
            onFolded?.();
            onClose();
        } catch (err) {
            console.error('Failed to fold field:', err);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-96 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-100">Fold Memory Field</h2>
                        <p className="text-xs text-gray-500">Merge conversation memory into user memory</p>
                    </div>
                </div>
                
                {/* Source field info */}
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 mb-4">
                    <div className="text-xs text-purple-400 mb-1">Source Field</div>
                    <div className="text-sm font-medium text-gray-200">{sourceField.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        {sourceField.contributionCount} fragment{sourceField.contributionCount !== 1 ? 's' : ''}
                    </div>
                </div>
                
                {/* Target field selection */}
                <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-400 mb-2">Target Field</label>
                    
                    {targetFields.length > 0 ? (
                        <select
                            value={selectedTargetId}
                            onChange={(e) => setSelectedTargetId(e.target.value)}
                            className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Create new user field</option>
                            {targetFields.map(field => (
                                <option key={field.id} value={field.id}>
                                    {field.name} ({field.contributionCount} fragments)
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
                            A new user memory field will be created automatically.
                        </div>
                    )}
                </div>
                
                {/* Warning */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                    <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="text-xs text-amber-200">
                            <strong className="block mb-1">This action cannot be undone</strong>
                            The source field will be locked after folding. Its fragments will be copied to the target field.
                        </div>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={syncing}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleFold}
                        disabled={syncing}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                        {syncing ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Folding...</span>
                            </div>
                        ) : (
                            'Fold'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
