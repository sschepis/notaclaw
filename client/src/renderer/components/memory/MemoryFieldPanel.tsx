import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import type { MemoryField, MemoryScope } from '../../../shared/alephnet-types';

// Scope configuration
const SCOPE_CONFIG: Record<MemoryScope, { label: string; colorClass: string; icon: React.ReactNode }> = {
    global: {
        label: 'Global',
        colorClass: 'text-primary',
        icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    user: {
        label: 'User',
        colorClass: 'text-blue-500',
        icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    },
    conversation: {
        label: 'Conversations',
        colorClass: 'text-purple-500',
        icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
    },
    organization: {
        label: 'Shared',
        colorClass: 'text-amber-500',
        icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    }
};

// Field list item component
const MemoryFieldItem: React.FC<{
    field: MemoryField;
    isSelected: boolean;
    onSelect: () => void;
    onFold: () => void;
    onDelete: () => void;
}> = ({ field, isSelected, onSelect, onFold, onDelete }) => {
    const config = SCOPE_CONFIG[field.scope];
    const entropyPercent = Math.round(field.entropy * 100);
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`
                group relative p-2 rounded-lg cursor-pointer transition-all duration-200
                ${isSelected 
                    ? 'bg-primary/20 border border-primary/40 shadow-lg shadow-primary/10' 
                    : 'bg-card border border-transparent hover:bg-muted/50 hover:border-border'}
                ${field.locked ? 'opacity-60' : ''}
            `}
            onClick={onSelect}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={config.colorClass}>
                        {config.icon}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                        {field.name}
                    </span>
                    {field.locked && (
                        <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    )}
                </div>
                
                {/* Quick actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {field.scope === 'conversation' && !field.locked && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onFold(); }}
                                        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Fold into user memory</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                    className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Delete field</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
            
            {/* Stats row */}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {field.contributionCount}
                </span>
                
                <span className="flex items-center gap-1" title={`Entropy: ${entropyPercent}%`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${
                                entropyPercent < 30 ? 'bg-emerald-500' : 
                                entropyPercent < 70 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${entropyPercent}%` }}
                        />
                    </div>
                </span>
            </div>
        </motion.div>
    );
};

// Collapsible category section
const CategorySection: React.FC<{
    scope: MemoryScope;
    fields: MemoryField[];
    selectedFieldId: string | null;
    onSelectField: (id: string) => void;
    onFoldField: (id: string) => void;
    onDeleteField: (id: string) => void;
}> = ({ scope, fields, selectedFieldId, onSelectField, onFoldField, onDeleteField }) => {
    const [isOpen, setIsOpen] = useState(true);
    const config = SCOPE_CONFIG[scope];
    
    if (fields.length === 0) return null;
    
    return (
        <div className="mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className={config.colorClass}>{config.icon}</span>
                    <span>{config.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {fields.length}
                    </Badge>
                </div>
                <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-1 overflow-hidden"
                    >
                        {fields.map(field => (
                            <MemoryFieldItem
                                key={field.id}
                                field={field}
                                isSelected={selectedFieldId === field.id}
                                onSelect={() => onSelectField(field.id)}
                                onFold={() => onFoldField(field.id)}
                                onDelete={() => onDeleteField(field.id)}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Main panel component
export const MemoryFieldPanel: React.FC = () => {
    const {
        fields,
        selectedFieldId,
        loading,
        error,
        searchQuery,
        loadFields,
        selectField,
        createField,
        deleteField,
        foldToUserField,
        setSearchQuery,
        clearError,
        getFieldsByScope
    } = useMemoryStore();
    
    const { setLayoutAction } = useAppStore();
    
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);
    const [fieldToFold, setFieldToFold] = useState<string | null>(null);
    
    // Load fields on mount
    useEffect(() => {
        loadFields({ includePublic: true });
    }, [loadFields]);
    
    // Group fields by scope
    const globalFields = getFieldsByScope('global');
    const userFields = getFieldsByScope('user');
    const conversationFields = getFieldsByScope('conversation');
    const sharedFields = getFieldsByScope('organization');
    
    // Filter by search
    const filterFields = (fieldList: MemoryField[]) => {
        if (!searchQuery.trim()) return fieldList;
        const query = searchQuery.toLowerCase();
        return fieldList.filter(f => 
            f.name.toLowerCase().includes(query) ||
            f.description.toLowerCase().includes(query)
        );
    };
    
    const handleSelectField = (fieldId: string) => {
        selectField(fieldId);
        // Open the memory viewer in stage
        setLayoutAction({ type: 'open', component: 'memory-viewer', name: 'MEMORY', icon: 'database' });
    };
    
    const handleCreateField = async () => {
        // For now, create a simple user field
        try {
            const field = await createField({
                name: `Memory ${Date.now()}`,
                scope: 'user',
                description: 'Custom memory field',
                visibility: 'private'
            });
            selectField(field.id);
        } catch (err) {
            console.error('Failed to create field:', err);
        }
        setShowCreateDialog(false);
    };
    
    const handleDeleteField = async (fieldId: string) => {
        try {
            await deleteField(fieldId, true);
        } catch (err) {
            console.error('Failed to delete field:', err);
        }
        setFieldToDelete(null);
    };
    
    const handleFoldField = async (fieldId: string) => {
        try {
            const result = await foldToUserField(fieldId);
            console.log('Fold result:', result);
        } catch (err) {
            console.error('Failed to fold field:', err);
        }
        setFieldToFold(null);
    };
    
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    Memory Fields
                </h2>
                
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowCreateDialog(true)}
                                className="h-7 w-7 p-0"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Create new memory field</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            
            {/* Search */}
            <div className="px-3 py-2">
                <Input
                    placeholder="Search fields..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-sm bg-muted/20 border-border"
                />
            </div>
            
            {/* Error display */}
            {error && (
                <div className="mx-3 mb-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={clearError} className="hover:text-red-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
            
            {/* Loading state */}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
            )}
            
            {/* Field list */}
            {!loading && (
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
                    <CategorySection
                        scope="global"
                        fields={filterFields(globalFields)}
                        selectedFieldId={selectedFieldId}
                        onSelectField={handleSelectField}
                        onFoldField={setFieldToFold}
                        onDeleteField={setFieldToDelete}
                    />
                    
                    <CategorySection
                        scope="user"
                        fields={filterFields(userFields)}
                        selectedFieldId={selectedFieldId}
                        onSelectField={handleSelectField}
                        onFoldField={setFieldToFold}
                        onDeleteField={setFieldToDelete}
                    />
                    
                    <CategorySection
                        scope="conversation"
                        fields={filterFields(conversationFields)}
                        selectedFieldId={selectedFieldId}
                        onSelectField={handleSelectField}
                        onFoldField={setFieldToFold}
                        onDeleteField={setFieldToDelete}
                    />
                    
                    <CategorySection
                        scope="organization"
                        fields={filterFields(sharedFields)}
                        selectedFieldId={selectedFieldId}
                        onSelectField={handleSelectField}
                        onFoldField={setFieldToFold}
                        onDeleteField={setFieldToDelete}
                    />
                    
                    {/* Empty state */}
                    {Object.keys(fields).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                            <p className="text-sm">No memory fields yet</p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="mt-3"
                                onClick={() => setShowCreateDialog(true)}
                            >
                                Create your first field
                            </Button>
                        </div>
                    )}
                </div>
            )}
            
            {/* Create Dialog - simplified inline */}
            {showCreateDialog && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50">
                    <div className="bg-popover border border-border rounded-lg p-4 w-72 shadow-xl">
                        <h3 className="text-sm font-semibold mb-3">Create Memory Field</h3>
                        <p className="text-xs text-muted-foreground mb-4">Create a new user memory field to store your knowledge.</p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(false)}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleCreateField}>
                                Create
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Delete confirmation */}
            {fieldToDelete && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50">
                    <div className="bg-popover border border-border rounded-lg p-4 w-72 shadow-xl">
                        <h3 className="text-sm font-semibold mb-2 text-destructive">Delete Field?</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            This will permanently delete the memory field and all its fragments.
                        </p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setFieldToDelete(null)}>
                                Cancel
                            </Button>
                            <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDeleteField(fieldToDelete)}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Fold confirmation */}
            {fieldToFold && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50">
                    <div className="bg-popover border border-border rounded-lg p-4 w-72 shadow-xl">
                        <h3 className="text-sm font-semibold mb-2 text-primary">Fold into User Memory?</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            This will merge all fragments from this conversation into your personal memory field.
                            The conversation field will be locked afterward.
                        </p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setFieldToFold(null)}>
                                Cancel
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => handleFoldField(fieldToFold)}
                            >
                                Fold
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
