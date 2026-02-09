# Domain System Design

This document defines the **Domain System** for the AlephNet network. Domains provide a mechanism for logical grouping of nodes, resource management, and access control.

## 1. Motivation

As the network grows, a flat structure where every node is visible to every other node becomes unmanageable and potentially insecure. Users need a way to organize themselves into groups with shared rules, trust models, and resources.

**Problem**:
- **Scalability**: Discovering relevant peers in a global mesh is inefficient.
- **Privacy**: Users may want to interact only with a trusted subset of peers.
- **Governance**: Different communities may want different rules for interaction (e.g., a "High Security" domain vs. a "Public" domain).

**Solution**: Introduce **Domains** as first-class entities. A domain is a named, logical partition of the network with its own membership registry and access control policies.

## 2. Core Concepts

### 2.1 The Public Domain
- **ID**: `00000000-0000-0000-0000-000000000000` (or similar constant)
- **Name**: `Public`
- **Description**: The default domain for all nodes.
- **Rules**: Open access, standard trust rules apply.
- **Membership**: All nodes are automatically members.

### 2.2 Custom Domains
- Users can register new domains.
- Domains have a unique **Handle** (e.g., `@developers`, `@aleph_core`).
- Domains have an **Owner** (the creator's public key).
- Domains have a set of **Rules** defining who can join and what they can do.

## 3. Data Structures

### 3.1 Domain Definition

```typescript
export type DomainVisibility = 'public' | 'private' | 'secret';

export interface DomainRules {
  /** Minimum staking tier required to join */
  minStakingTier: StakingTier;
  
  /** Minimum reputation score (0.0 - 1.0) required to join */
  minReputation: number;
  
  /** If true, new members must be approved by an Admin */
  requiresApproval: boolean;
  
  /** List of allowed public keys (for private/secret domains) */
  whitelist?: string[];
  
  /** List of banned public keys */
  blacklist?: string[];
  
  /** 
   * Capabilities granted to members of this domain.
   * e.g., 'store:write' might be allowed within the domain context.
   */
  grantedCapabilities: Capability[];
}

export interface DomainDefinition {
  /** Unique identifier (UUID or Hash) */
  id: string;
  
  /** Unique human-readable handle (e.g., 'developers') */
  handle: string;
  
  /** Display name */
  name: string;
  
  /** Description of the domain */
  description: string;
  
  /** Public key of the domain owner */
  ownerId: string;
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Visibility level */
  visibility: DomainVisibility;
  
  /** Access and interaction rules */
  rules: DomainRules;
  
  /** Metadata (icon, tags, etc.) */
  metadata: Record<string, unknown>;
}
```

### 3.2 Domain Membership

```typescript
export type DomainRole = 'owner' | 'admin' | 'member' | 'guest';
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'banned';

export interface DomainMembership {
  /** The domain ID */
  domainId: string;
  
  /** The user's public key */
  userId: string;
  
  /** Current role in the domain */
  role: DomainRole;
  
  /** Membership status */
  status: MembershipStatus;
  
  /** When the user joined */
  joinedAt: number;
  
  /** Who approved the membership (if applicable) */
  approvedBy?: string;
}
```

## 4. Domain Lifecycle

### 4.1 Registration
1.  User submits a `domain:register` transaction/request.
2.  Network checks if `handle` is available (requires a unique index in GunDB).
3.  If available, a new `DomainDefinition` is created and signed by the user.
4.  The domain is indexed in the global domain registry (GunDB).

**Storage Schema**:
```javascript
// Root for all domains
gun.get('domains')

// Domain definition by ID
gun.get('domains').get(domainId).put(signedDomainDefinition)

// Unique handle index (handle -> domainId)
gun.get('domains').get('by_handle').get(handle).put(domainId)
```

### 4.2 Discovery
-   **Public Domains**: Listed in `gun.get('domains').get('public')`.
-   **Private Domains**: Visible if you know the handle/ID, but details may be redacted.
-   **Secret Domains**: Not listed; invite-only.

### 4.3 Joining a Domain
1.  **Open Domain**: User sends `domain:join`. If they meet `minStakingTier` and `minReputation`, they are added as `active` member.
2.  **Approval Required**: User sends `domain:join`. Status is `pending`. Admins receive a notification.
3.  **Invite Only**: Admin sends an `Invite` (signed envelope). User accepts.

**Membership Storage**:
```javascript
// Members of a domain
gun.get('domains').get(domainId).get('members').get(userId).put({
  role: 'member',
  status: 'active', // or 'pending'
  joinedAt: Date.now()
})

// User's joined domains
gun.get('users').get(userId).get('domains').get(domainId).put({
  role: 'member',
  joinedAt: Date.now()
})
```

### 4.4 Leaving/Banning
-   User can leave at any time (`domain:leave`).
-   Admins can ban users (`domain:ban`), adding them to the blacklist.
    -   Banned users are removed from `members` and added to `blacklist`.

## 5. Integration with Trust System

Domains act as a **Context** for trust evaluation.

### 5.1 Domain Trust Bonus
-   Interaction *within* a domain context (e.g., messaging a fellow domain member) carries a trust bonus.
-   The `TrustEvaluator` will check:
    ```typescript
    if (isDomainMember(userA, domainX) && isDomainMember(userB, domainX)) {
      trustScore += domainX.reputationBonus;
    }
    ```
-   If both users are members of a reputable domain, `socialDistance` might be effectively reduced.

### 5.2 Capability Gating via Domains
-   `TrustGate` can be configured to allow specific capabilities *only* within specific domains.
-   Example: `fs:write` might be allowed for the `@backup_service` domain but denied globally.
-   The `TrustAssessment` will include a `domainContext` field.

### 5.3 Resource Scoping
-   **GMF (Global Memory Field)**: Domains can have their own "Local Memory Field" (LMF) or a partitioned slice of the GMF.
-   **Services**: Services can be registered *only* to a specific domain, making them invisible to the public.

## 6. Implementation Plan

### Phase 1: Core Structures
-   Define `DomainDefinition`, `DomainRules`, `DomainMembership` types.
-   Implement `DomainRegistry` service (CRUD for domains).

### Phase 2: Membership Management
-   Implement `join`, `leave`, `approve`, `ban` workflows.
-   Update `IdentityManager` to track user's domains.

### Phase 3: Access Control & Enforcement
-   Update `TrustEvaluator` to consider domain membership.
-   Update `TrustGate` to enforce domain-specific rules.

### Phase 4: UI
-   "Domains" panel in the sidebar.
-   Domain creation wizard.
-   Domain discovery/browser.
-   Membership management UI for admins.

## 7. Impact on Existing Types

### 7.1 DSNNodeConfig Update
The existing `domain` field in `DSNNodeConfig` (client/src/shared/alephnet-types.ts) implies a single domain. We should update this to support multiple memberships.

```typescript
export interface DSNNodeConfig {
  // ... existing fields ...
  
  /** The node's primary domain (default: 'Public') */
  primaryDomain: string;
  
  /** List of all domain IDs the node is a member of */
  joinedDomains: string[];
  
  // ...
}
```

### 7.2 TrustAssessment Update
The `TrustAssessment` should include domain context.

```typescript
export interface TrustAssessment {
  // ... existing fields ...
  
  /** Domain context for this assessment, if applicable */
  domainContext?: {
    domainId: string;
    membershipStatus: MembershipStatus;
    role: DomainRole;
  };
}
```
