# Entangled Chat — Enhancements

## Critical Issues

### 1. Centralized Relay
- **Current**: Likely relies on a central server or simple P2P relay for message delivery.
- **Enhancement**: Transition to a fully decentralized mesh network (using DSN or libp2p) for message routing, ensuring no single point of failure.
- **Priority**: Critical

### 2. Basic Encryption
- **Current**: Encryption might be basic or missing.
- **Enhancement**: Implement end-to-end encryption (E2EE) using Signal Protocol or similar robust standards. Ensure forward secrecy and post-compromise security.
- **Priority**: Critical

### 3. Ephemeral Storage
- **Current**: Messages might be stored only in memory or local storage without synchronization.
- **Enhancement**: Implement a distributed message store (using Gun.js or OrbitDB) to sync messages across devices while maintaining privacy.
- **Priority**: High

---

## Functional Enhancements

### 4. Group Chat
- Support private group chats with E2EE and dynamic membership management.

### 5. Rich Media Support
- Allow sending images, videos, files, and code snippets with inline preview.

### 6. Voice/Video Calls
- Integrate WebRTC for peer-to-peer voice and video calls.

### 7. Offline Messaging
- Store messages locally when offline and automatically sync when connectivity is restored. Support store-and-forward via blind relays.

---

## UI/UX Enhancements

### 8. Contact Management
- Manage contacts, block users, and verify identities (using fingerprints or QR codes).

### 9. Message Status
- Show message status indicators (sent, delivered, read).

### 10. Threaded Replies
- Support threaded replies to keep conversations organized.

---

## Testing Enhancements

### 11. E2EE Tests
- Verify that messages are correctly encrypted and decrypted, and that keys are securely managed.

### 12. Network Resilience Tests
- Test message delivery under poor network conditions and during peer churn.

---

## Architecture Enhancements

### 13. Identity Abstraction
- Decouple identity from the chat protocol, allowing users to use their DSN identity or other decentralized identifiers (DIDs).

### 14. Pluggable Transport
- Allow switching between different transport layers (WebSockets, WebRTC, Bluetooth LE) based on network availability.
