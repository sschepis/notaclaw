import React, { useState, useEffect, useMemo } from 'react';
import { SecretEntryRedacted, SecretNamespace } from '../../../shared/secrets-types';
import { AddSecretDialog } from './AddSecretDialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Lock, Search, Plus, Trash2, Edit2, Copy, RefreshCw, ShieldAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

export const SecretsPanel: React.FC = () => {
    const [secrets, setSecrets] = useState<SecretEntryRedacted[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingSecret, setEditingSecret] = useState<SecretEntryRedacted | undefined>(undefined);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const fetchSecrets = async () => {
        setLoading(true);
        try {
            const result = await window.electronAPI.secretsList();
            setSecrets(result);
        } catch (error) {
            console.error('Failed to list secrets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSecrets();
    }, []);

    const handleDelete = async (namespace: SecretNamespace, key: string) => {
        try {
            await window.electronAPI.secretsDelete({ namespace, key });
            fetchSecrets();
            setDeleteConfirmId(null);
        } catch (error) {
            console.error('Failed to delete secret:', error);
        }
    };

    const handleEdit = (secret: SecretEntryRedacted) => {
        setEditingSecret(secret);
        setIsAddDialogOpen(true);
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        // Could add toast notification here
    };

    const filteredSecrets = useMemo(() => {
        if (!searchQuery) return secrets;
        const lowerQuery = searchQuery.toLowerCase();
        return secrets.filter(s => 
            s.key.toLowerCase().includes(lowerQuery) || 
            s.namespace.toLowerCase().includes(lowerQuery) ||
            (s.metadata.label && s.metadata.label.toLowerCase().includes(lowerQuery))
        );
    }, [secrets, searchQuery]);

    const groupedSecrets = useMemo(() => {
        const groups: Record<string, SecretEntryRedacted[]> = {};
        filteredSecrets.forEach(secret => {
            if (!groups[secret.namespace]) {
                groups[secret.namespace] = [];
            }
            groups[secret.namespace].push(secret);
        });
        return groups;
    }, [filteredSecrets]);

    const namespaceOrder: SecretNamespace[] = ['user', 'ai-providers', 'services', 'plugins', 'identity', 'system'];
    const sortedNamespaces = Object.keys(groupedSecrets).sort((a, b) => {
        const indexA = namespaceOrder.indexOf(a as SecretNamespace);
        const indexB = namespaceOrder.indexOf(b as SecretNamespace);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Lock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">Secrets Vault</h2>
                        <p className="text-xs text-muted-foreground">Manage encrypted credentials</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchSecrets}
                        className="h-9 w-9 p-0"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                    <Button onClick={() => { setEditingSecret(undefined); setIsAddDialogOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Secret
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="p-4 pb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search secrets by key, namespace, or label..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-card border-border"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {sortedNamespaces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-60">
                        <ShieldAlert className="w-12 h-12 mb-2" />
                        <p>No secrets found</p>
                    </div>
                ) : (
                    sortedNamespaces.map(namespace => (
                        <div key={namespace} className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <Badge variant="outline" className="text-xs uppercase tracking-wider font-bold bg-muted/50 text-muted-foreground border-muted-foreground/20">
                                    {namespace}
                                </Badge>
                                <div className="h-px flex-1 bg-border/50" />
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                                {groupedSecrets[namespace].map(secret => (
                                    <Card key={secret.id} className="bg-card/50 border-border/50 hover:bg-card/80 hover:border-border transition-all group">
                                        <CardContent className="p-3 flex items-center justify-between">
                                            <div className="flex flex-col min-w-0 flex-1 mr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-sm font-medium text-foreground truncate select-all" title={secret.key}>
                                                        {secret.key}
                                                    </span>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button onClick={() => handleCopyKey(secret.key)} className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Copy className="w-3 h-3" />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Copy Key</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                {secret.metadata.label && (
                                                    <span className="text-xs text-muted-foreground truncate">{secret.metadata.label}</span>
                                                )}
                                                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/60">
                                                    <span>Updated: {new Date(secret.metadata.updatedAt).toLocaleDateString()}</span>
                                                    {secret.metadata.origin && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Origin: {secret.metadata.origin}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(secret)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                
                                                {deleteConfirmId === secret.id ? (
                                                    <div className="flex items-center gap-1 bg-destructive/10 rounded-md p-1 animate-in fade-in slide-in-from-right-2">
                                                        <Button 
                                                            variant="destructive" 
                                                            size="sm" 
                                                            className="h-7 px-2 text-xs" 
                                                            onClick={() => handleDelete(secret.namespace, secret.key)}
                                                        >
                                                            Confirm
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-7 w-7 p-0" 
                                                            onClick={() => setDeleteConfirmId(null)}
                                                        >
                                                            ✕
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" 
                                                        onClick={() => setDeleteConfirmId(secret.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AddSecretDialog 
                open={isAddDialogOpen} 
                onOpenChange={setIsAddDialogOpen} 
                onSave={fetchSecrets}
                editingSecret={editingSecret}
            />
        </div>
    );
};
