import { activate, deactivate } from '../main/index';

describe('Reputation Manager', () => {
  let context: any;
  let handlers: { [key: string]: Function } = {};
  let storage: { [key: string]: any } = {};

  beforeEach(async () => {
    handlers = {};
    storage = {};
    context = {
      ipc: {
        handle: jest.fn((channel, handler) => {
          handlers[channel] = handler;
        }),
        on: jest.fn(),
        send: jest.fn()
      },
      storage: {
        get: jest.fn(async (key) => storage[key]),
        set: jest.fn(async (key, value) => { storage[key] = value; })
      },
      dsn: {
        registerTool: jest.fn()
      },
      on: jest.fn()
    };
    await activate(context);
  });

  test('activate registers IPC handlers and DSN tools', () => {
    expect(context.ipc.handle).toHaveBeenCalledWith('reputation:get-all', expect.any(Function));
    expect(context.ipc.handle).toHaveBeenCalledWith('reputation:get-entity', expect.any(Function));
    expect(context.ipc.handle).toHaveBeenCalledWith('reputation:submit-feedback', expect.any(Function));
    expect(context.dsn.registerTool).toHaveBeenCalledTimes(2);
  });

  test('reputation:submit-feedback creates entity and updates score', async () => {
    const feedback = {
      entityId: 'peer-1',
      reviewerId: 'alice',
      score: 5,
      comment: 'Great!',
      category: 'General'
    };

    const result = await handlers['reputation:submit-feedback'](feedback);
    expect(result.success).toBe(true);
    expect(result.newScore).toBeGreaterThan(500); // Initial is 500

    const entity = await handlers['reputation:get-entity']('peer-1');
    expect(entity.score).toBe(result.newScore);
    expect(entity.feedback).toHaveLength(1);
    expect(entity.feedback[0].comment).toBe('Great!');
    expect(entity.rank).not.toBe('Novice'); // Should upgrade if score is high enough
  });

  test('score calculation logic', async () => {
    // Initial score 500. Rating 5 -> +20 points.
    await handlers['reputation:submit-feedback']({
      entityId: 'peer-2',
      score: 5
    });
    let entity = await handlers['reputation:get-entity']('peer-2');
    expect(entity.score).toBe(520);

    // Rating 1 -> -20 points.
    await handlers['reputation:submit-feedback']({
      entityId: 'peer-2',
      score: 1
    });
    entity = await handlers['reputation:get-entity']('peer-2');
    expect(entity.score).toBe(500);
  });

  test('score clamping at 0 and 1000', async () => {
    // Max out
    for (let i = 0; i < 30; i++) {
        await handlers['reputation:submit-feedback']({ entityId: 'peer-max', score: 5 });
    }
    let entity = await handlers['reputation:get-entity']('peer-max');
    expect(entity.score).toBe(1000);

    // Bottom out
    for (let i = 0; i < 60; i++) {
        await handlers['reputation:submit-feedback']({ entityId: 'peer-min', score: 1 });
    }
    entity = await handlers['reputation:get-entity']('peer-min');
    expect(entity.score).toBe(0);
  });

  test('persistence', async () => {
    await handlers['reputation:submit-feedback']({ entityId: 'peer-persist', score: 5 });
    expect(context.storage.set).toHaveBeenCalled();
    expect(storage['reputation-data']).toBeDefined();
    expect(storage['reputation-data'].entities['peer-persist']).toBeDefined();
  });
});
