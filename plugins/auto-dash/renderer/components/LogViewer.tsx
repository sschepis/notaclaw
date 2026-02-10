import React from 'react';

interface LogViewerProps {
  title: string;
  data: any[];
}

export const LogViewer: React.FC<LogViewerProps> = ({ title, data }) => {
  const logs = Array.isArray(data) ? data : [];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col h-full max-h-[300px]">
      <div className="bg-gray-800 px-4 py-2 text-xs font-mono text-gray-400 border-b border-gray-700">
        {title}
      </div>
      <div className="p-2 overflow-y-auto flex-1 font-mono text-xs space-y-1">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-gray-500">[{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]</span>
            <span className="text-green-400">{log.source || 'SYSTEM'}:</span>
            <span className="text-gray-300">{typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-600 italic p-2">No logs available</div>
        )}
      </div>
    </div>
  );
};
