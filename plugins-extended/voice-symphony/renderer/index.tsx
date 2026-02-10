import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Radio } from 'lucide-react';

// Mock interface
interface AlephAPI {
    invoke: (tool: string, args: any) => Promise<any>;
}
declare const window: Window & { aleph: AlephAPI };

export default function VoiceSymphony() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
      let interval: any;
      if (isListening) {
          interval = setInterval(() => {
              window.aleph?.invoke('getTranscript', {}).then(res => {
                  if (res.transcript) setTranscript(res.transcript);
              });
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [isListening]);

  // Mock visualizer
  useEffect(() => {
      if (!isListening || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      let frame = 0;
      const draw = () => {
          if (!isListening) return;
          ctx.clearRect(0, 0, 300, 100);
          ctx.fillStyle = '#4ade80';
          for (let i = 0; i < 30; i++) {
              const h = Math.sin(frame * 0.1 + i * 0.5) * 40 + 50;
              ctx.fillRect(i * 10, 100 - h, 8, h);
          }
          frame++;
          requestAnimationFrame(draw);
      };
      draw();
  }, [isListening]);

  const toggleMic = async () => {
      const newState = !isListening;
      setIsListening(newState);
      await window.aleph?.invoke('toggleListening', { state: newState });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-black text-white p-8 items-center justify-center">
      <div className="text-center mb-12">
          <h1 className="text-4xl font-thin mb-2 flex items-center justify-center gap-3">
              <Radio className={`w-8 h-8 ${isListening ? 'text-green-400 animate-pulse' : 'text-gray-600'}`} />
              Voice Symphony
          </h1>
          <p className="text-gray-500">Natural Language Interface</p>
      </div>

      <div className="relative mb-12">
          <button 
            onClick={toggleMic}
            className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl shadow-2xl transition-all duration-500 ${isListening ? 'bg-red-600 hover:bg-red-500 scale-110' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
              {isListening ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
          </button>
          {isListening && (
              <div className="absolute -inset-4 border-2 border-green-500 rounded-full animate-ping opacity-50 pointer-events-none"></div>
          )}
      </div>

      {isListening && (
          <div className="w-full max-w-md h-24 bg-black rounded-xl overflow-hidden mb-8 border border-gray-800 relative">
              <canvas ref={canvasRef} width={300} height={100} className="w-full h-full opacity-70"></canvas>
          </div>
      )}

      <div className="w-full max-w-2xl bg-gray-800/50 rounded-xl p-6 h-64 overflow-y-auto border border-gray-700 backdrop-blur">
          <h3 className="text-xs uppercase text-gray-500 mb-4 font-bold tracking-wider">Live Transcript</h3>
          <div className="space-y-4">
              {transcript.length === 0 && <span className="text-gray-600 italic">Silence...</span>}
              {transcript.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                          {msg.text}
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}
