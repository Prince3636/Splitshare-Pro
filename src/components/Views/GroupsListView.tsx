import React from 'react';
import { Group, Member, Expense, Settlement, AppNotification } from '../../types';
import { calculateBalances } from '../../utils/debtSimplifier';
import { formatCurrency } from '../../utils/formatters';
import { Plus, ChevronRight, UserPlus, Sparkles, Receipt, AlertCircle, Bell } from 'lucide-react';

interface GroupsListViewProps {
  groups: Group[];
  currentUser: Member;
  expenses: Expense[];
  settlements: Settlement[];
  notifications?: AppNotification[];
  onSelectGroup: (group: Group) => void;
  onOpenCreateGroup: () => void;
}

export const GroupsListView: React.FC<GroupsListViewProps> = ({
  groups,
  currentUser,
  expenses,
  settlements,
  notifications = [],
  onSelectGroup,
  onOpenCreateGroup,
}) => {
  const groupMetrics = React.useMemo(() => {
    const map: Record<string, { myBalance: number; pendingForMe: number; unreadGroupNotifs: number; expenseCount: number }> = {};
    groups.forEach((group) => {
      const groupExpenses = expenses.filter((e) => e.groupId === group.id);
      const groupSettlements = settlements.filter((s) => s.groupId === group.id);
      const { netBalances } = calculateBalances(
        group.members.map((m) => m.id),
        groupExpenses,
        groupSettlements
      );
      const myBalance = netBalances[currentUser.id] || 0;
      const pendingForMe = groupExpenses.filter(
        (e) =>
          e.status === 'PENDING_APPROVAL' &&
          e.approvals?.[currentUser.id]?.status === 'PENDING'
      ).length;
      const unreadGroupNotifs = (notifications || []).filter(
        (n) => n.groupId === group.id && !n.read
      ).length;
      map[group.id] = { myBalance, pendingForMe, unreadGroupNotifs, expenseCount: groupExpenses.length };
    });
    return map;
  }, [groups, expenses, settlements, notifications, currentUser.id]);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-28">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Your Groups</h1>
          <p className="text-xs text-slate-500 font-medium">Track and split shared expenses</p>
        </div>
        <button
          onClick={onOpenCreateGroup}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all active:scale-95"
        >
          <Plus size={16} />
          New Group
        </button>
      </div>

      {/* Group Cards List OR Clean Minimal Empty State */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs space-y-4 my-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto shadow-inner">
            👥
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No groups yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Create a group to start splitting bills and settling balances.
            </p>
          </div>

          <button
            onClick={onOpenCreateGroup}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            Create Group
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const { myBalance, pendingForMe, unreadGroupNotifs, expenseCount } = groupMetrics[group.id] || {
              myBalance: 0,
              pendingForMe: 0,
              unreadGroupNotifs: 0,
              expenseCount: 0,
            };

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer space-y-3 active:scale-[0.99] ${
                  pendingForMe > 0
                    ? 'border-rose-200 shadow-sm shadow-rose-500/10 hover:border-rose-300'
                    : unreadGroupNotifs > 0
                    ? 'border-emerald-200 shadow-sm shadow-emerald-500/10 hover:border-emerald-300'
                    : 'border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="text-2xl p-2.5 bg-slate-100 rounded-2xl block">{group.emoji}</span>
                      {pendingForMe > 0 ? (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white"></span>
                        </span>
                      ) : unreadGroupNotifs > 0 ? (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white"></span>
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        {group.name}
                        {pendingForMe > 0 ? (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            {pendingForMe} need{pendingForMe === 1 ? 's' : ''} your approval
                          </span>
                        ) : unreadGroupNotifs > 0 ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            New Activity
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {group.members.length} members • {expenseCount} expenses
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>

                {/* Bottom strip with member avatars and net balance */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  {/* Avatars */}
                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {group.members.slice(0, 4).map((m) => (
                      <span
                        key={m.id}
                        className="inline-block w-6 h-6 rounded-full bg-slate-100 text-xs flex items-center justify-center ring-2 ring-white"
                        title={m.name}
                      >
                        {m.avatar}
                      </span>
                    ))}
                    {group.members.length > 4 && (
                      <span className="inline-block w-6 h-6 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center ring-2 ring-white">
                        +{group.members.length - 4}
                      </span>
                    )}
                  </div>

                  {/* My Net Balance */}
                  <div className="text-right">
                    <span className={`text-xs font-extrabold ${
                      myBalance > 0.01
                        ? 'text-emerald-600'
                        : myBalance < -0.01
                        ? 'text-rose-600'
                        : 'text-slate-500 font-semibold'
                    }`}>
                      {myBalance > 0.01
                        ? `gets back ${formatCurrency(myBalance)}`
                        : myBalance < -0.01
                        ? `owes ${formatCurrency(Math.abs(myBalance))}`
                        : 'settled'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
