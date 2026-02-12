import React, { useState, useEffect } from 'react';
import { PluginManifest } from '../../../shared/plugin-types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Eye, EyeOff, Save } from 'lucide-react';
import { useSlotRegistry } from '../../services/SlotRegistry';

interface PluginSettingsRendererProps {
    plugin: PluginManifest;
}

interface ConfigField {
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'secret' | 'select';
    default?: any;
    description?: string;
    options?: { label: string; value: string }[];
}

export const PluginSettingsRenderer: React.FC<PluginSettingsRendererProps> = ({ plugin }) => {
    const [values, setValues] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const { showToast } = useSlotRegistry();

    // Safely cast configuration to ConfigField[]
    const configFields = (plugin.alephConfig?.configuration || []) as ConfigField[];

    useEffect(() => {
        loadSettings();
    }, [plugin.id]);

    const loadSettings = async () => {
        setLoading(true);
        const newValues: Record<string, any> = {};

        for (const field of configFields) {
            try {
                let value;
                if (field.type === 'secret') {
                     const hasSecret = await window.electronAPI.secretsHas({ 
                         namespace: 'plugins', 
                         key: `${plugin.id}:${field.key}` 
                     });
                     newValues[field.key] = hasSecret ? '••••••••' : '';
                } else {
                    value = await window.electronAPI.pluginStorageGet(plugin.id, field.key);
                    newValues[field.key] = value ?? field.default ?? '';
                }
            } catch (err) {
                console.warn(`Failed to load setting ${field.key} for plugin ${plugin.id}`, err);
            }
        }
        setValues(newValues);
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            for (const field of configFields) {
                const value = values[field.key];
                
                if (field.type === 'secret') {
                    // Only update secret if it's not the placeholder
                    if (value !== '••••••••') {
                        await window.electronAPI.secretsSet({
                            namespace: 'plugins',
                            key: `${plugin.id}:${field.key}`,
                            value: value,
                            label: `${plugin.name} - ${field.label}`
                        });
                    }
                } else {
                    await window.electronAPI.pluginStorageSet(plugin.id, field.key, value);
                }
            }
            showToast({
                title: "Settings Saved",
                description: `Configuration for ${plugin.name} has been updated.`,
                variant: "default"
            });
        } catch (err) {
            console.error("Failed to save settings", err);
            showToast({
                title: "Error",
                description: "Failed to save settings. Check console for details.",
                variant: "destructive"
            });
        }
    };

    const handleChange = (key: string, value: any) => {
        setValues(prev => ({ ...prev, [key]: value }));
    };

    if (configFields.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                No configuration options available for this plugin.
            </div>
        );
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">{plugin.name} Settings</h2>
                    <p className="text-muted-foreground">{plugin.description}</p>
                </div>
                <Button onClick={handleSave} className="bg-primary text-primary-foreground">
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                </Button>
            </div>

            <Card className="bg-card/40 border-border">
                <CardContent className="space-y-6 pt-6">
                    {configFields.map(field => (
                        <div key={field.key} className="space-y-2">
                            <Label htmlFor={field.key}>{field.label}</Label>
                            
                            {field.description && (
                                <p className="text-sm text-muted-foreground mb-2">{field.description}</p>
                            )}

                            {field.type === 'string' && (
                                <Input 
                                    id={field.key}
                                    value={values[field.key] || ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                />
                            )}

                            {field.type === 'number' && (
                                <Input 
                                    id={field.key}
                                    type="number"
                                    value={values[field.key] || ''}
                                    onChange={(e) => handleChange(field.key, parseFloat(e.target.value))}
                                />
                            )}

                            {field.type === 'boolean' && (
                                <div className="flex items-center space-x-2">
                                    <Switch 
                                        id={field.key}
                                        checked={!!values[field.key]}
                                        onCheckedChange={(checked) => handleChange(field.key, checked)}
                                    />
                                    <Label htmlFor={field.key}>{values[field.key] ? 'Enabled' : 'Disabled'}</Label>
                                </div>
                            )}

                            {field.type === 'select' && field.options && (
                                <Select 
                                    value={values[field.key] || ''} 
                                    onValueChange={(val) => handleChange(field.key, val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {field.options.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {field.type === 'secret' && (
                                <div className="relative">
                                    <Input 
                                        id={field.key}
                                        type={showSecrets[field.key] ? 'text' : 'password'}
                                        value={values[field.key] || ''}
                                        onChange={(e) => handleChange(field.key, e.target.value)}
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                        onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                    >
                                        {showSecrets[field.key] ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};
