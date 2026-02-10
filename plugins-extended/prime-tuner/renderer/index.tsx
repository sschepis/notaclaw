import React, { useState, useEffect } from 'react';

export const activate = (context: any) => {
    console.log('[Prime Tuner] Renderer activated');

    const TunerPanel = () => {
        const [frequency, setFrequency] = useState(432);
        const [sensitivity, setSensitivity] = useState(0.5);
        const [autoTune, setAutoTune] = useState(false);
        const [mode, setMode] = useState('harmonic');

        // Visualize wave
        const [wavePoints, setWavePoints] = useState<string>('');

        useEffect(() => {
            // Generate sine wave path
            const width = 300;
            const height = 100;
            const points = [];
            for (let x = 0; x <= width; x++) {
                const y = height / 2 + Math.sin((x / width) * Math.PI * 4 * (frequency / 432)) * (height / 2.5);
                points.push(`${x},${y}`);
            }
            setWavePoints(points.join(' '));
        }, [frequency]);

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <h2 className="text-xl font-bold mb-4">Prime Tuner</h2>
                
                <div className="bg-white/5 p-4 rounded-lg mb-4">
                    <svg width="100%" height="100" className="overflow-visible">
                        <polyline points={wavePoints} fill="none" stroke="#3b82f6" strokeWidth="2" />
                    </svg>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Resonance Frequency (Hz)</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="range" min="20" max="1000" 
                                value={frequency} 
                                onChange={(e) => setFrequency(Number(e.target.value))}
                                className="flex-1 accent-blue-500"
                            />
                            <span className="text-sm w-12 text-right">{frequency}</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Sensitivity</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="range" min="0" max="1" step="0.1"
                                value={sensitivity} 
                                onChange={(e) => setSensitivity(Number(e.target.value))}
                                className="flex-1 accent-blue-500"
                            />
                            <span className="text-sm w-12 text-right">{sensitivity}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-sm">Auto Tune</label>
                        <input 
                            type="checkbox" 
                            checked={autoTune} 
                            onChange={(e) => setAutoTune(e.target.checked)}
                            className="accent-blue-500 w-4 h-4"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Mode</label>
                        <select 
                            value={mode} 
                            onChange={(e) => setMode(e.target.value)}
                            className="w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="harmonic">Harmonic</option>
                            <option value="melodic">Melodic</option>
                            <option value="scalar">Scalar</option>
                        </select>
                    </div>
                </div>
            </div>
        );
    };

    const PrimeTunerButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'prime-tuner';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('prime-tuner')}
                title="Prime Tuner"
            >
                PT
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'prime-tuner-nav',
        component: PrimeTunerButton
    });

    context.registerComponent('sidebar:view:prime-tuner', {
        id: 'prime-tuner-panel',
        component: TunerPanel
    });
};
