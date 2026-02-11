
import { activate, deactivate } from '../main/index';

describe('Notification Center Main Process', () => {
  let context: any;
  let notifications: any[] = [];
  let handlers: { [key: string]: Function } = {};
  let listeners: { [key: string]: Function } = {};

  beforeEach(() => {
    jest.useFakeTimers();
    notifications = [];
    handlers = {};
    listeners = {};
    context = {
      ipc: {
        on: jest.fn((channel, listener) => {
          listeners[channel] = listener;
        }),
        send: jest.fn(),
        handle: jest.fn((channel, handler) => {
          handlers[channel] = handler;
        })
      },
      on: jest.fn((event, listener) => {
        if (event === 'ready') listener();
      })
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('activate registers IPC handlers', () => {
    activate(context);
    expect(context.ipc.on).toHaveBeenCalledWith('notify', expect.any(Function));
    expect(context.ipc.handle).toHaveBeenCalledWith('notifications:list', expect.any(Function));
    expect(context.ipc.handle).toHaveBeenCalledWith('notifications:markRead', expect.any(Function));
    expect(context.ipc.handle).toHaveBeenCalledWith('notifications:clear', expect.any(Function));
  });

  test('notifications:list returns empty array initially', async () => {
    activate(context);
    const result = await handlers['notifications:list']();
    expect(result).toEqual([]);
  });

  test('notify listener adds notification', async () => {
    activate(context);
    const notifyListener = listeners['notify'];
    
    notifyListener({ title: 'Test', message: 'Message', type: 'info' });
    
    expect(context.ipc.send).toHaveBeenCalledWith('notification:new', expect.objectContaining({
      title: 'Test',
      message: 'Message',
      type: 'info',
      read: false
    }));

    const listResult = await handlers['notifications:list']();
    expect(listResult).toHaveLength(1);
    expect(listResult[0].title).toBe('Test');
  });

  test('notifications:markRead marks notification as read', async () => {
    activate(context);
    const notifyListener = listeners['notify'];
    
    // Add a notification (we need to capture its ID or rely on list)
    notifyListener({ title: 'Test' });
    
    // Get the notification from list to find its ID
    const listResult = await handlers['notifications:list']();
    const notificationId = listResult[0].id;

    // Mark as read
    const markReadResult = await handlers['notifications:markRead']({ id: notificationId });
    expect(markReadResult).toEqual({ success: true });

    // Verify it is read
    const updatedList = await handlers['notifications:list']();
    expect(updatedList[0].read).toBe(true);
  });

  test('notifications:clear clears all notifications', async () => {
    activate(context);
    const notifyListener = listeners['notify'];
    notifyListener({ title: 'Test 1' });
    notifyListener({ title: 'Test 2' });

    let listResult = await handlers['notifications:list']();
    expect(listResult).toHaveLength(2);

    await handlers['notifications:clear']();
    
    listResult = await handlers['notifications:list']();
    expect(listResult).toHaveLength(0);
  });
});
