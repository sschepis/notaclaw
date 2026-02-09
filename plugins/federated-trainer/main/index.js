export function activate(context) {
  console.log('[Federated Trainer] Activating...');

  let activeRounds = new Map();

  // Load rounds
  context.storage.get('training-rounds').then(rounds => {
      if (rounds) {
          Object.keys(rounds).forEach(key => {
              activeRounds.set(key, rounds[key]);
          });
          console.log(`[Federated Trainer] Loaded ${activeRounds.size} rounds`);
      }
  });

  const saveRounds = async () => {
      const obj = {};
      activeRounds.forEach((value, key) => {
          obj[key] = value;
      });
      await context.storage.set('training-rounds', obj);
  };

  context.dsn.registerTool({
    name: 'startTrainingRound',
    description: 'Initiates a federated learning round for a specific model',
    parameters: {
      type: 'object',
      properties: {
        modelId: { type: 'string' },
        datasetQuery: { type: 'string' },
        epochs: { type: 'number', default: 1 }
      },
      required: ['modelId']
    }
  }, async (args) => {
    console.log(`[Federated Trainer] Starting round for ${args.modelId}`);
    const roundId = 'rnd_' + Date.now();
    const round = {
        id: roundId,
        modelId: args.modelId,
        status: 'initializing',
        participants: 0,
        progress: 0,
        epochs: args.epochs || 1
    };
    activeRounds.set(roundId, round);
    await saveRounds();
    
    // Notify renderer
    context.ipc.send('training-update', Array.from(activeRounds.values()));

    // Simulate progress
    setTimeout(() => {
        round.status = 'training';
        round.participants = Math.floor(Math.random() * 20) + 1;
        context.ipc.send('training-update', Array.from(activeRounds.values()));
        
        let progress = 0;
        const interval = setInterval(async () => {
            progress += 10;
            round.progress = progress;
            if (progress >= 100) {
                round.status = 'completed';
                clearInterval(interval);
            }
            await saveRounds();
            context.ipc.send('training-update', Array.from(activeRounds.values()));
        }, 1000);
    }, 2000);

    return { status: 'round_initiated', roundId };
  });

  context.ipc.on('get-rounds', () => {
      context.ipc.send('training-update', Array.from(activeRounds.values()));
  });

  context.ipc.on('start-round', async (args) => {
    // Re-use the logic from the tool
    const roundId = 'rnd_' + Date.now();
    const round = {
        id: roundId,
        modelId: args.modelId,
        status: 'initializing',
        participants: 0,
        progress: 0,
        epochs: args.epochs || 1
    };
    activeRounds.set(roundId, round);
    await saveRounds();
    
    context.ipc.send('training-update', Array.from(activeRounds.values()));

    // Simulate progress
    setTimeout(() => {
        round.status = 'training';
        round.participants = Math.floor(Math.random() * 20) + 1;
        context.ipc.send('training-update', Array.from(activeRounds.values()));
        
        let progress = 0;
        const interval = setInterval(async () => {
            progress += 10;
            round.progress = progress;
            if (progress >= 100) {
                round.status = 'completed';
                clearInterval(interval);
            }
            await saveRounds();
            context.ipc.send('training-update', Array.from(activeRounds.values()));
        }, 1000);
    }, 2000);
  });

  console.log('[Federated Trainer] Activated.');
}
