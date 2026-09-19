import React from 'react';
import { Expense, Settlement, KittyContribution, KittyExpense, Group, Member } from '../../types';
import { formatCurrency, formatRelativeDate, CATEGORY_DETAILS } from '../../utils/formatters';
import { CheckCircle2, TrendingUp, PiggyBank, Receipt, ArrowRightLeft } from 'lucide-react';

interface ActivityViewProps {
  expenses: Expense[];
  settlements: Settlement[];
  kittyContributions: KittyContribution[];
  kittyExpenses: KittyExpense[];
  groups: Group[];
  allMembers: Member[];
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  expenses,
  settlements,
  kittyContributions,
  kittyExpenses,
  groups,
  allMembers,
}) => {
  // Combine all activities into a single chronological timeline
  const items: any[] = [];

  expenses.forEach((e) => {
    items.push({
      id: e.id,
      date: e.date,
      type: 'EXPENSE',
      title: e.title,
      amount: e.amount,
      groupId: e.groupId,
      actorId: e.paidById,
      status: e.status,
      category: e.category,
    });
  });

  settlements.forEach((s) => {
    items.push({
      id: s.id,
      date: s.date,
      type: 'SETTLEMENT',
      title: 'Settled balance',
      amount: s.amount,
      groupId: s.groupId,
      fromId: s.fromMemberId,
      toId: s.toMemberId,
    });
  });

  kittyContributions.forEach((k) => {
    items.push({
      id: k.id,
      date: k.date,
      type: 'KITTY_ADD',
      title: 'Added to Kitty Pool',
      amount: k.amount,
      groupId: k.groupId,
      actorId: k.memberId,
    });
  });

  kittyExpenses.forEach((ke) => {
    items.push({
      id: ke.id,
      date: ke.date,
      type: 'KITTY_SPEND',
      title: `Kitty: ${ke.title}`,
      amount: ke.amount,
      groupId: ke.groupId,
      actorId: ke.addedById,
    });
  });

  // Sort descending by date
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-28">
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-md">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <TrendingUp size={15} />
          Group Timeline
        </div>
        <h1 className="text-xl font-extrabold mt-1">Recent Activity</h1>
        <p className="text-xs text-slate-400 mt-1">
          Audit log of all expenses, payments, and approvals across your groups.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs divide-y divide-slate-100">
        {items.length === 0 ? (
          <p className="text-center py-6 text-slate-400 text-xs font-medium">No activity recorded yet.</p>
        ) : (
          items.map((item) => {
            const group = groups.find((g) => g.id === item.groupId);
            const actor = allMembers.find((m) => m.id === item.actorId);
            const from = allMembers.find((m) => m.id === item.fromId);
            const to = allMembers.find((m) => m.id === item.toId);

            return (
              <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-sm shrink-0 mt-0.5">
                    {item.type === 'EXPENSE' && '🧾'}
                    {item.type === 'SETTLEMENT' && '🤝'}
                    {item.type === 'KITTY_ADD' && '🐷'}
                    {item.type === 'KITTY_SPEND' && '💸'}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-slate-800">
                        {item.type === 'SETTLEMENT' ? (
                          <>
                            <span className="text-emerald-700">{from?.name.split(' ')[0]}</span> paid{' '}
                            <span className="text-emerald-700">{to?.name.split(' ')[0]}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-900">{actor?.name.split(' ')[0]}</span> {item.title}
                          </>
                        )}
                      </p>
                      {item.status === 'PENDING_APPROVAL' && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-md">
                          pending
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {group?.name} • {formatRelativeDate(item.date)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-xs font-extrabold ${
                    item.type === 'SETTLEMENT' ? 'text-emerald-600' : 'text-slate-900'
                  }`}>
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
