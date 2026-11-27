import React from 'react';
import { captureComponentError } from '../utils/sentry';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    captureComponentError(error, errorInfo);
  }

  private handleReload = (): void => {
    try {
      window.location.reload();
    } catch {
      this.setState({ hasError: false });
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] text-[#F4F4F5] px-6">
          <div className="w-full max-w-md border border-white/[0.1] bg-[#111114] rounded-sm p-8 text-center space-y-4">
            <p className="font-mono text-xs text-[#52D1FF] tracking-wide uppercase">
              Studio Recovery
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-100">
              Something went wrong
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              An unexpected display error occurred while rendering the studio. Reload to restore your session.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-sm bg-[#52D1FF] hover:bg-[#7ADFFF] text-[#0A0A0B] font-semibold text-xs transition-colors duration-150 cursor-pointer"
              >
                Reload Studio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
