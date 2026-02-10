/**
 * Desktop Accessibility Learner - Type Definitions
 * Defines the core data structures for the hybrid vision system.
 */

// ─── Element Roles ───────────────────────────────────────────────────────

export type DesktopElementRole = 
  | 'button' | 'link' | 'input' | 'textarea' | 'checkbox' | 'radio'
  | 'select' | 'menu' | 'menuitem' | 'tab' | 'slider' | 'image'
  | 'text' | 'heading' | 'toolbar' | 'dialog' | 'window' | 'unknown';

export type DetectionSource = 'a11y' | 'vision' | 'a11y+vision' | 'learned';

// ─── Desktop Target ──────────────────────────────────────────────────────

export interface DesktopTarget {
  id: string;                    // Unique ID: "app_window_element_hash"
  
  // Identification
  appName: string;               // "Firefox", "VSCode", etc.
  windowTitle: string;           // Window title at time of detection
  role: DesktopElementRole;      // button | input | link | menu | menuitem | etc.
  label: string;                 // Human-readable label
  
  // Location (cached)
  bounds: ElementBounds;
  clickPoint: Point;
  
  // Confidence & Source
  confidence: number;            // 0.0 - 1.0
  source: DetectionSource;
  
  // Learning metadata
  firstSeen: number;             // Timestamp
  lastSeen: number;              // Timestamp  
  hitCount: number;              // Times successfully clicked
  missCount: number;             // Times click failed (element moved/gone)
  
  // Hierarchy (for complex UIs)
  parentId?: string;
  depth: number;
  
  // Visual fingerprint (for matching after layout changes)
  visualHash?: string;           // Perceptual hash of element region
  
  // State flags
  stale?: boolean;               // Element may have moved/disappeared
  taught?: boolean;              // User explicitly taught this element
}

export interface Point {
  x: number;
  y: number;
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Application Context ─────────────────────────────────────────────────

export interface ActiveApplication {
  name: string;
  bundleId?: string;             // macOS: "com.google.Chrome"
  windowTitle: string;
  pid?: number;
}

export interface LearnedPatterns {
  appSignature: string;          // Hash of app+window combo
  commonActions: string[];       // ["Submit", "Cancel", "Next"]
  layoutVersion: number;         // Incremented on major changes
  lastUpdated: number;
}

// ─── Screen Context ──────────────────────────────────────────────────────

export interface ScreenContext {
  timestamp: number;
  
  // Current application context
  activeApp: ActiveApplication;
  
  // Screen state
  screenSize: { width: number; height: number };
  
  // Available targets (sorted by relevance)
  targets: DesktopTarget[];
  
  // Quick lookup by common patterns
  buttons: DesktopTarget[];
  inputs: DesktopTarget[];
  links: DesktopTarget[];
  
  // Context from memory (previously learned patterns)
  learnedPatterns?: LearnedPatterns;
}

// ─── Detection Options ───────────────────────────────────────────────────

export interface GetScreenContextOptions {
  forceVision?: boolean;
  focusArea?: ElementBounds;
  appFilter?: string;
  roleFilter?: DesktopElementRole | 'all';
  maxTargets?: number;
}

// ─── Action Feedback ─────────────────────────────────────────────────────

export interface ActionFeedback {
  targetId: string;
  success: boolean;
  actionType: 'click' | 'type' | 'scroll';
  errorReason?: string;
  beforeScreenHash?: string;
  afterScreenHash?: string;
}

// ─── Serialization ───────────────────────────────────────────────────────

export interface SerializedTarget {
  id: string;
  appName: string;
  windowTitle: string;
  role: DesktopElementRole;
  label: string;
  bounds: ElementBounds;
  clickPoint: Point;
  confidence: number;
  source: DetectionSource;
  firstSeen: number;
  lastSeen: number;
  hitCount: number;
  missCount: number;
  depth: number;
  visualHash?: string;
}

export function serializeTarget(target: DesktopTarget): SerializedTarget {
  return {
    id: target.id,
    appName: target.appName,
    windowTitle: target.windowTitle,
    role: target.role,
    label: target.label,
    bounds: target.bounds,
    clickPoint: target.clickPoint,
    confidence: target.confidence,
    source: target.source,
    firstSeen: target.firstSeen,
    lastSeen: target.lastSeen,
    hitCount: target.hitCount,
    missCount: target.missCount,
    depth: target.depth,
    visualHash: target.visualHash
  };
}

export function deserializeTarget(data: SerializedTarget): DesktopTarget {
  return {
    ...data,
    stale: false,
    taught: false
  };
}
