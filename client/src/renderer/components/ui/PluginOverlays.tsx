/**
 * PluginOverlays - Renders plugin-triggered modals and toasts
 *
 * This component should be placed at the root of the app to handle
 * modal and toast rendering from the SlotRegistry.
 *
 * Features:
 * - Modal stack rendering with backdrop and escape key support
 * - Toast notifications with auto-dismiss and action support
 * - Full keyboard accessibility (Escape to close modals)
 * - Error boundaries around plugin-provided content
 * - Performance optimized with React.memo and useCallback
 */

import React, { memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useModals, useToasts, useSlotRegistry } from '../../services/SlotRegistry';
import { SlotErrorBoundary } from './SlotErrorBoundary';
import { cn } from '../../lib/utils';
import type { ToastOptions } from '../../../shared/slot-types';

// Debug logging
const DEBUG = process.env.NODE_ENV === 'development';
const log = (message: string, ...args: unknown[]) => {
  if (DEBUG) console.log(`[PluginOverlays] ${message}`, ...args);
};

// ═══════════════════════════════════════════════════════════════════════════
// Modal Backdrop
// ═══════════════════════════════════════════════════════════════════════════

interface ModalBackdropProps {
  onClick: () => void;
  'aria-label'?: string;
}

const ModalBackdrop: React.FC<ModalBackdropProps> = memo(({ onClick, 'aria-label': ariaLabel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
    onClick={onClick}
    role="button"
    tabIndex={-1}
    aria-label={ariaLabel || 'Close modal'}
  />
));

ModalBackdrop.displayName = 'ModalBackdrop';

// ═══════════════════════════════════════════════════════════════════════════
// Modal Container
// ═══════════════════════════════════════════════════════════════════════════

const MODAL_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
} as const;

interface ModalContainerProps {
  id: string;
  title: string;
  component: React.ComponentType<{ close: (result?: unknown) => void }>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  onClose: (result?: unknown) => void;
}

const ModalContainer: React.FC<ModalContainerProps> = memo(({
  id,
  title,
  component: Component,
  size = 'md',
  onClose,
}) => {
  // Handle escape key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      log('Modal closed via Escape key:', id);
      onClose(undefined);
    }
  }, [id, onClose]);

  // Set up escape key listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Memoize close handler
  const handleClose = useCallback(() => {
    log('Modal close button clicked:', id);
    onClose(undefined);
  }, [id, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
        "bg-gray-900 border border-gray-700 rounded-xl shadow-2xl",
        "flex flex-col max-h-[90vh] w-full",
        MODAL_SIZES[size]
      )}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`modal-title-${id}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h2 id={`modal-title-${id}`} className="text-lg font-semibold text-white">{title}</h2>
        <button
          onClick={handleClose}
          className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          aria-label={`Close ${title}`}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <SlotErrorBoundary slotId="overlay:modal" extensionId={id}>
          <Component close={onClose} />
        </SlotErrorBoundary>
      </div>
    </motion.div>
  );
});

ModalContainer.displayName = 'ModalContainer';

// ═══════════════════════════════════════════════════════════════════════════
// Plugin Modals Renderer
// ═══════════════════════════════════════════════════════════════════════════

export const PluginModals: React.FC = memo(() => {
  const modals = useModals();
  const closeModal = useSlotRegistry((state) => state.closeModal);

  // Create stable close handlers
  const handleBackdropClick = useCallback((modalId: string) => {
    log('Modal backdrop clicked:', modalId);
    closeModal(modalId, undefined);
  }, [closeModal]);

  const handleModalClose = useCallback((modalId: string, result?: unknown) => {
    log('Modal closed:', modalId, result !== undefined ? 'with result' : 'without result');
    closeModal(modalId, result);
  }, [closeModal]);

  if (modals.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {modals.map((modal) => (
        <React.Fragment key={modal.id}>
          <ModalBackdrop
            onClick={() => handleBackdropClick(modal.id)}
            aria-label={`Close ${modal.options.title}`}
          />
          <ModalContainer
            id={modal.id}
            title={modal.options.title}
            component={modal.options.component}
            size={modal.options.size}
            onClose={(result) => handleModalClose(modal.id, result)}
          />
        </React.Fragment>
      ))}
    </AnimatePresence>
  );
});

PluginModals.displayName = 'PluginModals';

// ═══════════════════════════════════════════════════════════════════════════
// Toast Icons
// ═══════════════════════════════════════════════════════════════════════════

const TOAST_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
} as const;

const TOAST_COLORS = {
  info: 'border-blue-500/30 bg-blue-500/10',
  success: 'border-green-500/30 bg-green-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  error: 'border-red-500/30 bg-red-500/10',
} as const;

const TOAST_ICON_COLORS = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Toast Component
// ═══════════════════════════════════════════════════════════════════════════

interface ToastItemProps {
  toast: ToastOptions & { id: string };
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = memo(({ toast, onDismiss }) => {
  const type = toast.type || 'info';
  const Icon = TOAST_ICONS[type];

  // Handle action click with error boundary
  const handleActionClick = useCallback(() => {
    if (!toast.action) return;
    
    try {
      log('Toast action clicked:', toast.id, toast.action.label);
      toast.action.onClick();
    } catch (error) {
      console.error(`[PluginOverlays] Toast action failed for "${toast.id}":`, error);
    }
  }, [toast.id, toast.action]);

  // Handle dismiss click
  const handleDismiss = useCallback(() => {
    log('Toast dismissed:', toast.id);
    onDismiss();
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border shadow-lg",
        "bg-gray-900/95 backdrop-blur-sm min-w-[300px] max-w-md",
        TOAST_COLORS[type]
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", TOAST_ICON_COLORS[type])} aria-hidden="true" />
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white text-sm">{toast.title}</h4>
        {toast.message && (
          <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={handleActionClick}
            className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
});

ToastItem.displayName = 'ToastItem';

// ═══════════════════════════════════════════════════════════════════════════
// Plugin Toasts Renderer
// ═══════════════════════════════════════════════════════════════════════════

export const PluginToasts: React.FC = memo(() => {
  const toasts = useToasts();
  const dismissToast = useSlotRegistry((state) => state.dismissToast);

  // Create stable dismiss handler
  const handleDismiss = useCallback((toastId: string) => {
    dismissToast(toastId);
  }, [dismissToast]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => handleDismiss(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

PluginToasts.displayName = 'PluginToasts';

// ═══════════════════════════════════════════════════════════════════════════
// Combined Overlays Component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main overlay component to be placed at the root of the app.
 * Renders both modals and toasts from plugins.
 */
export const PluginOverlays: React.FC = memo(() => {
  return (
    <>
      <PluginModals />
      <PluginToasts />
    </>
  );
});

PluginOverlays.displayName = 'PluginOverlays';

export default PluginOverlays;
