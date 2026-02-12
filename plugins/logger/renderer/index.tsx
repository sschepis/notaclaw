import React from 'react';
import { Activity } from 'lucide-react';

const LoggerComponent = () => {
  const [logs, setLogs] = React.useState<string[]>([]);
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Add initial log
    setLogs(prev => [...prev, `[${new Date().toISOString()}] Logger initialized`]);

    // Mock logs for demonstration
    const interval = setInterval(() => {
      const messages = [
        'System check... OK',
        'Network connected',
        'Data sync complete',
        'User activity detected',
        'Memory usage stable'
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setLogs(prev => [...prev, `[${new Date().toISOString()}] ${randomMsg}`]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#1e1e1e', 
      color: '#d4d4d4',
      fontFamily: 'monospace',
      fontSize: '12px',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '8px', 
        borderBottom: '1px solid #333',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>System Logs</span>
        <button 
          onClick={() => setLogs([])}
          style={{
            background: 'transparent',
            border: '1px solid #444',
            color: '#aaa',
            padding: '2px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>{log}</div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

export default (context: any) => {
  context.ui.registerBottomPanelTab({
    id: 'logger-tab',
    name: 'Logger',
    icon: Activity,
    component: LoggerComponent,
    priority: 10,
    enableClose: true
  });
};
