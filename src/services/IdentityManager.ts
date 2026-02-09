import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import Gun from 'gun';
import 'gun/sea';
import { KeyTriplet } from '../shared/types';

const IDENTITY_FILE = 'identity.json';

// First 16 primes for resonance field computation
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53];

// Internal type that includes private keys
export interface StoredIdentity extends KeyTriplet {
  priv: string; // Ed25519 private key (base64)
  sea?: { pub: string, priv: string, epriv: string, epub: string }; // Gun SEA Keypair
}

export class IdentityManager {
  private identityPath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    this.identityPath = path.join(dataDir, IDENTITY_FILE);
  }

  async checkIdentity(): Promise<boolean> {
    try {
      await fs.access(this.identityPath);
      return true;
    } catch {
      return false;
    }
  }

  async createIdentity(): Promise<KeyTriplet> {
    // Ensure directory exists
    await fs.mkdir(path.dirname(this.identityPath), { recursive: true });

    // Generate Ed25519 Keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // Generate Gun SEA Keypair
    const seaPair = await Gun.SEA.pair();

    // Extract raw keys (base64 encoded)
    const cleanPub = this.stripPemHeaders(publicKey);
    const cleanPriv = this.stripPemHeaders(privateKey);

    // Compute prime-resonant identity fields from public key bytes
    const pubKeyBytes = Buffer.from(cleanPub, 'base64');
    const resonance = this.computeResonanceField(pubKeyBytes);
    const bodyPrimes = this.extractBodyPrimes(pubKeyBytes);
    const fingerprint = this.generateFingerprint(cleanPub);

    const identity: StoredIdentity = {
      pub: cleanPub,
      priv: cleanPriv,
      resonance,
      fingerprint,
      bodyPrimes,
      sea: seaPair
    };

    await this.saveIdentity(identity);
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { priv, sea, ...publicIdentity } = identity;
    return publicIdentity;
  }

  async importIdentity(jsonString: string): Promise<KeyTriplet> {
    try {
      const identity = JSON.parse(jsonString);
      
      // Basic validation
      if (!identity.pub || !identity.priv || !identity.resonance || !identity.fingerprint) {
        throw new Error('Invalid identity file format. Missing required fields.');
      }

      // If missing SEA keys, generate them
      if (!identity.sea) {
          identity.sea = await Gun.SEA.pair();
      }

      await this.saveIdentity(identity);
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { priv, sea, ...publicIdentity } = identity;
      return publicIdentity;
    } catch (error) {
      throw new Error(`Failed to import identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getIdentity(): Promise<StoredIdentity | null> {
    try {
      const data = await fs.readFile(this.identityPath, 'utf-8');
      const identity = JSON.parse(data);
      
      // Lazy migration: if SEA keys missing, generate and save
      if (!identity.sea) {
          identity.sea = await Gun.SEA.pair();
          await this.saveIdentity(identity);
      }
      
      return identity;
    } catch {
      return null;
    }
  }

  async getPublicIdentity(): Promise<StoredIdentity | null> {
    return await this.getIdentity();
  }

  private async saveIdentity(identity: StoredIdentity): Promise<void> {
      const data = JSON.stringify(identity, null, 2);
      await fs.writeFile(this.identityPath, data, { mode: 0o600 }); // Secure permissions
  }

  /**
   * Compute 16-dimensional resonance field from public key bytes.
   * Uses prime-based sinusoidal computation per the design spec.
   */
  private computeResonanceField(publicKey: Buffer): number[] {
    const resonance = new Array(16).fill(0);
    
    for (let i = 0; i < 16; i++) {
      let sum = 0;
      for (let j = 0; j < publicKey.length; j++) {
        // Prime-weighted sinusoidal contribution from each byte
        sum += publicKey[j] * Math.sin(PRIMES[i] * j / publicKey.length);
      }
      // Normalize to [-1, 1] range using tanh
      resonance[i] = Math.tanh(sum / publicKey.length);
    }
    
    return resonance;
  }

  /**
   * Extract body primes from key material.
   * Selects primes based on byte values modulo prime candidates.
   */
  private extractBodyPrimes(keyBytes: Buffer): number[] {
    // Extended prime list for body prime selection
    const PRIME_CANDIDATES = [
      2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53,
      59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113
    ];
    
    const bodyPrimes: number[] = [];
    const usedIndices = new Set<number>();
    
    // Use key bytes to select 8 unique primes
    for (let i = 0; i < keyBytes.length && bodyPrimes.length < 8; i++) {
      const primeIdx = keyBytes[i] % PRIME_CANDIDATES.length;
      if (!usedIndices.has(primeIdx)) {
        usedIndices.add(primeIdx);
        bodyPrimes.push(PRIME_CANDIDATES[primeIdx]);
      }
    }
    
    return bodyPrimes.sort((a, b) => a - b);
  }

  private generateFingerprint(pubKey: string): string {
    const hash = crypto.createHash('sha256').update(pubKey).digest('hex');
    return hash.substring(0, 16);
  }

  private stripPemHeaders(pem: string): string {
    return pem
      .replace(/-----BEGIN [A-Z ]+-----/g, '')
      .replace(/-----END [A-Z ]+-----/g, '')
      .replace(/\s/g, '');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cryptographic Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sign a message using Ed25519.
   * @param message - The message to sign (will be stringified if not a string)
   * @returns Base64-encoded signature
   */
  async sign(message: string | object): Promise<string> {
    const identity = await this.getIdentity();
    if (!identity) {
      throw new Error('No identity available for signing');
    }

    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    // Reconstruct PEM format for crypto.sign
    const pemPrivateKey = `-----BEGIN PRIVATE KEY-----\n${identity.priv.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
    
    const signature = crypto.sign(null, Buffer.from(messageStr, 'utf8'), pemPrivateKey);
    return signature.toString('base64');
  }

  /**
   * Verify a signature using Ed25519.
   * @param message - The original message
   * @param signature - Base64-encoded signature
   * @param publicKey - Base64-encoded public key (optional, uses own key if not provided)
   * @returns True if signature is valid
   */
  async verify(message: string | object, signature: string, publicKey?: string): Promise<boolean> {
    const pubKeyB64 = publicKey || (await this.getIdentity())?.pub;
    if (!pubKeyB64) {
      throw new Error('No public key available for verification');
    }

    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    // Reconstruct PEM format for crypto.verify
    const pemPublicKey = `-----BEGIN PUBLIC KEY-----\n${pubKeyB64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
    
    try {
      return crypto.verify(null, Buffer.from(messageStr, 'utf8'), pemPublicKey, Buffer.from(signature, 'base64'));
    } catch {
      return false;
    }
  }

  /**
   * Sign a message using Gun SEA (for cross-platform compatibility).
   * @param message - The message to sign
   * @returns SEA signature string
   */
  async seaSign(message: string | object): Promise<string> {
    const identity = await this.getIdentity();
    if (!identity?.sea) {
      throw new Error('No SEA keypair available for signing');
    }

    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    return await Gun.SEA.sign(messageStr, identity.sea);
  }

  /**
   * Verify a SEA signature.
   * @param signedMessage - The SEA-signed message
   * @param publicKey - SEA public key (optional)
   * @returns The original message if valid, false otherwise
   */
  async seaVerify(signedMessage: string, publicKey?: string): Promise<string | false> {
    const pubKey = publicKey || (await this.getIdentity())?.sea?.pub;
    if (!pubKey) {
      throw new Error('No SEA public key available for verification');
    }

    return await Gun.SEA.verify(signedMessage, pubKey);
  }

  /**
   * Perform ECDH key exchange using SEA.
   * @param recipientEpub - Recipient's ephemeral public key (epub from SEA pair)
   * @returns Shared secret for symmetric encryption
   */
  async deriveSharedSecret(recipientEpub: string): Promise<string> {
    const identity = await this.getIdentity();
    if (!identity?.sea) {
      throw new Error('No SEA keypair available for ECDH');
    }

    const secret = await Gun.SEA.secret(recipientEpub, identity.sea);
    if (!secret) {
      throw new Error('Failed to derive shared secret');
    }
    return secret;
  }

  /**
   * Encrypt data using SEA (uses ECDH-derived shared secret).
   * @param data - Data to encrypt
   * @param recipientEpub - Recipient's epub for ECDH, or undefined for self-encryption
   * @returns Encrypted string
   */
  async seaEncrypt(data: string | object, recipientEpub?: string): Promise<string> {
    const identity = await this.getIdentity();
    if (!identity?.sea) {
      throw new Error('No SEA keypair available for encryption');
    }

    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (recipientEpub) {
      // ECDH encryption for recipient
      const secret = await this.deriveSharedSecret(recipientEpub);
      return await Gun.SEA.encrypt(dataStr, secret);
    } else {
      // Self-encryption using own key pair
      return await Gun.SEA.encrypt(dataStr, identity.sea);
    }
  }

  /**
   * Decrypt data using SEA.
   * @param encryptedData - Encrypted string
   * @param senderEpub - Sender's epub for ECDH (if encrypted with shared secret)
   * @returns Decrypted data
   */
  async seaDecrypt(encryptedData: string, senderEpub?: string): Promise<string> {
    const identity = await this.getIdentity();
    if (!identity?.sea) {
      throw new Error('No SEA keypair available for decryption');
    }

    if (senderEpub) {
      // ECDH decryption
      const secret = await this.deriveSharedSecret(senderEpub);
      const result = await Gun.SEA.decrypt(encryptedData, secret);
      if (!result) {
        throw new Error('Decryption failed');
      }
      return result as string;
    } else {
      // Self-decryption
      const result = await Gun.SEA.decrypt(encryptedData, identity.sea);
      if (!result) {
        throw new Error('Decryption failed');
      }
      return result as string;
    }
  }
}
