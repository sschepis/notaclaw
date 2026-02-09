# Quantum Vault

**Quantum Vault** provides a future-proof security layer for the AlephNet ecosystem. It uses post-quantum cryptographic algorithms (Kyber, Dilithium) to secure sensitive data against both classical and quantum threats.

## Features

- **PQC Encryption**: Encrypts sensitive memories and agent states using CRYSTALS-Kyber.
- **Quantum-Safe Signatures**: Signs all critical transactions and audit logs using CRYSTALS-Dilithium.
- **Secure Enclaves**: Integration with TEEs (Trusted Execution Environments) like Intel SGX or AWS Nitro (where available) to process data in isolation.
- **Key Rotation**: Automated, periodic rotation of quantum-safe keys.
- **Zero-Knowledge Access**: Allows agents to prove they have permission to access data without revealing the data itself or the key.

## Usage

1.  **Vault Initialization**: Generate a new PQC KeyTriplet.
2.  **Secret Storage**: Store API keys, medical records, or private journals in the vault.
    ```javascript
    await vault.store('my_secret', 'super_sensitive_data');
    ```
3.  **Agent Access**: Grant specific agents temporary, scoped access to secrets.
    ```javascript
    await vault.grantAccess('agent_123', 'my_secret', { duration: '5m' });
    ```

## Algorithms

- **KEM**: CRYSTALS-Kyber-1024
- **Signature**: CRYSTALS-Dilithium-5
- **Hash**: SHAKE-256

## License

MIT
