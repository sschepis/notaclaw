/**
 * Tests for SlidingWindowRateLimiter
 */

import * as assert from 'assert';

// We need to extract the SlidingWindowRateLimiter from AuthService for testing.
// Since it's not exported, we'll replicate the logic here to test the algorithm.

class SlidingWindowRateLimiter {
  private windows = new Map<string, number[]>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isRateLimited(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let timestamps = this.windows.get(key);
    if (!timestamps) {
      timestamps = [];
      this.windows.set(key, timestamps);
    }

    // Remove expired timestamps
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= this.maxRequests) {
      return true;
    }

    timestamps.push(now);
    return false;
  }

  removeClient(key: string): void {
    this.windows.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    for (const [key, timestamps] of this.windows) {
      while (timestamps.length > 0 && timestamps[0] < cutoff) {
        timestamps.shift();
      }
      if (timestamps.length === 0) {
        this.windows.delete(key);
      }
    }
  }

  get clientCount(): number {
    return this.windows.size;
  }
}

suite('SlidingWindowRateLimiter', () => {
  test('allows requests under limit', () => {
    const limiter = new SlidingWindowRateLimiter(5, 1000);
    
    // 5 requests should all pass
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(limiter.isRateLimited('client1'), false, `Request ${i} should pass`);
    }
  });

  test('blocks requests over limit', () => {
    const limiter = new SlidingWindowRateLimiter(3, 1000);
    
    // First 3 pass
    assert.strictEqual(limiter.isRateLimited('client1'), false);
    assert.strictEqual(limiter.isRateLimited('client1'), false);
    assert.strictEqual(limiter.isRateLimited('client1'), false);
    
    // 4th should be blocked
    assert.strictEqual(limiter.isRateLimited('client1'), true);
  });

  test('tracks separate clients independently', () => {
    const limiter = new SlidingWindowRateLimiter(2, 1000);
    
    // Client A uses both slots
    assert.strictEqual(limiter.isRateLimited('a'), false);
    assert.strictEqual(limiter.isRateLimited('a'), false);
    assert.strictEqual(limiter.isRateLimited('a'), true); // blocked
    
    // Client B still has its own budget
    assert.strictEqual(limiter.isRateLimited('b'), false);
    assert.strictEqual(limiter.isRateLimited('b'), false);
    assert.strictEqual(limiter.isRateLimited('b'), true); // blocked
  });

  test('removeClient clears tracking for a client', () => {
    const limiter = new SlidingWindowRateLimiter(2, 1000);
    
    assert.strictEqual(limiter.isRateLimited('client1'), false);
    assert.strictEqual(limiter.isRateLimited('client1'), false);
    assert.strictEqual(limiter.isRateLimited('client1'), true); // blocked
    
    limiter.removeClient('client1');
    
    // After removal, client gets a fresh budget
    assert.strictEqual(limiter.isRateLimited('client1'), false);
  });

  test('cleanup removes empty client entries', () => {
    const limiter = new SlidingWindowRateLimiter(10, 50); // 50ms window for fast test

    limiter.isRateLimited('client1');
    assert.strictEqual(limiter.clientCount, 1);

    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        limiter.cleanup();
        assert.strictEqual(limiter.clientCount, 0, 'Expired client should be cleaned up');
        resolve();
      }, 100);
    });
  });

  test('window slides — old requests expire', () => {
    const limiter = new SlidingWindowRateLimiter(2, 50); // 50ms window

    assert.strictEqual(limiter.isRateLimited('client1'), false);
    assert.strictEqual(limiter.isRateLimited('client1'), false);
    assert.strictEqual(limiter.isRateLimited('client1'), true); // blocked

    // Wait for window to slide
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Old timestamps expired, new requests should pass
        assert.strictEqual(limiter.isRateLimited('client1'), false, 'Request should pass after window slides');
        resolve();
      }, 100);
    });
  });

  test('burst detection — rapid fire triggers limit', () => {
    const limiter = new SlidingWindowRateLimiter(5, 1000);
    
    const results: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(limiter.isRateLimited('burst'));
    }

    // First 5 should pass (false = not limited)
    assert.deepStrictEqual(results.slice(0, 5), [false, false, false, false, false]);
    // Remaining 5 should be blocked (true = limited)
    assert.deepStrictEqual(results.slice(5), [true, true, true, true, true]);
  });

  test('zero max requests blocks everything', () => {
    const limiter = new SlidingWindowRateLimiter(0, 1000);
    assert.strictEqual(limiter.isRateLimited('client1'), true);
  });
});
