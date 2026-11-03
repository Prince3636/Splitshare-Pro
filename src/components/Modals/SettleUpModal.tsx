import React, { useState, useEffect } from 'react';
import { Member, UPIAccount } from '../../types';
import { X, QrCode, Smartphone, MessageCircle, CheckCircle, Copy, Check, Star } from 'lucide-react';
import { generateUPILink, generateUPIQRCodeUrl } from '../../utils/upi';
import { generateWhatsAppNudge } from '../../utils/whatsapp';
import confetti from 'canvas-confetti';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtor: Member;
  creditor: Member;
  amount: number;
  groupName: string;
  onConfirmSettlement: (data: {
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    upiRef?: string;
  }) => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  debtor,
  creditor,
  amount,
  groupName,
  onConfirmSettlement,
}) => {
  const [copied, setCopied] = useState(false);
  const [upiRef, setUpiRef] = useState('');
  const [tone, setTone] = useState<'friendly' | 'funny' | 'formal'>('funny');

  const upiAccounts: UPIAccount[] = creditor.upiAccounts && creditor.upiAccounts.length > 0
    ? creditor.upiAccounts
    : creditor.upiId
    ? [
        {
          id: 'def',
          label: 'Primary UPI',
          upiId: creditor.upiId,
          isDefault: true,
          createdAt: new Date().toISOString(),
        },
      ]
    : [];

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    upiAccounts.find((u) => u.isDefault)?.id || upiAccounts[0]?.id || ''
  );
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (upiAccounts.length > 0) {
      const def = upiAccounts.find((u) => u.isDefault) || upiAccounts[0];
      setSelectedAccountId(def.id);
    }
  }, [creditor]);

  const selectedAccount = upiAccounts.find((u) => u.id === selectedAccountId) || upiAccounts[0];
  const activeUpiId = selectedAccount?.upiId || creditor.upiId || `${creditor.name.toLowerCase().replace(/\s+/g, '')}@upi`;

  useEffect(() => {
    if (selectedAccount?.customQrImage) {
      setQrUrl(selectedAccount.customQrImage);
    } else {
      generateUPIQRCodeUrl({
        upiId: activeUpiId,
        payeeName: creditor.name,
        amount,
        note: `Settlement for ${groupName}`,
      }).then(setQrUrl).catch(() => setQrUrl(''));
    }
  }, [selectedAccount, activeUpiId, creditor.name, amount, groupName]);

  if (!isOpen) return null;

  const upiLink = generateUPILink({
    upiId: activeUpiId,
    payeeName: creditor.name,
    amount,
    note: `SplitShare settlement for ${groupName}`,
  });

  const whatsappUrl = generateWhatsAppNudge({
    borrowerName: debtor.name.split(' ')[0],
    lenderName: creditor.name.split(' ')[0],
    amount,
    groupName,
    lenderUpi: activeUpiId,
    tone,
  });

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(activeUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkSettled = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    onConfirmSettlement({
      fromMemberId: debtor.id,
      toMemberId: creditor.id,
      amount,
      upiRef: upiRef.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settle Balance"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-all"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h2 className="text-base font-bold text-slate-900">Settle Balance</h2>
            <p className="text-xs text-slate-500 font-medium">{groupName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settle dialog"
            className="min-w-[48px] min-h-[48px] rounded-full bg-slate-200/60 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Transfer Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl p-4 shadow-md shadow-emerald-500/20 text-center">
            <p className="text-xs font-medium text-emerald-100 uppercase tracking-wider">
              Settlement Amount
            </p>
            <h1 className="text-3xl font-extrabold mt-1">₹{amount.toLocaleString('en-IN')}</h1>

            <div className="mt-4 pt-3 border-t border-emerald-400/30 flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span>{debtor.avatar}</span>
                <span>{debtor.name.split(' ')[0]}</span>
              </div>
              <span className="text-xs text-emerald-200 font-bold">pays ➔</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span>{creditor.avatar}</span>
                <span>{creditor.name.split(' ')[0]}</span>
              </div>
            </div>
          </div>

          {/* Payee Account Selector (if multiple accounts exist) */}
          {upiAccounts.length > 1 && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Choose {creditor.name.split(' ')[0]}'s Receiving Account & QR:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {upiAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      acc.id === selectedAccountId
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{acc.label}</span>
                      {acc.isDefault && (
                        <span className="text-[9px] bg-emerald-600 text-white font-bold px-1 rounded-sm">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{acc.upiId}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active UPI ID Pill */}
          <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                {selectedAccount?.label || 'Payee UPI'}:
              </span>
              <span className="text-xs font-mono font-bold text-slate-800 truncate">{activeUpiId}</span>
            </div>
            <button
              onClick={handleCopyUPI}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors shrink-0"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Action 1: Direct Pay on UPI App */}
          <div>
            <a
              href={upiLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Smartphone size={16} className="text-emerald-400" />
              Pay via GPay / PhonePe / Paytm
            </a>
          </div>

          {/* Action 2: Dynamic QR Code / Custom Barcode Scan */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <QrCode size={16} className="text-emerald-600" />
              Scan {selectedAccount?.label || ''} QR Code
            </div>
            <div className="inline-block p-2 bg-white rounded-xl shadow-xs border border-slate-200">
              <img
                src={qrUrl}
                alt="UPI QR Code"
                className="w-44 h-44 mx-auto object-contain rounded-lg"
                loading="lazy"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">
              Scan with any UPI scanner to pay directly to {activeUpiId}
            </p>
          </div>

          {/* Action 3: WhatsApp Nudge / Reminder */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <MessageCircle size={15} className="text-emerald-600" />
                Send WhatsApp Nudge
              </span>
              <div className="flex gap-1">
                {(['funny', 'friendly', 'formal'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`px-2 py-0.5 rounded-md text-[10px] capitalize font-bold transition-all ${
                      tone === t
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200/70'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <MessageCircle size={15} />
              Open WhatsApp Reminder
            </a>
          </div>

          {/* Reference ID / Note */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              UPI Reference ID / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UTR / Transaction number"
              value={upiRef}
              onChange={(e) => setUpiRef(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleMarkSettled}
            className="flex-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <CheckCircle size={16} />
            Confirm Settled (Paid)
          </button>
        </div>
      </div>
    </div>
  );
};
