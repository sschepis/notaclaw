import React, { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';

const NetworkGraph = ({ context }: { context: any }) => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  
  // Assuming store might have network info, otherwise use mock
  // const { network } = context.useAppStore(); 

  useEffect(() => {
    // Mock network data generation
    // In reality this would come from the Gun.js mesh state
    const width = 800;
    const height = 600;
    
    const mockNodes = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      type: i === 0 ? 'me' : Math.random() > 0.9 ? 'archon' : 'peer',
      velocity: { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 }
    }));
    
    const mockLinks: any[] = [];
    mockNodes.forEach((node, i) => {
      if (i > 0) {
        // Connect to 1-3 random other nodes
        const numLinks = Math.floor(Math.random() * 3) + 1;
        for(let j=0; j<numLinks; j++) {
            const target = Math.floor(Math.random() * mockNodes.length);
            if (target !== i) {
                mockLinks.push({ source: i, target });
            }
        }
      }
    });

    setNodes(mockNodes);
    setLinks(mockLinks);

    // Simple animation loop
    const interval = setInterval(() => {
        setNodes(prevNodes => prevNodes.map(node => {
            let newX = node.x + node.velocity.x;
            let newY = node.y + node.velocity.y;
            
            // Bounce off walls
            if (newX < 0 || newX > width) node.velocity.x *= -1;
            if (newY < 0 || newY > height) node.velocity.y *= -1;
            
            return { ...node, x: newX, y: newY };
        }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-gray-950 relative overflow-hidden flex flex-col">
      <div className="absolute top-4 left-4 z-10 bg-gray-900/80 p-4 rounded-lg backdrop-blur border border-gray-800">
        <h2 className="text-white font-bold flex items-center space-x-2">
            <span className="animate-pulse w-2 h-2 rounded-full bg-green-500"></span>
            <span>DSN Topology</span>
        </h2>
        <div className="flex items-center space-x-2 mt-4">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400"></span>
            <span className="text-xs text-gray-400">Local Node (You)</span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
            <span className="w-3 h-3 rounded-full bg-purple-500 border border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></span>
            <span className="text-xs text-gray-400">Archon Node</span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
            <span className="w-3 h-3 rounded-full bg-gray-600 border border-gray-500"></span>
            <span className="text-xs text-gray-400">Standard Peer</span>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-800 space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-gray-500">Latency</span>
                <span className="text-green-400 font-mono">42ms</span>
            </div>
            <div className="flex justify-between text-xs">
                <span className="text-gray-500">Peers</span>
                <span className="text-blue-400 font-mono">{nodes.length}</span>
            </div>
            <div className="flex justify-between text-xs">
                <span className="text-gray-500">Sync Status</span>
                <span className="text-purple-400 font-mono">99.9%</span>
            </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 800 600">
            <defs>
                <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" style={{stopColor:'rgb(59, 130, 246)', stopOpacity:0.5}} />
                    <stop offset="100%" style={{stopColor:'rgb(0,0,0)', stopOpacity:0}} />
                </radialGradient>
            </defs>
            {links.map((link, i) => {
                const source = nodes[link.source];
                const target = nodes[link.target];
                if (!source || !target) return null;
                return (
                    <line 
                        key={i}
                        x1={source.x} y1={source.y}
                        x2={target.x} y2={target.y}
                        stroke="rgba(100, 116, 139, 0.2)"
                        strokeWidth="1"
                    />
                );
            })}
            {nodes.map((node) => (
                <g key={node.id}> 
                    <circle 
                        cx={node.x} cy={node.y}
                        r={node.type === 'me' ? 8 : node.type === 'archon' ? 6 : 3}
                        fill={node.type === 'me' ? '#3B82F6' : node.type === 'archon' ? '#A855F7' : '#475569'}
                        className="transition-all duration-300"
                    />
                    {node.type === 'me' && (
                         <circle cx={node.x} cy={node.y} r="20" fill="url(#grad1)" />
                    )}
                </g>
            ))}
        </svg>
      </div>
    </div>
  );
};

export const activate = (context: any) => {
  console.log('[Network Visualizer] Renderer activated');
  const { ui } = context;

  // Register Navigation
  const cleanupNav = ui.registerNavigation({
    id: 'network-visualizer-nav',
    label: 'Network',
    icon: Share2,
    view: {
        id: 'network-visualizer-view',
        name: 'Network Visualizer',
        icon: Share2,
        component: () => <NetworkGraph context={context} />
    },
    order: 800
  });

  context._cleanups = [cleanupNav];
};

export const deactivate = (context: any) => {
    console.log('[Network Visualizer] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};

