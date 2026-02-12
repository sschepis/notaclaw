# Reputation Manager Design

## Overview
The Reputation Manager plugin provides a system for tracking, calculating, and visualizing trust scores for various entities (peers, services, agents) within the system. It persists data, exposes IPC endpoints for the renderer, and registers DSN tools for agentic interaction.

## Architecture

### Core Components
1.  **ReputationManager (Main Process)**:
    *   Manages the reputation database.
    *   Handles IPC requests.
    *   Implements the scoring algorithm and decay logic.
    *   Persists state using `context.storage`.
    *   Registers DSN tools.

2.  **Renderer (UI)**:
    *   Visualizes reputation scores and trends.
    *   Provides a form for submitting feedback.
    *   Subscribes to real-time updates via IPC events.

3.  **Shared Types**:
    *   Definitions for `ReputationEntry`, `Feedback`, `ReputationEvent`, etc., shared between main and renderer.

## Data Persistence

The plugin will use `context.storage` to persist reputation data.

### Schema
```typescript
interface ReputationData {
  entities: Record<string, EntityReputation>;
  settings: ReputationSettings;
}

interface EntityReputation {
  id: string; // Entity ID (e.g., peer ID, agent ID)
  score: number; // Current calculated score (0-1000)
  rank: string; // Current rank (e.g., "Novice", "Adept")
  history: ScoreSnapshot[]; // Historical score data for trends
  feedback: Feedback[]; // List of received feedback
  lastActivity: number; // Timestamp of last interaction/feedback
}

interface Feedback {
  id: string;
  reviewerId: string;
  score: number; // 1-5 rating
  comment: string;
  category: string; // e.g., "Performance", "Reliability"
  timestamp: number;
  weight: number; // Calculated weight of this feedback
}

interface ScoreSnapshot {
  timestamp: number;
  score: number;
}

interface ReputationSettings {
  initialScore: number;
  decayRate: number; // Points lost per day of inactivity
  decayWindow: number; // Days before decay starts
  ranks: RankThreshold[];
}

interface RankThreshold {
  name: string;
  minScore: number;
}
```

## IPC Communication

### Channels
*   `reputation:get-all`: Returns all entity reputations.
*   `reputation:get-entity`: Returns reputation for a specific entity.
*   `reputation:submit-feedback`: Submits new feedback for an entity.
*   `reputation:get-settings`: Returns current settings.
*   `reputation:update-settings`: Updates settings (admin only).

### Events
*   `reputation:updated`: Emitted when an entity's score changes. Payload: `{ entityId: string, newScore: number, oldScore: number }`.

## Algorithms

### Weighted Scoring
The score is calculated based on a weighted average of feedback, adjusted by the reviewer's own reputation (if available) and recency.

`NewScore = CurrentScore + (FeedbackRating - 3) * 10 * Weight`

Factors influencing `Weight`:
*   **Reviewer Trust**: Higher trust = higher weight.
*   **Recency**: Newer feedback has more impact (handled via decay or time-weighted average).
*   **Diminishing Returns**: Repeated feedback from the same reviewer has reduced weight.

### Decay
A background job (or check on access) will apply decay.
If `Date.now() - lastActivity > decayWindow`:
`Score -= decayRate * (daysSinceLastActivity - decayWindow)`

## DSN Integration

The plugin will register the following DSN tools:
*   `reputation_get_score`: Inputs: `{ entityId: string }`. Outputs: `{ score: number, rank: string }`.
*   `reputation_submit_feedback`: Inputs: `{ entityId: string, rating: number, comment: string }`. Outputs: `{ success: boolean, newScore: number }`.

## UI/UX Design

### Components
*   **ReputationDashboard**: Main view showing a list of entities and their scores.
*   **EntityDetail**: Detailed view for a single entity, showing:
    *   Radial gauge for current score.
    *   Trend line chart (history).
    *   Feedback list with sorting/filtering.
    *   "Submit Feedback" form.
*   **SettingsPanel**: Configuration for decay rates, rank thresholds, etc.

## Implementation Plan

1.  **Refactor Main Process**:
    *   Implement `ReputationManager` class with persistence.
    *   Implement scoring and decay algorithms.
    *   Set up IPC handlers.
    *   Register DSN tools.

2.  **Update Renderer**:
    *   Create `useReputation` hook for data fetching and subscription.
    *   Implement `ReputationDashboard` and `EntityDetail` components.
    *   Add visualization charts (Recharts or similar).

3.  **Testing**:
    *   Unit tests for scoring algorithm and persistence.
    *   Integration tests for IPC communication.
    *   UI tests for components.
