import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Database } from 'lucide-react';
import { Button } from '../ui/button';
import { useAlephStore } from '../../../../client/src/renderer/store/useAlephStore';
import type { MemoryScope } from '../../../../client/src/shared/alephnet-types';

export const FieldListView: React.FC = () => {
  const {
    memory: { fields },
    createMemoryField, setActiveMemoryField
  } = useAlephStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState<MemoryScope>('user');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createMemoryField(newName, newScope, newDesc);
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
  };

  const MotionDiv = motion.div as any;
  const PlusIcon = Plus as any;
  const DatabaseIcon = Database as any;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end p-3 border-b border-white/5">
        <Button size="sm" onClick={() => setShowCreate(true)} className="h-6 text-[10px] bg-blue-600 px-2">
          <PlusIcon size={10} className="mr-1" /> New Field
        </Button>
      </div>

      {/* Create dialog */}
      <AnimatePresence>
        {showCreate && (
          <MotionDiv initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-white/5">
            <div className="p-3 space-y-2 bg-blue-900/10">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Field name" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" />
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" />
              <div className="flex gap-2">
                <select value={newScope} onChange={e => setNewScope(e.target.value as MemoryScope)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white">
                  <option value="user">User</option>
                  <option value="conversation">Conversation</option>
                  <option value="organization">Organization</option>
                  <option value="global">Global</option>
                </select>
                <Button size="sm" onClick={handleCreate} className="h-6 text-[10px] bg-blue-600">Create</Button>
                <Button size="sm" onClick={() => setShowCreate(false)} className="h-6 text-[10px] bg-gray-700">Cancel</Button>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {fields.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs"><DatabaseIcon size={24} className="mx-auto mb-2 opacity-40" /><p>No memory fields. Create one above.</p></div>
        ) : (
          fields.map((f: any, i: number) => (
            <MotionDiv key={f.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => setActiveMemoryField(f.id)}
              className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 cursor-pointer transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{f.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  f.scope === 'global' ? 'bg-purple-500/10 text-purple-400' :
                  f.scope === 'user' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-gray-500/10 text-gray-400'
                }`}>{f.scope}</span>
              </div>
              <p className="text-[10px] text-gray-500">{f.description || 'No description'}</p>
              <div className="flex gap-3 mt-1.5 text-[9px] text-gray-600">
                <span>{f.contributionCount} fragments</span>
                <span>entropy: {f.entropy.toFixed(2)}</span>
                <span>{f.locked ? '🔒' : '🔓'}</span>
              </div>
            </MotionDiv>
          ))
        )}
      </div>
    </div>
  );
};