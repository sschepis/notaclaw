import React from 'react';
import { PluginManifest } from '../../../../shared/plugin-types';
import { Box, AlertCircle, CheckCircle, Ban } from 'lucide-react';

interface PluginListProps {
    plugins: PluginManifest[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export const PluginList: React.FC<PluginListProps> = ({ plugins, selectedId, onSelect }) => {
    return (
        <div className="flex-1 overflow-y-auto">
            {plugins.map(plugin => {
                const isSelected = selectedId === plugin.id;
                
                // Determine status icon
                let StatusIcon = CheckCircle;
                let statusColor = "text-emerald-500";
                
                if (plugin.status === 'error') {
                    StatusIcon = AlertCircle;
                    statusColor = "text-red-500";
                } else if (plugin.status === 'disabled') {
                    StatusIcon = Ban;
                    statusColor = "text-zinc-500";
                }

                return (
                    <div 
                        key={plugin.id}
                        onClick={() => onSelect(plugin.id)}
                        className={`
                            flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors border-l-2
                            ${isSelected 
                                ? 'bg-blue-500/10 border-blue-500' 
                                : 'border-transparent hover:bg-zinc-800/50'}
                        `}
                    >
                        {/* Icon */}
                        <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                            {plugin.icon ? (
                                <img src={plugin.icon} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Box size={16} className="text-zinc-500" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                    {plugin.name}
                                </span>
                                <StatusIcon size={12} className={statusColor} />
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate">
                                v{plugin.version}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
