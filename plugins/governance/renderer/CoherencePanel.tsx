import React, { useState, useEffect } from 'react';

// Simple Icons
const Icon = ({ d, className }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const Shield = ({ className }: any) => <Icon className={className} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
const CheckCircle2 = ({ className }: any) => <Icon className={className} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
const XCircle = ({ className }: any) => <Icon className={className} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />;
const AlertCircle = ({ className }: any) => <Icon className={className} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
const Plus = ({ className }: any) => <Icon className={className} d="M12 4v16m8-8H4" />;
const Eye = ({ className }: any) => <Icon className={className} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />;
const Link2 = ({ className }: any) => <Icon className={className} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />;
const BookOpen = ({ className }: any) => <Icon className={className} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />;

// Simple Button
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

type Tab = 'claims' | 'tasks' | 'syntheses';

export const CoherencePanel = ({ context }: { context: any }) => {
  const { useAlephStore } = context;
  const {
    coherence: { claims, verificationTasks, syntheses },
    submitClaim, verifyClaim, loadVerificationTasks, claimTask,
    createSynthesis,
  } = useAlephStore();
  
  const [tab, setTab] = useState<Tab>('claims');
  const [newStatement, setNewStatement] = useState('');
  const [synthTitle, setSynthTitle] = useState('');
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => { loadVerificationTasks(); }, []);

  const handleSubmitClaim = async () => {
    if (!newStatement.trim()) return;
    await submitClaim(newStatement.trim());
    setNewStatement('');
    setShowSubmit(false);
  };

  const handleVerify = async (claimId: string, result: 'VERIFIED' | 'REFUTED') => {
    await verifyClaim(claimId, result, { method: 'manual_review' });
  };

  const handleCreateSynthesis = async () => {
    if (!synthTitle.trim() || selectedClaimIds.length === 0) return;
    await createSynthesis(synthTitle, selectedClaimIds);
    setSynthTitle('');
    setSelectedClaimIds([]);
  };

  const toggleClaimSelection = (id: string) => {
    setSelectedClaimIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const statusIcon = (status: string) => {
    if (status === 'VERIFIED') return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    if (status === 'REFUTED') return <XCircle className="w-3 h-3 text-red-400" />;
    return <AlertCircle className="w-3 h-3 text-amber-400" />;
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'claims', label: 'Claims', count: claims.length },
    { id: 'tasks', label: 'Tasks', count: verificationTasks.filter((t: any) => t.status === 'OPEN').length },
    { id: 'syntheses', label: 'Syntheses', count: syntheses.length },
  ];

  return (
    <div className="h-full flex flex-col text-white">
      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-white/5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${tab === t.id ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
            {t.label} {t.count > 0 && <span className="ml-1 text-[10px] opacity-60">({t.count})</span>}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Claims */}
        {tab === 'claims' && (
          <>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Coherence Claims</h4>
              <Button size="sm" onClick={() => setShowSubmit(!showSubmit)} className="h-6 text-[10px] bg-blue-600 px-2 text-white">
                <Plus className="w-3 h-3 mr-1" /> Submit
              </Button>
            </div>

            {showSubmit && (
                <div className="overflow-hidden mb-3">
                  <div className="p-3 bg-blue-900/10 rounded-lg border border-blue-500/10 space-y-2 mb-3">
                    <textarea value={newStatement} onChange={e => setNewStatement(e.target.value)} placeholder="Enter a claim statement for verification..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 h-20 resize-none focus:outline-none focus:border-blue-500/50" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSubmitClaim} disabled={!newStatement.trim()} className="h-6 text-[10px] bg-blue-600 text-white">Submit Claim</Button>
                      <Button size="sm" onClick={() => setShowSubmit(false)} className="h-6 text-[10px] bg-gray-700 text-white">Cancel</Button>
                    </div>
                  </div>
                </div>
            )}

            {claims.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs"><Shield className="w-6 h-6 mx-auto mb-2 opacity-40" /><p>No claims submitted yet.</p></div>
            ) : (
              claims.map((claim: any, i: number) => (
                <div key={claim.id}
                  className={`p-3 rounded-xl border transition-colors ${selectedClaimIds.includes(claim.id) ? 'border-blue-500/30 bg-blue-900/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}>
                  <div className="flex items-start gap-2">
                    <button onClick={() => toggleClaimSelection(claim.id)} className="mt-0.5 shrink-0">
                      {statusIcon(claim.status)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200">{claim.statement}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[9px] text-gray-500">
                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                          claim.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400' :
                          claim.status === 'REFUTED' ? 'bg-red-500/10 text-red-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>{claim.status}</span>
                        <span>Score: {(claim.consensusScore * 100).toFixed(0)}%</span>
                        <span>{claim.verificationCount} verifications</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleVerify(claim.id, 'VERIFIED')} title="Verify" className="p-1 hover:bg-emerald-500/10 rounded text-gray-600 hover:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleVerify(claim.id, 'REFUTED')} title="Refute" className="p-1 hover:bg-red-500/10 rounded text-gray-600 hover:text-red-400">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Synthesis creator */}
            {selectedClaimIds.length >= 2 && (
              <div className="p-3 bg-purple-900/10 rounded-lg border border-purple-500/10 space-y-2 mt-3">
                <h4 className="text-xs font-medium text-purple-400 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Create Synthesis ({selectedClaimIds.length} claims)</h4>
                <input value={synthTitle} onChange={e => setSynthTitle(e.target.value)} placeholder="Synthesis title..."
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" />
                <Button size="sm" onClick={handleCreateSynthesis} disabled={!synthTitle.trim()} className="h-6 text-[10px] bg-purple-600 text-white">Create</Button>
              </div>
            )}
          </>
        )}

        {/* Tasks */}
        {tab === 'tasks' && (
          verificationTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs"><Eye className="w-6 h-6 mx-auto mb-2 opacity-40" /><p>No verification tasks available.</p></div>
          ) : (
            verificationTasks.map((task: any, i: number) => (
              <div key={task.id}
                className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                    task.status === 'OPEN' ? 'bg-blue-500/10 text-blue-400' :
                    task.status === 'CLAIMED' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>{task.status}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">+{task.reward}ℵ</span>
                </div>
                <p className="text-xs text-gray-200 mb-1">{task.claimStatement || 'Claim verification task'}</p>
                <div className="flex items-center justify-between text-[9px] text-gray-500">
                  <span>{task.type}</span>
                  {task.status === 'OPEN' && (
                    <Button size="sm" onClick={() => claimTask(task.id)} className="h-5 text-[9px] bg-blue-600 px-1.5 text-white">Claim</Button>
                  )}
                </div>
              </div>
            ))
          )
        )}

        {/* Syntheses */}
        {tab === 'syntheses' && (
          syntheses.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs"><Link2 className="w-6 h-6 mx-auto mb-2 opacity-40" /><p>No syntheses created yet.</p></div>
          ) : (
            syntheses.map((s: any, i: number) => (
              <div key={s.id}
                className="p-3 bg-white/5 rounded-xl border border-white/5">
                <h4 className="text-sm font-medium text-white mb-1">{s.title}</h4>
                <div className="flex gap-2 text-[10px] text-gray-500">
                  <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded-full">{s.status}</span>
                  <span>{s.acceptedClaimIds.length} claims</span>
                  <span>{new Date(s.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
