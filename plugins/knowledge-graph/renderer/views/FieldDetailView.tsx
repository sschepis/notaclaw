import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Activity, Download, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { useAlephStore } from '../../../../client/src/renderer/store/useAlephStore';

interface FieldDetailViewProps {
  fieldId: string;
  onBack: () => void;
}

export const FieldDetailView: React.FC<FieldDetailViewProps> = ({ fieldId, onBack }) => {
  const {
    memory: { fields, queryResults, activeFieldEntropy },
    storeMemory, queryMemoryField, deleteMemoryField
  } = useAlephStore();

  const [storeContent, setStoreContent] = useState('');
  const [storeSignificance, setStoreSignificance] = useState(0.5);
  const [queryInput, setQueryInput] = useState('');
  const [queryThreshold, setQueryThreshold] = useState(0.3);

  const field = fields.find((f: any) => f.id === fieldId);
  if (!field) return null;

  const handleStore = async () => {
    if (!storeContent.trim()) return;
    await storeMemory(fieldId, storeContent.trim(), storeSignificance);
    setStoreContent('');
  };

  const handleQuery = async () => {
    if (!queryInput.trim()) return;
    await queryMemoryField(fieldId, queryInput, queryThreshold);
  };
  
  const MotionDiv = motion.div as any;
  const ArrowLeftIcon = ArrowLeft as any;
  const Trash2Icon = Trash2 as any;
  const ActivityIcon = Activity as any;
  const DownloadIcon = Download as any;
  const SearchIcon = Search as any;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/5">
        <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-lg"><ArrowLeftIcon size={14} className="text-gray-400" /></button>
        <div className="flex-1">
          <span className="text-sm font-medium text-white">{field.name}</span>
          <p className="text-[10px] text-gray-500">{field.scope} • {field.contributionCount} fragments</p>
        </div>
        <Button size="sm" onClick={() => deleteMemoryField(fieldId)} className="h-6 text-[10px] bg-red-600/30 text-red-400"><Trash2Icon size={10} /></Button>
      </div>

      {/* Entropy stats */}
      {activeFieldEntropy && (
        <div className="px-3 py-2 border-b border-white/5 bg-purple-900/5 flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1"><ActivityIcon size={10} className="text-purple-400" /><span className="text-gray-400">Entropy:</span> <span className="text-purple-400">{activeFieldEntropy.shannon.toFixed(3)}</span></div>
          <div><span className="text-gray-400">Trend:</span> <span className={activeFieldEntropy.trend === 'stable' ? 'text-emerald-400' : 'text-amber-400'}>{activeFieldEntropy.trend}</span></div>
          <div><span className="text-gray-400">Coherence:</span> <span className="text-blue-400">{activeFieldEntropy.coherence.toFixed(2)}</span></div>
        </div>
      )}

      {/* Store knowledge */}
      <div className="p-3 border-b border-white/5 space-y-2">
        <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Store Knowledge</h4>
        <textarea value={storeContent} onChange={e => setStoreContent(e.target.value)} placeholder="Enter knowledge to store..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 h-16 resize-none focus:outline-none focus:border-blue-500/50" />
        <div className="flex items-center gap-3">
          <label className="text-[10px] text-gray-500">Significance: {storeSignificance.toFixed(1)}</label>
          <input type="range" min="0" max="1" step="0.1" value={storeSignificance} onChange={e => setStoreSignificance(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-blue-500" />
          <Button size="sm" onClick={handleStore} disabled={!storeContent.trim()} className="h-6 text-[10px] bg-blue-600 px-2">
            <DownloadIcon size={10} className="mr-1" /> Store
          </Button>
        </div>
      </div>

      {/* Query */}
      <div className="p-3 border-b border-white/5 space-y-2">
        <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Query Field</h4>
        <div className="flex gap-2">
          <input value={queryInput} onChange={e => setQueryInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuery()}
            placeholder="Semantic search..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
          <Button size="sm" onClick={handleQuery} className="h-7 px-2 bg-purple-600"><SearchIcon size={12} /></Button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <label>Threshold: {queryThreshold.toFixed(1)}</label>
          <input type="range" min="0" max="1" step="0.1" value={queryThreshold} onChange={e => setQueryThreshold(parseFloat(e.target.value))} className="flex-1 h-1 accent-purple-500" />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {queryResults.length === 0 ? (
          <div className="text-center py-6 text-gray-600 text-xs">Query this field to see results.</div>
        ) : (
          queryResults.map((frag: any, i: number) => (
            <MotionDiv key={frag.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="p-2.5 bg-white/5 rounded-lg border border-white/5">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-gray-500">{frag.id.substring(0, 12)}...</span>
                {frag.similarity !== undefined && (
                  <span className={`text-[10px] font-mono font-bold ${frag.similarity > 0.7 ? 'text-emerald-400' : frag.similarity > 0.4 ? 'text-amber-400' : 'text-gray-500'}`}>
                    {(frag.similarity * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-200">{frag.content}</p>
              <div className="flex gap-2 mt-1 text-[9px] text-gray-600">
                <span>sig: {frag.significance.toFixed(1)}</span>
                {frag.sourceNode && <span>src: {frag.sourceNode.substring(0, 8)}</span>}
              </div>
            </MotionDiv>
          ))
        )}
      </div>
    </div>
  );
};