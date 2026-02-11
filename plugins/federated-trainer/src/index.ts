import { Context, TrainingRound } from './types';

export function activate(context: Context) {
  console.log('[Federated Trainer] Activating...');

  const activeRounds = new Map<string, TrainingRound>();

  // Load rounds
  context.storage.get('training-rounds').then((rounds: Record<string, TrainingRound>) => {
      if (rounds) {
          Object.keys(rounds).forEach(key => {
              activeRounds.set(key, rounds[key]);
          });
          console.log(`[Federated Trainer] Loaded ${activeRounds.size} rounds`);
      }
  });

  const saveRounds = async () => {
      const obj: Record<string, TrainingRound> = {};
      activeRounds.forEach((value, key) => {
          obj[key] = value;
      });
      await context.storage.set('training-rounds', obj);
  };

  const startRound = async (modelId: string, epochs: number) => {
    console.log(`[Federated Trainer] Starting round for ${modelId}`);
    const roundId = 'rnd_' + Date.now();
    const round: TrainingRound = {
        id: roundId,
        modelId: modelId,
        status: 'initializing',
        participants: 0,
        progress: 0,
        epochs: epochs || 1
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

    return roundId;
  };

  context.dsn.registerTool({
    name: 'startTrainingRound',
    description: 'Initiates a federated learning round for a specific model',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        modelId: { type: 'string' },
        datasetQuery: { type: 'string' },
        epochs: { type: 'number', default: 1 }
      },
      required: ['modelId']
    },
    semanticDomain: 'cognitive',
    primeDomain: [13, 17],
    smfAxes: [0.7, 0.6],
    requiredTier: 'Adept',
    version: '1.0.0'
  }, async (args: { modelId: string, epochs: number }) => {
    const roundId = await startRound(args.modelId, args.epochs);
    return { status: 'round_initiated', roundId };
  });

  context.ipc.on('get-rounds', () => {
      context.ipc.send('training-update', Array.from(activeRounds.values()));
  });

  context.ipc.on('start-round', async (args: any) => {
    await startRound(args.modelId, args.epochs);
  });

  console.log('[Federated Trainer] Activated.');
}
