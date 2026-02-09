import React, { useEffect, useState } from 'react';

export const activate = (context) => {
    console.log('[IoT Resonance Bridge] Renderer activated');

    const IoTView = () => {
        const [devices, setDevices] = useState([]);
        const [view, setView] = useState('dashboard'); // 'dashboard' | 'settings'
        const [config, setConfig] = useState({ url: '', token: '' });

        useEffect(() => {
            context.ipc.send('getDevices');
            context.ipc.on('devices', setDevices);
            
            // Load config
            context.storage.get('iot-config').then(c => {
                if (c) setConfig(c);
            });
        }, []);

        const toggleDevice = (deviceId, currentState) => {
            context.ipc.send('controlDevice', {
                deviceId,
                action: currentState ? 'turn_off' : 'turn_on'
            });
        };

        const saveConfig = async () => {
            await context.storage.set('iot-config', config);
            // Securely store token
            await context.secrets.set('ha-token', config.token);
            context.ipc.send('reload-iot-config');
            setView('dashboard');
        };

        if (view === 'settings') {
            return (
                <div className="p-4 h-full overflow-y-auto text-white">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">IoT Settings</h1>
                        <button onClick={() => setView('dashboard')} className="text-gray-400 hover:text-white">
                            Cancel
                        </button>
                    </div>
                    
                    <div className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Home Assistant URL</label>
                            <input 
                                type="text" 
                                value={config.url}
                                onChange={e => setConfig({...config, url: e.target.value})}
                                placeholder="http://homeassistant.local:8123"
                                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Access Token</label>
                            <input 
                                type="password" 
                                value={config.token}
                                onChange={e => setConfig({...config, token: e.target.value})}
                                placeholder="Long-lived access token"
                                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <button 
                            onClick={saveConfig}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition-colors"
                        >
                            Save & Connect
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4 h-full overflow-y-auto text-white">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">IoT Resonance Bridge</h1>
                    <button 
                        onClick={() => setView('settings')}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded text-gray-300"
                        title="Settings"
                    >
                        ⚙️
                    </button>
                </div>

                {devices.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                        <p className="mb-4">No devices connected.</p>
                        <button onClick={() => setView('settings')} className="text-blue-400 hover:underline">
                            Configure Home Assistant
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {devices.map(device => (
                            <div key={device.id} className="border border-white/10 p-4 rounded bg-white/5 flex flex-col items-center relative group">
                                <div className={`text-4xl mb-2 transition-opacity ${device.state.unavailable ? 'opacity-30' : 'opacity-100'}`}>
                                    {device.type === 'light' ? '💡' : 
                                     device.type === 'thermostat' ? '🌡️' : 
                                     device.type === 'lock' ? '🔒' : 
                                     device.type === 'switch' ? '🔌' : '📱'}
                                </div>
                                <h3 className="text-lg font-bold text-center truncate w-full">{device.name}</h3>
                                <div className="mt-2 text-sm text-gray-400">
                                    {device.state.unavailable ? 'Unavailable' : 
                                     device.type === 'light' ? (device.state.on ? 'On' : 'Off') :
                                     device.type === 'lock' ? (device.state.locked ? 'Locked' : 'Unlocked') :
                                     device.type === 'thermostat' ? `${device.state.temperature}°F` :
                                     JSON.stringify(device.state)}
                                </div>
                                
                                {!device.state.unavailable && (
                                    <div className="mt-4 flex gap-2">
                                        {device.type === 'light' && (
                                            <button 
                                                onClick={() => toggleDevice(device.id, device.state.on)}
                                                className={`px-4 py-2 rounded font-medium transition-colors ${
                                                    device.state.on ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30' : 'bg-white/10 hover:bg-white/20'
                                                }`}
                                            >
                                                {device.state.on ? 'Turn Off' : 'Turn On'}
                                            </button>
                                        )}
                                        {device.type === 'lock' && (
                                            <button 
                                                onClick={() => context.ipc.send('controlDevice', { deviceId: device.id, action: device.state.locked ? 'unlock' : 'lock' })}
                                                className={`px-4 py-2 rounded font-medium transition-colors ${
                                                    device.state.locked ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                                                }`}
                                            >
                                                {device.state.locked ? 'Unlock' : 'Lock'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const IoTButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'iot-bridge';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('iot-bridge')}
                title="IoT Bridge"
            >
                🏠
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'iot-bridge-nav',
        component: IoTButton
    });

    context.registerComponent('sidebar:view:iot-bridge', {
        id: 'iot-bridge-panel',
        component: IoTView
    });
};
