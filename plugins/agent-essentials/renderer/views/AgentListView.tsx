import React, { useState } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { Bot, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { useAlephStore } from 'alephnet';

const MotionDiv = motion.div as React.FC<HTMLMotionProps<'div'> & { className?: string; children?: React.ReactNode; onClick?: () => void }>;

export const AgentListView: React.FC = () => {
  const {
    agents: { agents },
    createAgent, setActiveAgent
  } = useAlephStore();
  
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState('');

  const handleCreateAgent = async () => {
    if (!newName.trim()) return;
    await createAgent(newName, newTemplate || undefined);
    setNewName('');
    setNewTemplate('');
    setShowCreate(false);
  };

  return (
    <>
      <div className="flex justify-end mb-2">
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="h-6 text-[10px] bg-blue-600 px-2"><Plus size={10} className="mr-1" /> New Agent</Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <MotionDiv initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 bg-blue-900/10 rounded-lg border border-blue-500/10 space-y-2 mb-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Agent name" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" />
              <input value={newTemplate} onChange={e => setNewTemplate(e.target.value)} placeholder="Template (optional)" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateAgent} disabled={!newName.trim()} className="h-6 text-[10px] bg-blue-600">Create</Button>
                <Button size="sm" onClick={() => setShowCreate(false)} className="h-6 text-[10px] bg-gray-700">Cancel</Button>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {agents.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-xs"><Bot size={24} className="mx-auto mb-2 opacity-40" /><p>No agents created yet.</p></div>
      ) : (
        agents.map((agent: any, i: number) => (
          <MotionDiv key={agent.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            onClick={() => setActiveAgent(agent.id)}
            className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 cursor-pointer transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Bot size={14} className={agent.status === 'active' ? 'text-emerald-400' : agent.status === 'dismissed' ? 'text-amber-400' : 'text-gray-500'} />
              <span className="text-sm font-medium text-white">{agent.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ml-auto capitalize ${
                agent.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                agent.status === 'dismissed' ? 'bg-amber-500/10 text-amber-400' :
                'bg-gray-500/10 text-gray-400'
              }`}>{agent.status}</span>
            </div>
            <div className="flex gap-2 text-[9px] text-gray-500">
              {agent.templateId && <span>template: {agent.templateId}</span>}
              <span>{agent.beliefs?.length || 0} beliefs</span>
            </div>
          </MotionDiv>
        ))
      )}
    </>
  );
};