# Wallet & Token Economics

The **Aleph Token (ℵ)** is the native currency of the AlephNet mesh. This document defines the wallet interface, staking mechanics, payment flows, and token economics.

## Token Overview

| Property | Value |
|----------|-------|
| Symbol | ℵ (ALEPH) |
| Decimals | 18 |
| Total Supply | 1,000,000,000 ℵ |
| Distribution | 40% Network Rewards, 30% Staking, 20% Development, 10% Reserve |

## Wallet Interface

```typescript
/**
 * AlephWallet - Client-side wallet for managing Aleph tokens
 */
export interface AlephWallet {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  
  /** Associated KeyTriplet */
  readonly keyTriplet: KeyTriplet;
  
  /** Wallet address (derived from KeyTriplet fingerprint) */
  readonly address: string;
  
  // ═══════════════════════════════════════════════════════════════
  // BALANCE
  // ═══════════════════════════════════════════════════════════════
  
  /** Get current balance */
  getBalance(): Promise<WalletBalance>;
  
  /** Subscribe to balance changes */
  onBalanceChange(callback: (balance: WalletBalance) => void): () => void;
  
  // ═══════════════════════════════════════════════════════════════
  // TRANSFERS
  // ═══════════════════════════════════════════════════════════════
  
  /** Transfer tokens to another address */
  transfer(
    to: string,
    amount: bigint,
    options?: TransferOptions
  ): Promise<TransactionReceipt>;
  
  /** Batch transfer to multiple recipients */
  batchTransfer(
    transfers: Array<{ to: string; amount: bigint }>
  ): Promise<TransactionReceipt[]>;
  
  // ═══════════════════════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════════════════════
  
  /** Authorize a payment (escrow until service confirms) */
  authorizePayment(
    to: string,
    maxAmount: bigint,
    purpose: PaymentPurpose,
    expiresIn?: number
  ): Promise<PaymentAuthorization>;
  
  /** Finalize an authorized payment */
  finalizePayment(
    authorizationId: string,
    actualAmount?: bigint
  ): Promise<TransactionReceipt>;
  
  /** Cancel an authorized payment (refund to sender) */
  cancelPayment(authorizationId: string): Promise<TransactionReceipt>;
  
  // ═══════════════════════════════════════════════════════════════
  // STAKING
  // ═══════════════════════════════════════════════════════════════
  
  /** Stake tokens to achieve a tier */
  stake(amount: bigint, lockPeriod: LockPeriod): Promise<StakeReceipt>;
  
  /** Unstake tokens (subject to lock period) */
  unstake(stakeId: string): Promise<UnstakeReceipt>;
  
  /** Claim staking rewards */
  claimRewards(): Promise<TransactionReceipt>;
  
  /** Get staking summary */
  getStakingSummary(): Promise<StakingSummary>;
  
  // ═══════════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════════
  
  /** Get transaction history */
  getTransactions(options?: {
    limit?: number;
    offset?: number;
    type?: TransactionType[];
    since?: number;
  }): Promise<Transaction[]>;
}

/**
 * Balance breakdown
 */
export interface WalletBalance {
  /** Total balance (available + staked + pending) */
  total: bigint;
  
  /** Available for spending */
  available: bigint;
  
  /** Currently staked */
  staked: bigint;
  
  /** Pending unstake (in lock period) */
  pendingUnstake: bigint;
  
  /** Reserved for authorized payments */
  reserved: bigint;
  
  /** Unclaimed rewards */
  unclaimedRewards: bigint;
  
  /** Current staking tier */
  stakingTier: 'Neophyte' | 'Adept' | 'Magus' | 'Archon';
  
  /** Last updated timestamp */
  updatedAt: number;
}
```

## Staking System

### Tier Requirements

| Tier | Min Stake | Lock Period | APY | Benefits |
|------|-----------|-------------|-----|----------|
| **Neophyte** | 0 ℵ | - | 0% | Basic access |
| **Adept** | 100 ℵ | 7 days | 3% | Private rooms, SRIA basic |
| **Magus** | 1,000 ℵ | 30 days | 5% | Priority routing, advanced SRIA |
| **Archon** | 10,000 ℵ | 90 days | 8% | Governance, node rewards |

### Staking Interface

```typescript
export type LockPeriod = '7d' | '30d' | '90d' | '180d' | '365d';

export interface StakeReceipt {
  stakeId: string;
  amount: bigint;
  lockPeriod: LockPeriod;
  lockEndsAt: number;
  estimatedApy: number;
  newTier: StakingTier;
  previousTier: StakingTier;
  transactionId: string;
}

export interface StakingSummary {
  currentTier: StakingTier;
  totalStaked: bigint;
  
  stakes: Array<{
    stakeId: string;
    amount: bigint;
    lockedUntil: number;
    canUnstake: boolean;
    accruedRewards: bigint;
  }>;
  
  rewards: {
    totalEarned: bigint;
    unclaimed: bigint;
    nextDistribution: number;
    estimatedNextReward: bigint;
  };
  
  nextTier: {
    tier: StakingTier;
    additionalStakeRequired: bigint;
    benefits: string[];
  } | null;
}

/**
 * Staking rewards are distributed based on:
 * 1. Stake amount (linear)
 * 2. Lock period (multiplier: 7d=1x, 30d=1.2x, 90d=1.5x, 180d=2x, 365d=3x)
 * 3. Participation (proposal voting, coherence verification)
 */
export interface RewardCalculation {
  baseReward: bigint;
  lockMultiplier: number;
  participationBonus: bigint;
  totalReward: bigint;
  epoch: number;
}
```

## Payment Flows

### Service Payment Flow

```typescript
/**
 * Payment authorization for service calls
 */
export interface PaymentAuthorization {
  id: string;
  from: string;
  to: string;
  maxAmount: bigint;
  purpose: PaymentPurpose;
  status: 'PENDING' | 'FINALIZED' | 'CANCELLED' | 'EXPIRED';
  createdAt: number;
  expiresAt: number;
  finalizedAmount?: bigint;
  transactionId?: string;
}

export type PaymentPurpose = 
  | { type: 'SERVICE_CALL'; serviceId: string; endpointName: string }
  | { type: 'TASK_EXECUTION'; taskId: string }
  | { type: 'SUBSCRIPTION'; serviceId: string; tierName: string }
  | { type: 'TIP'; recipientId: string }
  | { type: 'STAKE'; lockPeriod: LockPeriod }
  | { type: 'COHERENCE_STAKE'; claimId: string; vote: 'SUPPORT' | 'CONTEST' };

/**
 * Example: Paying for a service call
 */
async function payForService(
  wallet: AlephWallet,
  service: ServiceDefinition,
  endpoint: string
): Promise<void> {
  // 1. Calculate estimated cost
  const cost = calculateServiceCost(service, endpoint);
  
  // 2. Authorize payment (escrow)
  const auth = await wallet.authorizePayment(
    service.providerNodeId,
    cost * 12n / 10n,  // 20% buffer
    { type: 'SERVICE_CALL', serviceId: service.id, endpointName: endpoint },
    60000  // 1 minute expiry
  );
  
  // 3. Execute service call
  try {
    const result = await serviceClient.call(service.id, endpoint, input);
    
    // 4. Finalize payment with actual cost
    await wallet.finalizePayment(auth.id, result.cost);
  } catch (error) {
    // 5. Cancel payment on failure
    await wallet.cancelPayment(auth.id);
    throw error;
  }
}
```

### Subscription Flow

```typescript
async function subscribeToService(
  wallet: AlephWallet,
  serviceId: string,
  tierName: string
): Promise<ServiceSubscription> {
  const service = await registry.getService(serviceId);
  const tier = service.pricing.subscriptionTiers?.find(t => t.name === tierName);
  
  // Direct transfer for subscriptions
  const receipt = await wallet.transfer(
    service.providerNodeId,
    BigInt(tier.price * 1e18),
    {
      purpose: { type: 'SUBSCRIPTION', serviceId, tierName },
      memo: `Subscription to ${service.name} - ${tierName}`
    }
  );
  
  return registry.createSubscription({
    serviceId,
    subscriberId: wallet.address,
    tierName,
    transactionId: receipt.transactionId
  });
}
```

## Token Ledger

### Graph Schema

```javascript
// gun.get('ledger')
{
  // Account balances
  accounts: {
    'address_1': {
      available: '1000000000000000000000',  // String for bigint
      staked: '500000000000000000000',
      pendingUnstake: '0',
      reserved: '50000000000000000000',
      updatedAt: 1707238800000
    }
  },
  
  // Transactions
  transactions: {
    'tx_id_1': Transaction,
    'tx_id_2': Transaction
  },
  
  // Stakes
  stakes: {
    'stake_id_1': {
      owner: 'address_1',
      amount: '500000000000000000000',
      lockPeriod: '90d',
      lockedUntil: 1707238800000,
      rewards: '12500000000000000000'
    }
  },
  
  // Payment authorizations
  authorizations: {
    'auth_id_1': PaymentAuthorization
  },
  
  // Reward pool
  rewardPool: {
    totalPool: '100000000000000000000000',
    distributedThisEpoch: '1000000000000000000000',
    currentEpoch: 42,
    nextDistribution: 1707238800000
  }
}
```

### Transaction Types

```typescript
export type TransactionType = 
  | 'TRANSFER'
  | 'STAKE'
  | 'UNSTAKE'
  | 'REWARD_CLAIM'
  | 'SERVICE_PAYMENT'
  | 'SUBSCRIPTION'
  | 'COHERENCE_STAKE'
  | 'COHERENCE_REWARD'
  | 'TIP'
  | 'NETWORK_FEE';

export interface Transaction {
  id: string;
  type: TransactionType;
  from: string;
  to: string;
  amount: bigint;
  fee: bigint;
  timestamp: number;
  blockNumber?: number;
  
  purpose?: PaymentPurpose;
  memo?: string;
  
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  confirmations: number;
  
  // For coherence network
  coherenceProof?: {
    tickNumber: number;
    smfHash: string;
  };
}
```

## Revenue Distribution

### Service Revenue Split

```typescript
interface RevenueDistribution {
  provider: number;  // 70-90% to service provider
  network: number;   // 5-15% network fee
  stakers: number;   // 5-15% to stakers
}

// Example distribution
const defaultDistribution: RevenueDistribution = {
  provider: 0.80,
  network: 0.10,
  stakers: 0.10
};

/**
 * Process service payment
 */
async function processServicePayment(
  payment: PaymentAuthorization,
  service: ServiceDefinition
): Promise<void> {
  const amount = payment.finalizedAmount!;
  const dist = service.pricing.revenueDistribution;
  
  // Calculate splits
  const providerAmount = amount * BigInt(Math.floor(dist.provider * 1000)) / 1000n;
  const networkAmount = amount * BigInt(Math.floor(dist.network * 1000)) / 1000n;
  const stakersAmount = amount - providerAmount - networkAmount;
  
  // Execute transfers
  await ledger.credit(service.providerNodeId, providerAmount, 'SERVICE_PAYMENT');
  await ledger.credit(NETWORK_TREASURY, networkAmount, 'NETWORK_FEE');
  await rewardPool.addToPool(stakersAmount);
}
```

### Reward Distribution Schedule

```typescript
/**
 * Rewards are distributed every epoch (24 hours)
 */
interface RewardEpoch {
  epochNumber: number;
  startTime: number;
  endTime: number;
  
  // Pool for this epoch
  totalPool: bigint;
  distributionComplete: boolean;
  
  // Participants
  participants: Array<{
    address: string;
    stakeAmount: bigint;
    lockMultiplier: number;
    participationScore: number;
    reward: bigint;
  }>;
}

async function distributeRewards(epoch: RewardEpoch): Promise<void> {
  // Calculate total weight
  let totalWeight = 0n;
  for (const p of epoch.participants) {
    const weight = p.stakeAmount * 
      BigInt(Math.floor(p.lockMultiplier * 100)) *
      BigInt(Math.floor(p.participationScore * 100)) / 10000n;
    totalWeight += weight;
  }
  
  // Distribute proportionally
  for (const p of epoch.participants) {
    const weight = p.stakeAmount * 
      BigInt(Math.floor(p.lockMultiplier * 100)) *
      BigInt(Math.floor(p.participationScore * 100)) / 10000n;
    
    p.reward = epoch.totalPool * weight / totalWeight;
    await ledger.creditReward(p.address, p.reward);
  }
  
  epoch.distributionComplete = true;
}
```

## Coherence Staking

### Staking on Claims

```typescript
interface CoherenceStakeAction {
  claimId: string;
  amount: bigint;
  vote: 'SUPPORT' | 'CONTEST';
}

/**
 * Stake on a coherence claim
 */
async function stakeOnClaim(
  wallet: AlephWallet,
  action: CoherenceStakeAction
): Promise<void> {
  // 1. Lock tokens
  await wallet.authorizePayment(
    COHERENCE_ESCROW,
    action.amount,
    { type: 'COHERENCE_STAKE', claimId: action.claimId, vote: action.vote }
  );
  
  // 2. Record stake
  await coherenceNetwork.recordStake(
    wallet.address,
    action.claimId,
    action.amount,
    action.vote
  );
}

/**
 * Resolve claim and distribute stakes
 */
async function resolveClaim(claimId: string): Promise<void> {
  const claim = await coherenceNetwork.getClaim(claimId);
  
  if (claim.status === 'ACCEPTED') {
    // Supporters win: get back stake + share of contesters
    const supporterPool = claim.contestStake;
    distributeToStakers(claim.supporters, supporterPool);
    refundStakes(claim.supporters);
    // Contesters lose their stake (already in pool)
  } else if (claim.status === 'REJECTED') {
    // Contesters win: get back stake + share of supporters
    const contesterPool = claim.supportStake;
    distributeToStakers(claim.contesters, contesterPool);
    refundStakes(claim.contesters);
  } else if (claim.status === 'SYNTHESIZED') {
    // Partial reward to both sides
    refundStakes(claim.supporters, 0.8);
    refundStakes(claim.contesters, 0.8);
    // 20% goes to synthesis reward pool
  }
}
```

## Network Treasury

```typescript
interface NetworkTreasury {
  // Balances
  operatingBalance: bigint;
  developmentFund: bigint;
  emergencyReserve: bigint;
  
  // Allocations
  allocations: {
    nodeRewards: number;      // 40% of fees
    development: number;      // 30% of fees
    stakers: number;          // 20% of fees
    reserve: number;          // 10% of fees
  };
  
  // Governance-controlled parameters
  parameters: {
    baseFeeRate: number;      // 10% default
    minStakeForTier: Record<StakingTier, bigint>;
    rewardMultipliers: Record<LockPeriod, number>;
    consensusThreshold: number;
  };
}

// Only Archons can propose parameter changes
async function proposeParameterChange(
  proposer: string,
  parameter: keyof NetworkTreasury['parameters'],
  newValue: any
): Promise<void> {
  const proposerTier = await getStakingTier(proposer);
  if (proposerTier !== 'Archon') {
    throw new Error('Only Archons can propose parameter changes');
  }
  
  await governance.createProposal({
    type: 'PARAMETER_CHANGE',
    proposer,
    parameter,
    currentValue: treasury.parameters[parameter],
    proposedValue: newValue,
    votingEnds: Date.now() + 7 * 24 * 60 * 60 * 1000  // 7 days
  });
}
```
