# Dependencies

Third-party npm packages used in the AlephNet-integrated Durable Agent Mesh.

## Core Dependencies

### Gun.js Ecosystem

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `gun` | ^0.2020.x | Distributed graph database, real-time sync | MIT/Zlib/Apache 2.0 |
| `gun-mongo-key` | ^1.1.x | MongoDB adapter for Gun.js (optional) | MIT |
| `gun-rs` | ^0.9.x | Radix storage adapter for Gun.js | MIT |

### AlephNet Core

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `@sschepis/alephnet-node` | ^1.0.x | AlephNet DSNNode, SRIA engine, semantic computing | MIT |

### Cryptography

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `@noble/ed25519` | ^2.0.x | Ed25519 signatures for KeyTriplet | MIT |
| `@noble/hashes` | ^1.3.x | SHA-256, SHA-512, HKDF for key derivation | MIT |
| `@noble/secp256k1` | ^2.0.x | ECDSA/ECDH for Gun.js SEA compatibility | MIT |
| `tweetnacl` | ^1.0.x | NaCl cryptographic primitives | Unlicense |
| `scrypt-js` | ^3.0.x | Key derivation for wallet encryption | MIT |

### LLM & AI

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `openai` | ^4.x | OpenAI API client (GPT-4, embeddings) | Apache 2.0 |
| `@anthropic-ai/sdk` | ^0.x | Anthropic API client (Claude) | MIT |
| `@xenova/transformers` | ^2.x | Local ONNX model inference (browser) | Apache 2.0 |
| `onnxruntime-node` | ^1.x | ONNX runtime for Node.js | MIT |
| `tiktoken` | ^1.x | Token counting for OpenAI models | MIT |

### Embeddings & Vector Search

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `vectordb` | ^0.x | In-memory vector database for SMF search | Apache 2.0 |
| `ml-matrix` | ^6.x | Matrix operations for PCA/projections | MIT |
| `ml-pca` | ^4.x | Principal Component Analysis | MIT |

## Networking & Communication

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `ws` | ^8.x | WebSocket client/server | MIT |
| `isomorphic-ws` | ^5.x | WebSocket for browser/Node.js | MIT |
| `socket.io` | ^4.x | Real-time bidirectional communication (optional) | MIT |
| `eventsource` | ^2.x | Server-Sent Events client | MIT |

### HTTP & API

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `fastify` | ^4.x | HTTP server framework | MIT |
| `@fastify/cors` | ^8.x | CORS middleware | MIT |
| `@fastify/rate-limit` | ^9.x | Rate limiting | MIT |
| `@fastify/websocket` | ^8.x | WebSocket support for Fastify | MIT |
| `undici` | ^6.x | Modern HTTP client (Node.js) | MIT |
| `ky` | ^1.x | HTTP client for browser | MIT |

## Data Management

### Validation & Schema

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `zod` | ^3.x | TypeScript-first schema validation | MIT |
| `json-schema-to-ts` | ^3.x | JSON Schema to TypeScript types | MIT |
| `ajv` | ^8.x | JSON Schema validator | MIT |

### State Management

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `immer` | ^10.x | Immutable state updates | MIT |
| `zustand` | ^4.x | Lightweight state management (browser) | MIT |

### Storage

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `idb-keyval` | ^6.x | IndexedDB wrapper (browser) | Apache 2.0 |
| `lru-cache` | ^10.x | LRU cache for embeddings | ISC |
| `level` | ^8.x | LevelDB for Node.js persistence | MIT |

## Scheduling & Tasks

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `croner` | ^8.x | Cron expression parser and scheduler | MIT |
| `p-queue` | ^8.x | Promise-based queue with concurrency control | MIT |
| `p-retry` | ^6.x | Retry with exponential backoff | MIT |
| `p-timeout` | ^6.x | Promise timeout | MIT |

## Observability

### Logging

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `pino` | ^8.x | Fast JSON logger | MIT |
| `pino-pretty` | ^10.x | Pretty printing for development | MIT |

### Metrics

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `prom-client` | ^15.x | Prometheus metrics client | Apache 2.0 |

### Tracing

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `@opentelemetry/api` | ^1.x | OpenTelemetry API | Apache 2.0 |
| `@opentelemetry/sdk-node` | ^0.x | OpenTelemetry SDK for Node.js | Apache 2.0 |
| `@opentelemetry/auto-instrumentations-node` | ^0.x | Auto-instrumentation | Apache 2.0 |
| `@opentelemetry/exporter-trace-otlp-http` | ^0.x | OTLP trace exporter | Apache 2.0 |

## Utilities

### General

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `nanoid` | ^5.x | Secure ID generation | MIT |
| `ulid` | ^2.x | Universally Unique Lexicographically Sortable Identifier | MIT |
| `date-fns` | ^3.x | Date manipulation | MIT |
| `lodash-es` | ^4.x | Utility functions (tree-shakeable) | MIT |
| `fast-deep-equal` | ^3.x | Fast deep equality check | MIT |
| `safe-stable-stringify` | ^2.x | Deterministic JSON serialization | MIT |

### Math & Numbers

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `bignumber.js` | ^9.x | Arbitrary precision decimals for token amounts | MIT |
| `mathjs` | ^12.x | Extended math library | Apache 2.0 |
| `quaternion` | ^1.x | Quaternion operations for SRIA state | MIT |

### Text Processing

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `franc` | ^6.x | Language detection | MIT |
| `natural` | ^7.x | NLP utilities (tokenization, stemming) | MIT |

## Development Dependencies

### TypeScript

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `typescript` | ^5.x | TypeScript compiler | Apache 2.0 |
| `@types/node` | ^20.x | Node.js type definitions | MIT |
| `@types/ws` | ^8.x | WebSocket type definitions | MIT |

### Testing

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `vitest` | ^1.x | Unit testing framework | MIT |
| `@testing-library/react` | ^14.x | React component testing | MIT |
| `msw` | ^2.x | Mock Service Worker for API mocking | MIT |
| `playwright` | ^1.x | End-to-end testing | Apache 2.0 |

### Linting & Formatting

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `eslint` | ^8.x | JavaScript/TypeScript linter | MIT |
| `@typescript-eslint/eslint-plugin` | ^6.x | TypeScript ESLint rules | MIT |
| `@typescript-eslint/parser` | ^6.x | TypeScript ESLint parser | BSD-2-Clause |
| `prettier` | ^3.x | Code formatter | MIT |
| `eslint-config-prettier` | ^9.x | Disable ESLint rules that conflict with Prettier | MIT |

### Build Tools

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `vite` | ^5.x | Frontend build tool | MIT |
| `esbuild` | ^0.x | Fast JavaScript/TypeScript bundler | MIT |
| `tsup` | ^8.x | TypeScript library bundler | MIT |
| `tsx` | ^4.x | TypeScript execution for Node.js | MIT |

## Browser-Specific

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `react` | ^18.x | UI framework | MIT |
| `react-dom` | ^18.x | React DOM bindings | MIT |
| `@tanstack/react-query` | ^5.x | Data fetching and caching | MIT |
| `jotai` | ^2.x | Atomic state management | MIT |

## Optional / Integrations

### IPFS (for large content storage)

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `kubo-rpc-client` | ^4.x | IPFS HTTP client | Apache 2.0/MIT |
| `multiformats` | ^13.x | CID and multicodec support | Apache 2.0/MIT |

### External Services

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `@supabase/supabase-js` | ^2.x | Supabase client (bootstrap) | MIT |
| `stripe` | ^14.x | Payment processing (optional) | MIT |

## package.json Example

```json
{
  "name": "@alephnet/agent-mesh",
  "version": "1.0.0",
  "type": "module",
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "gun": "^0.2020.1239",
    "@sschepis/alephnet-node": "^1.0.0",
    
    "@noble/ed25519": "^2.0.0",
    "@noble/hashes": "^1.3.3",
    "tweetnacl": "^1.0.3",
    
    "openai": "^4.28.0",
    "@anthropic-ai/sdk": "^0.14.0",
    
    "fastify": "^4.26.0",
    "@fastify/cors": "^8.5.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/websocket": "^8.3.0",
    "ws": "^8.16.0",
    
    "zod": "^3.22.4",
    "immer": "^10.0.3",
    "lru-cache": "^10.2.0",
    
    "croner": "^8.0.0",
    "p-queue": "^8.0.1",
    "p-retry": "^6.2.0",
    
    "pino": "^8.18.0",
    "prom-client": "^15.1.0",
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.48.0",
    
    "nanoid": "^5.0.4",
    "date-fns": "^3.3.1",
    "bignumber.js": "^9.1.2",
    "ml-pca": "^4.1.1"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.11.16",
    "@types/ws": "^8.5.10",
    
    "vitest": "^1.2.2",
    "msw": "^2.1.5",
    
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "prettier": "^3.2.5",
    
    "tsup": "^8.0.1",
    "tsx": "^4.7.0"
  }
}
```

## Version Compatibility Matrix

| Component | Min Node.js | Min Browser | Notes |
|-----------|-------------|-------------|-------|
| Gun.js | 14+ | ES6+ | Full feature parity |
| AlephNet | 18+ | ES2020+ | Requires Web Crypto API |
| OpenAI SDK | 18+ | Fetch API | Uses native fetch |
| ONNX Runtime | 16+ | WebAssembly | For local embeddings |
| OpenTelemetry | 16+ | N/A | Server-side only |

## Security Considerations

1. **Noble cryptography packages** - Audited, no dependencies, timing-attack resistant
2. **Gun.js SEA** - Uses WebCrypto API, keys never leave the client
3. **Avoid packages with native dependencies** - Prefer pure JavaScript for portability
4. **Keep dependencies updated** - Use `npm audit` regularly
5. **Lock versions in production** - Use `package-lock.json` or `pnpm-lock.yaml`

## Bundle Size Optimization

For browser builds:
- Use tree-shaking with `lodash-es` instead of `lodash`
- Import specific functions from `date-fns`
- Use dynamic imports for optional features (IPFS, Stripe)
- Consider `@xenova/transformers` for client-side embeddings vs server calls
