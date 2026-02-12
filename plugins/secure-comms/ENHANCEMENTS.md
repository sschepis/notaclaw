# Secure Comms — Enhancements

## Critical Issues

### 1. Peer Discovery
- **Current**: Likely relies on a centralized signaling server or static peer list.
- **Enhancement**: Implement decentralized peer discovery using DSN or a DHT (Distributed Hash Table) to find peers without a central authority.
- **Priority**: Critical

### 2. Metadata Leakage
- **Current**: Metadata (who is talking to whom, when) might be exposed.
- **Enhancement**: Implement metadata protection techniques like onion routing (Tor) or mixnets (Nym) to obscure traffic patterns.
- **Priority**: High

### 3. Forward Secrecy
- **Current**: Encryption keys might be static.
- **Enhancement**: Implement Perfect Forward Secrecy (PFS) by rotating session keys frequently, ensuring that past messages cannot be decrypted even if the long-term key is compromised.
- **Priority**: High

---

## Functional Enhancements

### 4. File Transfer
- Support secure, encrypted file transfer between peers.

### 5. Group Messaging
- Enable secure group chats with dynamic membership and efficient key management (e.g., using Sender Keys).

### 6. Offline Messaging
- Support asynchronous messaging where messages are stored encrypted on relay nodes until the recipient comes online.

### 7. Burn-on-Read
- Add a feature to automatically delete messages after they have been read or after a certain time period.

---

## UI/UX Enhancements

### 8. Contact Verification
- Implement a user-friendly way to verify contacts (e.g., comparing safety numbers or scanning QR codes) to prevent man-in-the-middle attacks.

### 9. Status Indicators
- Show connection status, encryption status, and message delivery confirmation.

### 10. Theme Support
- Allow users to customize the chat interface with themes and colors.

---

## Testing Enhancements

### 11. Crypto Tests
- Rigorously test the cryptographic implementation against known vectors and edge cases.

### 12. Network Simulation
- Simulate various network conditions (latency, packet loss, NAT) to ensure reliable communication.

---

## Architecture Enhancements

### 13. Transport Agnostic
- Design the communication layer to be transport-agnostic, supporting TCP, UDP, WebSockets, and potentially others (Bluetooth, LoRa).

### 14. Pluggable Crypto
- Allow swapping cryptographic primitives or libraries to adapt to future security standards (e.g., post-quantum cryptography).
