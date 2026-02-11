/**
 * Tests for ServiceRegistry
 */

import * as assert from 'assert';
import { ServiceRegistry } from '../../services/ServiceRegistry';

suite('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  setup(() => {
    registry = new ServiceRegistry();
  });

  teardown(() => {
    registry.dispose();
  });

  test('register and resolve a service', () => {
    registry.register('myService', () => ({ name: 'test' }));
    const svc = registry.resolve<{ name: string }>('myService');
    assert.strictEqual(svc.name, 'test');
  });

  test('singleton factory is called only once', () => {
    let callCount = 0;
    registry.register('counter', () => {
      callCount++;
      return { count: callCount };
    });

    const first = registry.resolve<{ count: number }>('counter');
    const second = registry.resolve<{ count: number }>('counter');

    assert.strictEqual(callCount, 1, 'Factory should be called once');
    assert.strictEqual(first, second, 'Should return same instance');
  });

  test('transient factory creates new instance each time', () => {
    let callCount = 0;
    registry.register('transient', () => {
      callCount++;
      return { count: callCount };
    }, false); // singleton = false

    const first = registry.resolve<{ count: number }>('transient');
    const second = registry.resolve<{ count: number }>('transient');

    assert.strictEqual(callCount, 2, 'Factory should be called twice');
    assert.notStrictEqual(first, second, 'Should return different instances');
  });

  test('registerInstance stores pre-built instance', () => {
    const instance = { value: 42 };
    registry.registerInstance('prebuilt', instance);

    const resolved = registry.resolve<{ value: number }>('prebuilt');
    assert.strictEqual(resolved, instance);
  });

  test('has() returns true for registered services', () => {
    registry.register('svc', () => ({}));
    assert.strictEqual(registry.has('svc'), true);
    assert.strictEqual(registry.has('missing'), false);
  });

  test('resolve throws for unregistered service', () => {
    assert.throws(() => registry.resolve('missing'), /not registered/);
  });

  test('register throws for duplicate name', () => {
    registry.register('dup', () => ({}));
    assert.throws(() => registry.register('dup', () => ({})), /already registered/);
  });

  test('unregister removes a service and calls dispose()', () => {
    let disposed = false;
    registry.register('disposable', () => ({
      dispose: () => { disposed = true; },
    }));

    // Force instantiation
    registry.resolve('disposable');

    registry.unregister('disposable');
    assert.strictEqual(registry.has('disposable'), false);
    assert.strictEqual(disposed, true);
  });

  test('getRegisteredNames returns all service names', () => {
    registry.register('a', () => ({}));
    registry.register('b', () => ({}));
    registry.register('c', () => ({}));

    const names = registry.getRegisteredNames();
    assert.deepStrictEqual(names.sort(), ['a', 'b', 'c']);
  });

  test('dispose calls dispose() on all singleton instances', () => {
    const disposed: string[] = [];

    registry.register('svc1', () => ({
      dispose: () => { disposed.push('svc1'); },
    }));
    registry.register('svc2', () => ({
      dispose: () => { disposed.push('svc2'); },
    }));

    // Force instantiation
    registry.resolve('svc1');
    registry.resolve('svc2');

    registry.dispose();
    assert.deepStrictEqual(disposed.sort(), ['svc1', 'svc2']);
  });

  test('operations throw after dispose', () => {
    registry.dispose();
    assert.throws(() => registry.register('late', () => ({})), /disposed/);
    assert.throws(() => registry.resolve('late'), /disposed/);
  });
});
