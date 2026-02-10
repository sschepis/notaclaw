/**
 * Desktop Accessibility Learner
 * Main service that orchestrates accessibility extraction, vision analysis, 
 * and memory persistence to create a learned model of the user's desktop.
 */

import { AlephNetClient } from '../AlephNetClient';
import { AIProviderManager } from '../AIProviderManager';
import { SessionManager } from '../SessionManager';
import { systemPreferences, dialog, shell } from 'electron';
import { 
  DesktopTarget, 
  ScreenContext, 
  GetScreenContextOptions, 
  LearnedPatterns
} from './types';
import * as AccessibilityExtractor from './AccessibilityExtractor';
import { VisionAnalyzer } from './VisionAnalyzer';

export class DesktopAccessibilityLearner {
  private memoryFieldId: string | null = null;
  private targetCache: Map<string, DesktopTarget> = new Map();
  private lastContext: ScreenContext | null = null;
  private visionAnalyzer: VisionAnalyzer;
  
  constructor(
    private alephNetClient: AlephNetClient,
    aiManager: AIProviderManager,
    private sessionManager: SessionManager
  ) {
    this.visionAnalyzer = new VisionAnalyzer(aiManager);
  }
  
  async initialize(): Promise<void> {
    // Check for accessibility permissions on macOS
    if (process.platform === 'darwin') {
      const trusted = systemPreferences.isTrustedAccessibilityClient(false);
      if (!trusted) {
        const result = await dialog.showMessageBox({
          type: 'warning',
          title: 'Accessibility Permission Needed',
          message: 'To allow the AI to see and control your desktop applications, AlephNet Client needs Accessibility permissions.',
          detail: 'Please grant access in System Settings > Privacy & Security > Accessibility.',
          buttons: ['Open System Settings', 'Deny'],
          defaultId: 0,
          cancelId: 1
        });

        if (result.response === 0) {
          // Trigger the system prompt which opens System Settings
          systemPreferences.isTrustedAccessibilityClient(true);
          // Also open the preference pane directly if possible
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
        }
      }
    }

    // Create or retrieve Desktop Memory Field
    try {
      this.memoryFieldId = await this.getOrCreateMemoryField();
      await this.loadCachedTargets();
      console.log('[DesktopAccessibilityLearner] Initialized with memory field:', this.memoryFieldId);
    } catch (error) {
      console.error('[DesktopAccessibilityLearner] Initialization failed:', error);
    }
  }
  
  /**
   * Get the current context of the screen, including all interactive elements.
   * This is the main entry point for AI tools.
   */
  async getScreenContext(options: GetScreenContextOptions = {}): Promise<ScreenContext> {
    const timestamp = Date.now();
    let activeApp = await AccessibilityExtractor.getActiveApplication();
    const screenSize = await AccessibilityExtractor.getScreenSize();
    
    // Resolve app filter to exact running app name
    let targetAppName = undefined;
    if (options.appFilter) {
      const runningApps = await AccessibilityExtractor.getRunningApplications();
      // Try exact match first, then fuzzy
      const match = runningApps.find(app => app.name.toLowerCase() === options.appFilter!.toLowerCase()) 
                 || runningApps.find(app => app.name.toLowerCase().includes(options.appFilter!.toLowerCase()));
      
      if (match) {
        targetAppName = match.name;
        // Update activeApp context so Vision Analyzer knows what we are looking for
        // even if the OS hasn't fully switched focus yet
        activeApp = { name: match.name, windowTitle: '' };
        console.log(`[DesktopAccessibilityLearner] Resolved app filter "${options.appFilter}" to "${match.name}"`);
      } else {
        console.warn(`[DesktopAccessibilityLearner] Could not find running app matching "${options.appFilter}"`);
      }
    }
    
    // Layer 1: OS Accessibility API (Fast Path)
    let a11yTargets: DesktopTarget[] = [];
    try {
      a11yTargets = await AccessibilityExtractor.extractAccessibilityTree({
        maxElements: options.maxTargets || 100,
        targetAppName: targetAppName // Use resolved exact name
      });
    } catch (e) {
      console.warn('[DesktopAccessibilityLearner] A11y extraction failed:', e);
    }
    
    // Layer 2: Memory lookup
    const memoryTargets = await this.queryMemoryForApp(activeApp.name);
    
    // Layer 3: Vision (Slow Path - only if needed)
    let visionTargets: DesktopTarget[] = [];
    
    // Force vision if explicitly requested OR if A11y failed to find enough targets
    // This handles cases where A11y is restricted or the app uses non-standard UI
    const shouldRunVision = options.forceVision || a11yTargets.length < 3;
    
    if (shouldRunVision) {
      try {
        console.log('[DesktopAccessibilityLearner] Triggering vision fallback...');
        const snapshot = await this.sessionManager.getSnapshot();
        // Remove data:image/png;base64, prefix if present for the vision analyzer if it expects raw base64
        // But usually image_url accepts the full data URI.
        visionTargets = await this.visionAnalyzer.analyzeScreenshot(snapshot, activeApp, memoryTargets);
        
        // Refine targets with "Target & Verify" loop
        if (visionTargets.length > 0) {
          console.log('[DesktopAccessibilityLearner] Refining vision targets...');
          visionTargets = await this.visionAnalyzer.refineTargets(snapshot, visionTargets);
        }
      } catch (e) {
        console.warn('[DesktopAccessibilityLearner] Vision analysis failed:', e);
      }
    }
    
    // Merge and return
    const targets = this.mergeDetections(a11yTargets, visionTargets, memoryTargets);
    
    // Apply filters
    let filteredTargets = targets;
    if (options.appFilter) {
      filteredTargets = filteredTargets.filter(t => 
        t.appName.toLowerCase().includes(options.appFilter!.toLowerCase())
      );
    }
    if (options.roleFilter && options.roleFilter !== 'all') {
      filteredTargets = filteredTargets.filter(t => t.role === options.roleFilter);
    }
    
    // Update cache with fresh detections
    this.updateCache(targets);
    
    this.lastContext = {
      timestamp,
      activeApp,
      screenSize,
      targets: filteredTargets,
      buttons: filteredTargets.filter(t => t.role === 'button'),
      inputs: filteredTargets.filter(t => ['input', 'textarea'].includes(t.role)),
      links: filteredTargets.filter(t => t.role === 'link'),
      learnedPatterns: await this.getLearnedPatterns(activeApp.name)
    };
    
    return this.lastContext;
  }
  
  /**
   * Retrieve a specific target by ID from the cache.
   */
  getTarget(targetId: string): DesktopTarget | undefined {
    return this.targetCache.get(targetId);
  }

  /**
   * Record the result of an action on a target to improve learning.
   */
  async recordActionResult(
    targetId: string,
    success: boolean,
    _feedback?: string
  ): Promise<void> {
    const target = this.targetCache.get(targetId);
    if (!target) return;
    
    if (success) {
      target.hitCount++;
      // Boost confidence on success, max 0.99
      target.confidence = Math.min(0.99, target.confidence + 0.05);
    } else {
      target.missCount++;
      // Reduce confidence on failure, min 0.1
      target.confidence = Math.max(0.1, target.confidence - 0.15);
    }
    
    target.lastSeen = Date.now();
    
    // Persist updated stats to memory
    await this.persistTarget(target);
  }
  
  /**
   * Allow user/AI to explicitly teach a target location.
   */
  async teachTarget(label: string, x: number, y: number): Promise<DesktopTarget> {
    const activeApp = await AccessibilityExtractor.getActiveApplication();
    
    const target: DesktopTarget = {
      id: `taught_${activeApp.name.replace(/\W/g,'')}_${Date.now()}`,
      appName: activeApp.name,
      windowTitle: activeApp.windowTitle,
      role: 'button', // Default role, refined later
      label,
      bounds: { x: x - 25, y: y - 15, width: 50, height: 30 },
      clickPoint: { x, y },
      confidence: 0.8,
      source: 'learned',
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      hitCount: 0,
      missCount: 0,
      depth: 0,
      taught: true
    };
    
    this.targetCache.set(target.id, target);
    await this.persistTarget(target);
    
    return target;
  }
  
  // ─── Private Helpers ───────────────────────────────────────────────────

  private async getOrCreateMemoryField(): Promise<string> {
    const fields = await this.alephNetClient.memoryList({ scope: 'user' });
    const existing = fields.find(f => f.name === 'Desktop Accessibility Tree');
    
    if (existing) return existing.id;
    
    const newField = await this.alephNetClient.memoryCreate({
      name: 'Desktop Accessibility Tree',
      scope: 'user',
      description: 'Learned UI elements across applications',
      visibility: 'private'
    });
    
    return newField.id;
  }

  private async loadCachedTargets(): Promise<void> {
    if (!this.memoryFieldId) return;
    
    // Load recently seen targets
    // In a real implementation, we'd paginate this
    try {
      const result = await this.alephNetClient.memoryQuery({
        fieldId: this.memoryFieldId,
        query: 'type:desktop_target',
        limit: 200
      });
      
      for (const fragment of result.fragments) {
        try {
          const target = JSON.parse(fragment.content) as DesktopTarget;
          // Only cache reasonably fresh targets (e.g., seen in last 30 days)
          if (Date.now() - target.lastSeen < 30 * 24 * 60 * 60 * 1000) {
            this.targetCache.set(target.id, target);
          }
        } catch (e) {
          // Ignore malformed fragments
        }
      }
    } catch (e) {
      console.warn('[DesktopAccessibilityLearner] Failed to load cache:', e);
    }
  }

  private async queryMemoryForApp(appName: string): Promise<DesktopTarget[]> {
    // Return cached targets for this app
    return Array.from(this.targetCache.values())
      .filter(t => t.appName === appName);
  }

  private async persistTarget(target: DesktopTarget): Promise<void> {
    if (!this.memoryFieldId) return;
    
    try {
      await this.alephNetClient.memoryStore({
        fieldId: this.memoryFieldId,
        content: JSON.stringify(target),
        significance: target.confidence,
        metadata: {
          type: 'desktop_target',
          appName: target.appName,
          role: target.role,
          hitCount: target.hitCount,
          targetId: target.id
        }
      });
    } catch (e) {
      console.warn('[DesktopAccessibilityLearner] Failed to persist target:', e);
    }
  }

  private mergeDetections(
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
      const existing = this.findNearby(merged, t, 50); // 50px tolerance
      if (existing) {
        // Corroborate: boost confidence
        existing.confidence = Math.min(0.99, existing.confidence + 0.1);
        if (existing.source === 'a11y') existing.source = 'a11y+vision';
        if (!existing.label && t.label) existing.label = t.label;
      } else {
        // New element from vision
        merged.set(t.id, { ...t, source: 'vision', confidence: t.confidence * 0.8 });
      }
    }
    
    // Priority 3: Memory (for elements we've successfully used before)
    for (const t of memoryTargets) {
      const existing = this.findNearby(merged, t, 30);
      if (existing) {
        // Transfer learned metadata to the fresh detection
        existing.hitCount = t.hitCount;
        existing.missCount = t.missCount;
        existing.firstSeen = t.firstSeen;
        if (t.confidence > 0.9) existing.taught = t.taught;
      } else if (t.hitCount > 2 && t.confidence > 0.7) {
        // Element not currently visible but was reliable in the past
        // We include it but mark as stale
        merged.set(t.id, { ...t, source: 'learned', stale: true });
      }
    }
    
    return Array.from(merged.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  private findNearby(
    map: Map<string, DesktopTarget>, 
    target: DesktopTarget, 
    tolerance: number
  ): DesktopTarget | undefined {
    // Fast lookup by ID first
    if (map.has(target.id)) return map.get(target.id);
    
    // Spatial lookup
    for (const existing of map.values()) {
      const dx = Math.abs(existing.clickPoint.x - target.clickPoint.x);
      const dy = Math.abs(existing.clickPoint.y - target.clickPoint.y);
      if (dx <= tolerance && dy <= tolerance) {
        return existing;
      }
    }
    return undefined;
  }

  private updateCache(targets: DesktopTarget[]) {
    for (const t of targets) {
      this.targetCache.set(t.id, t);
    }
  }

  private async getLearnedPatterns(_appName: string): Promise<LearnedPatterns | undefined> {
    // Placeholder for more advanced pattern learning
    return undefined;
  }
}
