import sodium from 'libsodium-wrappers';
import { User } from './types';

export class IdentityManager {
  private user: User | null = null;
  private keyPair: { publicKey: Uint8Array; privateKey: Uint8Array } | null = null;

  async init(name: string): Promise<User> {
    await sodium.ready;
    this.keyPair = sodium.crypto_sign_keypair();
    if (!this.keyPair) throw new Error('Failed to generate key pair');
    const publicKeyHex = sodium.to_hex(this.keyPair.publicKey);
    
    // Simple DID-like identifier based on public key
    const id = `did:entangled:${publicKeyHex.substring(0, 16)}`;

    this.user = {
      id,
      publicKey: publicKeyHex,
      name,
    };

    return this.user;
  }

  getUser(): User | null {
    return this.user;
  }

  getPrivateKey(): Uint8Array | null {
    return this.keyPair ? this.keyPair.privateKey : null;
  }

  sign(message: string): string {
    if (!this.keyPair) throw new Error('Identity not initialized');
    const signature = sodium.crypto_sign_detached(message, this.keyPair.privateKey);
    return sodium.to_hex(signature);
  }

  verify(message: string, signature: string, publicKey: string): boolean {
    const signatureBytes = sodium.from_hex(signature);
    const publicKeyBytes = sodium.from_hex(publicKey);
    return sodium.crypto_sign_verify_detached(signatureBytes, message, publicKeyBytes);
  }
}
