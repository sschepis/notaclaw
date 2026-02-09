import React, { useState, useEffect } from 'react';
import { Database } from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: 'postgres' | 'mysql' | 'mongodb' | 'rest';
  connectionString: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync: number | null;
  recordCount: number;
}

export const activate = (context: any) => {
    const { ui, ipc } = context;

    const DataOsmosis = () => {
        const [sources, setSources] = useState<DataSource[]>([]);
        const [isAdding, setIsAdding] = useState(false);
        const [newSource, setNewSource] = useState({ name: '', type: 'postgres', connectionString: '' });

        useEffect(() => {
            // Load initial data
            ipc.invoke('data-osmosis:list').then((initialSources: any) => {
                if (Array.isArray(initialSources)) {
                    setSources(initialSources);
                }
            });

            const handleUpdate = (updatedSources: any) => {
                if (Array.isArray(updatedSources)) {
                    setSources(updatedSources);
                }
            };

            ipc.on('data-osmosis:update', handleUpdate);

            return () => {
                // Cleanup listener if possible
            };
        }, []);

        const handleAdd = async () => {
            try {
                const result = await ipc.invoke('data-osmosis:connect', newSource);
                if (result) {
                    setIsAdding(false);
                    setNewSource({ name: '', type: 'postgres', connectionString: '' });
                    // List will update via event
                }
            } catch (err) {
                console.error('Failed to add source:', err);
                // Show error toast
                ui.showToast({
                    title: 'Connection Failed',
                    message: String(err),
                    type: 'error'
                });
            }
        };

        const handleSync = async (id: string) => {
            try {
                await ipc.invoke('data-osmosis:sync', id);
            } catch (err) {
                console.error('Sync failed:', err);
                 ui.showToast({
                    title: 'Sync Failed',
                    message: String(err),
                    type: 'error'
                });
            }
        };

        return (
            <div className="p-6 bg-gray-900 text-white min-h-full font-sans">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-400">Data Osmosis</h1>
                        <p className="text-gray-400 text-sm">Universal Data Connector</p>
                    </div>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium"
                    >
                        + Add Source
                    </button>
                </div>

                {isAdding && (
                    <div className="mb-8 bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4">New Connection</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Name</label>
                                <input 
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                                    value={newSource.name}
                                    onChange={e => setNewSource({...newSource, name: e.target.value})}
                                    placeholder="e.g. User Database"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Type</label>
                                <select 
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                                    value={newSource.type}
                                    onChange={e => setNewSource({...newSource, type: e.target.value as any})}
                                >
                                    <option value="postgres">PostgreSQL</option>
                                    <option value="mysql">MySQL</option>
                                    <option value="mongodb">MongoDB</option>
                                    <option value="rest">REST API</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm text-gray-400 mb-1">Connection String / URL</label>
                                <input 
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono text-sm"
                                    value={newSource.connectionString}
                                    onChange={e => setNewSource({...newSource, connectionString: e.target.value})}
                                    placeholder="postgres://..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAdd}
                                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                            >
                                Connect
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sources.map(source => (
                        <div key={source.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 shadow-sm hover:border-gray-500 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                        source.status === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 
                                        source.status === 'syncing' ? 'bg-blue-500 animate-pulse' : 
                                        'bg-red-500'
                                    }`}></div>
                                    <h3 className="font-semibold text-lg">{source.name}</h3>
                                </div>
                                <span className="text-xs font-mono bg-gray-900 px-2 py-1 rounded text-gray-400 uppercase">
                                    {source.type}
                                </span>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-400 mb-6">
                                <div className="flex justify-between">
                                    <span>Records:</span>
                                    <span className="text-white font-mono">{source.recordCount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Last Sync:</span>
                                    <span className="text-white">
                                        {source.lastSync ? new Date(source.lastSync).toLocaleTimeString() : 'Never'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleSync(source.id)}
                                    disabled={source.status === 'syncing'}
                                    className={`flex-1 py-2 rounded text-sm font-medium ${
                                        source.status === 'syncing' 
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                >
                                    {source.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                                </button>
                                <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300">
                                    ⚙️
                                </button>
                            </div>
                        </div>
                    ))}
                    {sources.length === 0 && !isAdding && (
                        <div className="col-span-full text-center py-12 text-gray-500 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
                            No data sources connected. Click "Add Source" to begin.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const cleanupNav = ui.registerNavigation({
        id: 'data-osmosis-nav',
        label: 'Data Osmosis',
        icon: Database,
        view: {
            id: 'data-osmosis-view',
            name: 'Data Osmosis',
            icon: Database,
            component: DataOsmosis
        },
        order: 200
    });

    context._cleanups = [cleanupNav];
};

export const deactivate = (context: any) => {
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};

