import React, { useState, useEffect } from 'react';
import { Clock, GitBranch, RotateCcw, Play } from 'lucide-react';

// Mock interface for Aleph API
interface AlephAPI {
    invoke: (tool: string, args: any) => Promise<any>;
}
declare const window: Window & { aleph: AlephAPI };

export default function TemporalVoyager() {
  const [timestamp, setTimestamp] = useState(Date.now());
  const [isLive, setIsLive] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [forkName, setForkName] = useState('');

  useEffect(() => {
      // Load history
      if (window.aleph) {
          window.aleph.invoke('getHistoryEvents', { limit: 10 }).then(res => {
              if (res.events) setHistory(res.events);
          });
      }
  }, []);

  const handleTravel = (val: number) => {
      setTimestamp(val);
      setIsLive(false);
      window.aleph?.invoke('travelToTime', { timestamp: val, mode: 'view' });
  };

  const handleFork = () => {
      const name = forkName || `Fork @ ${new Date(timestamp).toLocaleTimeString()}`;
      window.aleph?.invoke('forkTimeline', { timestamp, label: name });
      alert(`Created fork: ${name}`);
  };

  const handleLive = () => {
      const now = Date.now();
      setTimestamp(now);
      setIsLive(true);
      window.aleph?.invoke('travelToTime', { timestamp: now, mode: 'view' });
  };

  return (
    <div className="p-4 flex flex-col h-full bg-gray-900 text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-400" />
            Temporal Voyager
        </h1>
        <div className="flex gap-2">
            <button 
                onClick={handleLive}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${isLive ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
                <Play className="w-3 h-3" /> Live
            </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4">
        {/* Main Timeline View */}
        <div className="flex-1 border border-gray-700 rounded bg-gray-800 p-6 relative flex flex-col justify-center items-center">
            
            <div className="absolute top-4 right-4 text-4xl opacity-10">
                ⏳
            </div>

            <div className="text-center mb-8">
                <h2 className="text-4xl font-mono font-bold text-white mb-2">
                    {new Date(timestamp).toLocaleTimeString()}
                </h2>
                <p className="text-gray-400 text-sm">
                    {new Date(timestamp).toDateString()}
                </p>
                {!isLive && (
                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-900 text-yellow-200 text-xs rounded border border-yellow-700">
                        HISTORICAL STATE
                    </span>
                )}
            </div>

            {/* Scrubber */}
            <div className="w-full max-w-2xl">
                <input 
                    type="range" 
                    min={Date.now() - 86400000} // 24h ago
                    max={Date.now()} 
                    value={timestamp} 
                    onChange={(e) => handleTravel(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>-24h</span>
                    <span>Now</span>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-12 flex gap-4">
                <div className="flex flex-col gap-2">
                    <input 
                        type="text" 
                        placeholder="Fork Label" 
                        value={forkName}
                        onChange={e => setForkName(e.target.value)}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                    />
                    <button onClick={handleFork} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded flex items-center justify-center gap-2 transition">
                        <GitBranch className="w-4 h-4" />
                        Fork Timeline
                    </button>
                </div>
                
                <button 
                    onClick={() => handleTravel(timestamp - 60000)} // -1 min
                    className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded flex items-center gap-2 self-end"
                >
                    <RotateCcw className="w-4 h-4" />
                    Step Back 1m
                </button>
            </div>
        </div>

        {/* History Log */}
        <div className="w-64 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Event Log</h3>
            <div className="space-y-3">
                {history.map((evt, i) => (
                    <div 
                        key={i} 
                        className="p-2 bg-gray-700 rounded border border-gray-600 hover:bg-gray-600 cursor-pointer transition"
                        onClick={() => handleTravel(evt.timestamp)}
                    >
                        <div className="text-xs text-blue-300 mb-1">{new Date(evt.timestamp).toLocaleTimeString()}</div>
                        <div className="text-sm font-medium text-white">{evt.type}</div>
                        <div className="text-xs text-gray-400">{evt.summary}</div>
                    </div>
                ))}
                {history.length === 0 && (
                    <div className="text-xs text-gray-500 italic text-center py-4">No events found</div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
