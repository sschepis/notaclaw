import React, { useState, useEffect } from 'react';

export const activate = (context: any) => {
    console.log('[Theme Studio] Renderer activated');

    const ThemePanel = () => {
        const [primaryColor, setPrimaryColor] = useState('#3b82f6');
        const [secondaryColor, setSecondaryColor] = useState('#a855f7');
        const [font, setFont] = useState('Inter');

        useEffect(() => {
            // Load saved theme
            // const loadTheme = async () => { ... }
        }, []);

        const handleSave = () => {
            // Apply theme
            document.documentElement.style.setProperty('--primary-color', primaryColor);
            document.documentElement.style.setProperty('--secondary-color', secondaryColor);
            // Persist (mock)
            alert('Theme saved!');
        };

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <h2 className="text-xl font-bold mb-4">Theme Studio</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Primary Color</label>
                        <div className="flex gap-2 items-center">
                            <input 
                                type="color" 
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="bg-transparent border-none w-8 h-8 cursor-pointer"
                            />
                            <input 
                                type="text"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Secondary Color</label>
                        <div className="flex gap-2 items-center">
                            <input 
                                type="color" 
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                className="bg-transparent border-none w-8 h-8 cursor-pointer"
                            />
                            <input 
                                type="text"
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Font Family</label>
                        <select 
                            value={font}
                            onChange={(e) => setFont(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm outline-none"
                        >
                            <option value="Inter">Inter</option>
                            <option value="Roboto">Roboto</option>
                            <option value="JetBrains Mono">JetBrains Mono</option>
                        </select>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={handleSave}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 rounded font-medium transition-colors"
                        >
                            Apply Theme
                        </button>
                    </div>

                    <div className="mt-8 p-4 rounded-lg bg-black/20 border border-white/5">
                        <h3 className="text-sm font-bold mb-2">Preview</h3>
                        <div className="flex gap-2 mb-2">
                            <button className="px-3 py-1 bg-[var(--primary-color)] text-white rounded text-xs" style={{backgroundColor: primaryColor}}>Primary</button>
                            <button className="px-3 py-1 bg-[var(--secondary-color)] text-white rounded text-xs" style={{backgroundColor: secondaryColor}}>Secondary</button>
                        </div>
                        <p className="text-xs text-gray-400" style={{fontFamily: font}}>
                            The quick brown fox jumps over the lazy dog.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const ThemeStudioButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'theme-studio';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('theme-studio')}
                title="Theme Studio"
            >
                THE
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'theme-studio-nav',
        component: ThemeStudioButton
    });

    context.registerComponent('sidebar:view:theme-studio', {
        id: 'theme-studio-panel',
        component: ThemePanel
    });
};
