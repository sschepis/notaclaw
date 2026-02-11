
import { activate, deactivate } from '../main/index';

describe('Reputation Manager', () => {
  let context: any;
  let handlers: { [key: string]: Function } = {};

  beforeEach(() => {
    handlers = {};
    context = {
      ipc: {
        handle: jest.fn((channel, handler) => {
          handlers[channel] = handler;
        }),
        on: jest.fn(),
        send: jest.fn()
      },
      on: jest.fn()
    };
    activate(context);
  });

  test('activate registers IPC handlers', () => {
    expect(context.ipc.handle).toHaveBeenCalledWith('reputation:get', expect.any(Function));
    expect(context.ipc.handle).toHaveBeenCalledWith('reputation:add-feedback', expect.any(Function));
  });

  test('reputation:get returns initial data', async () => {
    const data = await handlers['reputation:get']();
    expect(data.score).toBe(750);
    expect(data.feedback).toHaveLength(2);
  });

  test('reputation:add-feedback updates score and feedback list', async () => {
    const initialData = await handlers['reputation:get']();
    const initialScore = initialData.score;

    const newFeedback = {
      from: 'Charlie',
      score: 5,
      comment: 'Excellent!'
    };

    await handlers['reputation:add-feedback'](newFeedback);

    const updatedData = await handlers['reputation:get']();
    expect(updatedData.feedback).toHaveLength(3);
    expect(updatedData.feedback[0].from).toBe('Charlie');
    // Score should increase by (5-3)*10 = 20
    expect(updatedData.score).toBe(initialScore + 20);
  });
});
