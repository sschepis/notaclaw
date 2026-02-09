import React, { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';

export const activate = (context: any) => {
    console.log('[Service Marketplace] Renderer activated');
    const { ui } = context;

    const MarketplacePanel = () => {
        const [plugins, setPlugins] = useState<any[]>([]);
        const [loading, setLoading] = useState(false);

        useEffect(() => {
            const fetchPlugins = async () => {
                if (context.ipc && context.ipc.invoke) {
                    const list = await context.ipc.invoke('marketplace:list');
                    setPlugins(list);
                }
            };
            fetchPlugins();
        }, []);

        const handleInstall = async (pluginId: string) => {
            setLoading(true);
            try {
                const result = await context.ipc.invoke('marketplace:install', { pluginId });
                alert(result.message);
            } catch (e: any) {
                alert('Installation failed: ' + e.message);
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <h2 className="text-xl font-bold mb-4">Marketplace</h2>
                
                <div className="flex-1 overflow-y-auto space-y-3">
                    {plugins.map((plugin) => (
                        <div key={plugin.id} className="bg-white/5 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-sm text-blue-400">{plugin.name}</h3>
                                    <p className="text-xs text-gray-500">v{plugin.version} • by {plugin.author}</p>
                                </div>
                                <button 
                                    onClick={() => handleInstall(plugin.id)}
                                    disabled={loading}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium disabled:opacity-50"
                                >
                                    Install
                                </button>
                            </div>
                            <p className="text-sm text-gray-300">{plugin.description}</p>
                        </div>
                    ))}
                    {plugins.length === 0 && <div className="text-center text-gray-500 mt-8">Loading registry...</div>}
                </div>
            </div>
        );
    };

    // Register Navigation
    const cleanupNav = ui.registerNavigation({
        id: 'marketplace-nav',
        label: 'Marketplace',
        icon: ShoppingBag,
        view: {
            id: 'marketplace-panel',
            name: 'Service Marketplace',
            icon: ShoppingBag,
            component: MarketplacePanel
        },
        order: 700
    });

    context._cleanups = [cleanupNav];
};

export const deactivate = (context: any) => {
    console.log('[Service Marketplace] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};

