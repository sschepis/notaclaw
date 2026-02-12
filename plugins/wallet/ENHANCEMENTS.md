# AlephNet Wallet — Enhancements

## Critical Issues

### 1. Key Management
- **Current**: Private keys might be stored insecurely.
- **Enhancement**: Integrate with the Secrets Manager plugin or a hardware wallet (Ledger, Trezor) to secure private keys. Never expose raw keys to the UI.
- **Priority**: Critical

### 2. Transaction Signing
- **Current**: Transactions might be signed automatically without user confirmation.
- **Enhancement**: Implement a secure transaction signing flow that requires explicit user approval for every transaction, displaying the details clearly.
- **Priority**: Critical

### 3. Network Security
- **Current**: RPC endpoints might be insecure or centralized.
- **Enhancement**: Allow users to configure custom RPC endpoints or connect to their own light node.
- **Priority**: High

---

## Functional Enhancements

### 4. Multi-Chain Support
- Support multiple blockchains (Ethereum, Solana, Polygon) and layer-2 networks.

### 5. Token Management
- Automatically discover and track ERC-20/SPL tokens associated with the user's address.

### 6. NFT Support
- Display and manage NFTs (ERC-721, ERC-1155) in a visual gallery.

### 7. Swap Integration
- Integrate with decentralized exchanges (Uniswap, Jupiter) to allow token swaps directly within the wallet.

---

## UI/UX Enhancements

### 8. Portfolio Overview
- Display the total portfolio value and asset allocation chart.

### 9. Transaction History
- Provide a detailed transaction history with filtering and export options.

### 10. Address Book
- Manage a list of frequently used addresses with custom labels.

---

## Testing Enhancements

### 11. Transaction Tests
- Test transaction signing and broadcasting on testnets.

### 12. Security Audits
- Conduct regular security audits of the wallet code.

---

## Architecture Enhancements

### 13. Wallet Connect Integration
- Support WalletConnect to connect the wallet to dApps.

### 14. Standardized Provider
- Expose a standard EIP-1193 provider to allow other plugins to interact with the wallet.
