import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { SecretNamespace, SecretEntryRedacted } from '../../../shared/secrets-types';
import { Eye, EyeOff } from 'lucide-react';

interface AddSecretDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
    editingSecret?: SecretEntryRedacted;
}

const NAMESPACES: SecretNamespace[] = ['ai-providers', 'identity', 'services', 'plugins', 'user', 'system'];

export const AddSecretDialog: React.FC<AddSecretDialogProps> = ({ open, onOpenChange, onSave, editingSecret }) => {
    const [namespace, setNamespace] = useState<SecretNamespace>('user');
    const [key, setKey] = useState('');
    const [value, setValue] = useState('');
    const [label, setLabel] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            if (editingSecret) {
                setNamespace(editingSecret.namespace);
                setKey(editingSecret.key);
                setLabel(editingSecret.metadata.label || '');
                setValue(''); // Value is redacted, user must enter new value to update
            } else {
                setNamespace('user');
                setKey('');
                setValue('');
                setLabel('');
            }
            setError(null);
            setShowPassword(false);
        }
    }, [open, editingSecret]);

    const handleSave = async () => {
        if (!key.trim()) {
            setError('Key is required');
            return;
        }
        if (!value && !editingSecret) {
            setError('Value is required for new secrets');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // If editing and value is empty, we might want to keep the old value?
            // The API requires a value for setSecret. 
            // If the user leaves it empty during edit, maybe they don't want to change it?
            // But we can't retrieve the old value to send it back.
            // So we must require a value if we are "setting" it.
            // Or we assume if value is empty during edit, we don't update the value?
            // But setSecret overwrites.
            // Let's require value for now, or maybe we need a specific update metadata vs update value logic.
            // The current API only has setSecret which takes everything.
            
            if (editingSecret && !value) {
                // If we are editing and didn't provide a new value, we can't really "update" just the label with setSecret
                // unless we fetch the value first. But we can't fetch the value in renderer easily (it returns string | null).
                // Actually secretsGet returns the value.
                // So we could fetch it.
                
                const currentValue = await window.electronAPI.secretsGet({ namespace: editingSecret.namespace, key: editingSecret.key });
                if (currentValue) {
                    await window.electronAPI.secretsSet({
                        namespace,
                        key,
                        value: currentValue,
                        label
                    });
                } else {
                     throw new Error("Could not retrieve existing value to update metadata");
                }
            } else {
                await window.electronAPI.secretsSet({
                    namespace,
                    key,
                    value,
                    label
                });
            }
            
            onSave();
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message || 'Failed to save secret');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
                <DialogHeader>
                    <DialogTitle>{editingSecret ? 'Edit Secret' : 'Add New Secret'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="namespace">Namespace</Label>
                        <Select
                            value={namespace}
                            onValueChange={(v) => setNamespace(v as SecretNamespace)}
                            disabled={!!editingSecret} // Cannot change namespace of existing secret (it changes ID)
                        >
                            <SelectTrigger id="namespace">
                                <SelectValue placeholder="Select namespace" />
                            </SelectTrigger>
                            <SelectContent>
                                {NAMESPACES.map((ns) => (
                                    <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="key">Key</Label>
                        <Input
                            id="key"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="e.g., api_key"
                            disabled={!!editingSecret} // Cannot change key of existing secret
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="label">Label (Optional)</Label>
                        <Input
                            id="label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Friendly name"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="value">Value</Label>
                        <div className="relative">
                            <Input
                                id="value"
                                type={showPassword ? 'text' : 'password'}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder={editingSecret ? 'Leave empty to keep existing value' : 'Secret value'}
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                        </div>
                    </div>
                    {error && (
                        <div className="text-destructive text-sm">{error}</div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
