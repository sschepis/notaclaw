import React from 'react';
import { SystemMonitor } from './components/SystemMonitor';

export const AgentsPanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <SystemMonitor />
      </div>
    </div>
  );
};

