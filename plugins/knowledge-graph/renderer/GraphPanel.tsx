import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Search, Plus, Filter, ZoomIn, ZoomOut, Move, Info, X } from 'lucide-react';

// Reusing basic UI components
const Icon = ({ d, className }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const Button = ({ children, onClick, className, disabled, size, title }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
      size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 py-2 text-sm'
    } ${className}`}
  >
    {children}
  </button>
);

export const GraphPanel = ({ context }: { context: any }) => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  
  const svgRef = useRef<SVGSVGElement>(null);

  // Load initial graph
  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const data = await context.ipc.invoke('kg:get-graph');
      if (data) {
        // Initialize positions randomly if not present
        const initializedNodes = data.entities.map((n: any) => ({
          ...n,
          x: n.x || Math.random() * 800,
          y: n.y || Math.random() * 600,
          vx: 0,
          vy: 0
        }));
        setNodes(initializedNodes);
        setLinks(data.relations);
      }
    } catch (e) {
      console.error('Failed to load graph:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return loadGraph();
    
    setLoading(true);
    try {
      const results = await context.ipc.invoke('kg:search-entities', { query: searchQuery });
      setNodes(results.map((n: any) => ({
        ...n,
        x: Math.random() * 800,
        y: Math.random() * 600
      })));
      // For search results, we might not have links, or we need to fetch them
      setLinks([]); 
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = async (node: any) => {
    setSelectedNode(node);
    // Fetch related
    try {
      const related = await context.ipc.invoke('kg:get-related', { entityId: node.id, depth: 1 });
      if (related) {
        // Merge related nodes/links
        setNodes(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNodes = related.entities.filter((n: any) => !existingIds.has(n.id))
            .map((n: any) => ({ ...n, x: Math.random() * 800, y: Math.random() * 600 }));
          return [...prev, ...newNodes];
        });
        setLinks(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const newLinks = related.relations.filter((l: any) => !existingIds.has(l.id));
          return [...prev, ...newLinks];
        });
      }
    } catch (e) {
      console.error('Failed to get related:', e);
    }
  };

  // Simple Force Simulation Effect
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulation = setInterval(() => {
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        const width = 800;
        const height = 600;
        const repulsion = 500;
        const springLength = 100;
        const k = 0.05; // Spring constant
        const c = 2000; // Repulsion constant

        // Repulsion
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[i].x - newNodes[j].x;
            const dy = newNodes[i].y - newNodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = c / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            newNodes[i].vx += fx;
            newNodes[i].vy += fy;
            newNodes[j].vx -= fx;
            newNodes[j].vy -= fy;
          }
        }

        // Attraction (Links)
        links.forEach(link => {
          const source = newNodes.find(n => n.id === link.subject);
          const target = newNodes.find(n => n.id === link.object);
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = k * (dist - springLength);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            source.vx += fx;
            source.vy += fy;
            target.vx -= fx;
            target.vy -= fy;
          }
        });

        // Center force & Velocity Damping
        newNodes.forEach(node => {
          const dx = width / 2 - node.x;
          const dy = height / 2 - node.y;
          node.vx += dx * 0.005;
          node.vy += dy * 0.005;

          node.vx *= 0.9;
          node.vy *= 0.9;
          node.x += node.vx;
          node.y += node.vy;
        });

        return newNodes;
      });
    }, 50);

    return () => clearInterval(simulation);
  }, [nodes.length, links.length]);

  // Pan/Zoom Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(t => ({ ...t, k: t.k * scale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(t => ({
        ...t,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const uniqueTypes = useMemo(() => {
    const types = new Set(nodes.map(n => n.type));
    return ['all', ...Array.from(types)];
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return nodes;
    return nodes.filter(n => n.type === filterType);
  }, [nodes, filterType]);

  return (
    <div className="h-full flex flex-col text-white bg-gray-900">
      {/* Toolbar */}
      <div className="p-3 border-b border-white/10 flex items-center gap-2 bg-gray-800/50">
        <div className="flex-1 flex items-center gap-2 bg-black/20 rounded-lg px-3 py-1.5 border border-white/5">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search entities..."
            className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none placeholder-gray-500"
          />
        </div>
        <div className="flex items-center gap-2">
           <select 
             value={filterType} 
             onChange={e => setFilterType(e.target.value)}
             className="bg-black/20 border border-white/5 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
           >
             {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
           </select>
          <Button size="sm" onClick={() => setTransform(t => ({ ...t, k: t.k * 1.2 }))} className="bg-white/5 hover:bg-white/10"><ZoomIn className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => setTransform(t => ({ ...t, k: t.k * 0.8 }))} className="bg-white/5 hover:bg-white/10"><ZoomOut className="w-4 h-4" /></Button>
          <Button size="sm" onClick={loadGraph} className="bg-blue-600 hover:bg-blue-500">Reset</Button>
        </div>
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative bg-black/40" 
             onWheel={handleWheel}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
        >
          {loading && <div className="absolute inset-0 flex items-center justify-center text-gray-400">Loading graph...</div>}
          
          <svg ref={svgRef} className="w-full h-full cursor-move">
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
              {/* Links */}
              {links.map(link => {
                const source = nodes.find(n => n.id === link.subject);
                const target = nodes.find(n => n.id === link.object);
                if (!source || !target) return null;
                return (
                  <line 
                    key={link.id}
                    x1={source.x} y1={source.y}
                    x2={target.x} y2={target.y}
                    stroke="#ffffff33"
                    strokeWidth="1"
                  />
                );
              })}
              
              {/* Nodes */}
              {filteredNodes.map(node => (
                <g 
                  key={node.id} 
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <circle 
                    r={node.id === selectedNode?.id ? 8 : 5} 
                    fill={node.type === 'concept' ? '#8b5cf6' : '#3b82f6'} 
                    stroke={node.id === selectedNode?.id ? '#fff' : 'none'}
                    strokeWidth={2}
                  />
                  <text 
                    y={15} 
                    textAnchor="middle" 
                    fill="#fff" 
                    fontSize="8px" 
                    className="pointer-events-none select-none opacity-70"
                  >
                    {node.name}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Details Panel */}
        {selectedNode && (
          <div className="w-64 border-l border-white/10 bg-gray-900/95 p-4 overflow-y-auto absolute right-0 top-0 bottom-0 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-white">{selectedNode.name}</h3>
              <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Type</label>
                <div className="text-sm text-blue-400 bg-blue-400/10 px-2 py-1 rounded inline-block mt-1">{selectedNode.type}</div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">ID</label>
                <div className="text-xs text-gray-400 font-mono mt-1 break-all">{selectedNode.id}</div>
              </div>

              {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Properties</label>
                  <div className="mt-1 space-y-1">
                    {Object.entries(selectedNode.properties).map(([k, v]: any) => (
                      <div key={k} className="text-xs">
                        <span className="text-gray-400">{k}:</span> <span className="text-gray-200">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/10">
                <Button size="sm" className="w-full bg-white/5 hover:bg-white/10 mb-2" onClick={() => handleNodeClick(selectedNode)}>
                  Expand Relations
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
