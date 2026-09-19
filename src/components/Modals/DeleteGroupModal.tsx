import React, { useState } from 'react';
import { Group } from '../../types';
import { X, AlertTriangle, Trash2, ArrowRight, ShieldAlert } from 'lucide-react';

interface DeleteGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onConfirmDelete: (groupId: string) => void;
}

export const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  onConfirmDelete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmName, setConfirmName] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setConfirmName('');
    onClose();
  };

  const isMatch = confirmName.trim().toLowerCase() === group.name.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs transition-all">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 max-h-[90dvh] flex flex-col overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle size={20} />
            <h3 className="text-base font-bold text-slate-900">
              {step === 1 ? 'Delete Group (Step 1 of 2)' : 'Final Confirmation (Step 2 of 2)'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {step === 1 ? (
          <div className="py-4 space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                Are you sure you want to delete "{group.name}"?
              </div>
              <p className="text-xs text-rose-800/90 leading-relaxed">
                As the group creator, deleting this group will permanently remove all shared bills,
                simplified debts, and history for all {group.members.length} members.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">What will happen:</p>
              <p>• All pending approvals and settlements will be wiped.</p>
              <p>• Group will disappear from every member's dashboard.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel, Keep Group
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                Next Step
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4 animate-in fade-in">
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-950">
              <p className="font-bold">2nd Safety Check:</p>
              <p className="mt-1">
                To prevent accidental deletion, please type the group name{' '}
                <strong className="font-extrabold text-slate-900">"{group.name}"</strong> below:
              </p>
            </div>

            <div>
              <input
                type="text"
                autoFocus
                placeholder={`Type "${group.name}"`}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!isMatch}
                onClick={() => {
                  onConfirmDelete(group.id);
                  handleClose();
                }}
                className="flex-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 size={14} />
                Permanently Delete Group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
