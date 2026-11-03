import React, { useState } from 'react';
import { Member, Group } from '../../types';
import { X, Check, UserPlus, Sparkles } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  allMembers: Member[];
  currentUser: Member;
  onAddMember: (member: { name: string; upiId?: string }) => Member;
  onCreateGroup: (group: Omit<Group, 'id' | 'createdAt' | 'createdBy'>) => void;
}

const EMOJI_OPTIONS = ['🏖️', '🏠', '✈️', '🍕', '🍻', '🚗', '⛺', '🎉', '💼', '⛰️', '🍔', '⚡'];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  allMembers,
  currentUser,
  onAddMember,
  onCreateGroup,
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏖️');
  const [description, setDescription] = useState('');
  const [targetBudgetStr, setTargetBudgetStr] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([currentUser.id]);

  // Inline Add New Member state
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendUpi, setFriendUpi] = useState('');

  if (!isOpen) return null;

  const handleAddNewFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) {
      alert("Please enter your friend's name");
      return;
    }
    const created = onAddMember({
      name: friendName.trim(),
      upiId: friendUpi.trim() || undefined,
    });

    // Auto-select the newly added friend
    setSelectedMemberIds((prev) => [...prev, created.id]);
    setFriendName('');
    setFriendUpi('');
    setShowAddFriend(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a group name');
      return;
    }
    if (selectedMemberIds.length < 2) {
      alert('Please add or select at least 1 other friend for this group!');
      return;
    }

    const members = allMembers.filter((m) => selectedMemberIds.includes(m.id));
    const targetBudget = parseFloat(targetBudgetStr) || undefined;

    onCreateGroup({
      name: name.trim(),
      emoji,
      description: description.trim() || undefined,
      currency: '₹',
      members,
      targetBudget,
      kittyActive: true,
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create New Group"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-all"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create New Group</h2>
            <p className="text-xs text-slate-500">Trip, flat, roommates, or party bills</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close create group dialog"
            className="min-w-[48px] min-h-[48px] rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form id="create-group-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Emoji selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Choose Group Icon
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {EMOJI_OPTIONS.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setEmoji(em)}
                  className={`w-10 h-10 rounded-xl text-xl shrink-0 flex items-center justify-center border transition-all ${
                    emoji === em
                      ? 'border-emerald-500 bg-emerald-50 shadow-xs scale-105'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Manali Trip, Flat 302, Friday Dinner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Target Budget (Optional ₹)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="e.g. 20000"
              value={targetBudgetStr}
              onChange={(e) => setTargetBudgetStr(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Members list & Add Member */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Group Members ({selectedMemberIds.length} added)
              </label>
              <button
                type="button"
                onClick={() => setShowAddFriend(!showAddFriend)}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                <UserPlus size={13} />
                + Add Friend
              </button>
            </div>

            {/* Form to add friend dynamically */}
            {showAddFriend && (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 mb-3 space-y-2 animate-in fade-in duration-150">
                <p className="text-xs font-bold text-emerald-950">Add a Real Person / Friend:</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Friend's Name *"
                    value={friendName}
                    onChange={(e) => setFriendName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-emerald-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="UPI ID (e.g. name@upi)"
                    value={friendUpi}
                    onChange={(e) => setFriendUpi(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-emerald-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddFriend(false)}
                    className="text-[11px] font-semibold text-slate-500 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewFriend}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg shadow-xs"
                  >
                    Save & Add to Group
                  </button>
                </div>
              </div>
            )}

            {/* List of members to toggle */}
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {allMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      if (isSelected) {
                        if (selectedMemberIds.length > 1) {
                          setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.id));
                        }
                      } else {
                        setSelectedMemberIds([...selectedMemberIds, m.id]);
                      }
                    }}
                    className={`p-2.5 rounded-xl flex items-center justify-between border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{m.avatar}</span>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-slate-800 truncate block">
                          {m.name}
                        </span>
                        {m.upiId && <span className="text-[10px] text-slate-400 block truncate">{m.upiId}</span>}
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {allMembers.length <= 1 && !showAddFriend && (
              <div className="text-center py-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl mt-1">
                <p className="text-xs text-slate-500">No friends added yet!</p>
                <button
                  type="button"
                  onClick={() => setShowAddFriend(true)}
                  className="mt-1 text-xs font-bold text-emerald-600 hover:underline"
                >
                  Click here to add your friends
                </button>
              </div>
            )}
          </div>
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
            form="create-group-form"
            className="flex-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};
