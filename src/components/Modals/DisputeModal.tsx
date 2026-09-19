import React, { useState } from 'react';
import { Expense, Member } from '../../types';
import { X, AlertTriangle, Send } from 'lucide-react';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
  currentUser: Member;
  onDispute: (expenseId: string, note: string) => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  expense,
  currentUser,
  onDispute,
}) => {
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      alert('Please explain the issue or query for the group.');
      return;
    }
    onDispute(expense.id, note.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-all">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 max-h-[90dvh] flex flex-col overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={20} />
            <h3 className="text-sm font-bold text-slate-900">Raise Query / Dispute</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <p className="font-semibold text-slate-800">{expense.title}</p>
            <p className="text-slate-500 mt-0.5">Total: ₹{expense.amount.toLocaleString('en-IN')}</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Why are you disputing or querying this bill?
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. I didn't drink alcohol, my share should be lower..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
            >
              <Send size={14} />
              Submit Query
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
