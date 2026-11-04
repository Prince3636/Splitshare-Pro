import React, { useState } from 'react';
import { AppNotification, GroupInvite, Expense, Member } from '../../types';
import { X, Bell, Mail, Check, AlertTriangle, Clock, CheckCircle2, BellRing } from 'lucide-react';
import { formatRelativeDate, formatCurrency } from '../../utils/formatters';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendLocalPushNotification,
} from '../../utils/notifications';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  pendingInvites: GroupInvite[];
  expenses: Expense[];
  currentUser: Member;
  onAcceptInvite: (inviteId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
  onAcceptApproval: (expenseId: string) => void;
  onOpenDisputeModal: (expense: Expense) => void;
  onMarkAllRead: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  pendingInvites,
  expenses,
  currentUser,
  onAcceptInvite,
  onDeclineInvite,
  onAcceptApproval,
  onOpenDisputeModal,
  onMarkAllRead,
}) => {
  const [permState, setPermState] = useState<string>(() => getNotificationPermission());

  if (!isOpen) return null;

  // Bills requiring approval for currentUser
  const myPendingExpenses = expenses.filter(
    (e) =>
      e.status === 'PENDING_APPROVAL' &&
      e.approvals?.[currentUser.id]?.status === 'PENDING'
  );

  const totalItems = pendingInvites.length + myPendingExpenses.length + notifications.length;

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    setPermState(getNotificationPermission());
    if (granted) {
      sendLocalPushNotification({
        title: 'Push Alerts Enabled! 🔔',
        body: 'SplitShare will alert you for bills, payments & approvals in real-time.',
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notifications & Invites"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-all"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500">Group invites & bill approval requests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close notifications drawer"
            className="min-w-[48px] min-h-[48px] rounded-full bg-slate-200/60 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Permission Banner for Web & Mobile Push */}
        {isNotificationSupported() && permState === 'default' && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <BellRing size={16} className="text-emerald-200 animate-bounce" />
              <span className="text-[11px] font-bold">Enable Real-Time Push Alerts</span>
            </div>
            <button
              onClick={handleEnablePush}
              className="px-3 py-1 bg-white text-emerald-800 text-[11px] font-extrabold rounded-lg shadow-xs hover:bg-emerald-50 transition-all active:scale-95"
            >
              Turn On
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Section 1: Pending Group Invitations */}
          {pendingInvites.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                Incoming Group Invites ({pendingInvites.length})
              </span>
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-1 bg-white rounded-xl shadow-xs">{invite.groupEmoji}</span>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950">{invite.groupName}</h4>
                        <p className="text-[11px] text-emerald-800">
                          Invited by <strong className="font-semibold">{invite.inviterName}</strong>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-700">
                      {formatRelativeDate(invite.createdAt)}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => onAcceptInvite(invite.id)}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} /> Join Group
                    </button>
                    <button
                      onClick={() => onDeclineInvite(invite.id)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section 2: Bills Awaiting Approval */}
          {myPendingExpenses.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                Bills Waiting For Your Approval ({myPendingExpenses.length})
              </span>
              {myPendingExpenses.map((expense) => {
                const myShare =
                  expense.splits?.find((s) => s.memberId === currentUser.id)?.amount || 0;

                return (
                  <div
                    key={expense.id}
                    className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-amber-950">{expense.title}</span>
                          <span className="px-1.5 py-0.5 rounded-sm bg-amber-200/70 text-amber-900 text-[10px] font-bold">
                            Approval Needed
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800/80 mt-0.5">
                          Total: ₹{expense.amount.toFixed(0)} • Your share:{' '}
                          <strong className="text-amber-950 font-bold">₹{myShare.toFixed(0)}</strong>
                        </p>
                      </div>
                      <span className="text-[10px] text-amber-700">
                        {formatRelativeDate(expense.date)}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => onAcceptApproval(expense.id)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Check size={14} /> Accept Share
                      </button>
                      <button
                        onClick={() => onOpenDisputeModal(expense)}
                        className="flex-1 py-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold hover:bg-amber-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <AlertTriangle size={14} /> Raise Query
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 3: General Activity Notifications & Reminders */}
          {notifications.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Recent Alerts
              </span>
              <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl p-2 border border-slate-200">
                {notifications.slice(0, 10).map((notif) => (
                  <div key={notif.id} className="py-2.5 px-2 text-xs flex items-start gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">
                      {notif.type === 'INVITE'
                        ? '✉️'
                        : notif.type === 'REMINDER'
                        ? '⏰'
                        : notif.type === 'SETTLEMENT'
                        ? '💸'
                        : notif.type === 'EXPENSE_APPROVED'
                        ? '✅'
                        : '🧾'}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{notif.title}</p>
                      <p className="text-slate-600 text-[11px] mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatRelativeDate(notif.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalItems === 0 && (
            <div className="text-center py-10">
              <span className="text-3xl block mb-2">🎉</span>
              <p className="text-xs font-bold text-slate-700">No new notifications</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                You're all caught up on invites and bill approvals!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 ? (
          <div className="p-3 border-t border-slate-100 bg-slate-50 text-center shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3">
            <button
              onClick={onMarkAllRead}
              className="text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              Mark all as read
            </button>
          </div>
        ) : (
          <div className="pb-[env(safe-area-inset-bottom,0px)]" />
        )}
      </div>
    </div>
  );
};
