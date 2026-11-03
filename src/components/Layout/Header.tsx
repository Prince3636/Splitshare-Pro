import React from 'react';
import { Member, UserAccount } from '../../types';
import { RotateCcw, ChevronDown, CheckCircle2, Bell, User, LogIn, UserPlus, LogOut } from 'lucide-react';

interface HeaderProps {
  currentUser: Member;
  currentAccount: UserAccount | null;
  accounts: UserAccount[];
  onSelectAccount: (userId: string) => void;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  onResetData: () => void;
  onSignOut?: () => void;
  pendingApprovalsCount: number;
  unreadNotificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentAccount,
  accounts,
  onSelectAccount,
  onOpenAuth,
  onOpenNotifications,
  onResetData,
  onSignOut,
  pendingApprovalsCount,
  unreadNotificationsCount,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const totalBadge = pendingApprovalsCount + unreadNotificationsCount;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-emerald-500/20">
            💸
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">
              SplitShare
            </span>
          </div>
        </div>

        {/* Right Action Icons: Notification Bell & Account Switcher */}
        <div className="flex items-center gap-2">
          {/* Notification Bell Icon */}
          <button
            onClick={onOpenNotifications}
            className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-600 transition-colors active:scale-95"
            title="Notifications & Invites"
          >
            <Bell size={18} />
            {totalBadge > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {totalBadge}
              </span>
            )}
          </button>

          {/* User Account / Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 transition-all border border-slate-200/80 text-xs font-semibold text-slate-800 shadow-xs active:scale-95"
              title="User account & profile"
            >
              <span className="text-sm">{currentUser.avatar}</span>
              <span className="max-w-[75px] truncate font-medium">{currentUser.name.split(' ')[0]}</span>
              <ChevronDown size={13} className="text-slate-500" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/10"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                  {/* Current user header */}
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70">
                    <p className="text-xs font-bold text-slate-900 leading-none">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                      {currentUser.email || 'No email registered'}
                    </p>
                    {currentUser.upiId && (
                      <p className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5">
                        UPI: {currentUser.upiId}
                      </p>
                    )}
                  </div>

                  {/* Switch to existing accounts */}
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Accounts
                    </div>
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          onSelectAccount(acc.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs transition-colors ${
                          acc.id === currentAccount?.id
                            ? 'bg-emerald-50 text-emerald-900 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{acc.avatar}</span>
                          <div className="truncate">
                            <p className="font-semibold leading-none truncate">{acc.name}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{acc.email}</p>
                          </div>
                        </div>
                        {acc.id === currentAccount?.id && (
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Log in / Create New Account */}
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenAuth();
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors"
                    >
                      <UserPlus size={14} />
                      Log In or Create New Account
                    </button>
                  </div>

                  {/* Log Out */}
                  {onSignOut && (
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onSignOut();
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                      >
                        <LogOut size={14} className="text-slate-500" />
                        Log Out ({currentUser.name})
                      </button>
                    </div>
                  )}

                  {/* Clear all data */}
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        if (confirm('Clear all groups, bills, and start fresh?')) {
                          onResetData();
                          setDropdownOpen(false);
                        }
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
                    >
                      <RotateCcw size={13} />
                      Clear All Groups & Data
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
