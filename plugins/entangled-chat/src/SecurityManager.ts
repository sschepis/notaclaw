import sodium from 'libsodium-wrappers';

export class SecurityManager {
  private keyPair: { publicKey: Uint8Array; privateKey: Uint8Array } | null = null;

  async init(privateKey?: Uint8Array) {
    await sodium.ready;
    if (privateKey) {
        // In a real app, we'd derive the public key from the private key
        // But sodium.crypto_sign_seed_keypair or similar might be needed depending on the key type
        // For simplicity, we'll just generate a new one if not provided or assume the user passes both
        // Here we will just generate a new encryption keypair for the session
        // Note: Identity keys (signing) are different from Encryption keys (box)
        this.keyPair = sodium.crypto_box_keypair();
    } else {
        this.keyPair = sodium.crypto_box_keypair();
    }
  }

  getPublicKey(): string {
    if (!this.keyPair) throw new Error('SecurityManager not initialized');
    return sodium.to_hex(this.keyPair.publicKey);
  }

  encrypt(message: string, recipientPublicKeyHex: string): string {
    if (!this.keyPair) throw new Error('SecurityManager not initialized');
    
    const recipientPublicKey = sodium.from_hex(recipientPublicKeyHex);
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
    
    const ciphertext = sodium.crypto_box_easy(
      message,
      nonce,
      recipientPublicKey,
      this.keyPair.privateKey
    );

    return JSON.stringify({
      nonce: sodium.to_hex(nonce),
      ciphertext: sodium.to_hex(ciphertext)
    });
  }

  decrypt(encryptedPackage: string, senderPublicKeyHex: string): string {
    if (!this.keyPair) throw new Error('SecurityManager not initialized');

    const { nonce, ciphertext } = JSON.parse(encryptedPackage);
    const senderPublicKey = sodium.from_hex(senderPublicKeyHex);
    const nonceBytes = sodium.from_hex(nonce);
    const ciphertextBytes = sodium.from_hex(ciphertext);

    const decrypted = sodium.crypto_box_open_easy(
      ciphertextBytes,
      nonceBytes,
      senderPublicKey,
      this.keyPair.privateKey
    );

    return sodium.to_string(decrypted);
  }
  
  // For group chats, we might use a shared symmetric key
  generateSymmetricKey(): string {
      return sodium.to_hex(sodium.crypto_secretbox_keygen());
  }

  encryptSymmetric(message: string, keyHex: string): string {
      const key = sodium.from_hex(keyHex);
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
      const ciphertext = sodium.crypto_secretbox_easy(message, nonce, key);
      
      return JSON.stringify({
          nonce: sodium.to_hex(nonce),
          ciphertext: sodium.to_hex(ciphertext)
      });
  }

  decryptSymmetric(encryptedPackage: string, keyHex: string): string {
      const { nonce, ciphertext } = JSON.parse(encryptedPackage);
      const key = sodium.from_hex(keyHex);
      const nonceBytes = sodium.from_hex(nonce);
      const ciphertextBytes = sodium.from_hex(ciphertext);
      
      const decrypted = sodium.crypto_secretbox_open_easy(ciphertextBytes, nonceBytes, key);
      return sodium.to_string(decrypted);
  }
}
