import { activate } from '../main/index';

describe('Notification Center Main Process', () => {
    let context: any;
    let storage: any;
    let ipcHandlers: { [key: string]: Function } = {};
    let ipcListeners: { [key: string]: Function } = {};

    beforeEach(() => {
        storage = {
            data: {},
            get: jest.fn(async (key) => storage.data[key]),
            set: jest.fn(async (key, value) => { storage.data[key] = value; }),
        };

        ipcHandlers = {};
        ipcListeners = {};

        context = {
            storage,
            ipc: {
                on: jest.fn((channel, handler) => { ipcListeners[channel] = handler; }),
                handle: jest.fn((channel, handler) => { ipcHandlers[channel] = handler; }),
                send: jest.fn(),
            },
            on: jest.fn(),
            dsn: {
                registerTool: jest.fn(),
            }
        };
    });

    test('should activate and register handlers', async () => {
        await activate(context);
        expect(context.ipc.handle).toHaveBeenCalledWith('notifications:list', expect.any(Function));
        expect(context.ipc.on).toHaveBeenCalledWith('notify', expect.any(Function));
    });

    test('should add a notification via notify channel', async () => {
        await activate(context);
        
        const notify = ipcListeners['notify'];
        await notify({ title: 'Test', message: 'Message' });

        const list = ipcHandlers['notifications:list'];
        const notifications = await list();
        
        expect(notifications).toHaveLength(1);
        expect(notifications[0].title).toBe('Test');
        expect(context.ipc.send).toHaveBeenCalledWith('notification:new', expect.any(Object));
    });

    test('should handle overflow eviction', async () => {
        await activate(context);
        const notify = ipcListeners['notify'];
        
        // Add 105 notifications
        for (let i = 0; i < 105; i++) {
            await notify({ title: `Msg ${i}`, message: 'body' });
        }

        const list = ipcHandlers['notifications:list'];
        const notifications = await list();
        
        expect(notifications).toHaveLength(100);
        // The last added (index 104) should be at the beginning (index 0) because of unshift
        expect(notifications[0].title).toBe('Msg 104');
    });

    test('should mark notification as read', async () => {
        await activate(context);
        const notify = ipcListeners['notify'];
        await notify({ title: 'Test', message: 'Message' });
        
        const list = ipcHandlers['notifications:list'];
        let notifications = await list();
        const id = notifications[0].id;

        const markRead = ipcHandlers['notifications:markRead'];
        await markRead({ id });

        notifications = await list();
        expect(notifications[0].read).toBe(true);
    });

    test('should clear all notifications', async () => {
        await activate(context);
        const notify = ipcListeners['notify'];
        await notify({ title: 'Test', message: 'Message' });
        
        const clear = ipcHandlers['notifications:clear'];
        await clear();

        const list = ipcHandlers['notifications:list'];
        const notifications = await list();
        expect(notifications).toHaveLength(0);
    });

    test('should persist notifications', async () => {
        await activate(context);
        const notify = ipcListeners['notify'];
        await notify({ title: 'Persistent', message: 'Message' });

        expect(storage.set).toHaveBeenCalledWith('notifications', expect.any(Array));
        expect(storage.data['notifications'][0].title).toBe('Persistent');
    });
});
