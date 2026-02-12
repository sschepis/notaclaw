# Data Osmosis Redesign

## Overview
This document outlines the architectural redesign of the Data Osmosis plugin to support a pluggable connector system, data transformation pipelines, and automated scheduling.

## Architecture

### 1. Connector Framework
The core of the redesign is the `DataConnector` interface, which abstracts specific data source implementations.

```typescript
interface DataConnector {
  id: string;
  type: string;
  config: any;
  
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  testConnection(): Promise<boolean>;
  
  /**
   * Fetches data. 
   * @param lastSyncTimestamp - For incremental sync
   */
  fetch(lastSyncTimestamp?: number): Promise<any[]>;
  
  getSchema(): Promise<any>;
}
```

### 2. Transformation Pipeline (ETL)
Data flows through a pipeline before being stored.

```typescript
interface TransformationStep {
  name: string;
  process(data: any[]): Promise<any[]>;
}

class Pipeline {
  steps: TransformationStep[];
  
  addStep(step: TransformationStep): void;
  execute(data: any[]): Promise<any[]>;
}
```

### 3. Scheduler
A `SyncScheduler` will manage automated data retrieval.

```typescript
interface SyncJob {
  sourceId: string;
  intervalMinutes: number;
  lastRun: number;
  nextRun: number;
}
```

### 4. Storage & State Management
- **Sources**: Persisted in plugin storage.
- **Sync History**: Log of sync runs.

## Implementation Plan

### Phase 1: Core Framework
- Define interfaces in `main/types.ts`.
- Create `ConnectorRegistry` to manage available connector types.
- Refactor `DataSourceManager` to use the registry.

### Phase 2: Connectors
- Implement `PostgresConnector` (using `pg`).
- Implement `MongoDBConnector` (using `mongodb`).
- Implement `WebScraperConnector` (using `axios` + `cheerio` or regex).
- Implement `RSSConnector` (using `rss-parser` or xml parsing).

### Phase 3: Pipeline & Scheduler
- Implement `Pipeline` class.
- Implement basic transformations (filter, map).
- Implement `SyncScheduler` using `setInterval`.

### Phase 4: Integration
- Update IPC handlers.
- Update DSN tools.
- Add tests.

## Directory Structure
```
plugins/data-osmosis/
├── main/
│   ├── connectors/
│   │   ├── BaseConnector.ts
│   │   ├── PostgresConnector.ts
│   │   ├── MongoDBConnector.ts
│   │   ├── WebScraperConnector.ts
│   │   └── RSSConnector.ts
│   ├── pipeline/
│   │   ├── Pipeline.ts
│   │   └── transformations.ts
│   ├── scheduler/
│   │   └── SyncScheduler.ts
│   ├── types.ts
│   ├── ConnectorRegistry.ts
│   └── index.ts
├── renderer/
│   └── ...
└── tests/
```
