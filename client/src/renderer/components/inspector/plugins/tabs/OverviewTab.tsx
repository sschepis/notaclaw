import React from 'react';
import { PluginManifest } from '../../../../../shared/plugin-types';
import { Shield, FileText, Link, Package, Info } from 'lucide-react';

export const OverviewTab: React.FC<{ plugin: PluginManifest }> = ({ plugin }) => {
    return (
        <div className="space-y-6">
            {/* Description */}
            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2 text-zinc-400">
                    <Info size={14} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Description</h3>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                    {plugin.description || "No description provided."}
                </p>
            </div>

            {/* Permissions */}
            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-3 text-zinc-400">
                    <Shield size={14} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Permissions</h3>
                </div>
                {plugin.permissions && plugin.permissions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {plugin.permissions.map((perm, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-zinc-950/50 rounded border border-zinc-800/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-xs font-mono text-zinc-300">{perm}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-zinc-500 italic">No special permissions requested.</p>
                )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-3 text-zinc-400">
                        <FileText size={14} />
                        <h3 className="text-xs font-bold uppercase tracking-wider">Manifest</h3>
                    </div>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">ID</span>
                            <span className="font-mono text-zinc-300 select-all">{plugin.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Version</span>
                            <span className="font-mono text-zinc-300">{plugin.version}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Main Entry</span>
                            <span className="font-mono text-zinc-300">{plugin.main || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Renderer</span>
                            <span className="font-mono text-zinc-300">{plugin.renderer || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-3 text-zinc-400">
                        <Package size={14} />
                        <h3 className="text-xs font-bold uppercase tracking-wider">Environment</h3>
                    </div>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Path</span>
                            <button 
                                className="text-blue-400 hover:underline truncate max-w-[200px] text-right"
                                title={plugin.path}
                                onClick={() => {/* TODO: Open in Finder */}}
                            >
                                {plugin.path}
                            </button>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Loaded At</span>
                            <span className="text-zinc-300">
                                {plugin.loadedAt ? new Date(plugin.loadedAt).toLocaleString() : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
