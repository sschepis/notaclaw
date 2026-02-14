// client/src/shared/risa/entities.ts

// Primitive Types
export type Prime = number;
export type Phase = number;
export type Amplitude = number; // Simplified to magnitude
export type Entropy = number;

// Interfaces
export interface Serializable {
  toJSON(): string;
  toString(): string;
}

/**
 * ResonantFragment: Represents a holographic memory field.
 * It contains coefficients (mapping primes to amplitudes), a 2D center, and an entropy value.
 */
export class ResonantFragment implements Serializable {
  coeffs: Map<Prime, Amplitude>;
  center: [number, number];
  entropy: Entropy;

  constructor(coeffs: Map<Prime, Amplitude>, centerX: number, centerY: number, entropy: Entropy) {
    this.coeffs = coeffs;
    this.center = [centerX, centerY];
    this.entropy = entropy;
  }

  toJSON(): string {
    const obj = {
      entropy: this.entropy,
      center: this.center,
      coeffs: Object.fromEntries(this.coeffs)
    };
    return JSON.stringify(obj);
  }

  toString(): string {
    return this.toJSON();
  }
}

/**
 * EntangledNode: Represents a node in the Prime Resonance Network.
 */
export class EntangledNode implements Serializable {
  id: string;
  pri: [Prime, Prime, Prime];
  phaseRing: number[];
  coherence: number;

  constructor(id: string, p1: Prime, p2: Prime, p3: Prime) {
    this.id = id;
    this.pri = [p1, p2, p3];
    this.phaseRing = [];
    this.coherence = 0.0;
  }

  toJSON(): string {
    return JSON.stringify({
      id: this.id,
      pri: this.pri,
      phaseRing: this.phaseRing,
      coherence: this.coherence
    });
  }

  toString(): string {
    return this.toJSON();
  }
}

/**
 * Attractor: Represents a symbolic pattern or state the system resonates with.
 */
export class Attractor implements Serializable {
  symbol: string;
  primes: Prime[];
  targetPhase: Phase[];
  coherence: number;

  constructor(symbol: string, primes: Prime[], targetPhase: Phase[], coherence: number = 0.0) {
    this.symbol = symbol;
    this.primes = primes;
    this.targetPhase = targetPhase;
    this.coherence = coherence;
  }

  toJSON(): string {
    return JSON.stringify({
      symbol: this.symbol,
      primes: this.primes,
      targetPhase: this.targetPhase,
      coherence: this.coherence
    });
  }

  toString(): string {
    return this.toJSON();
  }
}
