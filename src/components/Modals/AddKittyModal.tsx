import React, { useState } from 'react';
import { Group, Member } from '../../types';
import { X, PiggyBank, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface AddKittyModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUser: Member;
  onAddContribution: (data: { memberId: string; amount: number }) => void;
  onAddExpense: (data: { title: string; amount: number; category: string; addedById: string }) => void;
}

export const AddKittyModal: React.FC<AddKittyModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  onAddContribution,
  onAddExpense,
}) => {
  const [tab, setTab] = useState<'CONTRIBUTE' | 'SPEND'>('SPEND');
  const [amountStr, setAmountStr] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('food');
  const [contributorId, setContributorId] = useState(currentUser.id);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (tab === 'CONTRIBUTE') {
      onAddContribution({
        memberId: contributorId,
        amount,
      });
    } else {
      if (!title.trim()) {
        alert('Please describe what this kitty expense was for');
        return;
      }
      onAddExpense({
        title: title.trim(),
        amount,
        category,
        addedById: currentUser.id,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-all">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-2 text-indigo-600">
            <PiggyBank size={20} />
            <h3 className="text-base font-bold text-slate-900">Group Kitty Pool</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <form id="kitty-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Tab switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('SPEND')}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'SPEND' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <ArrowDownRight size={15} />
              Spend from Kitty
            </button>
            <button
              type="button"
              onClick={() => setTab('CONTRIBUTE')}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'CONTRIBUTE' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <ArrowUpRight size={15} />
              Add to Kitty (Pool)
            </button>
          </div>

          {tab === 'SPEND' ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  What was bought?
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Highway toll, roadside chai, water bottles"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Amount Spent (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 350"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                >
                  <option value="food">🍔 Food & Snacks</option>
                  <option value="travel">🚕 Toll & Transport</option>
                  <option value="groceries">🛒 Supplies</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Contributing Member
                </label>
                <select
                  value={contributorId}
                  onChange={(e) => setContributorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                >
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.avatar} {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Contribution Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 1000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </>
          )}
        </form>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="kitty-form"
            className="flex-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
