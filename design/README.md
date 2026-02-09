# AlephNet-Integrated Durable Agent Mesh - Design Documentation

This folder contains the comprehensive design documentation for the AlephNet-Integrated Durable Agent Mesh architecture.

## Document Structure

### Core Architecture

| File | Description |
|------|-------------|
| [01-overview.md](./01-overview.md) | High-level architecture and paradigm |
| [02-integration.md](./02-integration.md) | Core integration points between Gun.js and AlephNet |
| [03-data-schema.md](./03-data-schema.md) | Unified data graph schema |
| [04-workflows.md](./04-workflows.md) | Offline-first durability and SRIA agent loop workflows |
| [05-agentic-requirements.md](./05-agentic-requirements.md) | Tool calls, skill registry, and semantic routing |
| [06-technical-stack.md](./06-technical-stack.md) | Technical stack and topology |
| [07-typescript-definitions.md](./07-typescript-definitions.md) | Complete TypeScript interfaces |

### Features

| File | Description |
|------|-------------|
| [08-tasks.md](./08-tasks.md) | Task entity for recurring/triggered processes |
| [09-services.md](./09-services.md) | Network services and monetization |
| [10-semantic-storage.md](./10-semantic-storage.md) | Semantic content storage and retrieval |

### Reference

| File | Description |
|------|-------------|
| [11-reference.md](./11-reference.md) | Reference tables (domains, tiers, bootstrap) |

### Infrastructure

| File | Description |
|------|-------------|
| [12-wallet-economics.md](./12-wallet-economics.md) | Wallet interface, staking, and token economics |
| [13-embedding-service.md](./13-embedding-service.md) | SMF projection and embedding caching |
| [14-error-recovery.md](./14-error-recovery.md) | Systematic error handling and recovery |
| [15-events.md](./15-events.md) | Event system for task triggers and pub/sub |
| [16-security.md](./16-security.md) | Authentication, authorization, encryption |
| [17-observability.md](./17-observability.md) | Logging, metrics, and distributed tracing |
| [18-dependencies.md](./18-dependencies.md) | Third-party npm packages |

### Client & Extensibility

| File | Description |
|------|-------------|
| [19-electron-client.md](./19-electron-client.md) | Electron client architecture |
| [20-plugin-architecture.md](./20-plugin-architecture.md) | Plugin system design |
| [21-user-session-interface.md](./21-user-session-interface.md) | User session and native control interface |

## Quick Start

### For High-Level Understanding

1. **[01-overview.md](./01-overview.md)** - Understand the paradigm shift
2. **[02-integration.md](./02-integration.md)** - See how Gun.js and AlephNet work together
3. **[06-technical-stack.md](./06-technical-stack.md)** - See the topology diagram

### For Implementation

1. **[07-typescript-definitions.md](./07-typescript-definitions.md)** - All TypeScript interfaces
2. **[03-data-schema.md](./03-data-schema.md)** - Database structure
3. **[04-workflows.md](./04-workflows.md)** - Workflow diagrams and code
4. **[18-dependencies.md](./18-dependencies.md)** - Required npm packages

### For Features

1. **[08-tasks.md](./08-tasks.md)** - Scheduled and triggered automation
2. **[09-services.md](./09-services.md)** - Monetizable service layer
3. **[10-semantic-storage.md](./10-semantic-storage.md)** - Content storage with semantic search

### For Operations

1. **[14-error-recovery.md](./14-error-recovery.md)** - Error handling strategies
2. **[16-security.md](./16-security.md)** - Security architecture
3. **[17-observability.md](./17-observability.md)** - Monitoring and alerting

## Key Concepts

| Concept | Description |
|---------|-------------|
| **DSNNode** | Distributed Sentience Network Node - every node is both a Gun.js peer AND an AlephNet node |
| **SRIA** | Summonable Resonant Intelligent Agent - autonomous agent with Perceive→Decide→Act→Learn cycle |
| **SMF** | Sedenion Memory Field - 16-dimensional semantic representation |
| **GMF** | Global Memory Field - network-wide consensus storage |
| **KeyTriplet** | Prime-resonant identity (Private, Public, Resonance keys) |
| **Coherent-Commit** | Consensus mechanism for accepting proposals with SMF verification |
| **Aleph (ℵ)** | Native token for staking, payments, and rewards |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED NODE (Client or Server)               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │    Gun.js Layer     │◄──►│     AlephNet DSNNode Layer      │ │
│  │  ─────────────────  │    │  ───────────────────────────────│ │
│  │  • Graph Sync       │    │  • Semantic Computing (SMF)      │ │
│  │  • SEA Auth         │    │  • Prime-Resonant Identity       │ │
│  │  • IndexedDB Store  │    │  • SRIA Agent Engine             │ │
│  │  • Mesh Routing     │    │  • Coherent-Commit Protocol      │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│                    ▲                      ▲                      │
│                    └──────────┬───────────┘                      │
│                               │                                  │
│  ┌────────────────────────────▼────────────────────────────────┐ │
│  │              BRIDGE LAYER (AlephGunBridge)                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Staking Tiers

| Tier | Min Stake | Capabilities |
|------|-----------|--------------|
| **Neophyte** | 0ℵ | Basic chat, public content |
| **Adept** | 100ℵ | + Private rooms, SRIA basic, service access |
| **Magus** | 1,000ℵ | + Priority routing, advanced SRIA, GMF proposals |
| **Archon** | 10,000ℵ | + Governance, node rewards, consensus voting |

## Semantic Domains

| Domain | SMF Axes | Description |
|--------|----------|-------------|
| **Perceptual** | 0-3 | Sensory input, observation, data collection |
| **Cognitive** | 4-7 | Reasoning, analysis, report generation |
| **Temporal** | 8-11 | Scheduling, history, predictions |
| **Meta** | 12-15 | Governance, coordination, self-reference |

## Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial integrated design (01-07) |
| 1.1.0 | 2024-02 | Added Tasks, Services, Content Store (08-11) |
| 1.2.0 | 2024-02 | Added Infrastructure docs (12-18) |
