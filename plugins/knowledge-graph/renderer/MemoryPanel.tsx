import React, { useEffect, useState } from 'react';
import { GraphPanel } from './GraphPanel';

// Icons
const Icon = ({ d, className }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const Search = ({ className }: any) => <Icon className={className} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />;
const Plus = ({ className }: any) => <Icon className={className} d="M12 4v16m8-8H4" />;
const Database = ({ className }: any) => <Icon className={className} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />;
const ArrowLeft = ({ className }: any) => <Icon className={className} d="M10 19l-7-7m0 0l7-7m-7 7h18" />;
const Trash2 = ({ className }: any) => <Icon className={className} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />;
const Activity = ({ className }: any) => <Icon className={className} d="M13 10V3L4 14h7v7l9-11h-7z" />;
const Download = ({ className }: any) => <Icon className={className} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />;

// Button
const Button = ({ children, onClick, className, disabled, size }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
      size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 py-2 text-sm'
    } ${className}`}
  >
    {children}
  </button>
);

export const MemoryPanel = ({ context }: { context: any }) => {
  const { useAlephStore } = context;
  const {
    memory: { activeFieldId, fields, queryResults, activeFieldEntropy },
    loadMemoryFields, setActiveMemoryField, createMemoryField,
    storeMemory, queryMemoryField, deleteMemoryField, queryGlobalMemory
  } = useAlephStore();

  const [tab, setTab] = useState<'fields' | 'global' | 'graph'>('fields');
  
  // Create Field State
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScope, setNewScope] = useState('user');
  const [newDesc, setNewDesc] = useState('');

  // Field Detail State
  const [storeContent, setStoreContent] = useState('');
  const [storeSignificance, setStoreSignificance] = useState(0.5);
  const [queryInput, setQueryInput] = useState('');
  const [queryThreshold, setQueryThreshold] = useState(0.3);
  const [globalQueryInput, setGlobalQueryInput] = useState('');

  useEffect(() => { loadMemoryFields(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createMemoryField(newName, newScope, newDesc);
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
  };

  const handleStore = async (fieldId: string) => {
    if (!storeContent.trim()) return;
    await storeMemory(fieldId, storeContent.trim(), storeSignificance);
    setStoreContent('');
  };

  const handleQuery = async (fieldId: string) => {
    if (!queryInput.trim()) return;
    await queryMemoryField(fieldId, queryInput, queryThreshold);
  };

  const handleGlobalQuery = async () => {
    if (!globalQueryInput.trim()) return;
    await queryGlobalMemory(globalQueryInput);
  };

  // Field Detail View
  if (activeFieldId) {
    const field = fields.find((f: any) => f.id === activeFieldId);
    if (!field) return <div>Field not found</div>;

    return (
      <div className="h-full flex flex-col text-white">
        <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/5">
          <button onClick={() => setActiveMemoryField(null)} className="p-1 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-3.5 h-3.5 text-gray-400" /></button>
          <div className="flex-1">
            <span className="text-sm font-medium text-white">{field.name}</span>
            <p className="text-[10px] text-gray-500">{field.scope} • {field.contributionCount} fragments</p>
          </div>
          <Button size="sm" onClick={() => deleteMemoryField(activeFieldId)} className="h-6 text-[10px] bg-red-600/30 text-red-400"><Trash2 className="w-2.5 h-2.5" /></Button>
        </div>

        {activeFieldEntropy && (
          <div className="px-3 py-2 border-b border-white/5 bg-purple-900/5 flex items-center gap-4 text-[10px]">
            <div className="flex items-center gap-1"><Activity className="w-2.5 h-2.5 text-purple-400" /><span className="text-gray-400">Entropy:</span> <span className="text-purple-400">{activeFieldEntropy.shannon.toFixed(3)}</span></div>
            <div><span className="text-gray-400">Trend:</span> <span className={activeFieldEntropy.trend === 'stable' ? 'text-emerald-400' : 'text-amber-400'}>{activeFieldEntropy.trend}</span></div>
            <div><span className="text-gray-400">Coherence:</span> <span className="text-blue-400">{activeFieldEntropy.coherence.toFixed(2)}</span></div>
          </div>
        )}

        <div className="p-3 border-b border-white/5 space-y-2">
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Store Knowledge</h4>
          <textarea value={storeContent} onChange={e => setStoreContent(e.target.value)} placeholder="Enter knowledge to store..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 h-16 resize-none focus:outline-none focus:border-blue-500/50" />
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-gray-500">Significance: {storeSignificance.toFixed(1)}</label>
            <input type="range" min="0" max="1" step="0.1" value={storeSignificance} onChange={e => setStoreSignificance(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-blue-500" />
            <Button size="sm" onClick={() => handleStore(activeFieldId)} disabled={!storeContent.trim()} className="h-6 text-[10px] bg-blue-600 px-2 text-white">
              <Download className="w-2.5 h-2.5 mr-1" /> Store
            </Button>
          </div>
        </div>

        <div className="p-3 border-b border-white/5 space-y-2">
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Query Field</h4>
          <div className="flex gap-2">
            <input value={queryInput} onChange={e => setQueryInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuery(activeFieldId)}
              placeholder="Semantic search..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
            <Button size="sm" onClick={() => handleQuery(activeFieldId)} className="h-7 px-2 bg-purple-600 text-white"><Search className="w-3 h-3" /></Button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <label>Threshold: {queryThreshold.toFixed(1)}</label>
            <input type="range" min="0" max="1" step="0.1" value={queryThreshold} onChange={e => setQueryThreshold(parseFloat(e.target.value))} className="flex-1 h-1 accent-purple-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {queryResults.length === 0 ? (
            <div className="text-center py-6 text-gray-600 text-xs">Query this field to see results.</div>
          ) : (
            queryResults.map((frag: any, i: number) => (
              <div key={frag.id || i} className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-gray-500">{frag.id?.substring(0, 12)}...</span>
                  {frag.similarity !== undefined && (
                    <span className={`text-[10px] font-mono font-bold ${frag.similarity > 0.7 ? 'text-emerald-400' : frag.similarity > 0.4 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {(frag.similarity * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-200">{frag.content}</p>
                <div className="flex gap-2 mt-1 text-[9px] text-gray-600">
                  <span>sig: {frag.significance?.toFixed(1)}</span>
                  {frag.sourceNode && <span>src: {frag.sourceNode.substring(0, 8)}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <div className="h-full flex flex-col text-white">
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <div className="flex gap-3">
          {(['fields', 'global', 'graph'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-medium capitalize ${tab === t ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'} transition-colors`}>
              {t === 'fields' ? 'My Fields' : t === 'global' ? 'Global Memory' : 'Graph Explorer'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'graph' ? (
          <GraphPanel context={context} />
        ) : tab === 'fields' ? (
          <div className="h-full flex flex-col">
            <div className="flex justify-end p-3 border-b border-white/5">
              <Button size="sm" onClick={() => setShowCreate(true)} className="h-6 text-[10px] bg-blue-600 px-2 text-white">
                <Plus className="w-2.5 h-2.5 mr-1" /> New Field
              </Button>
            </div>

            {showCreate && (
              <div className="border-b border-white/5">
                <div className="p-3 space-y-2 bg-blue-900/10">
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Field name" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" />
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" />
                  <div className="flex gap-2">
                    <select value={newScope} onChange={e => setNewScope(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white">
                      <option value="user">User</option>
                      <option value="conversation">Conversation</option>
                      <option value="organization">Organization</option>
                      <option value="global">Global</option>
                    </select>
                    <Button size="sm" onClick={handleCreate} className="h-6 text-[10px] bg-blue-600 text-white">Create</Button>
                    <Button size="sm" onClick={() => setShowCreate(false)} className="h-6 text-[10px] bg-gray-700 text-white">Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs"><Database className="w-6 h-6 mx-auto mb-2 opacity-40" /><p>No memory fields. Create one above.</p></div>
              ) : (
                fields.map((f: any) => (
                  <div key={f.id}
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
                      <span>entropy: {f.entropy?.toFixed(2)}</span>
                      <span>{f.locked ? '🔒' : '🔓'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="p-3 border-b border-white/5">
              <div className="flex gap-2">
                <input value={globalQueryInput} onChange={e => setGlobalQueryInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGlobalQuery()}
                  placeholder="Query global network memory..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
                <Button size="sm" onClick={handleGlobalQuery} className="h-7 px-2 bg-purple-600 text-white"><Search className="w-3 h-3" /></Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {queryResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">Enter a query to search global memory.</div>
              ) : (
                queryResults.map((frag: any, i: number) => (
                  <div key={frag.id || i} className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-gray-500">{frag.sourceNode?.substring(0, 12) ?? 'local'}...</span>
                      {frag.similarity !== undefined && (
                        <span className={`text-[10px] font-mono font-bold ${frag.similarity > 0.7 ? 'text-emerald-400' : 'text-amber-400'}`}>{(frag.similarity * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-200">{frag.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
