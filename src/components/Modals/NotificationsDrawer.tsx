import React from 'react';
import { AppNotification, GroupInvite, Expense, Member } from '../../types';
import { X, Bell, Mail, Check, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { formatRelativeDate, formatCurrency } from '../../utils/formatters';

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
  if (!isOpen) return null;

  // Bills requiring approval for currentUser
  const myPendingExpenses = expenses.filter(
    (e) =>
      e.status === 'PENDING_APPROVAL' &&
      e.approvals?.[currentUser.id]?.status === 'PENDING'
  );

  const totalItems = pendingInvites.length + myPendingExpenses.length + notifications.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-all">
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
            className="w-7 h-7 rounded-full bg-slate-200/60 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

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
                      onClick={() => onDeclineInvite(invite.id)}
                      className="flex-1 py-1.5 rounded-xl border border-emerald-300 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100/50 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => {
                        onAcceptInvite(invite.id);
                      }}
                      className="flex-2 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                    >
                      <Check size={14} />
                      Accept & Join Group
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section 2: Pending Bill Approvals */}
          {myPendingExpenses.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                Bills Awaiting Your Approval ({myPendingExpenses.length})
              </span>
              {myPendingExpenses.map((exp) => {
                const mySplit = exp.splits.find((s) => s.memberId === currentUser.id);

                return (
                  <div
                    key={exp.id}
                    className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{exp.title}</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Total: {formatCurrency(exp.amount)} • Your Share:{' '}
                          <strong className="text-amber-900 font-extrabold">
                            {formatCurrency(mySplit?.amount || 0)}
                          </strong>
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatRelativeDate(exp.date)}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => onOpenDisputeModal(exp)}
                        className="flex-1 py-1.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-amber-900 hover:bg-amber-100/50 transition-colors"
                      >
                        Query
                      </button>
                      <button
                        onClick={() => onAcceptApproval(exp.id)}
                        className="flex-2 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                      >
                        <Check size={14} />
                        Accept Bill
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
                {notifications.slice(0, 8).map((notif) => (
                  <div key={notif.id} className="py-2.5 px-2 text-xs flex items-start gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">
                      {notif.type === 'INVITE' ? '✉️' : notif.type === 'REMINDER' ? '⏰' : '🧾'}
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
