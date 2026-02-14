interface Trace {
    timestamp: number;
    step: string;
    details: any;
}

interface Session {
    id: string;
    agentId: string;
    startTime: number;
    status: string;
    traces: Trace[];
}

class TraceCollector {
  sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map<string, Session>();
  }

  startSession(agentId: string): string {
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

  logTrace(sessionId: string, step: string, details: any) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.traces.push({ timestamp: Date.now(), step, details });
  }

  endSession(sessionId: string, status: string = 'completed') {
      const session = this.sessions.get(sessionId);
      if (session) session.status = status;
  }

  get(sessionId: string) {
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

export function activate(context: any) {
  console.log('[Thought Stream Debugger] Activating...');
  
  const collector = new TraceCollector();

  // Hook into the global event bus to capture real agent steps
  if (context.events && typeof context.events.on === 'function') {
      context.events.on('agent:step', (data: any) => {
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
  }, async (args: any) => {
    const session = collector.get(args.sessionId);
    if (!session) throw new Error(`Session ${args.sessionId} not found`);
    return { status: 'success', session };
  });

  if (context.traits) {
    context.traits.register({
      id: 'thought-debugger',
      name: 'Thought Debugger',
      description: 'Inspect agent reasoning traces.',
      instruction: 'You can inspect the execution traces of other agents (or past sessions) using `listAgentSessions` and `inspectAgentSession`. Use this to debug reasoning errors or analyze agent behavior.',
      activationMode: 'dynamic',
      triggerKeywords: ['debug', 'trace', 'inspect', 'reasoning', 'execution', 'log', 'step']
    });
  }

  console.log('[Thought Stream Debugger] Activated.');
}
