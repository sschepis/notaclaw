/**
 * Tests for MiddlewarePipeline
 */

import * as assert from 'assert';
import {
  MiddlewarePipeline,
  MiddlewareFn,
  createAuthMiddleware,
  createLoggingMiddleware,
} from '../../server/Middleware';

function makeRequest(method: string, params?: any, id?: number) {
  return { jsonrpc: '2.0' as const, method, params, id: id ?? 1 };
}

function makeClient(id: string, authenticated: boolean) {
  return { id, authenticated, origin: 'test' };
}

suite('MiddlewarePipeline', () => {
  test('executes middlewares in order', async () => {
    const pipeline = new MiddlewarePipeline();
    const order: string[] = [];

    pipeline.use('first', async (_ctx, next) => {
      order.push('first-before');
      const res = await next();
      order.push('first-after');
      return res;
    });

    pipeline.use('second', async (_ctx, next) => {
      order.push('second-before');
      const res = await next();
      order.push('second-after');
      return res;
    });

    pipeline.use('handler', async () => {
      order.push('handler');
      return { jsonrpc: '2.0' as const, id: 1, result: 'ok' };
    });

    await pipeline.execute(makeRequest('test'), makeClient('c1', true));

    assert.deepStrictEqual(order, [
      'first-before',
      'second-before',
      'handler',
      'second-after',
      'first-after',
    ]);
  });

  test('middleware can short-circuit', async () => {
    const pipeline = new MiddlewarePipeline();
    let handlerReached = false;

    pipeline.use('blocker', async () => {
      return {
        jsonrpc: '2.0' as const,
        id: 1,
        error: { code: -1, message: 'blocked' },
      };
    });

    pipeline.use('handler', async () => {
      handlerReached = true;
      return { jsonrpc: '2.0' as const, id: 1, result: 'ok' };
    });

    const result = await pipeline.execute(makeRequest('test'), makeClient('c1', true));

    assert.strictEqual(handlerReached, false, 'Handler should not be reached');
    assert.ok(result && 'error' in result, 'Should return error response');
  });

  test('useBefore inserts middleware before target', async () => {
    const pipeline = new MiddlewarePipeline();
    const order: string[] = [];

    pipeline.use('a', async (_, next) => { order.push('a'); return next(); });
    pipeline.use('c', async (_, next) => { order.push('c'); return next(); });
    pipeline.use('handler', async () => { order.push('handler'); return null; });

    pipeline.useBefore('c', 'b', async (_, next) => { order.push('b'); return next(); });

    await pipeline.execute(makeRequest('test'), makeClient('c1', true));
    assert.deepStrictEqual(order, ['a', 'b', 'c', 'handler']);
  });

  test('useAfter inserts middleware after target', async () => {
    const pipeline = new MiddlewarePipeline();
    const order: string[] = [];

    pipeline.use('a', async (_, next) => { order.push('a'); return next(); });
    pipeline.use('c', async (_, next) => { order.push('c'); return next(); });
    pipeline.use('handler', async () => { order.push('handler'); return null; });

    pipeline.useAfter('a', 'b', async (_, next) => { order.push('b'); return next(); });

    await pipeline.execute(makeRequest('test'), makeClient('c1', true));
    assert.deepStrictEqual(order, ['a', 'b', 'c', 'handler']);
  });

  test('remove() removes middleware by name', async () => {
    const pipeline = new MiddlewarePipeline();
    const order: string[] = [];

    pipeline.use('a', async (_, next) => { order.push('a'); return next(); });
    pipeline.use('b', async (_, next) => { order.push('b'); return next(); });
    pipeline.use('handler', async () => { order.push('handler'); return null; });

    pipeline.remove('b');

    await pipeline.execute(makeRequest('test'), makeClient('c1', true));
    assert.deepStrictEqual(order, ['a', 'handler']);
  });

  test('has() checks for middleware by name', () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.use('auth', async (_, next) => next());

    assert.strictEqual(pipeline.has('auth'), true);
    assert.strictEqual(pipeline.has('unknown'), false);
  });

  test('getNames() returns ordered middleware names', () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.use('auth', async (_, next) => next());
    pipeline.use('logging', async (_, next) => next());
    pipeline.use('handler', async () => null);

    assert.deepStrictEqual(pipeline.getNames(), ['auth', 'logging', 'handler']);
  });

  test('context.state allows inter-middleware data sharing', async () => {
    const pipeline = new MiddlewarePipeline();

    pipeline.use('setter', async (ctx, next) => {
      ctx.state.set('userId', 'user123');
      return next();
    });

    pipeline.use('getter', async (ctx) => {
      const userId = ctx.state.get('userId');
      return { jsonrpc: '2.0' as const, id: 1, result: { userId } };
    });

    const result = await pipeline.execute(makeRequest('test'), makeClient('c1', true));
    assert.ok(result && 'result' in result);
    assert.strictEqual((result as any).result.userId, 'user123');
  });
});

suite('Auth Middleware', () => {
  test('allows authenticated clients', async () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.use('auth', createAuthMiddleware(new Set(['auth.authenticate'])));
    pipeline.use('handler', async () => ({ jsonrpc: '2.0' as const, id: 1, result: 'ok' }));

    const result = await pipeline.execute(
      makeRequest('editor.openFile'),
      makeClient('c1', true)
    );

    assert.ok(result && 'result' in result);
  });

  test('blocks unauthenticated clients', async () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.use('auth', createAuthMiddleware(new Set(['auth.authenticate'])));
    pipeline.use('handler', async () => ({ jsonrpc: '2.0' as const, id: 1, result: 'ok' }));

    const result = await pipeline.execute(
      makeRequest('editor.openFile'),
      makeClient('c1', false)
    );

    assert.ok(result && 'error' in result, 'Should return error');
    assert.strictEqual(result.error.code, -32600);
  });

  test('allows auth.authenticate for unauthenticated clients', async () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.use('auth', createAuthMiddleware(new Set(['auth.authenticate'])));
    pipeline.use('handler', async () => ({ jsonrpc: '2.0' as const, id: 1, result: 'ok' }));

    const result = await pipeline.execute(
      makeRequest('auth.authenticate'),
      makeClient('c1', false)
    );

    assert.ok(result && 'result' in result);
  });
});

suite('Logging Middleware', () => {
  test('logs request and response', async () => {
    const logs: string[] = [];
    const pipeline = new MiddlewarePipeline();

    pipeline.use('logging', createLoggingMiddleware((msg) => logs.push(msg)));
    pipeline.use('handler', async () => ({ jsonrpc: '2.0' as const, id: 1, result: 'ok' }));

    await pipeline.execute(makeRequest('editor.openFile'), makeClient('c1', true));

    assert.strictEqual(logs.length, 2, 'Should log request and response');
    assert.ok(logs[0].includes('editor.openFile'), 'Should log method name');
    assert.ok(logs[1].includes('OK'), 'Should log success');
  });

  test('logs errors', async () => {
    const logs: string[] = [];
    const pipeline = new MiddlewarePipeline();

    pipeline.use('logging', createLoggingMiddleware((msg) => logs.push(msg)));
    pipeline.use('handler', async () => ({
      jsonrpc: '2.0' as const,
      id: 1,
      error: { code: -32600, message: 'bad' },
    }));

    await pipeline.execute(makeRequest('editor.openFile'), makeClient('c1', true));

    assert.ok(logs[1].includes('ERROR'), 'Should log error');
  });
});
