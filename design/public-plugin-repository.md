# Public Plugin Repository Design

## Overview
This document outlines the design for a decentralized plugin repository on AlephNet. This repository acts as a **metadata registry** and **licensing layer** for plugins hosted on NPM. It leverages AlephNet's distributed storage and economic primitives (AlephToken) to handle discovery, bonding, and monetization.

## Core Concepts

1.  **Metadata Registry:** Plugin metadata (name, description, version, NPM package) is stored on AlephNet, ensuring decentralized discovery.
2.  **Code Hosting:** The actual plugin code remains on NPM (or other package registries) for the MVP.
3.  **Bonding:** Publishers must bond AlephToken to publish a plugin. This prevents spam, ensures quality, and provides a mechanism for slashing in case of malicious behavior.
4.  **Monetization:** Publishers can charge fees (one-time or subscription) in AlephToken. The system manages licenses and payments.

## Data Schema

### 1. Plugin Manifest
Stored in the global **Marketplace Memory Field** (a public, consensus-driven field).

```typescript
interface PluginRegistryEntry {
  id: string; // Unique ID (e.g., @scope/name)
  name: string;
  description: string;
  npmPackage: string; // e.g., "@notaclaw/plugin-awesome"
  version: string;
  authorId: string; // AlephNet Identity
  
  // Economics
  bondAmount: number;
  pricing: {
    type: 'free' | 'one-time' | 'subscription';
    amount: number;
    currency: 'ALEPH';
    interval?: 'monthly' | 'yearly'; // For subscriptions
  };
  
  // Metadata
  tags: string[];
  icon?: string;
  website?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 2. License Record
Stored in the User's **Private Memory** and optionally hashed to a public ledger for verification.

```typescript
interface PluginLicense {
  pluginId: string;
  userId: string;
  type: 'perpetual' | 'subscription';
  status: 'active' | 'expired';
  purchasedAt: number;
  expiresAt?: number;
  transactionId: string; // Proof of payment
}
```

## Workflows

### 1. Publishing a Plugin
1.  **Developer** creates a plugin and publishes it to NPM.
2.  **Developer** calls `marketplace:publish` in Notaclaw.
3.  **System** verifies:
    - User has sufficient AlephToken for the **Bond** (e.g., 500 ALEPH).
    - Plugin ID is unique.
4.  **System** executes a `stake` transaction to lock the bond.
5.  **System** writes the `PluginRegistryEntry` to the Marketplace Memory Field.

### 2. Discovering Plugins
1.  **User** opens the Marketplace tab.
2.  **System** queries the Marketplace Memory Field for available plugins.
3.  **System** filters results based on compatibility and user preferences.

### 3. Installing & Purchasing
1.  **User** clicks "Install".
2.  **System** checks `pricing`.
3.  **If Free:**
    - System runs `npm install`.
    - System records a free license.
4.  **If Paid:**
    - System prompts User to confirm payment.
    - User signs a `transfer` transaction of `amount` ALEPH to `authorId`.
    - Upon transaction confirmation, System runs `npm install`.
    - System records a `PluginLicense` linked to the transaction.

### 4. License Verification (Runtime)
1.  When Notaclaw loads a plugin, it checks the `PluginRegistryEntry`.
2.  If the plugin is paid, it queries the User's `PluginLicense`.
3.  If no valid license is found, the plugin is disabled or restricted.

### 5. Unpublishing & Refunds
1.  **Developer** calls `marketplace:unpublish`.
2.  **System** marks the registry entry as "deprecated" or removes it.
3.  **System** initiates an `unstake` transaction for the Bond.
    - **Vesting Period:** The bond is returned after a safety delay (e.g., 30 days) to ensure no scams are reported post-exit.

## Economic Model

### Bonding
- **Purpose:** Anti-spam, Quality Assurance, Sybil Resistance.
- **Mechanism:** Tokens are locked in a staking contract or designated wallet.
- **Slashing:** If a plugin is verified as malicious (via Coherence Network consensus), the bond is slashed (burned or redistributed to victims).

### Fees
- **Platform Fee:** A small percentage (e.g., 1-5%) of purchase fees may be burned or sent to the AlephNet DAO treasury.
- **Publisher Revenue:** The remainder goes directly to the publisher.

## Technical Implementation

### AlephNet Client Updates
- Extend `AlephNetClient` to support `marketplace` namespace commands.
- Implement `BondingManager` to handle staking/unstaking logic.

### Marketplace Plugin
- The existing `plugins/marketplace` will be updated to serve as the frontend for this system.
- It will visualize the registry, handle search, and manage the install/purchase flow.

## Future Extensions
- **Decentralized Code Storage:** Move code from NPM to AlephNet Storage (IPFS-like) once mature.
- **DAO Governance:** Community voting on featured plugins or slashing events.
- **Automated Updates:** Subscriptions automatically trigger payment for updates.
