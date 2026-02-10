import React from 'react';
import { useSlotRegistry } from '../../../../services/SlotRegistry';
import { useAppStore } from '../../../../store/useAppStore';
import { Layers, Command, Layout, MessageSquare } from 'lucide-react';

export const ExtensionsTab: React.FC<{ pluginId: string }> = ({ pluginId }) => {
    const { setLayoutAction } = useAppStore();
    
    // We can't use the hook directly inside a loop or conditional, but we can get the state.
    // However, `useSlotRegistry` is a zustand store, so we can select what we need.
    const registrations = useSlotRegistry(state => {
        const all: any[] = [];
        
        // Collect all registrations for this plugin
        Object.values(state.registrations).flat().forEach(r => {
            if (r.pluginId === pluginId) all.push({ type: 'Slot', ...r });
        });
        
        Object.values(state.panels).forEach(p => {
            if (p.pluginId === pluginId) all.push({ type: 'Panel', ...p });
        });

        Object.values(state.stageViews).forEach(v => {
            if (v.pluginId === pluginId) all.push({ type: 'Stage View', ...v });
        });
        
        Object.values(state.commands).forEach(c => {
            if (c.pluginId === pluginId) all.push({ type: 'Command', ...c });
        });

        Object.values(state.inspectorTabs).forEach(t => {
            if (t.pluginId === pluginId) all.push({ type: 'Inspector Tab', ...t });
        });

        return all;
    });

    const handleExtensionClick = (reg: any) => {
        if (reg.type === 'Panel') {
            setLayoutAction({ 
                type: 'open', 
                component: reg.id, 
                name: reg.label || reg.name || 'Panel',
                icon: 'layout'
            });
        } else if (reg.type === 'Stage View') {
            setLayoutAction({ 
                type: 'open', 
                component: reg.id, 
                name: reg.label || reg.name || 'View',
                icon: 'stage'
            });
        }
    };

    if (registrations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Layers size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No extensions registered.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {registrations.map((reg, i) => {
                let Icon = Layers;
                if (reg.type === 'Command') Icon = Command;
                else if (reg.type === 'Panel' || reg.type === 'Stage View') Icon = Layout;
                else if (reg.type === 'Slot') Icon = MessageSquare; // Assuming mostly chat slots for now

                const isClickable = reg.type === 'Panel' || reg.type === 'Stage View';

                return (
                    <div 
                        key={i} 
                        className={`bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex items-start gap-3 ${isClickable ? 'cursor-pointer hover:bg-zinc-800/50 transition-colors' : ''}`}
                        onClick={() => isClickable && handleExtensionClick(reg)}
                    >
                        <div className="mt-1 p-1.5 bg-zinc-800 rounded text-zinc-400">
                            <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                                    {reg.type}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded">
                                    {reg.id}
                                </span>
                            </div>
                            <div className="mt-1 text-sm text-zinc-200 truncate">
                                {reg.label || reg.name || reg.slotId || 'Unnamed Extension'}
                            </div>
                            {reg.description && (
                                <p className="text-xs text-zinc-500 mt-1">{reg.description}</p>
                            )}
                            {reg.shortcut && (
                                <div className="mt-2 inline-flex items-center px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-[10px] font-mono text-zinc-400">
                                    {reg.shortcut}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
