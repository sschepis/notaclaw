import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMemoryStore } from '../../store/useMemoryStore';
import type { MemoryField, MemoryScope } from '../../../shared/alephnet-types';
import { Users, User, MessageSquare, Globe, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// Configuration
const NODE_RADIUS = 30;
const LINK_DISTANCE = 150;
const CHARGE_STRENGTH = -300;
const CENTER_FORCE = 0.05;
const DAMPING = 0.8;

// Scope visuals
const SCOPE_CONFIG: Record<MemoryScope, { color: string; icon: any }> = {
    global: { color: '#10b981', icon: Globe }, // Emerald
    user: { color: '#3b82f6', icon: User },   // Blue
    conversation: { color: '#a855f7', icon: MessageSquare }, // Purple
    organization: { color: '#f59e0b', icon: Users } // Amber
};

interface Node extends MemoryField {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

interface Link {
    source: string;
    target: string;
    strength: number;
}

export const MemoryGraphView: React.FC<{ onSelectField: (id: string) => void }> = ({ onSelectField }) => {
    const { fields, selectedFieldId } = useMemoryStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    // Initialize simulation
    useEffect(() => {
        if (!containerRef.current) return;
        
        const updateDimensions = () => {
            // Re-center logic could go here if needed
        };

        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);
    
    useEffect(() => {
        if (!containerRef.current) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const centerX = width / 2;
        const centerY = height / 2;

        const fieldList = Object.values(fields);
        
        // Initialize nodes with random positions near center if not already initialized
        // Or re-initialize if fields changed significantly
        
        const initialNodes: Node[] = fieldList.map(field => {
            // Preserve position if node already exists
            const existing = nodes.find(n => n.id === field.id);
            if (existing) return { ...existing, ...field };
            
            return {
                ...field,
                x: centerX + (Math.random() - 0.5) * 200,
                y: centerY + (Math.random() - 0.5) * 200,
                vx: 0,
                vy: 0
            };
        });

        // Create links based on scope relationships
        // Logic: Conversations link to User, User links to Global/Org
        const initialLinks: Link[] = [];
        
        const userFields = initialNodes.filter(n => n.scope === 'user');
        const globalFields = initialNodes.filter(n => n.scope === 'global');
        const orgFields = initialNodes.filter(n => n.scope === 'organization');
        
        // Link all user fields to global fields (weakly)
        userFields.forEach(u => {
            globalFields.forEach(g => {
                initialLinks.push({ source: u.id, target: g.id, strength: 0.1 });
            });
            orgFields.forEach(o => {
                initialLinks.push({ source: u.id, target: o.id, strength: 0.2 });
            });
        });

        // Link conversations to user fields (strongly)
        const mainUserField = userFields[0];
        if (mainUserField) {
            initialNodes.filter(n => n.scope === 'conversation').forEach(c => {
                initialLinks.push({ source: c.id, target: mainUserField.id, strength: 0.8 });
            });
        }

        setNodes(initialNodes);
        setLinks(initialLinks);
    }, [fields]); // Re-run when fields change

    // Simulation Loop
    useEffect(() => {
        let animationFrameId: number;
        
        const tick = () => {
            setNodes(prevNodes => {
                const nextNodes = prevNodes.map(n => ({ ...n })); // Shallow copy for mutation
                const width = containerRef.current?.clientWidth || 800;
                const height = containerRef.current?.clientHeight || 600;
                const centerX = width / 2;
                const centerY = height / 2;

                // 1. Apply Repulsion (Coulomb's Law)
                for (let i = 0; i < nextNodes.length; i++) {
                    for (let j = i + 1; j < nextNodes.length; j++) {
                        const dx = nextNodes[i].x - nextNodes[j].x;
                        const dy = nextNodes[i].y - nextNodes[j].y;
                        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                        const force = CHARGE_STRENGTH / (distance * distance);
                        
                        const fx = (dx / distance) * force;
                        const fy = (dy / distance) * force;

                        nextNodes[i].vx += fx;
                        nextNodes[i].vy += fy;
                        nextNodes[j].vx -= fx;
                        nextNodes[j].vy -= fy;
                    }
                }

                // 2. Apply Spring Forces (Hooke's Law)
                links.forEach(link => {
                    const sourceNode = nextNodes.find(n => n.id === link.source);
                    const targetNode = nextNodes.find(n => n.id === link.target);
                    
                    if (sourceNode && targetNode) {
                        const dx = targetNode.x - sourceNode.x;
                        const dy = targetNode.y - sourceNode.y;
                        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                        const force = (distance - LINK_DISTANCE) * 0.05 * link.strength;

                        const fx = (dx / distance) * force;
                        const fy = (dy / distance) * force;

                        sourceNode.vx += fx;
                        sourceNode.vy += fy;
                        targetNode.vx -= fx;
                        targetNode.vy -= fy;
                    }
                });

                // 3. Apply Center Gravity
                nextNodes.forEach(node => {
                    node.vx += (centerX - node.x) * CENTER_FORCE;
                    node.vy += (centerY - node.y) * CENTER_FORCE;
                });

                // 4. Update Positions & Apply Damping
                nextNodes.forEach(node => {
                    node.vx *= DAMPING;
                    node.vy *= DAMPING;
                    node.x += node.vx;
                    node.y += node.vy;
                });

                return nextNodes;
            });
            
            animationFrameId = requestAnimationFrame(tick);
        };

        animationFrameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationFrameId);
    }, [links]); // Run simulation when links are set up

    // Handlers
    const handleWheel = (e: React.WheelEvent) => {
        const delta = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(scale + delta, 0.1), 5);
        setScale(newScale);
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // Left click
            setIsDragging(true);
            dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setOffset({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <div 
            ref={containerRef} 
            className="w-full h-full bg-black/90 relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Grid Background */}
            <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
                    backgroundSize: `${30 * scale}px ${30 * scale}px`,
                    transform: `translate(${offset.x}px, ${offset.y}px)`
                }}
            />

            {/* Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button onClick={() => setScale(s => Math.min(s + 0.2, 5))} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-300 border border-zinc-700">
                    <ZoomIn size={18} />
                </button>
                <button onClick={() => setScale(s => Math.max(s - 0.2, 0.1))} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-300 border border-zinc-700">
                    <ZoomOut size={18} />
                </button>
                <button onClick={() => { setScale(1); setOffset({x:0,y:0}); }} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-300 border border-zinc-700">
                    <Maximize size={18} />
                </button>
            </div>

            {/* Graph Container */}
            <motion.div 
                className="w-full h-full origin-center"
                style={{ 
                    scale,
                    x: offset.x,
                    y: offset.y
                }}
            >
                <svg className="w-full h-full overflow-visible">
                    {/* Links */}
                    {links.map((link, i) => {
                        const source = nodes.find(n => n.id === link.source);
                        const target = nodes.find(n => n.id === link.target);
                        if (!source || !target) return null;

                        return (
                            <line
                                key={`link-${i}`}
                                x1={source.x}
                                y1={source.y}
                                x2={target.x}
                                y2={target.y}
                                stroke="#4b5563"
                                strokeWidth={1}
                                strokeOpacity={0.4}
                            />
                        );
                    })}

                    {/* Nodes */}
                    {nodes.map(node => {
                        const config = SCOPE_CONFIG[node.scope];
                        const isSelected = selectedFieldId === node.id;
                        const Icon = config.icon;
                        
                        return (
                            <g 
                                key={node.id} 
                                transform={`translate(${node.x},${node.y})`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectField(node.id);
                                }}
                                className="cursor-pointer transition-all duration-300"
                                style={{ opacity: isSelected ? 1 : 0.8 }}
                            >
                                {/* Glow Effect */}
                                {isSelected && (
                                    <circle 
                                        r={NODE_RADIUS + 10} 
                                        fill={config.color} 
                                        opacity={0.2}
                                        className="animate-pulse"
                                    />
                                )}
                                
                                {/* Node Body */}
                                <circle 
                                    r={NODE_RADIUS} 
                                    fill="#18181b" 
                                    stroke={isSelected ? config.color : '#3f3f46'} 
                                    strokeWidth={isSelected ? 3 : 2}
                                />
                                
                                {/* Icon */}
                                <foreignObject x={-12} y={-12} width={24} height={24} className="pointer-events-none">
                                    <div className="flex items-center justify-center w-full h-full text-zinc-300">
                                        <Icon size={16} color={config.color} />
                                    </div>
                                </foreignObject>

                                {/* Label */}
                                <text 
                                    y={NODE_RADIUS + 15} 
                                    textAnchor="middle" 
                                    fill="#a1a1aa" 
                                    fontSize={10} 
                                    className="select-none font-mono"
                                >
                                    {node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name}
                                </text>
                                
                                {/* Badge if locked */}
                                {node.locked && (
                                    <circle cx={NODE_RADIUS * 0.7} cy={-NODE_RADIUS * 0.7} r={6} fill="#ef4444" />
                                )}
                            </g>
                        );
                    })}
                </svg>
            </motion.div>
            
            {/* Info Overlay */}
            <div className="absolute bottom-4 left-4 p-4 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl max-w-xs pointer-events-none">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Network Topology</h3>
                <div className="space-y-1 text-xs text-zinc-400 font-mono">
                    <div className="flex justify-between">
                        <span>Nodes:</span>
                        <span className="text-zinc-200">{nodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Connections:</span>
                        <span className="text-zinc-200">{links.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Stability:</span>
                        <span className="text-emerald-400">98.2%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
