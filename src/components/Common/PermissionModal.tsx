import React from 'react';
import { Camera, Image, ShieldCheck, X } from 'lucide-react';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  type: 'CAMERA' | 'STORAGE' | 'ALL';
  onGrant: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  type,
  onGrant,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            {type === 'CAMERA' ? (
              <Camera size={20} />
            ) : type === 'STORAGE' ? (
              <Image size={20} />
            ) : (
              <ShieldCheck size={20} />
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
          <p className="font-semibold text-slate-800">Why does SplitShare need this?</p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500">
            {type === 'CAMERA' && (
              <li>To scan UPI barcodes (Paytm, GPay, PhonePe) directly with your camera.</li>
            )}
            {type === 'STORAGE' && (
              <li>To select saved UPI QR code screenshots from your gallery.</li>
            )}
            {type === 'ALL' && (
              <>
                <li>Camera: Scan payment QR codes and bill receipts.</li>
                <li>Photos: Upload payment proof and custom UPI codes.</li>
              </>
            )}
          </ul>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={() => {
              onGrant();
              onClose();
            }}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
          >
            Allow Access
          </button>
        </div>
      </div>
    </div>
  );
};
