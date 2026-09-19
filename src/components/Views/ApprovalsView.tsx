import React from 'react';
import { Expense, Member, Group } from '../../types';
import { formatCurrency, formatRelativeDate, CATEGORY_DETAILS } from '../../utils/formatters';
import { CheckCircle2, AlertTriangle, Clock, ShieldCheck, Check } from 'lucide-react';

interface ApprovalsViewProps {
  currentUser: Member;
  allMembers: Member[];
  groups: Group[];
  expenses: Expense[];
  onAcceptApproval: (expenseId: string) => void;
  onOpenDisputeModal: (expense: Expense) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  currentUser,
  allMembers,
  groups,
  expenses,
  onAcceptApproval,
  onOpenDisputeModal,
}) => {
  // 1. Pending approvals for current user
  const myPendingExpenses = expenses.filter(
    (e) =>
      e.status === 'PENDING_APPROVAL' &&
      e.approvals?.[currentUser.id]?.status === 'PENDING'
  );

  // 2. Expenses created by current user awaiting others
  const myCreatedAwaitingOthers = expenses.filter(
    (e) =>
      e.paidById === currentUser.id &&
      e.status === 'PENDING_APPROVAL'
  );

  // 3. Recently approved or resolved expenses
  const recentlyApproved = expenses.filter(
    (e) =>
      e.requiresApproval &&
      e.status === 'CONFIRMED'
  );

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-28">
      {/* View Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl p-5 shadow-md">
        <div className="flex items-center gap-2 text-amber-100 text-xs font-bold uppercase tracking-wider">
          <Clock size={15} />
          Approval Center
        </div>
        <h1 className="text-xl font-extrabold mt-1">Pending Bill Approvals</h1>
        <p className="text-xs text-amber-100/90 mt-1">
          Review bills split with you before they get added to your balance.
        </p>
      </div>

      {/* Section 1: Requires My Action */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Awaiting Your Confirmation ({myPendingExpenses.length})
          </h2>
        </div>

        {myPendingExpenses.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-xs">
            <span className="text-3xl block mb-2">✅</span>
            <p className="text-xs font-bold text-slate-700">All caught up!</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No bills currently pending your permission.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myPendingExpenses.map((expense) => {
              const group = groups.find((g) => g.id === expense.groupId);
              const payer = allMembers.find((m) => m.id === expense.paidById);
              const mySplit = expense.splits.find((s) => s.memberId === currentUser.id);
              const cat = CATEGORY_DETAILS[expense.category] || CATEGORY_DETAILS.other;

              return (
                <div
                  key={expense.id}
                  className="bg-white rounded-2xl p-4 border-2 border-amber-300 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center text-lg`}>
                        {cat.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{expense.title}</h3>
                        <p className="text-[11px] text-slate-500">
                          {group?.name} • Added by <strong className="text-slate-700">{payer?.name}</strong>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatRelativeDate(expense.date)}
                    </span>
                  </div>

                  {/* Share breakdown card */}
                  <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-800">
                        Your Calculated Share ({expense.splitType.toLowerCase()})
                      </span>
                      <p className="text-base font-extrabold text-amber-950 mt-0.5">
                        {formatCurrency(mySplit?.amount || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Bill</span>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  </div>

                  {expense.notes && (
                    <p className="text-xs italic text-slate-500 bg-slate-50 p-2 rounded-lg">
                      Note: "{expense.notes}"
                    </p>
                  )}

                  {/* Approval Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onOpenDisputeModal(expense)}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <AlertTriangle size={14} />
                      Raise Query
                    </button>
                    <button
                      onClick={() => onAcceptApproval(expense.id)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                      <Check size={16} />
                      Accept & Confirm
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Outgoing Bills Awaiting Other Members */}
      {myCreatedAwaitingOthers.length > 0 && (
        <div className="pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Bills You Added (Waiting for others)
          </h2>
          <div className="space-y-2">
            {myCreatedAwaitingOthers.map((expense) => {
              const pendingCount = Object.values(expense.approvals || {}).filter(
                (a) => a.status === 'PENDING'
              ).length;
              const hasDispute = Object.values(expense.approvals || {}).some(
                (a) => a.status === 'DISPUTED'
              );

              return (
                <div key={expense.id} className="bg-white rounded-xl p-3.5 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{expense.title}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Total {formatCurrency(expense.amount)} • {expense.splits.length} people
                      </p>
                    </div>
                    {hasDispute ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Disputed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1">
                        <Clock size={11} />
                        {pendingCount} pending
                      </span>
                    )}
                  </div>

                  {/* Status pills per member */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                    {Object.entries(expense.approvals || {}).map(([mId, appr]) => {
                      const member = allMembers.find((m) => m.id === mId);
                      return (
                        <span
                          key={mId}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            appr.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : appr.status === 'DISPUTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {member?.name.split(' ')[0]}: {appr.status.toLowerCase()}
                          {appr.queryNote && ` ("${appr.queryNote}")`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: Recently Approved */}
      {recentlyApproved.length > 0 && (
        <div className="pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Recently Confirmed Bills
          </h2>
          <div className="space-y-2">
            {recentlyApproved.slice(0, 3).map((expense) => (
              <div key={expense.id} className="bg-white rounded-xl p-3 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">{expense.title}</p>
                    <p className="text-slate-400 text-[10px]">{formatRelativeDate(expense.date)}</p>
                  </div>
                </div>
                <span className="font-bold text-slate-900">{formatCurrency(expense.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
