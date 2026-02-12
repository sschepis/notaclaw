import { PluginContext } from '../../client/src/shared/plugin-types';

export { PluginContext };

export interface ReputationData {
  entities: Record<string, EntityReputation>;
  settings: ReputationSettings;
}

export interface EntityReputation {
  id: string; // Entity ID (e.g., peer ID, agent ID)
  score: number; // Current calculated score (0-1000)
  rank: string; // Current rank (e.g., "Novice", "Adept")
  history: ScoreSnapshot[]; // Historical score data for trends
  feedback: Feedback[]; // List of received feedback
  lastActivity: number; // Timestamp of last interaction/feedback
}

export interface Feedback {
  id: string;
  reviewerId: string;
  score: number; // 1-5 rating
  comment: string;
  category: string; // e.g., "Performance", "Reliability"
  timestamp: number;
  weight: number; // Calculated weight of this feedback
}

export interface ScoreSnapshot {
  timestamp: number;
  score: number;
}

export interface ReputationSettings {
  initialScore: number;
  decayRate: number; // Points lost per day of inactivity
  decayWindow: number; // Days before decay starts
  ranks: RankThreshold[];
}

export interface RankThreshold {
  name: string;
  minScore: number;
}

export interface ReputationUpdateEvent {
  entityId: string;
  newScore: number;
  oldScore: number;
}
