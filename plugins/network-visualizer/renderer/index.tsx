import React from 'react';

const NetworkGraph = ({ context }: { context: any }) => {
  return (
    <div className="h-full bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-xl mb-4 font-mono">Network Topology</h1>
      <div className="w-[800px] h-[600px] border border-green-500/30 rounded bg-green-900/10 flex items-center justify-center relative overflow-hidden">
        {/* Mock Visualization */}
        <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 left-1/2 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
        <div className="absolute top-2/3 right-1/4 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
            <line x1="25%" y1="50%" x2="50%" y2="33%" stroke="white" strokeWidth="1" />
            <line x1="50%" y1="33%" x2="75%" y2="66%" stroke="white" strokeWidth="1" />
        </svg>
        <div className="absolute bottom-4 left-4 text-xs font-mono text-green-400">
            Nodes: 3 | Links: 2 | Latency: 45ms
        </div>
      </div>
    </div>
  );
};

export const activate = (context: any) => {
  console.log('[NetworkViz] Renderer Activated');
  
  context.registerComponent('sidebar:view:network-viz', {
    id: 'network-viz-panel',
    component: () => <NetworkGraph context={context} />
  });
};
