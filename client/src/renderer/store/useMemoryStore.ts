import { create } from 'zustand';
import type { 
    MemoryField, 
    MemoryFragment, 
    MemoryScope,
    CreateMemoryFieldOptions,
    QueryMemoryOptions
} from '../../shared/alephnet-types';

export type MemoryViewMode = 'list' | 'semantic' | 'graph';

interface MemoryStoreState {
    // Data
    fields: Record<string, MemoryField>;
    fragments: Record<string, MemoryFragment[]>;
    selectedFieldId: string | null;
    activeView: MemoryViewMode;
    
    // Loading states
    loading: boolean;
    syncing: boolean;
    error: string | null;
    
    // Filters
    scopeFilter: MemoryScope | 'all';
    searchQuery: string;
    
    // Actions
    loadFields: (params?: { scope?: MemoryScope; includePublic?: boolean }) => Promise<void>;
    createField: (options: CreateMemoryFieldOptions) => Promise<MemoryField>;
    deleteField: (fieldId: string, force?: boolean) => Promise<void>;
    selectField: (fieldId: string | null) => void;
    loadFragments: (fieldId: string) => Promise<MemoryFragment[]>;
    queryField: (options: QueryMemoryOptions) => Promise<MemoryFragment[]>;
    storeFragment: (fieldId: string, content: string, significance?: number) => Promise<MemoryFragment>;
    foldToUserField: (conversationFieldId: string, targetFieldId?: string) => Promise<{ syncedCount: number; entropyDelta: number }>;
    setActiveView: (view: MemoryViewMode) => void;
    setScopeFilter: (scope: MemoryScope | 'all') => void;
    setSearchQuery: (query: string) => void;
    clearError: () => void;
    
    // Computed
    getFieldsByScope: (scope: MemoryScope) => MemoryField[];
    getFilteredFields: () => MemoryField[];
}

export const useMemoryStore = create<MemoryStoreState>((set, get) => ({
    // Initial state
    fields: {},
    fragments: {},
    selectedFieldId: null,
    activeView: 'list',
    loading: false,
    syncing: false,
    error: null,
    scopeFilter: 'all',
    searchQuery: '',
    
    // Actions
    loadFields: async (params) => {
        set({ loading: true, error: null });
        try {
            const result = await window.electronAPI.memoryList(params);
            const fieldsMap: Record<string, MemoryField> = {};
            for (const field of result) {
                fieldsMap[field.id] = field;
            }
            set({ fields: fieldsMap, loading: false });
        } catch (err) {
            console.error('Failed to load memory fields:', err);
            set({ 
                loading: false, 
                error: err instanceof Error ? err.message : 'Failed to load memory fields' 
            });
        }
    },
    
    createField: async (options) => {
        set({ loading: true, error: null });
        try {
            const field = await window.electronAPI.memoryCreate(options);
            set(state => ({
                fields: { ...state.fields, [field.id]: field },
                loading: false
            }));
            return field;
        } catch (err) {
            console.error('Failed to create memory field:', err);
            set({ 
                loading: false, 
                error: err instanceof Error ? err.message : 'Failed to create memory field' 
            });
            throw err;
        }
    },
    
    deleteField: async (fieldId, force) => {
        set({ loading: true, error: null });
        try {
            await window.electronAPI.memoryDelete({ fieldId, force });
            set(state => {
                const { [fieldId]: deleted, ...rest } = state.fields;
                const { [fieldId]: deletedFrags, ...restFrags } = state.fragments;
                return { 
                    fields: rest, 
                    fragments: restFrags,
                    selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId,
                    loading: false 
                };
            });
        } catch (err) {
            console.error('Failed to delete memory field:', err);
            set({ 
                loading: false, 
                error: err instanceof Error ? err.message : 'Failed to delete memory field' 
            });
            throw err;
        }
    },
    
    selectField: (fieldId) => {
        set({ selectedFieldId: fieldId });
        if (fieldId) {
            // Load fragments for selected field
            get().loadFragments(fieldId);
        }
    },
    
    loadFragments: async (fieldId) => {
        try {
            const result = await window.electronAPI.memoryQuery({ 
                fieldId, 
                query: '', 
                limit: 100 
            });
            set(state => ({
                fragments: { ...state.fragments, [fieldId]: result.fragments }
            }));
            return result.fragments;
        } catch (err) {
            console.error('Failed to load fragments:', err);
            return [];
        }
    },
    
    queryField: async (options) => {
        try {
            const result = await window.electronAPI.memoryQuery(options);
            return result.fragments;
        } catch (err) {
            console.error('Failed to query memory field:', err);
            throw err;
        }
    },
    
    storeFragment: async (fieldId, content, significance) => {
        try {
            const fragment = await window.electronAPI.memoryStore({
                fieldId,
                content,
                significance: significance ?? 0.5
            });
            // Add to local cache
            set(state => ({
                fragments: {
                    ...state.fragments,
                    [fieldId]: [...(state.fragments[fieldId] ?? []), fragment]
                }
            }));
            return fragment;
        } catch (err) {
            console.error('Failed to store fragment:', err);
            throw err;
        }
    },
    
    foldToUserField: async (conversationFieldId, targetFieldId) => {
        set({ syncing: true, error: null });
        try {
            // If no target specified, find or create user memory field
            let userFieldId = targetFieldId;
            if (!userFieldId) {
                const fields = Object.values(get().fields);
                const userField = fields.find(f => f.scope === 'user');
                if (userField) {
                    userFieldId = userField.id;
                } else {
                    // Create user field
                    const newField = await get().createField({
                        name: 'My Memories',
                        scope: 'user',
                        description: 'Personal memory field for accumulated knowledge',
                        visibility: 'private'
                    });
                    userFieldId = newField.id;
                }
            }
            
            // Get conversation field to find its conversation ID
            const convField = get().fields[conversationFieldId];
            if (!convField) throw new Error('Conversation field not found');
            
            // Extract conversation ID from field name or metadata
            const conversationId = convField.id.replace('field_', '');
            
            const result = await window.electronAPI.memorySync({
                conversationId,
                targetFieldId: userFieldId!,
                verifiedOnly: false
            });
            
            // Mark source field as locked
            set(state => ({
                fields: {
                    ...state.fields,
                    [conversationFieldId]: {
                        ...state.fields[conversationFieldId],
                        locked: true
                    }
                },
                syncing: false
            }));
            
            // Reload target field to get updated entropy
            await get().loadFields();
            
            return result;
        } catch (err) {
            console.error('Failed to fold memory field:', err);
            set({ 
                syncing: false, 
                error: err instanceof Error ? err.message : 'Failed to fold memory field' 
            });
            throw err;
        }
    },
    
    setActiveView: (view) => set({ activeView: view }),
    
    setScopeFilter: (scope) => set({ scopeFilter: scope }),
    
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    clearError: () => set({ error: null }),
    
    // Computed helpers
    getFieldsByScope: (scope) => {
        return Object.values(get().fields).filter(f => f.scope === scope);
    },
    
    getFilteredFields: () => {
        const { fields, scopeFilter, searchQuery } = get();
        let result = Object.values(fields);
        
        if (scopeFilter !== 'all') {
            result = result.filter(f => f.scope === scopeFilter);
        }
        
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f => 
                f.name.toLowerCase().includes(query) ||
                f.description.toLowerCase().includes(query)
            );
        }
        
        // Sort by updatedAt descending
        return result.sort((a, b) => b.updatedAt - a.updatedAt);
    }
}));
