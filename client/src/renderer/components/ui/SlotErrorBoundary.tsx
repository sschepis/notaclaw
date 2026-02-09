/**
 * SlotErrorBoundary - Error isolation for plugin components
 *
 * This component wraps plugin-provided components to catch and handle errors,
 * preventing plugin failures from crashing the entire application.
 *
 * Features:
 * - Catches render errors in plugin components
 * - Displays user-friendly fallback UI
 * - Logs detailed error information for debugging
 * - Provides retry functionality
 * - Reports errors to parent components
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Debug logging
const DEBUG = process.env.NODE_ENV === 'development';

interface Props {
  /** The plugin component to render */
  children: ReactNode;
  /** The slot where this component is rendered */
  slotId: string;
  /** The plugin/extension that provided this component */
  extensionId: string;
  /** Callback when an error occurs */
  onError?: (error: Error, extensionId: string) => void;
  /** Custom fallback UI (optional) */
  fallback?: ReactNode;
  /** Whether to show retry button */
  showRetry?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/** Maximum number of retries before permanently showing error */
const MAX_RETRIES = 3;

/**
 * Error boundary for extension slot components.
 * Catches errors in plugin components and displays a fallback UI.
 */
export class SlotErrorBoundary extends Component<Props, State> {
  static displayName = 'SlotErrorBoundary';
  
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { slotId, extensionId, onError } = this.props;
    
    // Log error details
    console.error(
      `[SlotErrorBoundary] Extension "${extensionId}" crashed in slot "${slotId}":`,
      error
    );
    
    if (DEBUG && errorInfo.componentStack) {
      console.error('Component stack:', errorInfo.componentStack);
    }
    
    // Update error count
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1
    }));
    
    // Notify parent
    if (onError) {
      try {
        onError(error, extensionId);
      } catch (callbackError) {
        console.error('[SlotErrorBoundary] Error in onError callback:', callbackError);
      }
    }
  }

  /**
   * Handle retry button click
   */
  private handleRetry = (): void => {
    if (this.state.errorCount >= MAX_RETRIES) {
      console.warn(
        `[SlotErrorBoundary] Max retries (${MAX_RETRIES}) reached for "${this.props.extensionId}"`
      );
      return;
    }
    
    this.setState({ hasError: false, error: null });
  };

  /**
   * Get a user-friendly error message
   */
  private getErrorMessage(): string {
    const { error, errorCount } = this.state;
    
    if (errorCount >= MAX_RETRIES) {
      return 'Plugin failed repeatedly and has been disabled';
    }
    
    if (error?.message) {
      // Truncate long error messages
      const message = error.message;
      return message.length > 100 ? `${message.substring(0, 100)}...` : message;
    }
    
    return 'An unknown error occurred';
  }

  render(): ReactNode {
    const { children, extensionId, fallback, showRetry = true } = this.props;
    const { hasError, errorCount } = this.state;
    
    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }
      
      const canRetry = showRetry && errorCount < MAX_RETRIES;
      const errorMessage = this.getErrorMessage();
      
      return (
        <div
          className="flex items-center gap-2 p-2 bg-red-950/20 border border-red-500/30 rounded-md text-xs text-red-400"
          role="alert"
          aria-live="polite"
          data-extension-id={extensionId}
        >
          <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
          <span className="flex-1 truncate" title={errorMessage}>
            Extension error: {extensionId}
          </span>
          {canRetry && (
            <button
              onClick={this.handleRetry}
              className="p-1 rounded hover:bg-red-500/20 transition-colors shrink-0"
              title="Retry loading extension"
              aria-label="Retry loading extension"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      );
    }

    return children;
  }
}

export default SlotErrorBoundary;
