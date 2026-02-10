/**
 * ExtensionSlotV2 - Enhanced extension slot component
 *
 * This component renders registered extensions for a given slot,
 * with support for filtering, priority ordering, layout options,
 * and error boundaries.
 *
 * Features:
 * - Type-safe slot context mapping
 * - Extension filtering with error handling
 * - Configurable layout (stack, inline, grid)
 * - Error boundaries around each extension
 * - Performance optimized with memoization
 * - Debug data attributes for development
 */

import React, { useMemo, useCallback, memo } from 'react';
import { cn } from '../../lib/utils';
import { useSlotRegistry } from '../../services/SlotRegistry';
import { SlotErrorBoundary } from './SlotErrorBoundary';
import type { SlotContextMap, SlotRegistration } from '../../../shared/slot-types';

// Debug logging
const DEBUG = process.env.NODE_ENV === 'development';
const log = (message: string, ...args: unknown[]) => {
  if (DEBUG) console.log(`[ExtensionSlot] ${message}`, ...args);
};

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface ExtensionSlotProps<K extends keyof SlotContextMap> {
  /** The slot identifier */
  name: K;
  /** Context data passed to extensions */
  context?: SlotContextMap[K];
  /** Fallback when no extensions are registered */
  fallback?: React.ReactNode;
  /** Wrapper component for all extensions */
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  /** Whether to render even with no extensions */
  renderEmpty?: boolean;
  /** Maximum number of extensions to render */
  maxItems?: number;
  /** Layout style */
  layout?: 'stack' | 'inline' | 'grid';
  /** Gap between items (tailwind spacing value) */
  gap?: 0 | 1 | 2 | 3 | 4 | 6 | 8;
  /** Additional CSS classes */
  className?: string;
  /** Callback when an extension errors */
  onExtensionError?: (error: Error, extensionId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Layout Classes
// ═══════════════════════════════════════════════════════════════════════════

const layoutClasses = {
  stack: 'flex flex-col',
  inline: 'flex flex-row flex-wrap',
  grid: 'grid grid-cols-2',
} as const;

const gapClasses = {
  0: '',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

function ExtensionSlotV2Inner<K extends keyof SlotContextMap>({
  name,
  context,
  fallback,
  wrapper: Wrapper,
  renderEmpty = false,
  maxItems,
  layout = 'stack',
  gap = 0,
  className,
  onExtensionError,
}: ExtensionSlotProps<K>): React.ReactElement | null {
  // Get extensions from registry - use shallow comparison for stability
  const registrations = useSlotRegistry((state) => state.registrations[name] || []);

  // Create stable error handler
  const handleError = useCallback((error: Error, extensionId: string) => {
    console.error(`[ExtensionSlot] Extension error in slot "${name}":`, extensionId, error);
    onExtensionError?.(error, extensionId);
  }, [name, onExtensionError]);

  // Filter extensions based on context
  // Note: We use 'unknown' for the internal array type since the registry stores heterogeneous registrations
  // The type safety is maintained at the registration point
  const filteredExtensions = useMemo(() => {
    const filtered: Array<SlotRegistration<unknown>> = [];
    
    for (const reg of registrations) {
      // No filter means always include
      if (!reg.filter) {
        filtered.push(reg);
        continue;
      }
      
      // No context means include (can't evaluate filter)
      if (context === undefined) {
        filtered.push(reg);
        continue;
      }
      
      // Evaluate filter with error handling
      try {
        if (reg.filter(context)) {
          filtered.push(reg);
        }
      } catch (error) {
        console.warn(`[ExtensionSlot] Filter error in "${reg.id}":`, error);
        // Include on filter error to prevent hiding functionality
        filtered.push(reg);
      }
    }

    // Apply max items limit if specified
    if (maxItems !== undefined && maxItems > 0 && filtered.length > maxItems) {
      log(`Limiting slot "${name}" to ${maxItems} items (${filtered.length} available)`);
      return filtered.slice(0, maxItems);
    }

    return filtered;
  }, [registrations, context, maxItems, name]);

  // Fast path: no extensions and not rendering empty
  if (filteredExtensions.length === 0 && !renderEmpty) {
    return fallback ? <>{fallback}</> : null;
  }

  // Log slot rendering in development
  if (DEBUG && filteredExtensions.length > 0) {
    log(`Rendering slot "${name}" with ${filteredExtensions.length} extension(s)`);
  }

  // Render extensions
  const content = (
    <div
      className={cn(
        'extension-slot',
        layoutClasses[layout],
        gapClasses[gap],
        className
      )}
      data-slot={name}
      data-extension-count={filteredExtensions.length}
      role="region"
      aria-label={`Extension slot: ${name}`}
    >
      {filteredExtensions.map((registration) => (
        <ExtensionItem
          key={registration.id}
          registration={registration}
          context={context}
          slotId={name}
          onError={handleError}
        />
      ))}
    </div>
  );

  // Apply wrapper if provided
  if (Wrapper) {
    return <Wrapper>{content}</Wrapper>;
  }

  return content;
}

// Memoize the component for performance
export const ExtensionSlotV2 = memo(ExtensionSlotV2Inner) as typeof ExtensionSlotV2Inner;

// ═══════════════════════════════════════════════════════════════════════════
// Extension Item
// ═══════════════════════════════════════════════════════════════════════════

interface ExtensionItemProps<TContext> {
  registration: SlotRegistration<TContext>;
  context: TContext | undefined;
  slotId: string;
  onError?: (error: Error, extensionId: string) => void;
}

const ExtensionItemInner = function ExtensionItem<TContext>({
  registration,
  context,
  slotId,
  onError,
}: ExtensionItemProps<TContext>): React.ReactElement {
  const Component = registration.component;

  // Validate component exists
  if (!Component) {
    console.error(`[ExtensionSlot] No component for registration "${registration.id}"`);
    return <></>;
  }

  return (
    <SlotErrorBoundary
      slotId={slotId}
      extensionId={registration.id}
      onError={onError}
    >
      <div
        className="extension-item"
        data-extension-id={registration.id}
        data-plugin-id={registration.pluginId}
      >
        <Component
          context={context as TContext}
          metadata={registration.metadata}
        />
      </div>
    </SlotErrorBoundary>
  );
};

// Memoized version of ExtensionItem
const ExtensionItem = memo(ExtensionItemInner) as typeof ExtensionItemInner;

// ═══════════════════════════════════════════════════════════════════════════
// Convenience Components for Common Slots
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Slot for nav rail items
 */
export const NavRailSlot: React.FC<{
  className?: string;
}> = memo(({ className }) => (
  <ExtensionSlotV2
    name="nav:rail-item"
    layout="stack"
    gap={2}
    className={className}
  />
));

NavRailSlot.displayName = 'NavRailSlot';

/**
 * Slot for inspector tab buttons
 */
export const InspectorTabButtonsSlot: React.FC<{
  activeTab: string;
  className?: string;
}> = memo(({ activeTab, className }) => (
  <ExtensionSlotV2
    name="inspector:tab-button"
    context={{ activeTab }}
    layout="inline"
    className={className}
  />
));

InspectorTabButtonsSlot.displayName = 'InspectorTabButtonsSlot';

/**
 * Slot for inspector tab content
 */
export const InspectorTabContentSlot: React.FC<{
  activeTab: string;
  className?: string;
}> = memo(({ activeTab, className }) => (
  <ExtensionSlotV2
    name="inspector:tab-content"
    context={{ activeTab }}
    className={className}
  />
));

InspectorTabContentSlot.displayName = 'InspectorTabContentSlot';

/**
 * Slot for chat input decorations (before input)
 */
export const ChatInputBeforeSlot: React.FC<{
  className?: string;
}> = memo(({ className }) => (
  <ExtensionSlotV2
    name="chat:input-before"
    layout="stack"
    gap={2}
    className={className}
  />
));

ChatInputBeforeSlot.displayName = 'ChatInputBeforeSlot';

/**
 * Slot for chat input decorations (after input)
 */
export const ChatInputAfterSlot: React.FC<{
  className?: string;
  context?: any;
}> = memo(({ className, context }) => (
  <ExtensionSlotV2
    name="chat:input-after"
    context={context}
    layout="stack"
    gap={2}
    className={className}
  />
));

ChatInputAfterSlot.displayName = 'ChatInputAfterSlot';

/**
 * Slot for empty chat state
 */
export const ChatEmptyStateSlot: React.FC<{
  fallback: React.ReactNode;
}> = memo(({ fallback }) => (
  <ExtensionSlotV2
    name="chat:empty-state"
    fallback={fallback}
    maxItems={1}
  />
));

ChatEmptyStateSlot.displayName = 'ChatEmptyStateSlot';

export default ExtensionSlotV2;
