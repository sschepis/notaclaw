import React, { useState, useEffect } from 'react';

// Types
interface Step {
  id: string;
  type: 'log' | 'tool' | 'agent';
  params: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  steps: Step[];
}

export default function WorkflowWeaver() {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 'demo-flow',
      name: 'Demo Weather Summary',
      steps: [
        { id: 'step1', type: 'log', params: { message: 'Starting demo workflow' } },
        { id: 'step2', type: 'tool', params: { toolName: 'getWeather', args: { city: 'Berlin' } } },
        { id: 'step3', type: 'agent', params: { prompt: 'Summarize the weather: $step2.toolOutput' } },
        { id: 'step4', type: 'log', params: { message: 'Workflow complete' } }
      ]
    }
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const selectedWorkflow = workflows.find(w => w.id === selectedId);

  const handleRun = async () => {
    if (!selectedWorkflow) return;
    
    setIsRunning(true);
    setLogs(prev => [...prev, `[System] Starting workflow: ${selectedWorkflow.name}...`]);

    // Simulate execution delay and steps
    try {
        for (const step of selectedWorkflow.steps) {
            await new Promise(resolve => setTimeout(resolve, 800)); // Fake delay
            setLogs(prev => [...prev, `[Engine] Executing step ${step.id} (${step.type})...`]);
            
            if (step.type === 'tool') {
                setLogs(prev => [...prev, `  > Calling tool: ${step.params.toolName}`]);
            } else if (step.type === 'agent') {
                setLogs(prev => [...prev, `  > Agent thinking...`]);
            }
        }
        setLogs(prev => [...prev, `[System] Workflow completed successfully.`]);
    } catch (err) {
        setLogs(prev => [...prev, `[Error] Execution failed.`]);
    } finally {
        setIsRunning(false);
    }
  };

  return (
    <div className="flex h-full bg-gray-900 text-white font-sans">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-700 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-blue-400">Workflows</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded mb-4">
            + New Workflow
        </button>
        <div className="flex-1 overflow-y-auto space-y-2">
            {workflows.map(w => (
                <div 
                    key={w.id}
                    onClick={() => setSelectedId(w.id)}
                    className={`p-3 rounded cursor-pointer transition-colors ${selectedId === w.id ? 'bg-gray-700 border-l-4 border-blue-500' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-gray-400">{w.steps.length} steps</div>
                </div>
            ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedWorkflow ? (
            <>
                {/* Header */}
                <div className="h-16 border-b border-gray-700 flex items-center justify-between px-6 bg-gray-800">
                    <h1 className="text-xl font-semibold">{selectedWorkflow.name}</h1>
                    <div className="flex gap-2">
                        <button className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded">Edit</button>
                        <button 
                            onClick={handleRun}
                            disabled={isRunning}
                            className={`px-4 py-2 rounded flex items-center gap-2 ${isRunning ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                            {isRunning ? 'Running...' : '▶ Run'}
                        </button>
                    </div>
                </div>

                {/* Workflow Canvas (Visual Representation) */}
                <div className="flex-1 p-8 overflow-y-auto bg-gray-900 relative">
                    <div className="max-w-3xl mx-auto space-y-8 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-8 top-4 bottom-4 w-1 bg-gray-700 -z-10"></div>

                        {selectedWorkflow.steps.map((step, index) => (
                            <div key={step.id} className="flex gap-4 items-start">
                                {/* Step Number / Icon */}
                                <div className="w-16 h-16 rounded-full bg-gray-800 border-4 border-gray-900 flex items-center justify-center z-10 shadow-lg text-lg font-bold text-gray-400">
                                    {index + 1}
                                </div>
                                
                                {/* Step Card */}
                                <div className="flex-1 bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:border-blue-500 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                                            step.type === 'trigger' ? 'bg-purple-900 text-purple-200' :
                                            step.type === 'agent' ? 'bg-green-900 text-green-200' :
                                            step.type === 'tool' ? 'bg-orange-900 text-orange-200' :
                                            'bg-gray-700 text-gray-300'
                                        }`}>
                                            {step.type}
                                        </span>
                                        <span className="text-xs text-gray-500">ID: {step.id}</span>
                                    </div>
                                    <div className="text-sm font-mono bg-black p-2 rounded text-gray-300 overflow-x-auto">
                                        {JSON.stringify(step.params, null, 2)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Execution Console */}
                <div className="h-64 border-t border-gray-700 bg-black p-4 font-mono text-sm overflow-y-auto">
                    <div className="text-gray-500 mb-2 uppercase text-xs tracking-wider">Execution Log</div>
                    {logs.length === 0 && <span className="text-gray-600 italic">Ready to execute.</span>}
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1">
                            <span className="text-green-500 opacity-50 mr-2">{new Date().toLocaleTimeString()}</span>
                            {log}
                        </div>
                    ))}
                </div>
            </>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a workflow to view details
            </div>
        )}
      </div>
    </div>
  );
}
