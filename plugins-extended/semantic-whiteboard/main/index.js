export function activate(context) {
  console.log('[Semantic Whiteboard] Activating...');

  // Use plugin storage for persistence (syncs with local file system)
  const activeSessions = new Map();

  // Load from storage
  context.storage.get('whiteboard-sessions').then(sessions => {
      if (sessions) {
          Object.keys(sessions).forEach(key => {
              activeSessions.set(key, sessions[key]);
          });
          console.log(`[Semantic Whiteboard] Loaded ${activeSessions.size} sessions from storage`);
      }
  });

  const saveSessions = async () => {
      const obj = {};
      activeSessions.forEach((value, key) => {
          obj[key] = value;
      });
      await context.storage.set('whiteboard-sessions', obj);
  };

  context.dsn.registerTool({
    name: 'addToWhiteboard',
    description: 'Adds an element to the active whiteboard session',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        element: { 
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['text', 'geo', 'note', 'arrow'] },
                content: { type: 'string' },
                x: { type: 'number' },
                y: { type: 'number' },
                props: { type: 'object' }
            }
        }
      },
      required: ['sessionId', 'element']
    }
  }, async (args) => {
    console.log(`[Semantic Whiteboard] Adding element to session ${args.sessionId}`);
    
    // Store in memory for now
    if (!activeSessions.has(args.sessionId)) {
        activeSessions.set(args.sessionId, []);
    }
    const session = activeSessions.get(args.sessionId);
    const element = {
        id: `shape:${Date.now()}`,
        type: args.element.type || 'text',
        x: args.element.x || 100,
        y: args.element.y || 100,
        props: args.element.props || { text: args.element.content || '' }
    };
    session.push(element);

    await saveSessions();

    // TODO: Emit event to renderer to update Tldraw store
    context.ipc.send('whiteboard-update', { sessionId: args.sessionId, element });

    return { status: 'success', elementId: element.id };
  });

  context.ipc.on('get-whiteboard-state', (sessionId) => {
      if (activeSessions.has(sessionId)) {
          context.ipc.send('whiteboard-state', { sessionId, elements: activeSessions.get(sessionId) });
      } else {
          context.ipc.send('whiteboard-state', { sessionId, elements: [] });
      }
  });

  console.log('[Semantic Whiteboard] Activated.');
}
