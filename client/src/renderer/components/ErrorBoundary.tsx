import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-8">
          <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
          <div className="bg-card p-4 rounded-lg border border-border max-w-2xl w-full overflow-auto">
            <p className="font-mono text-sm text-red-400 mb-2">{this.state.error?.toString()}</p>
            <details className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
              {this.state.errorInfo?.componentStack}
            </details>
          </div>
          <button 
            className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
