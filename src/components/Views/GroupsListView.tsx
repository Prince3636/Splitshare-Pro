import React from 'react';
import { Group, Member, Expense, Settlement } from '../../types';
import { calculateBalances } from '../../utils/debtSimplifier';
import { formatCurrency } from '../../utils/formatters';
import { Plus, ChevronRight, UserPlus, Sparkles, Receipt } from 'lucide-react';

interface GroupsListViewProps {
  groups: Group[];
  currentUser: Member;
  expenses: Expense[];
  settlements: Settlement[];
  onSelectGroup: (group: Group) => void;
  onOpenCreateGroup: () => void;
}

export const GroupsListView: React.FC<GroupsListViewProps> = ({
  groups,
  currentUser,
  expenses,
  settlements,
  onSelectGroup,
  onOpenCreateGroup,
}) => {
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-28">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Your Groups</h1>
          <p className="text-xs text-slate-500 font-medium">Split bills, trips & flatmates expenses</p>
        </div>
        <button
          onClick={onOpenCreateGroup}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all active:scale-95"
        >
          <Plus size={16} />
          New Group
        </button>
      </div>

      {/* Group Cards List OR Friendly Empty State */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-3xl p-6 text-center border border-slate-200 shadow-xs space-y-4 my-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl mx-auto">
            🏕️
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Welcome to SplitShare!</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
              No groups added yet. Create a group for your upcoming trip, flatmates, or party and add your real friends!
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3.5 text-left border border-slate-200/80 space-y-2 text-xs">
            <p className="font-bold text-slate-700">Quick steps to get started:</p>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">1</span>
              <span>Create a group (e.g. "Goa Roadtrip", "Flat 302")</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">2</span>
              <span>Add your friends' names and their UPI IDs</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">3</span>
              <span>Start adding bills with Equal, Exact, or % splits!</span>
            </div>
          </div>

          <button
            onClick={onOpenCreateGroup}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const groupExpenses = expenses.filter((e) => e.groupId === group.id);
            const groupSettlements = settlements.filter((s) => s.groupId === group.id);
            const { netBalances } = calculateBalances(
              group.members.map((m) => m.id),
              groupExpenses,
              groupSettlements
            );

            const myBalance = netBalances[currentUser.id] || 0;
            const pendingCount = groupExpenses.filter((e) => e.status === 'PENDING_APPROVAL').length;

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 bg-slate-100 rounded-xl">{group.emoji}</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {group.name}
                        {pendingCount > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                            {pendingCount} pending
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {group.members.length} members • {groupExpenses.length} expenses
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
                        : 'text-slate-400 font-semibold'
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
