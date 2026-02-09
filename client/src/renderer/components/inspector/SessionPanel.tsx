import React, { useState, useEffect } from 'react';
import { ActionLog, LogEntry } from '../session/ActionLog';
import { Button } from '../ui/button';
import { Eye, EyeOff, AlertTriangle, MousePointer2 } from 'lucide-react';

export const SessionPanel: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isEyeActive, setIsEyeActive] = useState(false);

    // Mock logs for now
    useEffect(() => {
        const mockLogs: LogEntry[] = [
            { id: '1', timestamp: Date.now() - 5000, type: 'VISION', message: 'Scanned screen (1920x1080)' },
            { id: '2', timestamp: Date.now() - 4000, type: 'SYSTEM', message: 'Target identified: Submit Button' },
            { id: '3', timestamp: Date.now() - 3000, type: 'ACTION', message: 'Mouse Move: 800, 600' },
        ];
        setLogs(mockLogs);
    }, []);

    return (
        <div className="space-y-6 p-4">
            {/* Vision Buffer */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center space-x-2">
                        <Eye size={14} className={isEyeActive ? 'text-blue-400' : 'text-zinc-500'} />
                        <h4 className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">VISION BUFFER</h4>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${isEyeActive ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-zinc-700'}`} />
                </div>
                
                <div className="aspect-video bg-black rounded-lg border border-zinc-800 flex items-center justify-center relative overflow-hidden group shadow-inner">
                    {isEyeActive ? (
                        <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center space-y-2">
                            <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-zinc-700 animate-spin"></div>
                            <span className="text-[10px] text-zinc-500 animate-pulse">AWAITING SNAPSHOT...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-zinc-700">
                            <EyeOff size={24} className="mb-2 opacity-50" />
                            <span className="text-[10px]">Vision Stream Disabled</span>
                        </div>
                    )}
                    
                    {/* Overlay Controls */}
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-6 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                            onClick={() => setIsEyeActive(!isEyeActive)}
                        >
                            {isEyeActive ? 'Stop Stream' : 'Start Stream'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Action Log */}
            <div>
                <div className="flex items-center space-x-2 mb-2 ml-1">
                    <MousePointer2 size={12} className="text-zinc-500" />
                    <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">ACTION LOG</h4>
                </div>
                <ActionLog logs={logs} />
            </div>

            {/* Safety Controls */}
            <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle size={14} className="text-red-500" />
                        <span className="text-[10px] text-red-400 font-bold tracking-wider">DEAD MAN'S SWITCH</span>
                    </div>
                    <span className="text-[9px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-900/50">ARMED</span>
                </div>
                <Button variant="destructive" size="sm" className="w-full h-8 text-xs font-bold tracking-wide shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all">
                    EMERGENCY STOP
                </Button>
                <p className="text-[9px] text-red-400/60 mt-2 text-center">
                    Pressing this will immediately sever the neural link and halt all agent actions.
                </p>
            </div>
        </div>
    );
};
