import React, { useState } from 'react';
import { User, Mail, Lock, Phone, CreditCard, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { UserAccount } from '../../types';

interface AuthScreenProps {
  onSignIn: (identifier: string, pass: string) => { success: boolean; error?: string; account?: UserAccount };
  onSignUp: (data: {
    username: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
    upiId?: string;
    avatar?: string;
  }) => { success: boolean; error?: string; account?: UserAccount };
}

const AVATAR_OPTIONS = ['👨‍💻', '👩‍💻', '😎', '🚀', '🦊', '⚡', '🍕', '🎯', '🦁', '💎', '🧘', '🏖️'];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn, onSignUp }) => {
  const [mode, setMode] = useState<'SIGNIN' | 'SIGNUP'>('SIGNIN');

  // Sign In inputs
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up inputs
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [upiId, setUpiId] = useState('');
  const [avatar, setAvatar] = useState('👨‍💻');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMsg('Please enter your username/email/mobile and password.');
      return;
    }
    const res = onSignIn(loginIdentifier.trim(), loginPassword);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials.');
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required fields (Name, Username, Email, Password).');
      return;
    }
    const res = onSignUp({
      name: name.trim(),
      username: username.trim(),
      phone: phone.trim() || undefined,
      email: email.trim(),
      password,
      upiId: upiId.trim() || undefined,
      avatar,
    });
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create account.');
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-100 flex justify-center text-slate-900 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md min-h-screen min-h-[100dvh] bg-white flex flex-col shadow-2xl relative border-x border-slate-200 overflow-x-hidden">
        {/* Top Hero Brand Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 pt-10 pb-8 rounded-b-[2.5rem] shadow-lg relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-2xl shadow-md shadow-emerald-500/30">
              💸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">SplitShare</h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Real-Time Bill Splitting & UPI Settle-Ups
              </p>
            </div>
          </div>

          <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-xs text-slate-200 leading-relaxed">
            <p className="flex items-center gap-1.5 font-bold text-emerald-300">
              <ShieldCheck size={16} />
              Permission-Based Bill Sharing
            </p>
            <p className="text-[11px] text-slate-300 mt-1">
              Add bills with friends. Debtors must approve shares before balances update!
            </p>
          </div>
        </div>

        {/* Auth Body */}
        <div className="flex-1 px-6 py-5 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Mode Switcher Pills */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNIN');
                  setErrorMsg(null);
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  mode === 'SIGNIN'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNUP');
                  setErrorMsg(null);
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  mode === 'SIGNUP'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 animate-in fade-in flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {mode === 'SIGNIN' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Username, Email, or Mobile No.
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. rahul, rahul@gmail.com, 9876543210"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400">
                      <Lock size={16} />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-6"
                >
                  Sign In & Enter
                  <ArrowRight size={16} />
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('SIGNUP');
                        setErrorMsg(null);
                      }}
                      className="font-bold text-emerald-600 hover:underline"
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleSignUp} className="space-y-3.5">
                {/* Choose Avatar */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Choose Your Avatar
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {AVATAR_OPTIONS.map((em) => (
                      <button
                        type="button"
                        key={em}
                        onClick={() => setAvatar(em)}
                        className={`w-10 h-10 rounded-xl text-xl shrink-0 flex items-center justify-center border transition-all ${
                          avatar === em
                            ? 'border-emerald-500 bg-emerald-50 scale-105 shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. rahul"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
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
                      placeholder="e.g. rahul@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
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
                      placeholder="e.g. rahul@paytm or 9876543210@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
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
                      className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-4"
                >
                  Create Account & Enter
                  <Sparkles size={16} />
                </button>

                <div className="text-center pt-1">
                  <p className="text-xs text-slate-500">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('SIGNIN');
                        setErrorMsg(null);
                      }}
                      className="font-bold text-emerald-600 hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>

          <div className="pt-6 pb-2 text-center">
            <p className="text-[11px] text-slate-400">
              🔒 100% Real-Time Data • Direct NPCI UPI Settlement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
