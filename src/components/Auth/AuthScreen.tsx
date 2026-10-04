import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Phone,
  CreditCard,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Send,
} from 'lucide-react';
import { UserAccount } from '../../types';
import {
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  sendPasswordReset,
  isFirebaseConfigured,
} from '../../services/firebase';

interface AuthScreenProps {
  onSignIn: (
    identifier: string,
    pass: string
  ) => Promise<{ success: boolean; error?: string; account?: UserAccount }> | { success: boolean; error?: string; account?: UserAccount };
  onSignUp: (data: {
    username: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
    upiId?: string;
    avatar?: string;
  }) => Promise<{ success: boolean; error?: string; account?: UserAccount }> | { success: boolean; error?: string; account?: UserAccount };
  onSetAccount?: (account: UserAccount) => void;
}

const AVATAR_OPTIONS = ['👨‍💻', '👩‍💻', '😎', '🚀', '🦊', '⚡', '🍕', '🎯', '🦁', '💎', '🧘', '🏖️'];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSignIn,
  onSignUp,
  onSetAccount,
}) => {
  const [mode, setMode] = useState<'SIGNIN' | 'SIGNUP' | 'FORGOT'>('SIGNIN');

  // Sign In inputs
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up inputs
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [avatar, setAvatar] = useState('👨‍💻');

  // Forgot Password input
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);

  // Status and Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verificationBanner, setVerificationBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!isFirebaseConfigured()) {
      setErrorMsg(
        'Firebase keys not detected in .env file. Please add VITE_FIREBASE_API_KEY in .env, or use Mobile/Email sign in below!'
      );
      setLoading(false);
      return;
    }

    try {
      const res = await signInWithGoogle();
      if (res.success && res.account) {
        if (onSetAccount) {
          onSetAccount(res.account);
        }
      } else {
        setErrorMsg(res.error || 'Google sign-in could not be completed.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error during Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Identifier (Mobile / Username / Email)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setVerificationBanner(null);

    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMsg('Please enter your username, email, or mobile number and password.');
      return;
    }

    setLoading(true);

    // If identifier is an email and Firebase is enabled, try Firebase Auth first
    if (loginIdentifier.includes('@') && isFirebaseConfigured()) {
      try {
        const fbRes = await signInWithEmail(loginIdentifier.trim(), loginPassword);
        if (fbRes.success && fbRes.account) {
          if (!fbRes.emailVerified) {
            setVerificationBanner(
              'Your email is not yet verified. Please check your inbox for the verification link.'
            );
          }
          if (onSetAccount) {
            onSetAccount(fbRes.account);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // Fall back to local store
      }
    }

    // Local / Backend Store sign-in
    const res = await onSignIn(loginIdentifier.trim(), loginPassword);
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials.');
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required fields (Name, Username, Email, Password).');
      return;
    }

    setLoading(true);

    // If Firebase is configured, register through Firebase Auth + send verification link!
    if (isFirebaseConfigured()) {
      try {
        const fbRes = await signUpWithEmail({
          email: email.trim(),
          password,
          name: name.trim(),
          username: username.trim(),
          phone: phone.trim() || undefined,
          upiId: upiId.trim() || undefined,
          avatar,
        });

        if (fbRes.success && fbRes.account) {
          setVerificationBanner(
            '✉️ Verification link sent to your email! Please verify your inbox to protect your account.'
          );
          if (onSetAccount) {
            onSetAccount(fbRes.account);
          }
          setLoading(false);
          return;
        } else if (fbRes.error) {
          setErrorMsg(fbRes.error);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn('Firebase signup failed, falling back:', err);
      }
    }

    // Default fast store signup
    const res = await onSignUp({
      name: name.trim(),
      username: username.trim(),
      phone: phone.trim() || undefined,
      email: email.trim(),
      password,
      upiId: upiId.trim() || undefined,
      avatar,
    });

    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create account.');
    } else {
      setSuccessMsg('Account created successfully! Welcome to SplitShare.');
    }
  };

  // Password Reset Handler
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setForgotStatus(null);

    if (!forgotEmail.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    const res = await sendPasswordReset(forgotEmail.trim());
    setLoading(false);

    if (res.success) {
      setForgotStatus(
        'Password reset link has been dispatched to your email! Check your inbox and spam folder.'
      );
    } else {
      setErrorMsg(res.error || 'Failed to send reset link. Ensure Firebase is configured.');
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-900 flex justify-center text-slate-900 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md min-h-screen min-h-[100dvh] bg-white flex flex-col shadow-2xl relative border-x border-slate-800 overflow-x-hidden">
        
        {/* Top Hero Brand Header */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-6 pt-10 pb-7 rounded-b-[2rem] shadow-xl relative shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-2xl shadow-md shadow-emerald-500/30">
                💸
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight">SplitShare</h1>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Real-Time Bill Splitting & UPI Settle-Ups
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-xs text-slate-200 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white text-xs">Zero Fake Data • Pure Cloud Sync</p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Each member only sees their real groups, approved bills, and instant UPI receipts.
              </p>
            </div>
          </div>
        </div>

        {/* Auth Body Container */}
        <div className="flex-1 px-5 py-5 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Mode Switcher Pills */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNIN');
                  setErrorMsg(null);
                  setSuccessMsg(null);
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
                  setSuccessMsg(null);
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

            {/* Email Verification Banner */}
            {verificationBanner && (
              <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 animate-in fade-in space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <span>✉️</span>
                  <span>Email Verification Notice</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {verificationBanner}
                </p>
              </div>
            )}

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 animate-in fade-in flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 animate-in fade-in flex items-center gap-2">
                <Check size={16} className="shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1-CLICK GOOGLE SIGN IN BUTTON */}
            {mode !== 'FORGOT' && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 text-xs font-bold shadow-xs flex items-center justify-center gap-3 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 absolute">
                    or continue with details
                  </span>
                </div>
              </div>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'FORGOT' ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <KeyRound size={15} />
                    Reset Your Password
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Enter your account's email address below. We'll dispatch a safe link to set a new password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {forgotStatus && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <Check size={16} className="text-emerald-600 shrink-0" />
                    <span>{forgotStatus}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Send size={15} />
                  Send Reset Link
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('SIGNIN');
                      setErrorMsg(null);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            ) : mode === 'SIGNIN' ? (
              /* SIGN IN FORM */
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Mobile No., Username, or Email
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210, rahul, or rahul@gmail.com"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('FORGOT');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-5"
                >
                  {loading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>Sign In & Open SplitShare</span>
                      <ArrowRight size={16} />
                    </>
                  )}
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
              <form onSubmit={handleSignUp} className="space-y-3">
                {/* Avatar Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Choose Your Avatar
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {AVATAR_OPTIONS.map((em) => (
                      <button
                        type="button"
                        key={em}
                        onClick={() => setAvatar(em)}
                        className={`w-9 h-9 rounded-xl text-lg shrink-0 flex items-center justify-center border transition-all ${
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
                    placeholder="e.g. Rahul Verma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
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
                      placeholder="e.g. rahul12"
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))
                      }
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Mobile No.
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">
                        🇮🇳
                      </span>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address * (For Verification Link)
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
                      placeholder="e.g. rahul@okhdfcbank or 9876543210@paytm"
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
                      type={showSignUpPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showSignUpPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-4"
                >
                  {loading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>Create Account & Start</span>
                      <Sparkles size={16} />
                    </>
                  )}
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

          <div className="pt-5 pb-2 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
              <span>🔒 256-bit Encrypted</span>
              <span>•</span>
              <span>Direct UPI Integration</span>
              <span>•</span>
              <span>Real-Time Cloud</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
