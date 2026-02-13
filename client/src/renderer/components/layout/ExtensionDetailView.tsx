import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { usePluginStore } from '../../store/usePluginStore';
import { MarkdownContent } from '../ui/MarkdownContent';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Download, Trash2, Power } from 'lucide-react';
import { ProgressSpinner } from '../ui/ProgressSpinner';

export const ExtensionDetailView: React.FC = () => {
    const { activeTabId } = useAppStore();
    const { plugins, availableSkills, updatePluginStatus, removePlugin } = usePluginStore();
    const [readmeContent, setReadmeContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pluginId = activeTabId;
    const plugin = plugins.find(p => p.id === pluginId);
    const skill = availableSkills.find(s => s.id === pluginId);
    
    // Determine if it's an installed plugin or just a skill listing
    const item = plugin || skill;
    const isInstalled = !!plugin;
    const isDisabled = plugin?.status === 'disabled';

    useEffect(() => {
        const fetchReadme = async () => {
            if (!pluginId || !item) return;
            
            setLoading(true);
            setError(null);
            setReadmeContent(null);

            try {
                let content = '';
                
                if (isInstalled && plugin?.path) {
                    // Try to read README.md from the plugin directory
                    const readmeCandidates = ['README.md', 'readme.md', 'README.txt', 'readme.txt', 'README'];
                    
                    console.log(`[ExtensionDetailView] Looking for README in ${plugin.path}`);
                    
                    for (const candidate of readmeCandidates) {
                        try {
                            const candidatePath = `${plugin.path}/${candidate}`;
                            content = await window.electronAPI.readPluginFile(candidatePath) || '';
                            if (content) {
                                console.log(`[ExtensionDetailView] Found README at ${candidatePath}`);
                                break;
                            }
                        } catch (e) {
                            // Continue to next candidate
                        }
                    }
                    
                    if (!content) {
                        console.warn('[ExtensionDetailView] No README found for plugin', pluginId);
                    }
                } else if (!isInstalled && skill) {
                    // For uninstalled skills, we might not have the README unless we fetch it from the registry/ClawHub
                    // For now, we'll just show the description as a fallback or placeholder
                    // TODO: Fetch README from ClawHub API if available
                    content = `# ${skill.name}\n\n${skill.description}\n\n*Detailed documentation not available for uninstalled extensions yet.*`;
                }

                if (!content && item) {
                     content = `# ${item.name}\n\n${item.description}\n\n*No additional documentation available.*`;
                }

                setReadmeContent(content);
            } catch (err) {
                console.error('Failed to load extension details:', err);
                setError('Failed to load extension details.');
            } finally {
                setLoading(false);
            }
        };

        fetchReadme();
    }, [pluginId, isInstalled, item]);

    const handleEnable = async () => {
        if (!pluginId) return;
        try {
            const success = await window.electronAPI.pluginEnable(pluginId);
            if (success) updatePluginStatus(pluginId, 'active');
        } catch (error) {
            console.error('Failed to enable plugin', error);
        }
    };

    const handleDisable = async () => {
        if (!pluginId) return;
        try {
            const success = await window.electronAPI.pluginDisable(pluginId);
            if (success) updatePluginStatus(pluginId, 'disabled');
        } catch (error) {
            console.error('Failed to disable plugin', error);
        }
    };

    const handleUninstall = async () => {
        if (!pluginId) return;
        if (!confirm('Are you sure you want to uninstall this extension?')) return;
        
        try {
            const success = await window.electronAPI.pluginUninstall(pluginId);
            if (success) removePlugin(pluginId);
        } catch (error) {
            console.error('Failed to uninstall plugin', error);
        }
    };

    if (!item) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                Extension not found.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
             {/* Header */}
             <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground shadow-sm border border-border/50 overflow-hidden">
                            {'icon' in item && item.icon ? (
                                <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                item.name.substring(0, 2).toUpperCase()
                            )}
                        </div>
                        
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                {item.name}
                                {'isAlephExtension' in item && item.isAlephExtension && (
                                    <Badge variant="outline" className="text-xs border-primary text-primary">Aleph</Badge>
                                )}
                            </h1>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span>v{item.version}</span>
                                <span>•</span>
                                <span>{item.author || 'Unknown Author'}</span>
                                {isInstalled && (
                                    <>
                                        <span>•</span>
                                        <Badge variant="outline" className={isDisabled ? "border-border text-muted-foreground" : "border-emerald-800 text-emerald-500"}>
                                            {isDisabled ? 'Disabled' : 'Installed'}
                                        </Badge>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isInstalled ? (
                            <>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={isDisabled ? handleEnable : handleDisable}
                                    className={isDisabled ? "text-emerald-500 hover:text-emerald-600" : "text-destructive hover:text-destructive"}
                                >
                                    <Power size={14} className="mr-2" />
                                    {isDisabled ? 'Enable' : 'Disable'}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={handleUninstall}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 size={14} className="mr-2" />
                                    Uninstall
                                </Button>
                            </>
                        ) : (
                            <Button size="sm">
                                <Download size={14} className="mr-2" />
                                Install
                            </Button>
                        )}
                    </div>
                </div>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                 <div className="max-w-4xl mx-auto">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <ProgressSpinner />
                        </div>
                    ) : error ? (
                        <div className="text-destructive text-center py-12">{error}</div>
                    ) : (
                        <MarkdownContent content={readmeContent || ''} />
                    )}
                 </div>
             </div>
        </div>
    );
};
