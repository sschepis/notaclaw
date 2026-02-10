
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
  
  /** Source of the trait (system or plugin id) */
  source?: string;
}
