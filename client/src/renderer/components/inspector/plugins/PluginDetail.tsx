import React, { useState } from 'react';
import { PluginManifest } from '../../../../shared/plugin-types';
import { Box, RefreshCw, Power, Trash2, Activity, Layers, Database, Terminal, MessageSquare, Zap } from 'lucide-react';
import { OverviewTab } from './tabs/OverviewTab';
import { ExtensionsTab } from './tabs/ExtensionsTab';
import { StateTab } from './tabs/StateTab';
import { ServicesTab } from './tabs/ServicesTab';
import { LogsTab } from './tabs/LogsTab';
import { IPCTab } from './tabs/IPCTab';

interface PluginDetailProps {
    plugin: PluginManifest;
}

type TabId = 'overview' | 'extensions' | 'state' | 'services' | 'logs' | 'ipc';

export const PluginDetail: React.FC<PluginDetailProps> = ({ plugin }) => {
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [isReloading, setIsReloading] = useState(false);

    const handleReload = async () => {
        setIsReloading(true);
        try {
            await window.electronAPI.pluginReload(plugin.id);
        } catch (e) {
            console.error("Failed to reload plugin:", e);
        } finally {
            setIsReloading(false);
        }
    };

    const handleToggle = async () => {
        if (plugin.status === 'disabled') {
            await window.electronAPI.pluginEnable(plugin.id);
        } else {
            await window.electronAPI.pluginDisable(plugin.id);
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'extensions', label: 'Extensions', icon: Layers },
        { id: 'state', label: 'State & Storage', icon: Database },
        { id: 'services', label: 'Services', icon: Zap },
        { id: 'logs', label: 'Logs', icon: Terminal },
        { id: 'ipc', label: 'IPC', icon: MessageSquare },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/30">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden shadow-lg border border-zinc-700">
                        {plugin.icon ? (
                            <img src={plugin.icon} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Box size={24} className="text-zinc-500" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">{plugin.name}</h2>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="font-mono">v{plugin.version}</span>
                            <span>•</span>
                            <span>{plugin.id}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                plugin.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                plugin.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                'bg-zinc-700 text-zinc-400'
                            }`}>
                                {plugin.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleReload}
                        disabled={isReloading}
                        className={`p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors ${isReloading ? 'animate-spin' : ''}`}
                        title="Reload Plugin"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button 
                        onClick={handleToggle}
                        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
                            plugin.status === 'disabled' ? 'text-zinc-500' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                        title={plugin.status === 'disabled' ? "Enable Plugin" : "Disable Plugin"}
                    >
                        <Power size={16} />
                    </button>
                    <button 
                        className="p-2 rounded hover:bg-red-900/30 text-zinc-600 hover:text-red-400 transition-colors"
                        title="Uninstall Plugin"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center px-4 border-b border-zinc-800 bg-zinc-900/10">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabId)}
                            className={`
                                flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors
                                ${isActive 
                                    ? 'border-blue-500 text-blue-400' 
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}
                            `}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-y-auto p-4 custom-scrollbar">
                    {activeTab === 'overview' && <OverviewTab plugin={plugin} />}
                    {activeTab === 'extensions' && <ExtensionsTab pluginId={plugin.id} />}
                    {activeTab === 'state' && <StateTab pluginId={plugin.id} />}
                    {activeTab === 'services' && <ServicesTab pluginId={plugin.id} />}
                    {activeTab === 'logs' && <LogsTab pluginId={plugin.id} />}
                    {activeTab === 'ipc' && <IPCTab pluginId={plugin.id} />}
                </div>
            </div>
        </div>
    );
};
