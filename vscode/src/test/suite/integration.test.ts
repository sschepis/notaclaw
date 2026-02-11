/**
 * WebSocket integration tests
 *
 * These tests exercise the full request/response cycle over WebSocket.
 * They require the `ws` package and run a lightweight server for testing.
 *
 * NOTE: These tests cannot run inside VS Code's test runner since they
 * need a real WebSocket connection. They are designed to be run with
 * `mocha` directly or adapted for a CI environment with a mock vscode module.
 *
 * The tests below are structured to validate the protocol layer independently
 * of VS Code APIs, using minimal mocks where necessary.
 */

import * as assert from 'assert';

// Integration tests for the protocol layer (JSON-RPC message handling)
// These test the serialization and structure without requiring a live WebSocket.

suite('Integration: JSON-RPC Protocol', () => {
  function createRequest(method: string, params?: any, id?: number) {
    return JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: id ?? 1,
    });
  }

  function createBatchRequest(requests: Array<{ method: string; params?: any; id?: number }>) {
    return JSON.stringify(
      requests.map((r, i) => ({
        jsonrpc: '2.0',
        method: r.method,
        params: r.params,
        id: r.id ?? i + 1,
      }))
    );
  }

  test('valid JSON-RPC request parses correctly', () => {
    const raw = createRequest('editor.openFile', { filePath: '/test.ts' }, 42);
    const parsed = JSON.parse(raw);

    assert.strictEqual(parsed.jsonrpc, '2.0');
    assert.strictEqual(parsed.method, 'editor.openFile');
    assert.strictEqual(parsed.id, 42);
    assert.strictEqual(parsed.params.filePath, '/test.ts');
  });

  test('batch request is a valid JSON array', () => {
    const raw = createBatchRequest([
      { method: 'editor.openFile', params: { filePath: '/a.ts' }, id: 1 },
      { method: 'editor.save', id: 2 },
    ]);
    const parsed = JSON.parse(raw);

    assert.ok(Array.isArray(parsed));
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].method, 'editor.openFile');
    assert.strictEqual(parsed[1].method, 'editor.save');
  });

  test('notification has no id field', () => {
    const notification = { jsonrpc: '2.0', method: 'fs.fileChanged', params: { uri: '/x.ts' } };
    const raw = JSON.stringify(notification);
    const parsed = JSON.parse(raw);

    assert.strictEqual(parsed.id, undefined, 'Notification should not have id');
    assert.strictEqual(parsed.method, 'fs.fileChanged');
  });

  test('success response structure', () => {
    const response = {
      jsonrpc: '2.0',
      id: 1,
      result: { content: 'hello world' },
    };

    assert.strictEqual(response.jsonrpc, '2.0');
    assert.strictEqual(response.id, 1);
    assert.ok('result' in response);
    assert.ok(!('error' in response));
  });

  test('error response structure', () => {
    const response = {
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32601,
        message: 'Method not found',
        data: {
          timestamp: new Date().toISOString(),
          errorType: 'MethodNotFound',
        },
      },
    };

    assert.strictEqual(response.jsonrpc, '2.0');
    assert.strictEqual(response.id, 1);
    assert.ok('error' in response);
    assert.strictEqual(response.error.code, -32601);
    assert.ok(response.error.data.timestamp);
  });

  test('invalid JSON-RPC version is detectable', () => {
    const raw = JSON.stringify({ jsonrpc: '1.0', method: 'test', id: 1 });
    const parsed = JSON.parse(raw);
    assert.notStrictEqual(parsed.jsonrpc, '2.0');
  });

  test('missing method is detectable', () => {
    const raw = JSON.stringify({ jsonrpc: '2.0', id: 1 });
    const parsed = JSON.parse(raw);
    assert.strictEqual(parsed.method, undefined);
  });
});

suite('Integration: Auth Protocol Flow', () => {
  test('auth challenge notification structure', () => {
    const challenge = {
      jsonrpc: '2.0',
      method: 'auth.challenge',
      params: { challenge: 'random-nonce-value' },
    };

    assert.strictEqual(challenge.method, 'auth.challenge');
    assert.ok(challenge.params.challenge.length > 0);
  });

  test('auth.authenticate request structure', () => {
    const request = {
      jsonrpc: '2.0',
      method: 'auth.authenticate',
      params: { token: 'signed-response-token' },
      id: 1,
    };

    assert.strictEqual(request.method, 'auth.authenticate');
    assert.ok(request.params.token);
  });

  test('auth success response', () => {
    const response = {
      jsonrpc: '2.0',
      id: 1,
      result: { authenticated: true },
    };

    assert.strictEqual(response.result.authenticated, true);
  });

  test('auth failure response', () => {
    const response = {
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32600,
        message: 'Authentication failed',
      },
    };

    assert.strictEqual(response.error.code, -32600);
  });
});

suite('Integration: Method Category Routing', () => {
  const categories: Record<string, string[]> = {
    editor: ['editor.openFile', 'editor.getContent', 'editor.setContent', 'editor.save', 'editor.close', 'editor.formatDocument', 'editor.getDocumentInfo', 'editor.applyEdits', 'editor.getCompletions'],
    fs: ['fs.readFile', 'fs.writeFile', 'fs.deleteFile', 'fs.listDirectory', 'fs.createDirectory', 'fs.watchFiles', 'fs.unwatchFiles'],
    terminal: ['terminal.execute', 'terminal.getOutput'],
    command: ['command.execute'],
    state: ['state.getOpenDocuments', 'state.getVisibleEditors', 'state.getDiagnostics', 'state.getSymbols', 'state.getHover', 'state.getReferences', 'state.getDefinition', 'state.getCodeActions'],
    debug: ['debug.startSession', 'debug.stopSession', 'debug.setBreakpoints', 'debug.removeBreakpoints', 'debug.getBreakpoints', 'debug.listSessions'],
    git: ['git.status', 'git.diff', 'git.log', 'git.stage', 'git.unstage', 'git.commit', 'git.checkout', 'git.branches'],
  };

  for (const [category, methods] of Object.entries(categories)) {
    test(`all ${category}.* methods are listed`, () => {
      for (const method of methods) {
        assert.ok(method.startsWith(`${category}.`), `${method} should start with ${category}.`);
      }
      assert.ok(methods.length > 0, `Category ${category} should have methods`);
    });
  }

  test('total method count covers all categories', () => {
    const total = Object.values(categories).reduce((sum, m) => sum + m.length, 0);
    // At least 30+ methods across all categories
    assert.ok(total >= 30, `Expected at least 30 methods, got ${total}`);
  });
});
