import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  /** Human label of the current view, shown in the fallback copy. */
  viewLabel?: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Per-view error boundary. Catches a render-phase crash inside a single screen
 * and shows a compact inline fallback instead of letting the exception bubble to
 * the global window handler (which replaces the whole app with a fatal screen).
 *
 * Mount this with `key={currentView}` so navigating to another view remounts it
 * and clears any previous error automatically. The "Try again" button re-attempts
 * the same view without a full page reload.
 *
 * This replaces the old blanket iPhone-Safari block that disabled five views
 * outright: now every view is available everywhere, and only a view that
 * genuinely throws degrades — and only that view.
 */
class ViewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('View render error', this.props.viewLabel, error, errorInfo);
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
          <div className="bg-slate-800 p-8 rounded-[32px] border border-slate-700 shadow-2xl max-w-sm">
            <div className="bg-amber-500/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="text-amber-400" size={26} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {this.props.viewLabel ? `${this.props.viewLabel} hit a snag` : 'This view hit a snag'}
            </h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Something in this screen failed to load. The rest of the app is still working —
              switch tabs or try again.
            </p>
            <button
              onClick={this.retry}
              className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              <RefreshCw size={18} /> Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ViewErrorBoundary;
