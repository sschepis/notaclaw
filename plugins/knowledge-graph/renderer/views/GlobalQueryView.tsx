import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Button } from '../ui/button';
import { useAlephStore } from '../../../../client/src/renderer/store/useAlephStore';

export const GlobalQueryView: React.FC = () => {
  const {
    memory: { queryResults },
    queryGlobalMemory
  } = useAlephStore();

  const [queryInput, setQueryInput] = useState('');

  const handleQuery = async () => {
    if (!queryInput.trim()) return;
    await queryGlobalMemory(queryInput);
  };

  const MotionDiv = motion.div as any;
  const SearchIcon = Search as any;

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-white/5">
        <div className="flex gap-2">
          <input value={queryInput} onChange={e => setQueryInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuery()}
            placeholder="Query global network memory..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
          <Button size="sm" onClick={handleQuery} className="h-7 px-2 bg-purple-600"><SearchIcon size={12} /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {queryResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">Enter a query to search global memory.</div>
        ) : (
          queryResults.map((frag: any, i: number) => (
            <MotionDiv key={frag.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="p-2.5 bg-white/5 rounded-lg border border-white/5">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-gray-500">{frag.sourceNode?.substring(0, 12) ?? 'local'}...</span>
                {frag.similarity !== undefined && (
                  <span className={`text-[10px] font-mono font-bold ${frag.similarity > 0.7 ? 'text-emerald-400' : 'text-amber-400'}`}>{(frag.similarity * 100).toFixed(0)}%</span>
                )}
              </div>
              <p className="text-xs text-gray-200">{frag.content}</p>
            </MotionDiv>
          ))
        )}
      </div>
    </div>
  );
};