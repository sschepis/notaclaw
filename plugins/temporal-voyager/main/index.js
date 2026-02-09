exports.activate = function(context) {
  console.log('[Temporal Voyager] Activating...');

  // Store active forks
  const forks = new Map();

  context.dsn.registerTool({
    name: 'travelToTime',
    description: 'Reverts the local graph view to a specific timestamp',
    parameters: {
      type: 'object',
      properties: {
        timestamp: { type: 'number' },
        mode: { type: 'string', enum: ['view', 'fork'] }
      },
      required: ['timestamp']
    }
  }, async (args) => {
    console.log(`[Temporal Voyager] Traveling to ${new Date(args.timestamp).toISOString()}`);
    
    // Switch Gun.js adapter's read head (simulated via storage)
    if (context.storage) {
        await context.storage.set('temporal-head', args.timestamp);
    }
    
    if (context.dsn && context.dsn.publishObservation) {
        context.dsn.publishObservation(`Time travel to ${args.timestamp}`, []);
    }

    return { status: 'success', currentView: args.timestamp, mode: args.mode || 'view' };
  });

  context.dsn.registerTool({
    name: 'forkTimeline',
    description: 'Creates a parallel state branch from a specific timestamp',
    parameters: {
      type: 'object',
      properties: {
        timestamp: { type: 'number' },
        label: { type: 'string' }
      },
      required: ['timestamp', 'label']
    }
  }, async (args) => {
    const forkId = `fork-${Date.now()}`;
    forks.set(forkId, {
      origin: args.timestamp,
      label: args.label,
      created: Date.now()
    });
    console.log(`[Temporal Voyager] Forked timeline '${args.label}' at ${args.timestamp}`);
    return { status: 'success', forkId };
  });

  context.dsn.registerTool({
    name: 'getHistoryEvents',
    description: 'Retrieves significant state change events',
    parameters: {
        type: 'object',
        properties: {
            limit: { type: 'number' }
        }
    }
  }, async (args) => {
      // Mock history for now, would pull from RAD/Gun history
      const now = Date.now();
      return {
          events: [
              { timestamp: now - 100000, type: 'agent_decision', summary: 'Updated task list' },
              { timestamp: now - 500000, type: 'network_sync', summary: 'Synced with peer A' },
              { timestamp: now - 1000000, type: 'user_input', summary: 'User defined goal' }
          ]
      };
  });

  console.log('[Temporal Voyager] Activated.');
}
