# Desktop Accessibility Learner: Hybrid Vision System

## 1. Overview

The Desktop Accessibility Learner (DAL) creates a **persistent, evolving accessibility tree** of the user's desktop. It combines:

1. **OS-level accessibility APIs** (fast, structured)
2. **Vision model analysis** (universal fallback)
3. **Learning & persistence** (memory across sessions)

The result: the Task Agent receives a plain-text list of targets instead of processing images.

## 2. Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Request                                   │
│                   "Click the Submit button"                            │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    DesktopAccessibilityLearner                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────────┐│
│  │ OS A11y API  │ + │ Vision Model │ → │ Desktop Memory Field          ││
│  │ (AppleScript │   │ (GPT-4o-mini)│   │ (MemoryField: scope='user')  ││
│  │  or UIAutom) │   │              │   │                              ││
│  └──────────────┘   └──────────────┘   └──────────────────────────────┘│
│         │                  │                        │                   │
│         ▼                  ▼                        ▼                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Merged ScreenContext                          │   │
│  │  {                                                               │   │
│  │    appName: "Firefox",                                           │   │
│  │    windowTitle: "Login - MyApp",                                 │   │
│  │    targets: [                                                    │   │
│  │      { id: "btn_submit", label: "Submit", x: 842, y: 567,       │   │
│  │        confidence: 0.95, source: "a11y+vision", learned: true }, │   │
│  │      ...                                                         │   │
│  │    ]                                                             │   │
│  │  }                                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Task Agent (Text Only)                          │
│   Input:  "Submit button at btn_submit (842, 567)"                     │
│   Output: `click_target({ targetId: "btn_submit" })`                   │
└────────────────────────────────────────────────────────────────────────┘
```

## 3. Data Structures

### 3.1 DesktopTarget

```typescript
interface DesktopTarget {
  id: string;                    // Unique ID: "app_window_element_hash"
  
  // Identification
  appName: string;               // "Firefox", "VSCode", etc.
  windowTitle: string;           // Window title at time of detection
  role: DesktopElementRole;      // button | input | link | menu | menuitem | etc.
  label: string;                 // Human-readable label
  
  // Location (cached)
  bounds: { x: number; y: number; width: number; height: number };
  clickPoint: { x: number; y: number };
  
  // Confidence & Source
  confidence: number;            // 0.0 - 1.0
  source: 'a11y' | 'vision' | 'a11y+vision' | 'learned';
  
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
}

type DesktopElementRole = 
  | 'button' | 'link' | 'input' | 'textarea' | 'checkbox' | 'radio'
  | 'select' | 'menu' | 'menuitem' | 'tab' | 'slider' | 'image'
  | 'text' | 'heading' | 'toolbar' | 'dialog' | 'window' | 'unknown';
```

### 3.2 ScreenContext (what the Task Agent sees)

```typescript
interface ScreenContext {
  timestamp: number;
  
  // Current application context
  activeApp: {
    name: string;
    bundleId?: string;           // macOS: "com.google.Chrome"
    windowTitle: string;
  };
  
  // Screen state
  screenSize: { width: number; height: number };
  
  // Available targets (sorted by relevance)
  targets: DesktopTarget[];
  
  // Quick lookup by common patterns
  buttons: DesktopTarget[];
  inputs: DesktopTarget[];
  links: DesktopTarget[];
  
  // Context from memory (previously learned patterns)
  learnedPatterns: {
    appSignature: string;        // Hash of app+window combo
    commonActions: string[];     // ["Submit", "Cancel", "Next"]
    layoutVersion: number;       // Incremented on major changes
  };
}
```

## 4. Learning Mechanisms

### 4.1 Passive Learning (Every Screen Capture)

Every time a screen capture is taken:

1. **Extract current a11y tree** (if available)
2. **Match against stored Desktop Memory**
3. **Update confidence scores**:
   - Element in same position → `confidence += 0.1` (up to 0.99)
   - Element moved slightly → update position, keep confidence
   - Element gone → mark as stale, `confidence *= 0.8`

### 4.2 Active Learning (Post-Action Feedback)

After every click/type action:

1. **Capture screen state before and after**
2. **Analyze change**:
   - Did expected element react? (button state changed, input focused)
   - Did unexpected element react? (wrong target)
   - Did nothing happen? (element wasn't clickable)
3. **Update memory**:
   - Success → `hitCount++`, reinforce position
   - Failure → `missCount++`, trigger re-scan

### 4.3 Explicit Learning (User Correction)

User can teach the system:

```typescript
// Tool for user to correct mistakes
{
  name: 'teach_target',
  description: 'Correct or teach the AI about a screen element',
  parameters: {
    label: { type: 'string' },  // "That's the Save button"
    x: { type: 'number' },
    y: { type: 'number' }
  }
}
```

## 5. Hybrid Detection Pipeline

### 5.1 Fast Path: OS Accessibility API

**macOS** (using System Events via AppleScript):

```applescript
tell application "System Events"
    set frontApp to first application process whose frontmost is true
    set appName to name of frontApp
    set windowName to name of front window of frontApp
    
    -- Get all UI elements
    set allElements to entire contents of front window of frontApp
    
    repeat with elem in allElements
        set elemRole to role of elem
        set elemTitle to title of elem
        set elemPos to position of elem
        set elemSize to size of elem
        -- Build structured output
    end repeat
end tell
```

**Pros**: Fast (~50ms), accurate positions, semantic roles
**Cons**: Requires accessibility permission, some apps don't expose full tree

### 5.2 Slow Path: Vision Model Analysis

When a11y tree is incomplete or for verification:

```typescript
const visionPrompt = `
Analyze this screenshot and identify all interactive UI elements.
Current app: {appName}
Window title: {windowTitle}

For each element, provide:
- role: button | input | link | menu | checkbox | etc.
- label: visible text or inferred purpose
- x: center x coordinate (pixels)
- y: center y coordinate (pixels)
- confidence: 0.0-1.0 based on clarity

Return JSON array. Focus on actionable elements.
Known elements from memory (verify positions):
{learnedElements}
`;
```

**Pros**: Works on any content, can read non-semantic UIs
**Cons**: Slower (~500ms), costs tokens, position estimates

### 5.3 Merge Strategy

```typescript
function mergeDetections(
  a11yTargets: DesktopTarget[],
  visionTargets: DesktopTarget[],
  memoryTargets: DesktopTarget[]
): DesktopTarget[] {
  const merged = new Map<string, DesktopTarget>();
  
  // Priority 1: A11y (ground truth for positions)
  for (const t of a11yTargets) {
    merged.set(t.id, { ...t, source: 'a11y', confidence: 0.95 });
  }
  
  // Priority 2: Vision (validate and fill gaps)
  for (const t of visionTargets) {
    const existing = findNearby(merged, t, 50); // 50px tolerance
    if (existing) {
      // Corroborate: boost confidence
      existing.confidence = Math.min(0.99, existing.confidence + 0.1);
      existing.source = 'a11y+vision';
      if (!existing.label && t.label) existing.label = t.label;
    } else {
      // New element from vision
      merged.set(t.id, { ...t, source: 'vision', confidence: t.confidence * 0.8 });
    }
  }
  
  // Priority 3: Memory (for elements we've successfully used before)
  for (const t of memoryTargets) {
    const existing = findNearby(merged, t, 30);
    if (existing) {
      // Transfer learned metadata
      existing.hitCount = t.hitCount;
      existing.firstSeen = t.firstSeen;
      if (t.confidence > 0.9) existing.learned = true;
    } else if (t.hitCount > 3 && t.confidence > 0.7) {
      // Element not currently visible but was reliable
      merged.set(t.id, { ...t, source: 'learned', stale: true });
    }
  }
  
  return Array.from(merged.values())
    .sort((a, b) => b.confidence - a.confidence);
}
```

## 6. Storage: Desktop Memory Field

Uses the existing `MemoryField` system with `scope: 'user'`:

```typescript
// On startup
const desktopMemoryField = await alephNetClient.memoryCreate({
  name: 'Desktop Accessibility Tree',
  scope: 'user',
  description: 'Learned UI elements across applications',
  visibility: 'private'
});

// Store learned target
await alephNetClient.memoryStore({
  fieldId: desktopMemoryField.id,
  content: JSON.stringify(target),
  significance: target.confidence,
  metadata: {
    type: 'desktop_target',
    appName: target.appName,
    role: target.role,
    hitCount: target.hitCount
  }
});

// Query for app context
const cached = await alephNetClient.memoryQuery({
  fieldId: desktopMemoryField.id,
  query: `appName:${currentApp} role:button`,
  limit: 50
});
```

## 7. Service Implementation

### 7.1 DesktopAccessibilityLearner Service

Location: `client/src/main/services/DesktopAccessibilityLearner.ts`

```typescript
export class DesktopAccessibilityLearner {
  private memoryFieldId: string | null = null;
  private targetCache: Map<string, DesktopTarget> = new Map();
  private lastContext: ScreenContext | null = null;
  
  constructor(
    private alephNetClient: AlephNetClient,
    private aiManager: AIProviderManager,
    private sessionManager: SessionManager
  ) {}
  
  async initialize(): Promise<void> {
    // Create or retrieve Desktop Memory Field
    this.memoryFieldId = await this.getOrCreateMemoryField();
    // Load cached targets
    await this.loadCachedTargets();
  }
  
  async getScreenContext(options?: {
    forceVision?: boolean;
    focusArea?: { x: number; y: number; width: number; height: number };
  }): Promise<ScreenContext> {
    const timestamp = Date.now();
    const activeApp = await this.getActiveApplication();
    
    // Layer 1: OS Accessibility API
    const a11yTargets = await this.extractAccessibilityTree();
    
    // Layer 2: Memory lookup
    const memoryTargets = await this.queryMemoryForApp(activeApp.name);
    
    // Layer 3: Vision (if needed)
    let visionTargets: DesktopTarget[] = [];
    if (options?.forceVision || a11yTargets.length < 5) {
      const screenshot = await this.sessionManager.getSnapshot();
      visionTargets = await this.analyzeWithVision(screenshot, activeApp, memoryTargets);
    }
    
    // Merge and return
    const targets = this.mergeDetections(a11yTargets, visionTargets, memoryTargets);
    
    // Update cache
    this.updateCache(targets);
    
    this.lastContext = {
      timestamp,
      activeApp,
      screenSize: await this.getScreenSize(),
      targets,
      buttons: targets.filter(t => t.role === 'button'),
      inputs: targets.filter(t => ['input', 'textarea'].includes(t.role)),
      links: targets.filter(t => t.role === 'link'),
      learnedPatterns: await this.getLearnedPatterns(activeApp.name)
    };
    
    return this.lastContext;
  }
  
  async recordActionResult(
    targetId: string,
    success: boolean,
    feedback?: string
  ): Promise<void> {
    const target = this.targetCache.get(targetId);
    if (!target) return;
    
    if (success) {
      target.hitCount++;
      target.confidence = Math.min(0.99, target.confidence + 0.05);
    } else {
      target.missCount++;
      target.confidence = Math.max(0.1, target.confidence - 0.15);
    }
    
    target.lastSeen = Date.now();
    
    // Persist to memory
    await this.persistTarget(target);
  }
  
  async teachTarget(label: string, x: number, y: number): Promise<DesktopTarget> {
    // Create new target from user teaching
    const activeApp = await this.getActiveApplication();
    const target: DesktopTarget = {
      id: `taught_${activeApp.name}_${Date.now()}`,
      appName: activeApp.name,
      windowTitle: activeApp.windowTitle,
      role: 'button', // Will be refined on first successful click
      label,
      bounds: { x: x - 25, y: y - 15, width: 50, height: 30 },
      clickPoint: { x, y },
      confidence: 0.8,
      source: 'learned',
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      hitCount: 0,
      missCount: 0,
      depth: 0
    };
    
    this.targetCache.set(target.id, target);
    await this.persistTarget(target);
    
    return target;
  }
  
  // ... private methods
}
```

## 8. AI Tool Integration

Add to `PersonalityManager.ts`:

```typescript
// Desktop Control Tools (using learned accessibility tree)
{
  type: 'function',
  function: {
    name: 'get_screen_targets',
    description: 'Get list of interactive elements on screen. Returns text list, not an image.',
    parameters: {
      type: 'object',
      properties: {
        appFilter: { type: 'string', description: 'Filter by app name (optional)' },
        roleFilter: { type: 'string', enum: ['button', 'input', 'link', 'menu', 'all'] }
      },
      required: []
    },
    script: async ({ appFilter, roleFilter }) => {
      const context = await desktopLearner.getScreenContext();
      let targets = context.targets;
      
      if (appFilter) {
        targets = targets.filter(t => t.appName.toLowerCase().includes(appFilter.toLowerCase()));
      }
      if (roleFilter && roleFilter !== 'all') {
        targets = targets.filter(t => t.role === roleFilter);
      }
      
      // Return text representation
      return {
        app: context.activeApp.name,
        window: context.activeApp.windowTitle,
        elementCount: targets.length,
        elements: targets.slice(0, 30).map(t => ({
          id: t.id,
          type: t.role,
          label: t.label,
          position: `(${t.clickPoint.x}, ${t.clickPoint.y})`,
          confidence: t.confidence.toFixed(2),
          learned: t.hitCount > 0
        }))
      };
    }
  }
},
{
  type: 'function',
  function: {
    name: 'click_element',
    description: 'Click a screen element by its ID (from get_screen_targets)',
    parameters: {
      type: 'object',
      properties: {
        elementId: { type: 'string', description: 'Element ID from get_screen_targets' }
      },
      required: ['elementId']
    },
    script: async ({ elementId }) => {
      const target = desktopLearner.getTarget(elementId);
      if (!target) {
        return { error: `Element ${elementId} not found. Try get_screen_targets again.` };
      }
      
      // Execute click via SessionManager
      await sessionManager.executeAction({ type: 'MOUSE_MOVE', x: target.clickPoint.x, y: target.clickPoint.y });
      const success = await sessionManager.executeAction({ type: 'CLICK' });
      
      // Record result for learning
      await desktopLearner.recordActionResult(elementId, success);
      
      return { 
        success, 
        clicked: target.label,
        position: target.clickPoint,
        confidence: target.confidence
      };
    }
  }
},
{
  type: 'function',
  function: {
    name: 'type_in_element',
    description: 'Type text into an input field by its ID',
    parameters: {
      type: 'object',
      properties: {
        elementId: { type: 'string' },
        text: { type: 'string' }
      },
      required: ['elementId', 'text']
    },
    script: async ({ elementId, text }) => {
      const target = desktopLearner.getTarget(elementId);
      if (!target) {
        return { error: `Element ${elementId} not found` };
      }
      
      // Click to focus first
      await sessionManager.executeAction({ type: 'MOUSE_MOVE', x: target.clickPoint.x, y: target.clickPoint.y });
      await sessionManager.executeAction({ type: 'CLICK' });
      
      // Small delay for focus
      await new Promise(r => setTimeout(r, 100));
      
      // Type
      await sessionManager.executeAction({ type: 'TYPE', text });
      
      await desktopLearner.recordActionResult(elementId, true);
      
      return { success: true, typed: text, in: target.label };
    }
  }
},
{
  type: 'function',
  function: {
    name: 'teach_element',
    description: 'Teach the AI about a UI element at specific coordinates',
    parameters: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'What this element is (e.g., "Submit button")' },
        x: { type: 'number', description: 'X coordinate' },
        y: { type: 'number', description: 'Y coordinate' }
      },
      required: ['label', 'x', 'y']
    },
    script: async ({ label, x, y }) => {
      const target = await desktopLearner.teachTarget(label, x, y);
      return { 
        success: true, 
        message: `Learned "${label}" at (${x}, ${y}). I'll remember this for future sessions.`,
        targetId: target.id
      };
    }
  }
}
```

## 9. Example Interaction

**User**: "Fill in my email and submit the login form"

**AI Tool Call**: `get_screen_targets({ roleFilter: 'all' })`

**Response**:
```json
{
  "app": "Firefox",
  "window": "Login - MyApp",
  "elementCount": 12,
  "elements": [
    { "id": "ff_login_email", "type": "input", "label": "Email", "position": "(400, 200)", "confidence": "0.95", "learned": true },
    { "id": "ff_login_pass", "type": "input", "label": "Password", "position": "(400, 260)", "confidence": "0.92", "learned": true },
    { "id": "ff_login_submit", "type": "button", "label": "Sign In", "position": "(400, 340)", "confidence": "0.98", "learned": true },
    { "id": "ff_login_forgot", "type": "link", "label": "Forgot password?", "position": "(400, 380)", "confidence": "0.85", "learned": false }
  ]
}
```

**AI reasoning**: Found email input at ff_login_email, submit button at ff_login_submit

**AI Tool Call**: `type_in_element({ elementId: "ff_login_email", text: "user@example.com" })`
**AI Tool Call**: `click_element({ elementId: "ff_login_submit" })`

**No images processed by the reasoning model.**

## 10. Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Create `DesktopAccessibilityLearner` service
- [ ] Implement macOS AppleScript accessibility extraction
- [ ] Create Desktop Memory Field persistence
- [ ] Wire IPC handlers

### Phase 2: Vision Integration
- [ ] Implement fallback vision analysis
- [ ] Create merge strategy
- [ ] Add visual fingerprinting for element matching

### Phase 3: Learning Loop
- [ ] Implement hit/miss tracking
- [ ] Add confidence decay for stale elements
- [ ] Create user teaching interface

### Phase 4: Tool Integration
- [ ] Add tools to PersonalityManager
- [ ] Create test suite for action verification
- [ ] Add safety constraints (confirmation for sensitive actions)

## 11. Security Considerations

1. **User Consent**: Display which apps are being indexed
2. **Sensitive Data**: Never store text content from password fields
3. **Rate Limiting**: Max 10 actions per minute without user confirmation
4. **Audit Log**: Log all desktop actions for user review
5. **App Blacklist**: Allow users to exclude specific apps from indexing
