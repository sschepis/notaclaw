import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useMemoryStore } from '../../store/useMemoryStore';
import type { MemoryScope, Visibility } from '../../../shared/alephnet-types';

interface CreateFieldDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (fieldId: string) => void;
}

export const CreateFieldDialog: React.FC<CreateFieldDialogProps> = ({ isOpen, onClose, onCreated }) => {
    const { createField, loading } = useMemoryStore();
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [scope, setScope] = useState<MemoryScope>('user');
    const [visibility, setVisibility] = useState<Visibility>('private');
    const [consensusThreshold, setConsensusThreshold] = useState(85);
    
    if (!isOpen) return null;
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim()) return;
        
        try {
            const field = await createField({
                name: name.trim(),
                description: description.trim(),
                scope,
                visibility,
                consensusThreshold: consensusThreshold / 100
            });
            
            onCreated?.(field.id);
            onClose();
            
            // Reset form
            setName('');
            setDescription('');
            setScope('user');
            setVisibility('private');
            setConsensusThreshold(85);
        } catch (err) {
            console.error('Failed to create field:', err);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-96 shadow-2xl">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">Create Memory Field</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Memory Field"
                            className="bg-white/5 border-white/10"
                            autoFocus
                        />
                    </div>
                    
                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description..."
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    
                    {/* Scope */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Scope</label>
                        <select
                            value={scope}
                            onChange={(e) => setScope(e.target.value as MemoryScope)}
                            className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="user">User (Personal)</option>
                            <option value="conversation">Conversation</option>
                            <option value="global">Global (Network-wide)</option>
                            <option value="organization">Organization</option>
                        </select>
                    </div>
                    
                    {/* Visibility */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Visibility</label>
                        <select
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value as Visibility)}
                            className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="private">Private</option>
                            <option value="public">Public</option>
                            <option value="restricted">Restricted</option>
                        </select>
                    </div>
                    
                    {/* Consensus threshold */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                            Consensus Threshold: {consensusThreshold}%
                        </label>
                        <input
                            type="range"
                            min="50"
                            max="100"
                            value={consensusThreshold}
                            onChange={(e) => setConsensusThreshold(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="flex-1"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                'Create'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
