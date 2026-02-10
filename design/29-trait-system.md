# Design: Trait System & Plugin API

## 1. Overview
The Trait System provides a modular way to compose AI personalities and capabilities. Unlike static "Personalities" (which are monolithic personas), **Traits** are granular instruction sets that can be mixed, matched, and dynamically injected into the AI's system prompt.

Crucially, this system allows **Plugins** to teach the AI new capabilities (such as how to use a custom visualization fence) by registering a Trait that contains the necessary instructions.

## 2. Core Concepts

### 2.1 The Trait
A Trait is a distinct unit of behavior or knowledge. It consists of:
- **Identity:** ID, Name, Description.
- **Instruction:** The actual text injected into the system prompt.
- **Activation:** Rules for when this trait should be active (e.g., "always", "on-keyword", "manual").

### 2.2 The Trait Registry
A central service that manages all available traits from the core system and loaded plugins.

## 3. Data Structures

### 3.1 TraitDefinition
```typescript
export interface TraitDefinition {
  /** Unique identifier (e.g., 'plugin-viz:network-mapper') */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description for UI/Selection */
  description: string;
  
  /** 
   * The actual instruction text injected into the System Prompt.
   * This tells the AI *how* to behave or *how* to use a capability.
   */
  instruction: string;
  
  /** 
   * Determining when this trait is injected.
   * - 'global': Always present in the system prompt.
   * - 'dynamic': Injected only when trigger keywords are detected.
   * - 'manual': Must be explicitly enabled by the user or personality.
   */
  activationMode: 'global' | 'dynamic' | 'manual';
  
  /** Keywords that trigger dynamic activation (e.g., ['network', 'topology']) */
  triggerKeywords?: string[];
  
  /** 
   * Priority for ordering in the prompt (higher = earlier/more important).
   * Default: 10
   */
  priority?: number;
}
```

## 4. Architecture Components

### 4.1 TraitRegistry Service
Managed by `ServiceRegistry` or a dedicated `TraitManager`.

```typescript
class TraitRegistry {
  private traits: Map<string, TraitDefinition> = new Map();

  register(trait: TraitDefinition) {
    this.traits.set(trait.id, trait);
  }

  unregister(id: string) {
    this.traits.delete(id);
  }

  getAll(): TraitDefinition[] {
    return Array.from(this.traits.values());
  }

  /**
   * Returns traits that match the given context/query based on activation rules.
   */
  resolveTraits(content: string, activePersonality: Personality): TraitDefinition[] {
    const active = [];
    
    for (const trait of this.traits.values()) {
      // 1. Global traits
      if (trait.activationMode === 'global') {
        active.push(trait);
        continue;
      }
      
      // 2. Dynamic traits (keyword match)
      if (trait.activationMode === 'dynamic' && trait.triggerKeywords) {
        if (trait.triggerKeywords.some(kw => content.toLowerCase().includes(kw))) {
          active.push(trait);
        }
      }
    }
    
    return active.sort((a, b) => (b.priority || 10) - (a.priority || 10));
  }
}
```

### 4.2 Plugin API Extension
Plugins access the registry via the `PluginContext`.

```typescript
// In client/src/shared/plugin-types.ts

export interface PluginContext {
  // ... existing properties
  
  traits: {
    /**
     * Register a new trait to teach the AI a capability.
     */
    register(trait: TraitDefinition): void;
    
    /**
     * Remove a previously registered trait.
     */
    unregister(traitId: string): void;
  }
}
```

### 4.3 Integration with PersonalityManager
The `PersonalityManager` uses the `TraitRegistry` during prompt construction.

```typescript
// In PersonalityManager.handleInteraction(...)

// 1. Get Base System Prompt (from Personality)
let systemPrompt = personality.systemPrompt;

// 2. Resolve Dynamic Traits
const relevantTraits = this.traitRegistry.resolveTraits(userMessage, personality);

// 3. Append Trait Instructions
if (relevantTraits.length > 0) {
  systemPrompt += "\n\n### Active Capabilities\n";
  for (const trait of relevantTraits) {
    systemPrompt += `\n**${trait.name}**: ${trait.instruction}`;
  }
}

// 4. Send to PromptEngine...
```

## 5. Implementation Example: "Canvas Visualization"

This is how a plugin would use the new API to "teach" the AI about the `canvas-viz` fence.

### 5.1 The Plugin Code
```typescript
// plugins/canvas-viz/index.ts

export function activate(context: PluginContext) {
  
  // 1. Register the Renderer (Frontend)
  // (Existing API)
  context.ui.registerFenceRenderer({
    id: 'canvas-viz',
    component: CanvasRenderer
  });

  // 2. Register the Trait (Backend/AI Knowledge)
  // (New API)
  context.traits.register({
    id: 'canvas-viz-capability',
    name: 'Canvas Visualizer',
    description: 'Enables the AI to draw diagrams using the canvas-viz format.',
    activationMode: 'dynamic',
    triggerKeywords: ['draw', 'visualize', 'diagram', 'graph', 'chart'],
    priority: 20,
    instruction: `
You have the ability to generate interactive diagrams.
To create a visualization, output a Markdown code block with the language 'canvas-viz'.
The content should be a JSON object with this structure:
{
  "type": "node-graph",
  "nodes": [{ "id": "a", "label": "Start" }, { "id": "b", "label": "End" }],
  "edges": [{ "from": "a", "to": "b" }]
}
Use this whenever the user asks for a visual representation of data.
    `.trim()
  });
}
```

## 6. Migration Steps
1.  Define `TraitDefinition` in `shared/types.ts`.
2.  Implement `TraitRegistry` in `client/src/main/services/TraitRegistry.ts`.
3.  Expose `TraitRegistry` to `PluginManager` and add `traits` namespace to `PluginContext`.
4.  Update `PersonalityManager` to inject resolved traits into the system prompt.
