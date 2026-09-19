import React, { useState, useEffect } from 'react';
import { Bell, X, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { AppNotification } from '../../types';

interface FloatingAlertProps {
  notifications: AppNotification[];
  pendingApprovalsCount: number;
  pendingInvitesCount: number;
  onOpenNotifications: () => void;
  onOpenApprovals: () => void;
}

export const FloatingAlert: React.FC<FloatingAlertProps> = ({
  notifications,
  pendingApprovalsCount,
  pendingInvitesCount,
  onOpenNotifications,
  onOpenApprovals,
}) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const totalAlerts = pendingApprovalsCount + pendingInvitesCount;

  useEffect(() => {
    if (totalAlerts > 0 && !dismissed) {
      setVisible(true);
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [totalAlerts, dismissed]);

  if (!visible || totalAlerts === 0) return null;

  return (
    <div className="fixed top-[calc(3.75rem+env(safe-area-inset-top,0px))] left-0 right-0 z-40 px-4 pointer-events-none animate-in slide-in-from-top-4 duration-300">
      <div className="max-w-md mx-auto pointer-events-auto bg-slate-900 text-white rounded-2xl p-3 shadow-xl border border-slate-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Bell size={16} className="animate-bounce" />
          </div>
          <div className="truncate">
            <p className="text-xs font-bold truncate">
              {pendingInvitesCount > 0
                ? `✉️ You have ${pendingInvitesCount} group invitation!`
                : `🔔 ${pendingApprovalsCount} bill(s) awaiting your approval!`}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              Tap to review and confirm your share
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              if (pendingInvitesCount > 0) {
                onOpenNotifications();
              } else {
                onOpenApprovals();
              }
              setVisible(false);
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
          >
            Review
            <ArrowRight size={12} />
          </button>
          <button
            onClick={() => {
              setVisible(false);
              setDismissed(true);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
