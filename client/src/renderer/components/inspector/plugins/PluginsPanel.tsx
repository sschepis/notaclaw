import React, { useState } from 'react';
import { PluginList } from './PluginList';
import { PluginDetail } from './PluginDetail';
import { usePluginStore } from '../../../store/usePluginStore';

export const PluginsPanel: React.FC = () => {
    const { plugins } = usePluginStore();
    const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);

    const selectedPlugin = plugins.find(p => p.id === selectedPluginId);

    return (
        <div className="flex h-full w-full bg-zinc-950 text-white overflow-hidden">
            {/* Sidebar List */}
            <div className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/30">
                <div className="p-3 border-b border-zinc-800">
                    <input 
                        type="text" 
                        placeholder="Search plugins..." 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-blue-500/50"
                    />
                </div>
                <PluginList 
                    plugins={plugins} 
                    selectedId={selectedPluginId} 
                    onSelect={setSelectedPluginId} 
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/50">
                {selectedPlugin ? (
                    <PluginDetail plugin={selectedPlugin} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                        Select a plugin to inspect details
                    </div>
                )}
            </div>
        </div>
    );
};
