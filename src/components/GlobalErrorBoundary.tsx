import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
// /* console.error */ ('Uncaught error:', error, errorInfo);
    
    // Log the error to Sentry
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack
      }
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zen-bg text-zen-text flex flex-col items-center justify-center p-8">
          <div className="max-w-md w-full bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zen-text/5 flex flex-col items-center text-center animate-slide-up">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" strokeWidth={2} />
            </div>
            
            <h1 className="text-2xl font-bold mb-3 tracking-tight">Something went wrong</h1>
            <p className="text-zen-text-2 mb-8 leading-relaxed">
              We're sorry, but an unexpected error occurred. The issue has been automatically reported to our engineering team.
            </p>
            
            <button 
              onClick={() => window.location.reload()}
              className="group w-full flex items-center justify-center gap-2 bg-zen-accent hover:bg-zen-accent-dark text-white font-medium py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98]"
            >
              <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              Reload Application
            </button>
            
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-8 p-4 bg-gray-50 rounded-xl w-full overflow-auto text-left border border-gray-100">
                <p className="text-sm font-mono text-red-500 font-semibold mb-2">{this.state.error.toString()}</p>
                <p className="text-xs font-mono text-gray-500 whitespace-pre-wrap">{this.state.error.stack}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
