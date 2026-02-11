import React, { useState } from 'react';

interface Trace {
  timestamp: number;
  step: string;
  details: Record<string, any>;
}

interface Session {
  id: string;
  agentId: string;
  startTime: number;
  status: string;
  traces: Trace[];
}

// Mock Data
const MOCK_SESSION: Session = {
  id: 'sess_mock_123',
  agentId: 'agent_sre_01',
  startTime: Date.now() - 60000,
  status: 'completed',
  traces: [
      { timestamp: Date.now() - 50000, step: 'Goal Analysis', details: { goal: 'Summarize recent logs', priority: 'high' } },
      { timestamp: Date.now() - 45000, step: 'Memory Recall', details: { query: 'logs', limit: 10, resonance: 0.85 } },
      { timestamp: Date.now() - 40000, step: 'Plan Formulation', details: { steps: ['fetch_logs', 'analyze_sentiment', 'generate_summary'] } },
      { timestamp: Date.now() - 35000, step: 'Tool Execution', details: { tool: 'fetch_logs', args: { limit: 100 } } },
      { timestamp: Date.now() - 30000, step: 'Observation', details: { result: 'Fetched 100 log entries.' } },
      { timestamp: Date.now() - 25000, step: 'Reasoning', details: { thought: 'Logs show high error rate in auth service.' } },
      { timestamp: Date.now() - 20000, step: 'Tool Execution', details: { tool: 'analyze_sentiment', args: { text: 'Error: Auth failed...' } } },
      { timestamp: Date.now() - 10000, step: 'Response Generation', details: { draft: 'The system is experiencing auth failures.' } }
  ]
};

export default function ThoughtStreamDebugger() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedTraceIndex, setSelectedTraceIndex] = useState<number | null>(null);

  const session = selectedSessionId === 'sess_mock_123' ? MOCK_SESSION : null;

  return (
    <div className="flex h-full bg-gray-950 text-gray-200 font-sans">
      {/* Session List */}
      <div className="w-64 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-purple-400">Sessions</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
            <div 
                onClick={() => setSelectedSessionId('sess_mock_123')}
                className={`p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-900 ${selectedSessionId === 'sess_mock_123' ? 'bg-gray-900 border-l-2 border-purple-500' : ''}`}
            >
                <div className="font-medium text-sm text-gray-300">agent_sre_01</div>
                <div className="text-xs text-gray-500 mt-1">{new Date(MOCK_SESSION.startTime).toLocaleTimeString()}</div>
                <div className="mt-2 text-xs">
                    <span className="bg-green-900 text-green-300 px-1 rounded">COMPLETED</span>
                </div>
            </div>
            {/* Placeholder for more sessions */}
            <div className="p-3 text-xs text-gray-600 text-center">No other sessions</div>
        </div>
      </div>

      {/* Main Trace View */}
      <div className="flex-1 flex flex-col">
        {session ? (
            <>
                <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900">
                    <div>
                        <h1 className="text-lg font-semibold text-white">Execution Trace: {session.id}</h1>
                        <span className="text-xs text-gray-500">Agent: {session.agentId}</span>
                    </div>
                </div>
                
                <div className="flex-1 flex overflow-hidden">
                    {/* Timeline */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {session.traces.map((trace, index) => (
                            <div 
                                key={index} 
                                onClick={() => setSelectedTraceIndex(index)}
                                className={`relative pl-8 pb-4 border-l-2 cursor-pointer transition-all ${
                                    selectedTraceIndex === index ? 'border-purple-500' : 'border-gray-800 hover:border-gray-600'
                                }`}
                            >
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                                    selectedTraceIndex === index ? 'bg-purple-900 border-purple-500' : 'bg-gray-900 border-gray-600'
                                }`}></div>
                                
                                <div className={`p-4 rounded-lg border ${
                                    selectedTraceIndex === index ? 'bg-gray-900 border-purple-500 shadow-lg shadow-purple-900/20' : 'bg-gray-900 border-gray-800'
                                }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-sm text-blue-300">{trace.step}</span>
                                        <span className="text-xs font-mono text-gray-500">
                                            +{trace.timestamp - session.startTime}ms
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-400 line-clamp-2">
                                        {JSON.stringify(trace.details)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detail Panel */}
                    {selectedTraceIndex !== null && (
                        <div className="w-96 border-l border-gray-800 bg-black p-6 overflow-y-auto">
                            <h3 className="text-lg font-bold mb-4 text-white">Step Details</h3>
                            <div className="mb-4">
                                <label className="block text-xs text-gray-500 uppercase mb-1">Step Type</label>
                                <div className="text-blue-400 font-mono">{session.traces[selectedTraceIndex].step}</div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs text-gray-500 uppercase mb-1">Timestamp</label>
                                <div className="text-gray-300 font-mono">{new Date(session.traces[selectedTraceIndex].timestamp).toISOString()}</div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 uppercase mb-1">Data Payload</label>
                                <pre className="text-xs font-mono text-green-400 bg-gray-900 p-3 rounded overflow-x-auto">
                                    {JSON.stringify(session.traces[selectedTraceIndex].details, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a session to view the thought stream
            </div>
        )}
      </div>
    </div>
  );
}
