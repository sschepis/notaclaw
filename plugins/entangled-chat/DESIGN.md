# Entangled Chat Design Document

## 1. Overview
This document outlines the design for the "Entangled Chat" plugin enhancements. The goal is to transition from a basic prototype to a robust, decentralized, secure, and feature-rich communication system.

## 2. Architecture

The system will be layered as follows:

```
+-------------------------------------------------------+
|                   UI / Presentation                   |
+-------------------------------------------------------+
|                   Chat Engine                         |
| (Orchestration, Message Handling, Group Management)   |
+-------------------+-------------------+---------------+
|  Identity Manager |  Security Manager | Storage Manager|
| (DID, Keys, Auth) | (E2EE, Ratchet)   | (Persistence)  |
+-------------------+-------------------+---------------+
|                   Network Manager                     |
|      (Transport Abstraction, Discovery, Routing)      |
+-------------------------------------------------------+
```

## 3. Core Modules

### 3.1 Network Manager (Enhancements 1, 14, 6)
- **Responsibility**: Manages peer connections, data transmission, and peer discovery.
- **Technology**: `libp2p` for mesh networking.
- **Features**:
    - **Pluggable Transports**: Support WebSockets, WebRTC, and potentially Bluetooth LE.
    - **Discovery**: mDNS, DHT, and Bootstrap nodes.
    - **PubSub**: GossipSub for efficient message routing.
    - **Direct Connection**: Stream handling for direct/group chats.

### 3.2 Security Manager (Enhancements 2, 8, 11)
- **Responsibility**: End-to-End Encryption, Key Management.
- **Technology**: `libsodium-wrappers` (X3DH Key Agreement, Double Ratchet Algorithm).
- **Features**:
    - **Key Generation**: Identity keys, Pre-keys, One-time keys.
    - **Session Management**: Establishing secure sessions between peers.
    - **Encryption**: Authenticated encryption for messages.
    - **Verification**: Fingerprint generation for contact verification.

### 3.3 Storage Manager (Enhancements 3, 7)
- **Responsibility**: Local persistence and synchronization.
- **Technology**: `Gun.js` (Decentralized Graph Database) or `RxDB`.
- **Features**:
    - **Offline First**: Messages are saved locally first.
    - **Sync**: Automatic synchronization when peers are online.
    - **Schema**:
        - `users`: Profiles and public keys.
        - `conversations`: Metadata about chats.
        - `messages`: The actual message data.

### 3.4 Identity Manager (Enhancement 13)
- **Responsibility**: User identity and profile management.
- **Technology**: DID (Decentralized Identifiers).
- **Features**:
    - **DID Resolution**: Resolving user IDs to public keys.
    - **Profile Management**: Name, Avatar.

### 3.5 Chat Engine (Enhancements 4, 5, 9, 10)
- **Responsibility**: Business logic for messaging.
- **Features**:
    - **Message Types**: Text, Image, Video, File, Code.
    - **Groups**: Management of group participants and keys (Sender Keys).
    - **Status**: Handling delivery receipts (sent, delivered, read).
    - **Threading**: Linking messages to parents.

## 4. Data Models

### Message
```typescript
interface Message {
  id: string;
  conversationId: string;
  sender: string;
  content: string; // Encrypted payload
  type: 'text' | 'image' | 'video' | 'file' | 'code';
  timestamp: number;
  replyTo?: string; // ID of parent message
  status: 'pending' | 'sent' | 'delivered' | 'read';
}
```

### Conversation
```typescript
interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  name?: string; // For groups
  lastMessage?: Message;
  updatedAt: number;
}
```

## 5. Implementation Plan

1.  **Setup**: Install dependencies (`libp2p`, `gun`, `libsodium-wrappers`, `uuid`).
2.  **Security Layer**: Implement `SecurityManager` with key generation and encryption primitives.
3.  **Network Layer**: Implement `NetworkManager` using `libp2p`.
4.  **Storage Layer**: Implement `StorageManager` using `Gun.js`.
5.  **Core Logic**: Implement `ChatEngine` integrating the above layers.
6.  **Integration**: Update `src/index.ts` to expose the new functionality via DSN tools.
7.  **Testing**: Add unit and integration tests.

## 6. Enhancements Addressing

| Enhancement | Solution |
| :--- | :--- |
| 1. Centralized Relay | `libp2p` Mesh Network |
| 2. Basic Encryption | `libsodium` / Double Ratchet |
| 3. Ephemeral Storage | `Gun.js` Distributed Store |
| 4. Group Chat | `ChatEngine` logic + Sender Keys |
| 5. Rich Media | Message Type support (blobs handled via IPFS or direct stream) |
| 6. Voice/Video | `simple-peer` (WebRTC) integration in Network Manager |
| 7. Offline Messaging | `Gun.js` sync capabilities |
| 8. Contact Management | `IdentityManager` + Security verification |
| 9. Message Status | Protocol acknowledgments |
| 10. Threaded Replies | `replyTo` field in Message model |
| 11. E2EE Tests | Jest tests for Security Manager |
| 12. Resilience Tests | Simulation of peer churn in tests |
| 13. Identity Abstraction | DID based `IdentityManager` |
| 14. Pluggable Transport | `libp2p` transport configuration |
