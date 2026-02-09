
class TraceCollector {
  constructor() {
    this.sessions = new Map();
    // Seed some mock data
    this.seedMockData();
  }

  seedMockData() {
      const mockSessionId = 'sess_mock_123';
      const traces = [
          { timestamp: Date.now() - 50000, step: 'Goal Analysis', details: { goal: 'Summarize recent logs', priority: 'high' } },
          { timestamp: Date.now() - 45000, step: 'Memory Recall', details: { query: 'logs', limit: 10, resonance: 0.85 } },
          { timestamp: Date.now() - 40000, step: 'Plan Formulation', details: { steps: ['fetch_logs', 'analyze_sentiment', 'generate_summary'] } },
          { timestamp: Date.now() - 35000, step: 'Tool Execution', details: { tool: 'fetch_logs', args: { limit: 100 } } },
          { timestamp: Date.now() - 30000, step: 'Observation', details: { result: 'Fetched 100 log entries.' } },
          { timestamp: Date.now() - 25000, step: 'Reasoning', details: { thought: 'Logs show high error rate in auth service.' } },
          { timestamp: Date.now() - 20000, step: 'Tool Execution', details: { tool: 'analyze_sentiment', args: { text: 'Error: Auth failed...' } } },
          { timestamp: Date.now() - 10000, step: 'Response Generation', details: { draft: 'The system is experiencing auth failures.' } }
      ];
      this.sessions.set(mockSessionId, { 
          id: mockSessionId, 
          agentId: 'agent_sre_01', 
          startTime: Date.now() - 60000, 
          status: 'completed',
          traces 
      });
  }

  startSession(agentId) {
    const id = 'sess_' + Date.now().toString(36);
    this.sessions.set(id, { 
        id, 
        agentId, 
        startTime: Date.now(), 
        status: 'active',
        traces: [] 
    });
    return id;
  }

  logTrace(sessionId, step, details) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.traces.push({ timestamp: Date.now(), step, details });
  }

  endSession(sessionId, status = 'completed') {
      const session = this.sessions.get(sessionId);
      if (session) session.status = status;
  }

  get(sessionId) {
      return this.sessions.get(sessionId);
  }

  list() {
      return Array.from(this.sessions.values()).map(s => ({
          id: s.id,
          agentId: s.agentId,
          startTime: s.startTime,
          status: s.status,
          stepCount: s.traces.length
      }));
  }
}

exports.activate = function(context) {
  console.log('[Thought Stream Debugger] Activating...');
  
  const collector = new TraceCollector();

  // Hook into the global event bus to capture real agent steps
  if (context.events && typeof context.events.on === 'function') {
      context.events.on('agent:step', (data) => {
          if (data && data.agentId) {
              // Ensure session exists
              let sessionId = Array.from(collector.sessions.values())
                  .find(s => s.agentId === data.agentId && s.status === 'active')?.id;
              
              if (!sessionId) {
                  sessionId = collector.startSession(data.agentId);
              }
              
              collector.logTrace(sessionId, 'Agent Step', data);
          }
      });
      console.log('[Thought Stream Debugger] Hooked into agent:step events');
  } else {
      console.warn('[Thought Stream Debugger] context.events not available');
  }

  context.dsn.registerTool({
    name: 'listAgentSessions',
    description: 'Lists all recorded agent sessions',
    parameters: { type: 'object', properties: {} }
  }, async () => {
    return { sessions: collector.list() };
  });

  context.dsn.registerTool({
    name: 'inspectAgentSession',
    description: 'Retrieves the execution trace for a given agent session',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' }
      },
      required: ['sessionId']
    }
  }, async (args) => {
    const session = collector.get(args.sessionId);
    if (!session) throw new Error(`Session ${args.sessionId} not found`);
    return { status: 'success', session };
  });

  console.log('[Thought Stream Debugger] Activated.');
}
