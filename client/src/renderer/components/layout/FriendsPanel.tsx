import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { motion } from 'framer-motion';

export const FriendsPanel: React.FC = () => {
  const { activeAgents, network } = useAppStore();

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Friends & Nodes</h2>
        <div className="text-xs font-mono text-muted-foreground">
          {network.peers} Connected Peers
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {activeAgents.length === 0 ? (
           <div className="text-center py-10 text-muted-foreground text-sm">
             No active friends found.
           </div>
        ) : (
          activeAgents.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center space-x-4 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-border">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {agent.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-card ${
                    agent.status === 'busy' ? 'bg-amber-500' : 
                    agent.status === 'idle' ? 'bg-emerald-500' : 'bg-muted-foreground'
                }`} />
              </div>
              
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">{agent.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">{agent.type} • {agent.status}</p>
              </div>
              
              <button className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors">
                Message
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
