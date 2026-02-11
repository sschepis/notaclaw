/**
 * Tests for EventBus
 */

import * as assert from 'assert';
import { EventBus } from '../../utils/EventBus';

suite('EventBus', () => {
  let bus: EventBus;

  setup(() => {
    bus = new EventBus();
  });

  teardown(() => {
    bus.dispose();
  });

  test('on() subscribes to events and receives data', () => {
    let received: any = null;
    bus.on('fs.fileChanged', (data) => {
      received = data;
    });

    bus.emit('fs.fileChanged', { type: 'created', uri: '/path/file.ts' });
    assert.deepStrictEqual(received, { type: 'created', uri: '/path/file.ts' });
  });

  test('on() returns unsubscribe function', () => {
    let callCount = 0;
    const unsub = bus.on('fs.fileChanged', () => { callCount++; });

    bus.emit('fs.fileChanged', { type: 'changed', uri: '' });
    assert.strictEqual(callCount, 1);

    unsub();
    bus.emit('fs.fileChanged', { type: 'changed', uri: '' });
    assert.strictEqual(callCount, 1, 'Should not receive after unsubscribe');
  });

  test('once() only fires once', () => {
    let callCount = 0;
    bus.once('server.stopped', () => { callCount++; });

    bus.emit('server.stopped', {});
    bus.emit('server.stopped', {});
    bus.emit('server.stopped', {});

    assert.strictEqual(callCount, 1);
  });

  test('multiple handlers on same event', () => {
    const calls: string[] = [];
    bus.on('fs.fileChanged', () => { calls.push('a'); });
    bus.on('fs.fileChanged', () => { calls.push('b'); });

    bus.emit('fs.fileChanged', { type: 'deleted', uri: '' });
    assert.deepStrictEqual(calls, ['a', 'b']);
  });

  test('handlers for different events are independent', () => {
    let fsCount = 0;
    let serverCount = 0;

    bus.on('fs.fileChanged', () => { fsCount++; });
    bus.on('server.stopped', () => { serverCount++; });

    bus.emit('fs.fileChanged', { type: 'changed', uri: '' });
    assert.strictEqual(fsCount, 1);
    assert.strictEqual(serverCount, 0);
  });

  test('error in one handler does not break others', () => {
    const calls: string[] = [];
    bus.on('fs.fileChanged', () => { throw new Error('boom'); });
    bus.on('fs.fileChanged', () => { calls.push('survived'); });

    // Should not throw
    bus.emit('fs.fileChanged', { type: 'changed', uri: '' });
    assert.deepStrictEqual(calls, ['survived']);
  });

  test('removeAllListeners(event) clears specific event', () => {
    let called = false;
    bus.on('fs.fileChanged', () => { called = true; });

    bus.removeAllListeners('fs.fileChanged');
    bus.emit('fs.fileChanged', { type: 'changed', uri: '' });
    assert.strictEqual(called, false);
  });

  test('removeAllListeners() clears all events', () => {
    let fsCall = false;
    let serverCall = false;
    bus.on('fs.fileChanged', () => { fsCall = true; });
    bus.on('server.stopped', () => { serverCall = true; });

    bus.removeAllListeners();
    bus.emit('fs.fileChanged', { type: 'changed', uri: '' });
    bus.emit('server.stopped', {});
    assert.strictEqual(fsCall, false);
    assert.strictEqual(serverCall, false);
  });

  test('listenerCount returns correct count', () => {
    assert.strictEqual(bus.listenerCount('fs.fileChanged'), 0);

    bus.on('fs.fileChanged', () => {});
    assert.strictEqual(bus.listenerCount('fs.fileChanged'), 1);

    bus.on('fs.fileChanged', () => {});
    assert.strictEqual(bus.listenerCount('fs.fileChanged'), 2);
  });

  test('dispose prevents further subscriptions', () => {
    bus.dispose();

    let called = false;
    bus.on('fs.fileChanged', () => { called = true; });
    bus.emit('fs.fileChanged', { type: 'changed', uri: '' });
    assert.strictEqual(called, false);
  });

  test('emit on non-existent event is a no-op', () => {
    // Should not throw
    bus.emit('server.stopped', {});
  });
});
