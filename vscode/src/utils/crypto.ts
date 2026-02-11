/**
 * ECDH Key Exchange and Encryption Utilities for Pairing
 * 
 * Uses Node.js built-in crypto module with P-256 (prime256v1) curve
 * for ephemeral key exchange during the pairing handshake.
 */

import * as crypto from 'crypto';

export interface ECDHKeyPair {
  publicKey: string;   // Base64-encoded public key
  privateKey: string;  // Base64-encoded private key (kept in memory only)
}

/**
 * Generate an ephemeral ECDH key pair using the P-256 curve.
 */
export function generateECDHKeyPair(): ECDHKeyPair {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    publicKey: ecdh.getPublicKey('base64'),
    privateKey: ecdh.getPrivateKey('base64'),
  };
}

/**
 * Derive a shared secret from our private key and their public key.
 * Returns a 32-byte key suitable for AES-256-GCM encryption.
 */
export function deriveSharedSecret(ourPrivateKey: string, theirPublicKey: string): Buffer {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(Buffer.from(ourPrivateKey, 'base64'));
  const sharedSecret = ecdh.computeSecret(Buffer.from(theirPublicKey, 'base64'));
  // HKDF-expand the raw shared secret into a proper AES key
  return crypto.createHash('sha256').update(sharedSecret).digest();
}

/**
 * Encrypt data using AES-256-GCM with the derived shared secret.
 * Returns base64-encoded ciphertext with IV and auth tag prepended.
 */
export function encryptWithSharedSecret(data: string, sharedSecret: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sharedSecret, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: IV (12 bytes) + authTag (16 bytes) + ciphertext
  const result = Buffer.concat([iv, authTag, encrypted]);
  return result.toString('base64');
}

/**
 * Decrypt data encrypted with encryptWithSharedSecret.
 */
export function decryptWithSharedSecret(encryptedData: string, sharedSecret: Buffer): string {
  const data = Buffer.from(encryptedData, 'base64');
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generate a cryptographically secure 6-digit pairing code.
 * Range: 100000-999999 (always 6 digits)
 */
export function generatePairingCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate a secure random token for device authentication.
 * 32 bytes = 64 hex characters.
 */
export function generatePairingToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for storage using SHA-256.
 * We don't store raw tokens server-side — only hashes.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against a stored hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyTokenHash(token: string, storedHash: string): boolean {
  const tokenHash = hashToken(token);
  const tokenBuffer = Buffer.from(tokenHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');
  if (tokenBuffer.length !== storedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(tokenBuffer, storedBuffer);
}

/**
 * Generate a fingerprint from a public key for device identification.
 * Returns first 16 hex chars of SHA-256 hash.
 */
export function fingerprintPublicKey(publicKey: string): string {
  return crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 16);
}
