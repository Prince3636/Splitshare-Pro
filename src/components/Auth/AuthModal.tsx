import React, { useState } from 'react';
import { UserAccount } from '../../types';
import { X, Lock, Mail, User, CreditCard, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: UserAccount[];
  currentAccount: UserAccount | null;
  onSignUp: (data: {
    name: string;
    email: string;
    password: string;
    username?: string;
    upiId?: string;
  }) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onSignIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onSwitchAccount: (userId: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currentAccount,
  onSignUp,
  onSignIn,
  onSwitchAccount,
}) => {
  const [mode, setMode] = useState<'SIGNIN' | 'SIGNUP'>('SIGNIN');

  // Sign In fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [upiId, setUpiId] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !loginPassword) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    const res = await onSignIn(cleanEmail, loginPassword);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to sign in.');
    } else {
      onClose();
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (!cleanEmail || !password || !cleanName) {
      setErrorMsg('Please fill in Name, Email, and Password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    const res = await onSignUp({
      name: cleanName,
      email: cleanEmail,
      password,
      username: cleanEmail.split('@')[0],
      upiId: upiId.trim() || undefined,
    });
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create account.');
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account Authentication"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-all"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200 pb-[env(safe-area-inset-bottom,0px)] sm:pb-0">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0 bg-slate-50/80">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {mode === 'SIGNIN' ? 'Sign In to SplitShare' : 'Create Your Account'}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === 'SIGNIN' ? 'Access your groups & bills' : 'Start splitting bills with your real friends'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close authentication dialog"
            className="min-w-[48px] min-h-[48px] rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl my-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('SIGNIN');
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'SIGNIN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('SIGNUP');
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'SIGNUP' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-2.5 mb-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Forms */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-2">
          {mode === 'SIGNIN' ? (
            <form onSubmit={handleSignInSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all mt-2"
              >
                Sign In
                <ArrowRight size={14} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUpSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Primary UPI ID (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <CreditCard size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder="rohit@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all mt-2"
              >
                Create My Account
                <ArrowRight size={14} />
              </button>
            </form>
          )}

          {/* Quick Demo Switcher Section */}
          {accounts.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Quick Switch Registered Accounts
              </span>
              <div className="space-y-1">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      onSwitchAccount(acc.id);
                      onClose();
                    }}
                    className={`w-full p-2 rounded-xl flex items-center justify-between text-left text-xs transition-colors ${
                      acc.id === currentAccount?.id
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{acc.avatar}</span>
                      <div>
                        <p className="font-bold leading-none">{acc.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{acc.email}</p>
                      </div>
                    </div>
                    {acc.id === currentAccount?.id && (
                      <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-md">
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
