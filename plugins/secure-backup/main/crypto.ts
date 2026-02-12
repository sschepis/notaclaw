import * as crypto from 'crypto';
import { EncryptedPayload } from '../types';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;       // 256 bits
const IV_LENGTH = 16;        // 128 bits
const SALT_LENGTH = 32;      // 256 bits
const AUTH_TAG_LENGTH = 16;  // 128 bits
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = 'sha512';

export class CryptoEngine {
  /**
   * Derive a 256-bit key from a passphrase using PBKDF2.
   */
  deriveKey(passphrase: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      passphrase,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      PBKDF2_DIGEST
    );
  }

  /**
   * Encrypt data with AES-256-GCM using a passphrase.
   * Returns salt, IV, auth tag, and ciphertext — everything needed for decryption
   * except the passphrase itself.
   */
  encrypt(data: Buffer, passphrase: string): EncryptedPayload {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.deriveKey(passphrase, salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });

    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
      salt,
      iv,
      authTag,
      ciphertext: encrypted
    };
  }

  /**
   * Decrypt an AES-256-GCM encrypted payload using a passphrase.
   * Throws if the passphrase is wrong or data is corrupted (GCM auth fails).
   */
  decrypt(payload: EncryptedPayload, passphrase: string): Buffer {
    const key = this.deriveKey(passphrase, payload.salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, payload.iv, {
      authTagLength: AUTH_TAG_LENGTH
    });

    decipher.setAuthTag(payload.authTag);

    const decrypted = Buffer.concat([
      decipher.update(payload.ciphertext),
      decipher.final()
    ]);

    return decrypted;
  }

  /**
   * Compute SHA-256 checksum of a buffer, returned as hex string.
   */
  computeChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify a SHA-256 checksum against a buffer.
   */
  verifyChecksum(data: Buffer, expected: string): boolean {
    const actual = this.computeChecksum(data);
    return crypto.timingSafeEqual(
      Buffer.from(actual, 'hex'),
      Buffer.from(expected, 'hex')
    );
  }

  /**
   * Compute a hash of a string value (for incremental backup diffing).
   */
  hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate a unique backup ID.
   */
  generateId(): string {
    return Date.now().toString(36) + '-' + crypto.randomBytes(6).toString('hex');
  }
}
