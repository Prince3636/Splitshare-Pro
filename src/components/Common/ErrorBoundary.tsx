import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 SplitShare Uncaught UI Exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      localStorage.removeItem('splitshare_auth_account_v5');
      localStorage.removeItem('splitshare_auth_jwt_token');
      localStorage.removeItem('SPLITSHARE_SERVER_URL');
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-500 border border-amber-100">
              <AlertTriangle size={32} />
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Something went wrong
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              An unexpected display error occurred. Don't worry, your groups and bill records are safe in the cloud.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw size={16} />
                Reload SplitShare
              </button>

              <button
                onClick={this.handleClearAndReload}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-600 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 size={14} />
                Clear Local Cache & Restart
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                {this.state.showDetails ? 'Hide Technical Details' : 'View Technical Details'}
              </button>

              {this.state.showDetails && this.state.error && (
                <div className="mt-3 p-3 bg-slate-950 rounded-xl text-left overflow-x-auto text-[10px] font-mono text-emerald-400">
                  {this.state.error.toString()}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
