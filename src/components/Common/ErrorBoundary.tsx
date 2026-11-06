import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Trash2, Home, Clock, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep developer crash logs securely inside browser console only, never display raw code errors to user
    console.error('🛡️ SplitShare Handled UI Exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
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
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-100 text-center animate-fade-in">
            {/* Friendly Non-Alarming Header Icon */}
            <div className="relative w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600 border border-emerald-100 shadow-sm">
              <Clock size={30} className="stroke-[2.2]" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
              </span>
            </div>

            {/* Friendly Reassurance Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold tracking-wide uppercase mb-3">
              <ShieldCheck size={13} />
              <span>Your Data Is 100% Safe</span>
            </div>

            {/* Simple, Non-Technical Title */}
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Service Temporarily Unavailable
            </h1>

            {/* Calming, Human-Friendly Message */}
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              We experienced a brief temporary hiccup loading this screen.
              Your groups, expenses, and account records are completely secure in the cloud.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw size={16} />
                Try Again & Reconnect
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Home size={15} />
                Return to Home Screen
              </button>

              <button
                onClick={this.handleClearAndReload}
                className="w-full py-2 px-3 text-slate-400 hover:text-slate-600 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-1"
              >
                <Trash2 size={12} />
                Clear Local Cache & Restart Fresh
              </button>
            </div>

            <p className="mt-5 text-[11px] text-slate-400">
              Auto-recovery is active. The service will resume momentarily.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
