import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { usePluginStore, ExtensionFilter } from '../../store/usePluginStore';
import { useAppStore } from '../../store/useAppStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PluginManifest, SkillManifest } from '../../../shared/plugin-types';
import { PopupMenu, PopupMenuItem } from '../ui/PopupMenu';
import { Trash2, Power, RefreshCw, Download, Copy, Settings, MoreVertical } from 'lucide-react';

export const ExtensionsView: React.FC = () => {
    const { plugins, availableSkills, filter, setFilter, setPlugins, setAvailableSkills, updatePluginStatus, removePlugin } = usePluginStore();
    const { openTab } = useAppStore();
    const [search, setSearch] = useState('');
    const [menuState, setMenuState] = useState<{
        position?: { x: number; y: number };
        anchorEl?: HTMLElement | null;
        targetId: string;
    } | null>(null);

    useEffect(() => {
        // Fetch plugins and skills on mount
        const fetchData = async () => {
            try {
                // Fetch installed plugins from PluginManager
                const installedPlugins = await window.electronAPI.getPlugins();
                console.log('Installed Plugins:', installedPlugins);
                setPlugins(installedPlugins);
                
                // Fetch available skills from ClawHub API
                const skills = await window.electronAPI.getOpenClawSkills();
                setAvailableSkills(skills);
            } catch (error) {
                console.error("Failed to fetch extensions data", error);
            }
        };
        fetchData();
    }, [setPlugins, setAvailableSkills]);

    const isInstalled = (id: string) => plugins.some(p => p.id === id);

    const getDisplayedItems = () => {
        let items: (PluginManifest | SkillManifest)[] = [];

        if (filter === 'all') {
            // Installed plugins
            items = [...plugins];
            // Available skills (not installed)
            const uninstalledSkills = availableSkills.filter(s => !isInstalled(s.id));
            items = [...items, ...uninstalledSkills];
        } else if (filter === 'installed') {
            items = [...plugins];
        } else if (filter === 'upgradeable') {
             // Mock upgradeable logic: check if available version > installed version
             items = plugins.filter(p => {
                 const skill = availableSkills.find(s => s.id === p.id);
                 return skill && skill.version > p.version; // Simple string comparison for now
             });
        } else if (filter === 'native') {
            // Filter native AlephNet plugins
            const allItems = [...plugins, ...availableSkills.filter(s => !isInstalled(s.id))];
            items = allItems.filter(item => ('isAlephExtension' in item && item.isAlephExtension) || ('alephConfig' in item && !!item.alephConfig));
        }

        // Apply search
        return items.filter(item => 
            item.name.toLowerCase().includes(search.toLowerCase()) || 
            item.description.toLowerCase().includes(search.toLowerCase())
        );
    };

    const filteredItems = getDisplayedItems();

    const handleExtensionClick = (item: PluginManifest | SkillManifest) => {
        openTab({
            id: item.id,
            type: 'extension',
            title: item.name
        });
    };

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        setMenuState({
            position: { x: e.clientX, y: e.clientY },
            targetId: id
        });
    };

    const handleSettingsClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setMenuState({
            anchorEl: e.currentTarget as HTMLElement,
            targetId: id
        });
    };

    const handleDisable = async (id: string) => {
        try {
            const success = await window.electronAPI.pluginDisable(id);
            if (success) {
                updatePluginStatus(id, 'disabled');
                console.log('Disabled plugin', id);
            }
        } catch (error) {
            console.error('Failed to disable plugin', error);
        }
    };

    const handleEnable = async (id: string) => {
        try {
            const success = await window.electronAPI.pluginEnable(id);
            if (success) {
                updatePluginStatus(id, 'active');
                console.log('Enabled plugin', id);
            }
        } catch (error) {
            console.error('Failed to enable plugin', error);
        }
    };

    const handleUninstall = async (id: string) => {
        if (!confirm('Are you sure you want to uninstall this extension? This cannot be undone.')) return;
        
        try {
            const success = await window.electronAPI.pluginUninstall(id);
            if (success) {
                removePlugin(id);
                console.log('Uninstalled plugin', id);
            }
        } catch (error) {
            console.error('Failed to uninstall plugin', error);
        }
    };

    const getMenuItems = (id: string): PopupMenuItem[] => {
        const plugin = plugins.find(p => p.id === id);
        const isDisabled = plugin?.status === 'disabled';

        return [
            {
                label: 'Auto Update',
                onClick: () => console.log('Toggle Auto Update', id),
                checked: true, // Mocked default
            },
            { divider: true, label: '', onClick: () => {} },
            {
                label: 'Install Version...',
                icon: <Download size={14} />,
                onClick: () => console.log('Install Version', id),
            },
            {
                label: 'Copy Extension ID',
                icon: <Copy size={14} />,
                onClick: () => {
                    navigator.clipboard.writeText(id);
                    console.log('Copied ID', id);
                },
            },
            { divider: true, label: '', onClick: () => {} },
            {
                label: isDisabled ? 'Enable' : 'Disable',
                icon: <Power size={14} className={isDisabled ? "text-emerald-500" : "text-destructive"} />,
                onClick: () => isDisabled ? handleEnable(id) : handleDisable(id),
            },
            {
                label: 'Uninstall Extension',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => handleUninstall(id),
            },
        ];
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Extensions</h2>
                    <Select value={filter} onValueChange={(v) => setFilter(v as ExtensionFilter)}>
                        <SelectTrigger className="w-[140px] h-7 text-xs bg-muted/20 border-border">
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Extensions</SelectItem>
                            <SelectItem value="installed">Installed</SelectItem>
                            <SelectItem value="upgradeable">Upgradeable</SelectItem>
                            <SelectItem value="native">Native Extensions</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Input 
                    placeholder="Search extensions..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-muted/20 border-border text-foreground h-8 text-sm"
                />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {filteredItems.map(item => {
                    const installed = isInstalled(item.id);
                    const isAlephExtension = 'isAlephExtension' in item && item.isAlephExtension;
                    const isDisabled = 'status' in item && item.status === 'disabled';
                    
                    return (
                        <div
                            key={item.id}
                            onClick={() => handleExtensionClick(item)}
                            onContextMenu={(e) => installed && handleContextMenu(e, item.id)}
                            className={`p-3 bg-card rounded-lg hover:bg-muted/50 transition-colors border border-border hover:border-primary/30 group relative cursor-pointer ${isDisabled ? 'opacity-75' : ''}`}
                        >
                            <div className="flex flex-wrap justify-between items-start mb-1 gap-y-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    {'icon' in item && item.icon ? (
                                        <img src={item.icon} alt={item.name} className="w-6 h-6 rounded-sm object-contain bg-muted/50 p-0.5 shrink-0" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-sm bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                                            {item.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <h3 className="font-bold text-sm text-foreground truncate">{item.name}</h3>
                                    {isAlephExtension && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary text-primary shrink-0">Aleph</Badge>}
                                </div>
                                <div className="flex items-center gap-2 ml-auto">
                                     {installed && <Badge variant="outline" className={isDisabled ? "text-[10px] px-1.5 py-0 h-5 border-border text-muted-foreground shrink-0" : "text-[10px] px-1.5 py-0 h-5 border-emerald-800 text-emerald-500 shrink-0"}>{isDisabled ? 'Disabled' : 'Installed'}</Badge>}
                                     <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">v{item.version}</Badge>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground/70 font-mono">{item.id}</span>
                                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!installed && (
                                        <button 
                                            className="text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-1 rounded" 
                                            title="Install"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // TODO: Implement install
                                                console.log('Install', item.id);
                                            }}
                                        >
                                            Install
                                        </button>
                                    )}
                                    {installed && (
                                         <button 
                                            className="p-1 text-muted-foreground hover:text-foreground transition-colors" 
                                            title="Settings"
                                            onClick={(e) => handleSettingsClick(e, item.id)}
                                         >
                                            <Settings size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {filteredItems.length === 0 && (
                    <div className="text-center py-8 text-gray-600 text-xs">
                        No extensions found.
                    </div>
                )}
            </div>

            {menuState && (
                <PopupMenu
                    items={getMenuItems(menuState.targetId)}
                    onClose={() => setMenuState(null)}
                    position={menuState.position}
                    anchorEl={menuState.anchorEl}
                />
            )}
        </div>
    );
};
