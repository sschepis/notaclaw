import { arraysToGunObjects, gunObjectsToArrays } from '@sschepis/alephnet-node';

describe('AlephGunBridge Array Utilities', () => {
  describe('arraysToGunObjects', () => {
    it('should convert a simple array to an indexed object', () => {
      const input = [1, 2, 3];
      const result = arraysToGunObjects(input);
      
      expect(result).toEqual({
        _isArray: true,
        '0': 1,
        '1': 2,
        '2': 3
      });
    });

    it('should handle empty arrays', () => {
      const input: any[] = [];
      const result = arraysToGunObjects(input);
      
      expect(result).toEqual({ _isArray: true });
    });

    it('should handle nested arrays', () => {
      const input = [[1, 2], [3, 4]];
      const result = arraysToGunObjects(input);
      
      expect(result).toEqual({
        _isArray: true,
        '0': { _isArray: true, '0': 1, '1': 2 },
        '1': { _isArray: true, '0': 3, '1': 4 }
      });
    });

    it('should handle arrays inside objects', () => {
      const input = {
        name: 'test',
        values: [10, 20, 30],
        nested: {
          items: ['a', 'b']
        }
      };
      const result = arraysToGunObjects(input);
      
      expect(result).toEqual({
        name: 'test',
        values: { _isArray: true, '0': 10, '1': 20, '2': 30 },
        nested: {
          items: { _isArray: true, '0': 'a', '1': 'b' }
        }
      });
    });

    it('should pass through primitives unchanged', () => {
      expect(arraysToGunObjects('string')).toBe('string');
      expect(arraysToGunObjects(123)).toBe(123);
      expect(arraysToGunObjects(true)).toBe(true);
      expect(arraysToGunObjects(null)).toBe(null);
      expect(arraysToGunObjects(undefined)).toBe(undefined);
    });

    it('should handle DSNNodeConfig-like structures', () => {
      const input = {
        nodeId: 'node123',
        gunPeers: ['http://peer1.com', 'http://peer2.com'],
        keyTriplet: {
          pub: 'pubkey123',
          resonance: [0.1, 0.2, 0.3, 0.4],
          fingerprint: 'fp123',
          bodyPrimes: [2, 3, 5, 7]
        },
        primeDomain: [11, 13, 17],
        smfAxes: [1, 2, 3, 4],
        hostedSkills: ['skill1', 'skill2']
      };
      
      const result = arraysToGunObjects(input);
      
      expect(result.gunPeers._isArray).toBe(true);
      expect(result.gunPeers['0']).toBe('http://peer1.com');
      expect(result.keyTriplet.resonance._isArray).toBe(true);
      expect(result.keyTriplet.bodyPrimes._isArray).toBe(true);
      expect(result.primeDomain._isArray).toBe(true);
      expect(result.smfAxes._isArray).toBe(true);
      expect(result.hostedSkills._isArray).toBe(true);
    });
  });

  describe('gunObjectsToArrays', () => {
    it('should convert an indexed object back to an array', () => {
      const input = {
        _isArray: true,
        '0': 1,
        '1': 2,
        '2': 3
      };
      const result = gunObjectsToArrays(input);
      
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle empty array objects', () => {
      const input = { _isArray: true };
      const result = gunObjectsToArrays(input);
      
      expect(result).toEqual([]);
    });

    it('should handle nested array objects', () => {
      const input = {
        _isArray: true,
        '0': { _isArray: true, '0': 1, '1': 2 },
        '1': { _isArray: true, '0': 3, '1': 4 }
      };
      const result = gunObjectsToArrays(input);
      
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    it('should handle array objects inside regular objects', () => {
      const input = {
        name: 'test',
        values: { _isArray: true, '0': 10, '1': 20, '2': 30 },
        nested: {
          items: { _isArray: true, '0': 'a', '1': 'b' }
        }
      };
      const result = gunObjectsToArrays(input);
      
      expect(result).toEqual({
        name: 'test',
        values: [10, 20, 30],
        nested: {
          items: ['a', 'b']
        }
      });
    });

    it('should skip Gun internal metadata (_)', () => {
      const input = {
        _: { '#': 'soul123' }, // Gun internal metadata
        name: 'test',
        values: { _isArray: true, '0': 1, '1': 2 }
      };
      const result = gunObjectsToArrays(input);
      
      expect(result).toEqual({
        name: 'test',
        values: [1, 2]
      });
      expect(result._).toBeUndefined();
    });

    it('should pass through primitives unchanged', () => {
      expect(gunObjectsToArrays('string')).toBe('string');
      expect(gunObjectsToArrays(123)).toBe(123);
      expect(gunObjectsToArrays(true)).toBe(true);
      expect(gunObjectsToArrays(null)).toBe(null);
      expect(gunObjectsToArrays(undefined)).toBe(undefined);
    });

    it('should handle sparse array indices', () => {
      const input = {
        _isArray: true,
        '0': 'first',
        '2': 'third',
        '5': 'sixth'
      };
      const result = gunObjectsToArrays(input);
      
      // Should produce array with items at indices 0, 1, 2 (sorted by numeric key)
      expect(result).toEqual(['first', 'third', 'sixth']);
    });
  });

  describe('Round-trip conversion', () => {
    it('should preserve data through put->get cycle', () => {
      const original = {
        nodeId: 'node123',
        name: 'Test Node',
        gunPeers: ['http://peer1.com', 'http://peer2.com'],
        keyTriplet: {
          pub: 'pubkey123',
          resonance: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6],
          fingerprint: 'fp1234567890123456',
          bodyPrimes: [2, 3, 5, 7, 11, 13]
        },
        primeDomain: [17, 19, 23],
        smfAxes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
        hostedSkills: ['skill1', 'skill2', 'skill3'],
        loadIndex: 0.5,
        status: 'ONLINE'
      };

      // Simulate put (arrays -> gun objects)
      const gunData = arraysToGunObjects(original);
      
      // Verify arrays were converted
      expect(Array.isArray(gunData.gunPeers)).toBe(false);
      expect(gunData.gunPeers._isArray).toBe(true);
      
      // Simulate get (gun objects -> arrays)
      const restored = gunObjectsToArrays(gunData);
      
      // Should match original
      expect(restored).toEqual(original);
    });

    it('should handle complex nested structures', () => {
      const original = {
        thoughtBuffer: ['thought1', 'thought2'],
        pendingTools: {
          tool1: {
            callId: 'call1',
            smfContext: [0.1, 0.2, 0.3],
            resonanceKey: {
              primes: [2, 3, 5],
              hash: 'hash123',
              timestamp: Date.now()
            }
          }
        },
        sria: {
          entropyTrajectory: [0.5, 0.4, 0.3],
          currentBeliefs: [
            { id: 'b1', content: 'belief1', probability: 0.8, entropy: 0.2, primeFactors: [2, 3] },
            { id: 'b2', content: 'belief2', probability: 0.6, entropy: 0.4, primeFactors: [5, 7] }
          ]
        }
      };

      const gunData = arraysToGunObjects(original);
      const restored = gunObjectsToArrays(gunData);
      
      expect(restored).toEqual(original);
    });
  });
});
