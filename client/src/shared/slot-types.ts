/**
 * Slot Types - Type definitions for the UI extensibility system
 *
 * This module defines the contracts for extension slots, allowing plugins
 * to inject UI components into predefined locations throughout the app.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Chat Message Types (minimal definition for slot system)
// ═══════════════════════════════════════════════════════════════════════════

export interface ChatAttachment {
  id: string;
  type: 'image' | 'document' | 'file';
  name: string;
  size: number;
  mimeType: string;
  dataUrl?: string;
  content?: string;
}

// ChatMessage type for plugin decorators - aligns with app's MessageType
export type ChatMessageType = 'perceptual' | 'agentic' | 'resonant' | 'error' | 'cognitive' | 'temporal' | 'meta';

export interface ChatMessage {
  id: string;
  content: string;
  type: ChatMessageType;
  sender: 'user' | 'agent';
  timestamp: string;
  attachments?: ChatAttachment[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Slot Categories
// ═══════════════════════════════════════════════════════════════════════════

export type SlotCategory = 
  | 'layout'      // Panel-level extension points
  | 'navigation'  // Navigation and menus
  | 'inspector'   // Inspector panel extensions
  | 'chat'        // Message stream extensions
  | 'overlay'     // Floating UI elements
  | 'specialized'; // Domain-specific extensions

// ═══════════════════════════════════════════════════════════════════════════
// Slot Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface SlotDefinition<TContext = unknown> {
  /** Unique slot identifier */
  id: string;
  /** Category for organization */
  category: SlotCategory;
  /** Human-readable description */
  description: string;
  /** Whether multiple extensions can register */
  allowMultiple: boolean;
  /** Maximum number of extensions (if allowMultiple) */
  maxExtensions?: number;
  /** TypeScript type name for documentation */
  contextTypeName?: string;
  /** Default context value (for development) */
  defaultContext?: TContext;
}

// ═══════════════════════════════════════════════════════════════════════════
// Slot Registrations
// ═══════════════════════════════════════════════════════════════════════════

export interface SlotRegistration<TContext = unknown> {
  /** Auto-generated unique ID */
  id: string;
  /** Target slot ID */
  slotId: string;
  /** Plugin that registered this */
  pluginId: string;
  /** React component to render */
  component: React.ComponentType<SlotComponentProps<TContext>>;
  /** Priority for ordering (lower = earlier) */
  priority: number;
  /** Optional filter function */
  filter?: (context: TContext) => boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface SlotComponentProps<TContext = unknown> {
  /** Context passed from the slot */
  context: TContext;
  /** Metadata from registration */
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Registration Options (for plugin API)
// ═══════════════════════════════════════════════════════════════════════════

export interface SlotRegistrationOptions<TContext = unknown> {
  /** React component to render */
  component: React.ComponentType<SlotComponentProps<TContext>>;
  /** Priority for ordering (default: 50) */
  priority?: number;
  /** Optional filter - return false to hide */
  filter?: (context: TContext) => boolean;
  /** Additional metadata passed to component */
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Panel Registration
// ═══════════════════════════════════════════════════════════════════════════

export interface PanelDefinition {
  /** Unique panel ID */
  id: string;
  /** Plugin that registered this */
  pluginId: string;
  /** Display name */
  name: string;
  /** Icon component or lucide icon name */
  icon: React.ComponentType<{ size?: number; className?: string }> | string;
  /** Panel component */
  component: React.ComponentType;
  /** Default dock location */
  defaultLocation: 'left' | 'right' | 'bottom';
  /** Default weight (percentage) */
  defaultWeight: number;
  /** Whether user can close this panel */
  enableClose: boolean;
}

export interface PanelOptions {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }> | string;
  component: React.ComponentType;
  defaultLocation?: 'left' | 'right' | 'bottom';
  defaultWeight?: number;
  enableClose?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Stage View Registration
// ═══════════════════════════════════════════════════════════════════════════

export interface StageViewDefinition {
  /** Unique view ID */
  id: string;
  /** Plugin that registered this */
  pluginId: string;
  /** Display name */
  name: string;
  /** Icon */
  icon: React.ComponentType<{ size?: number; className?: string }> | string;
  /** View component */
  component: React.ComponentType;
}

export interface StageViewOptions {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }> | string;
  component: React.ComponentType;
}

// ═══════════════════════════════════════════════════════════════════════════
// Navigation Registration
// ═══════════════════════════════════════════════════════════════════════════

export interface NavigationDefinition {
  /** Unique navigation ID */
  id: string;
  /** Plugin that registered this */
  pluginId: string;
  /** Display label */
  label: string;
  /** Icon */
  icon: React.ComponentType<{ size?: number; className?: string }> | string;
  /** Associated view */
  view: StageViewDefinition;
  /** Badge function (returns count or null) */
  badge?: () => number | null;
  /** Order in nav rail */
  order: number;
}

export interface NavigationOptions {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }> | string;
  view: StageViewOptions;
  badge?: () => number | null;
  order?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Inspector Tab Registration
// ═══════════════════════════════════════════════════════════════════════════

export interface InspectorContext {
  activeTab: string;
}

export interface InspectorTabDefinition {
  id: string;
  pluginId: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  component: React.ComponentType<{ context: InspectorContext }>;
  priority: number;
  badge?: () => number | null;
}

export interface InspectorTabOptions {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  component: React.ComponentType<{ context: InspectorContext }>;
  priority?: number;
  badge?: () => number | null;
}

export interface InspectorSectionDefinition {
  id: string;
  pluginId: string;
  targetTab: string;
  component: React.ComponentType<{ context: InspectorContext }>;
  location: 'top' | 'bottom';
  priority: number;
}

export interface InspectorSectionOptions {
  id: string;
  targetTab: string;
  component: React.ComponentType<{ context: InspectorContext }>;
  location?: 'top' | 'bottom';
  priority?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Message Decorator Registration
// ═══════════════════════════════════════════════════════════════════════════

export interface MessageAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: (message: ChatMessage) => void;
  visible?: (message: ChatMessage) => boolean;
}

export interface MessageDecoratorDefinition {
  id: string;
  pluginId: string;
  match: (message: ChatMessage) => boolean;
  wrapper?: React.ComponentType<{ message: ChatMessage; children: React.ReactNode }>;
  before?: React.ComponentType<{ message: ChatMessage }>;
  after?: React.ComponentType<{ message: ChatMessage }>;
  actions: MessageAction[];
  priority: number;
}

export interface MessageDecoratorOptions {
  id: string;
  match: (message: ChatMessage) => boolean;
  wrapper?: React.ComponentType<{ message: ChatMessage; children: React.ReactNode }>;
  before?: React.ComponentType<{ message: ChatMessage }>;
  after?: React.ComponentType<{ message: ChatMessage }>;
  actions?: MessageAction[];
  priority?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Settings Tab Registration
// ═══════════════════════════════════════════════════════════════════════════

export interface SettingsTabDefinition {
  id: string;
  pluginId: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  component: React.ComponentType;
  order: number;
}

export interface SettingsTabOptions {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  component: React.ComponentType;
  order?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Command Palette Registration
// ═══════════════════════════════════════════════════════════════════════════

export interface CommandDefinition {
  id: string;
  pluginId: string;
  label: string;
  shortcut?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
  category?: string;
}

export interface CommandOptions {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
  category?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal and Toast Options
// ═══════════════════════════════════════════════════════════════════════════

export interface ModalOptions<T = unknown> {
  id: string;
  title: string;
  component: React.ComponentType<{ close: (result?: T) => void }>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface ToastOptions {
  id?: string;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  action?: { label: string; onClick: () => void };
}

// ═══════════════════════════════════════════════════════════════════════════
// Slot Context Types Map
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maps slot IDs to their context types for type safety
 */
export interface SlotContextMap {
  // Layout slots
  'layout:panel': undefined;
  'layout:stage-view': undefined;
  'layout:sidebar-view': undefined;
  
  // Navigation slots
  'nav:rail-item': NavRailContext;
  'nav:rail-footer': undefined;
  'nav:menu-item': undefined;
  'nav:context-menu': ContextMenuContext;
  
  // Inspector slots
  'inspector:tab': InspectorContext;
  'inspector:tab-button': InspectorContext;
  'inspector:tab-content': InspectorContext;
  'inspector:section': InspectorContext;
  
  // Chat slots
  'chat:message-before': ChatMessage;
  'chat:message-after': ChatMessage;
  'chat:message-action': ChatMessage;
  'chat:input-before': InputContext;
  'chat:input-after': InputContext;
  'chat:empty-state': undefined;
  
  // Overlay slots
  'overlay:command-palette': undefined;
  
  // Specialized slots
  'fence:renderer': FenceContext;
  'settings:tab': undefined;
  'onboarding:step': undefined;
}

export interface InputContext {
  content: string;
  setContent: (content: string) => void;
  metadata: Record<string, any>;
  setMetadata: (key: string, value: any) => void;
  onSend: () => void;
}

export interface NavRailContext {
  activeView: string;
  setActiveView: (view: string) => void;
}

export interface ContextMenuContext {
  target: HTMLElement;
  position: { x: number; y: number };
  data?: unknown;
}

export interface FenceContext {
  language: string;
  code: string;
  meta?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// UI Extension API
// ═══════════════════════════════════════════════════════════════════════════

export interface UIExtensionAPI {
  // Slot registration
  registerSlot<K extends keyof SlotContextMap>(
    slotId: K, 
    options: SlotRegistrationOptions<SlotContextMap[K]>
  ): () => void;
  
  // Panel registration for FlexLayout
  registerPanel(options: PanelOptions): () => void;
  
  // Stage view registration
  registerStageView(options: StageViewOptions): () => void;
  
  // Navigation with associated view
  registerNavigation(options: NavigationOptions): () => void;
  
  // Inspector tab
  registerInspectorTab(options: InspectorTabOptions): () => void;
  
  // Inspector section
  registerInspectorSection(options: InspectorSectionOptions): () => void;
  
  // Message decorator
  registerMessageDecorator(options: MessageDecoratorOptions): () => void;
  
  // Settings tab
  registerSettingsTab(options: SettingsTabOptions): () => void;
  
  // Modals and toasts
  showModal<T = unknown>(options: ModalOptions<T>): Promise<T | undefined>;
  showToast(options: ToastOptions): void;
  closeModal(id: string): void;
  
  // Command palette
  registerCommand(options: CommandOptions): () => void;
}
