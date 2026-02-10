/**
 * Desktop Accessibility Learner - Vision Analyzer
 * Uses AI vision models to detect and identify UI elements from screenshots.
 * Acts as a fallback when OS accessibility APIs fail or return incomplete trees.
 */

import { AIProviderManager } from '../AIProviderManager';
import { ImageAnnotator } from './ImageAnnotator';
import { 
  DesktopTarget, 
  ActiveApplication, 
  DesktopElementRole
} from './types';

export class VisionAnalyzer {
  private imageAnnotator: ImageAnnotator;

  constructor(private aiManager: AIProviderManager) {
    this.imageAnnotator = new ImageAnnotator();
  }

  /**
   * Analyze a screenshot to detect interactive UI elements.
   * 
   * @param screenshotBase64 Base64 encoded image data
   * @param activeApp Context about the active application
   * @param knownTargets Existing targets to help guide the vision model (optional)
   */
  async analyzeScreenshot(
    screenshotBase64: string,
    activeApp: ActiveApplication,
    knownTargets: DesktopTarget[] = []
  ): Promise<DesktopTarget[]> {
    // Construct the prompt with context
    const prompt = this.buildPrompt(activeApp, knownTargets);
    
    try {
      // Call the vision model
      // Note: We're using a specific model optimized for vision/JSON extraction
      // In a real implementation, we'd want to make this configurable
      const response = await this.aiManager.processChatRequest(
        [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: prompt 
              },
              {
                type: 'image_url',
                image_url: {
                  url: screenshotBase64
                }
              }
            ]
          }
        ],
        [], // No tools needed for this extraction
        {
          model: 'gpt-4o-mini', // or equivalent vision-capable model
          temperature: 0.1, // Low temperature for deterministic JSON
          maxTokens: 2000,
          contentType: 'analysis'
        }
      );

      return this.parseResponse(response.content, activeApp);
    } catch (error) {
      console.error('[VisionAnalyzer] Analysis failed:', error);
      return [];
    }
  }

  private buildPrompt(activeApp: ActiveApplication, knownTargets: DesktopTarget[]): string {
    const knownContext = knownTargets.length > 0
      ? `\nKnown elements in this view (verify these positions):\n${knownTargets.map(t => `- ${t.label} (${t.role}) at (${t.bounds.x},${t.bounds.y})`).join('\n')}`
      : '';

    return `
Analyze this screenshot of ${activeApp.name} ("${activeApp.windowTitle}") and identify all interactive UI elements.

Return a JSON array where each object has:
- role: button | input | link | menu | checkbox | radio | tab | unknown
- label: visible text or inferred purpose
- x: center x coordinate (pixels from left)
- y: center y coordinate (pixels from top)
- width: approximate width in pixels
- height: approximate height in pixels
- confidence: 0.0-1.0 based on visual clarity

Focus on actionable elements (buttons, inputs, links). Ignore purely decorative elements.
${knownContext}

Return ONLY valid JSON. No markdown formatting, no explanation.
`;
  }

  private parseResponse(content: string, activeApp: ActiveApplication): DesktopTarget[] {
    try {
      // Clean up potential markdown code blocks
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      const rawTargets = JSON.parse(jsonStr);
      
      if (!Array.isArray(rawTargets)) {
        console.warn('[VisionAnalyzer] Expected array response, got:', typeof rawTargets);
        return [];
      }

      const now = Date.now();
      
      return rawTargets.map((raw: any, index: number) => {
        const x = Number(raw.x) || 0;
        const y = Number(raw.y) || 0;
        const width = Number(raw.width) || 20;
        const height = Number(raw.height) || 20;
        const role = (raw.role || 'unknown') as DesktopElementRole;
        const label = raw.label || `Element ${index}`;
        
        // Generate ID
        const id = this.generateVisionId(activeApp.name, activeApp.windowTitle, role, label, x, y);

        return {
          id,
          appName: activeApp.name,
          windowTitle: activeApp.windowTitle,
          role,
          label,
          bounds: { x: x - width/2, y: y - height/2, width, height },
          clickPoint: { x, y },
          confidence: Number(raw.confidence) || 0.5,
          source: 'vision',
          firstSeen: now,
          lastSeen: now,
          hitCount: 0,
          missCount: 0,
          depth: 0
        };
      });
    } catch (error) {
      console.error('[VisionAnalyzer] Failed to parse response:', error);
      return [];
    }
  }

  private generateVisionId(
    appName: string, 
    _windowTitle: string, 
    role: string, 
    label: string, 
    x: number, 
    y: number
  ): string {
    const normalizedApp = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    const xBucket = Math.floor(x / 50);
    const yBucket = Math.floor(y / 50);
    
    return `vis_${normalizedApp}_${role}_${normalizedLabel}_${xBucket}_${yBucket}`;
  }

  /**
   * Refine targets by verifying them against the screenshot with an iterative loop.
   */
  async refineTargets(
    screenshotBase64: string, 
    targets: DesktopTarget[]
  ): Promise<DesktopTarget[]> {
    if (targets.length === 0) return targets;

    try {
      // 1. Annotate image with numbered dots
      const annotatedImage = await this.imageAnnotator.annotate(screenshotBase64, targets);

      // 2. Ask AI to verify
      const prompt = `
I have drawn numbered red dots on the screenshot. 
Please verify if each dot is correctly centered on its intended UI element.

Targets:
${targets.map((t, i) => `${i + 1}. ${t.label} (${t.role})`).join('\n')}

Return a JSON array with adjustments for each target:
[
  { "id": 1, "status": "correct" },
  { "id": 2, "status": "adjust", "dx": 10, "dy": -5 } // Move dot 10px right, 5px up
]

Return ONLY valid JSON.
`;

      const response = await this.aiManager.processChatRequest(
        [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: annotatedImage } }
            ]
          }
        ],
        [],
        {
          model: 'gpt-4o-mini',
          temperature: 0.1,
          contentType: 'analysis'
        }
      );

      // 3. Apply adjustments
      const adjustments = JSON.parse(response.content.replace(/```json\n?|\n?```/g, '').trim());
      
      if (Array.isArray(adjustments)) {
        return targets.map((t, i) => {
          const adj = adjustments.find((a: any) => a.id === i + 1);
          if (adj && adj.status === 'adjust' && (adj.dx || adj.dy)) {
            const dx = Number(adj.dx) || 0;
            const dy = Number(adj.dy) || 0;
            
            // Apply offset
            const newX = t.clickPoint.x + dx;
            const newY = t.clickPoint.y + dy;
            
            return {
              ...t,
              clickPoint: { x: newX, y: newY },
              bounds: { 
                ...t.bounds, 
                x: t.bounds.x + dx, 
                y: t.bounds.y + dy 
              },
              confidence: Math.min(0.99, t.confidence + 0.1) // Boost confidence
            };
          }
          return t;
        });
      }
    } catch (error) {
      console.warn('[VisionAnalyzer] Refinement failed:', error);
    }

    return targets;
  }
}
