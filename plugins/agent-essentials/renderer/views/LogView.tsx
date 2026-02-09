import React from 'react';
import { Activity } from 'lucide-react';
import { useAlephStore } from 'alephnet';

export const LogView: React.FC = () => {
  const {
    agents: { agents, stepLog },
  } = useAlephStore();

  return (
    <>
      {stepLog.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-xs"><Activity size={24} className="mx-auto mb-2 opacity-40" /><p>No agent steps recorded.</p></div>
      ) : (
        stepLog.slice(-50).reverse().map((step: any, i: number) => (
          <div key={`${step.timestamp}-${i}`} className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-[10px] font-mono">
            <div className="flex justify-between mb-0.5">
              <span className="text-blue-400">{agents.find((a: any) => a.id === step.agentId)?.name ?? step.agentId}</span>
              <span className="text-gray-600">{new Date(step.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-gray-300">{step.action}</p>
            <span className="text-purple-400">FE: {step.freeEnergy.toFixed(3)}</span>
          </div>
        ))
      )}
    </>
  );
};