import React, { useState } from 'react';
import { Group, GroupInvite } from '../../types';
import { X, Mail, Send, Copy, Check, Sparkles, Share2 } from 'lucide-react';

interface InviteEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onSendInvite: (groupId: string, email: string) => GroupInvite | null;
}

export const InviteEmailModal: React.FC<InviteEmailModalProps> = ({
  isOpen,
  onClose,
  group,
  onSendInvite,
}) => {
  const [email, setEmail] = useState('');
  const [sentInvite, setSentInvite] = useState<GroupInvite | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const res = onSendInvite(group.id, email.trim());
    if (res) {
      setSentInvite(res);
      setEmail('');
    }
  };

  const inviteLink = sentInvite
    ? `${window.location.origin}/?join=${sentInvite.id}`
    : `${window.location.origin}/?group=${group.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-all">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 max-h-[90dvh] flex flex-col overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Mail size={16} className="text-emerald-600" />
              Invite to {group.name}
            </h3>
            <p className="text-xs text-slate-400">Add member via email address or link</p>
          </div>
          <button
            onClick={() => {
              setSentInvite(null);
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {sentInvite ? (
          <div className="py-4 space-y-3 animate-in fade-in">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                ✓
              </div>
              <h4 className="text-sm font-bold text-emerald-950">Invitation Created!</h4>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Invite for <strong className="font-bold">{sentInvite.invitedEmail}</strong> is active.
                When they sign in or open the link, the group will automatically join their account.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Direct Join Link
              </label>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="bg-transparent text-xs text-slate-700 font-mono flex-1 focus:outline-hidden"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSentInvite(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Invite Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="py-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Friend's Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="e.g. friend@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                If they have an account with this email, they will see an instant notification banner to accept.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Send size={14} />
                Send Invitation
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
