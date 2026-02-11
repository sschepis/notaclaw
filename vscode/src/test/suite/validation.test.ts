/**
 * Tests for method schema validation
 */

import * as assert from 'assert';
import { validateParams } from '../../server/MethodSchemas';

suite('Method Schema Validation', () => {
  // ── Required parameters ──────────────────────────────────────────────

  test('rejects missing required string parameter', () => {
    const error = validateParams('editor.openFile', {});
    assert.ok(error, 'Should return an error');
    assert.ok(error!.includes('filePath'), 'Should mention the missing parameter');
  });

  test('rejects missing params object for method with required params', () => {
    const error = validateParams('editor.openFile', undefined);
    assert.ok(error, 'Should return an error');
    assert.ok(error!.includes('filePath'), 'Should mention required parameter');
  });

  test('accepts valid params', () => {
    const error = validateParams('editor.openFile', { filePath: '/path/to/file.ts' });
    assert.strictEqual(error, null);
  });

  test('accepts noParams methods with no params', () => {
    const error = validateParams('editor.save', undefined);
    assert.strictEqual(error, null);
  });

  test('accepts noParams methods with empty object', () => {
    const error = validateParams('editor.save', {});
    assert.strictEqual(error, null);
  });

  // ── Type checking ────────────────────────────────────────────────────

  test('rejects wrong type — string expected, number given', () => {
    const error = validateParams('editor.openFile', { filePath: 123 });
    assert.ok(error, 'Should return an error');
    assert.ok(error!.includes('type'), 'Should mention type mismatch');
  });

  test('rejects wrong type — number expected, string given', () => {
    const error = validateParams('editor.insertText', {
      text: 'hello',
      line: '5', // should be number
      character: 0,
    });
    assert.ok(error, 'Should return an error');
    assert.ok(error!.includes('line') || error!.includes('type'));
  });

  test('rejects wrong type — array expected, string given', () => {
    const error = validateParams('editor.applyEdits', { edits: 'not-an-array' });
    assert.ok(error, 'Should return an error');
    assert.ok(error!.includes('array'));
  });

  // ── String constraints ───────────────────────────────────────────────

  test('rejects empty string when minLength > 0', () => {
    const error = validateParams('editor.openFile', { filePath: '' });
    assert.ok(error, 'Should reject empty string');
    assert.ok(error!.includes('character'));
  });

  test('accepts non-empty string when minLength = 1', () => {
    const error = validateParams('fs.readFile', { filePath: 'a' });
    assert.strictEqual(error, null);
  });

  // ── Number constraints ───────────────────────────────────────────────

  test('rejects negative number when min is 0', () => {
    const error = validateParams('editor.insertText', {
      text: 'hello',
      line: -1,
      character: 0,
    });
    assert.ok(error, 'Should reject negative line');
    assert.ok(error!.includes('line') || error!.includes('>= 0'));
  });

  test('accepts zero when min is 0', () => {
    const error = validateParams('editor.insertText', {
      text: 'hello',
      line: 0,
      character: 0,
    });
    assert.strictEqual(error, null);
  });

  // ── Array item type checking ─────────────────────────────────────────

  test('rejects array with wrong item types', () => {
    const error = validateParams('git.stage', { files: [123, 456] });
    assert.ok(error, 'Should reject non-string items in files array');
    assert.ok(error!.includes('string'));
  });

  test('accepts array with correct item types', () => {
    const error = validateParams('git.stage', { files: ['file1.ts', 'file2.ts'] });
    assert.strictEqual(error, null);
  });

  // ── Unknown methods ──────────────────────────────────────────────────

  test('skips validation for unknown methods', () => {
    const error = validateParams('unknown.method', { whatever: true });
    assert.strictEqual(error, null, 'Should pass through for unregistered methods');
  });

  // ── Complex method schemas ───────────────────────────────────────────

  test('validates state.getHover with all required params', () => {
    const error = validateParams('state.getHover', {
      filePath: '/path/file.ts',
      line: 10,
      character: 5,
    });
    assert.strictEqual(error, null);
  });

  test('rejects state.getHover with missing character', () => {
    const error = validateParams('state.getHover', {
      filePath: '/path/file.ts',
      line: 10,
    });
    assert.ok(error, 'Should require character parameter');
    assert.ok(error!.includes('character'));
  });

  test('validates debug.startSession', () => {
    const error = validateParams('debug.startSession', {
      name: 'Launch',
      type: 'node',
      request: 'launch',
    });
    assert.strictEqual(error, null);
  });

  test('validates git.commit', () => {
    const error = validateParams('git.commit', { message: 'fix: something' });
    assert.strictEqual(error, null);
  });

  test('rejects git.commit with empty message', () => {
    const error = validateParams('git.commit', { message: '' });
    assert.ok(error, 'Should reject empty commit message');
  });
});
