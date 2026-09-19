import React, { useState } from 'react';
import { Member, Group, Expense, Settlement, UPIAccount } from '../../types';
import { calculateBalances } from '../../utils/debtSimplifier';
import { formatCurrency } from '../../utils/formatters';
import { generateUPIQRCodeUrl } from '../../utils/upi';
import { 
  UserCheck, 
  QrCode, 
  Copy, 
  Check, 
  ShieldCheck, 
  CreditCard, 
  Edit3, 
  Trash2, 
  Plus, 
  Upload, 
  Star, 
  Smartphone,
  Maximize2,
  X,
  LogOut
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: Member;
  allMembers: Member[];
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
  onSelectUser: (memberId: string) => void;
  onUpdateProfile: (updates: Partial<Member>) => void;
  onClearAllData: () => void;
  onSignOut?: () => void;
  onAddUPIAccount?: (data: {
    label: string;
    upiId: string;
    isDefault?: boolean;
    customQrImage?: string;
  }) => void;
  onDeleteUPIAccount?: (id: string) => void;
  onSetDefaultUPIAccount?: (id: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  allMembers = [],
  groups,
  expenses,
  settlements,
  onSelectUser,
  onUpdateProfile,
  onClearAllData,
  onSignOut,
  onAddUPIAccount,
  onDeleteUPIAccount,
  onSetDefaultUPIAccount,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');

  // Add new UPI account modal / form
  const [showAddUpi, setShowAddUpi] = useState(false);
  const [newLabel, setNewLabel] = useState('Paytm');
  const [newUpiId, setNewUpiId] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [newCustomQr, setNewCustomQr] = useState<string | undefined>(undefined);

  // Zoomed QR code modal
  const [zoomQr, setZoomQr] = useState<{
    label: string;
    upiId: string;
    qrUrl: string;
  } | null>(null);

  // Compute total net across all groups for currentUser
  let totalNetBalance = 0;
  groups.forEach((g) => {
    const groupExpenses = expenses.filter((e) => e.groupId === g.id);
    const groupSettlements = settlements.filter((s) => s.groupId === g.id);
    const { netBalances } = calculateBalances(
      g.members.map((m) => m.id),
      groupExpenses,
      groupSettlements
    );
    totalNetBalance += netBalances[currentUser.id] || 0;
  });

  const upiList: UPIAccount[] = currentUser.upiAccounts && currentUser.upiAccounts.length > 0
    ? currentUser.upiAccounts
    : currentUser.upiId
    ? [
        {
          id: 'default_upi',
          label: 'Primary UPI',
          upiId: currentUser.upiId,
          isDefault: true,
          createdAt: new Date().toISOString(),
        },
      ]
    : [];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateProfile({
      name: name.trim(),
      phone: phone.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewCustomQr(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateUPI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpiId.trim()) {
      alert('Please enter a valid UPI ID');
      return;
    }

    if (onAddUPIAccount) {
      onAddUPIAccount({
        label: newLabel.trim() || 'My UPI',
        upiId: newUpiId.trim(),
        isDefault: newIsDefault || upiList.length === 0,
        customQrImage: newCustomQr,
      });
    }

    setNewLabel('Paytm');
    setNewUpiId('');
    setNewIsDefault(false);
    setNewCustomQr(undefined);
    setShowAddUpi(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-28">
      {/* Profile Card with Mobile Number */}
      <div className="bg-gradient-to-tr from-emerald-600 to-teal-800 text-white rounded-3xl p-5 shadow-lg relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl border border-white/20 shadow-xs">
              {currentUser.avatar}
            </div>
            <div>
              <h1 className="text-xl font-extrabold">{currentUser.name}</h1>
              <p className="text-xs text-emerald-100 font-medium mt-0.5 flex items-center gap-1">
                <Smartphone size={12} />
                {currentUser.phone || 'No mobile number set'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors flex items-center gap-1 text-xs font-bold active:scale-95"
            title="Edit profile & phone number"
          >
            <Edit3 size={14} />
            Edit
          </button>
        </div>

        {/* Inline Edit Form for Name and Mobile Number */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-4 pt-3 border-t border-emerald-500/30 space-y-2 text-slate-800 animate-in fade-in">
            <div>
              <label className="block text-[10px] uppercase font-bold text-emerald-100 mb-0.5">Your Real Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white text-xs font-semibold focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-emerald-100 mb-0.5">Mobile Number</label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white text-xs font-semibold focus:outline-hidden"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold text-emerald-100 px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs font-bold bg-white text-emerald-800 px-3 py-1 rounded-lg shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Overall Net Balance */}
        <div className="mt-4 pt-3.5 border-t border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">
              Total Balance (All Groups)
            </span>
            <p className={`text-xl font-black mt-0.5 ${
              totalNetBalance > 0 ? 'text-white' : totalNetBalance < 0 ? 'text-rose-200' : 'text-emerald-100'
            }`}>
              {totalNetBalance > 0
                ? `You get back ${formatCurrency(totalNetBalance)}`
                : totalNetBalance < 0
                ? `You owe ${formatCurrency(Math.abs(totalNetBalance))}`
                : 'All accounts balanced'}
            </p>
          </div>
        </div>
      </div>

      {/* MULTIPLE UPI IDS & BARCODES SECTION */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CreditCard size={15} className="text-emerald-600" />
              My UPI Accounts & Barcodes
            </h2>
            <p className="text-[11px] text-slate-400">Attach distinct barcodes (Paytm, GPay, PhonePe)</p>
          </div>
          <button
            onClick={() => setShowAddUpi(true)}
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl transition-all active:scale-95"
          >
            <Plus size={14} />
            Add UPI & Barcode
          </button>
        </div>

        {/* Add UPI Account Form Modal */}
        {showAddUpi && (
          <form onSubmit={handleCreateUPI} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800">Add New Payment Account</span>
              <button
                type="button"
                onClick={() => setShowAddUpi(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Account Label / App Name
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['Paytm', 'Google Pay', 'PhonePe', 'HDFC Bank', 'SBI UPI', 'CRED'].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setNewLabel(lbl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      newLabel === lbl
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                UPI ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. raj@paytm or 9876543210@okhdfcbank"
                value={newUpiId}
                onChange={(e) => setNewUpiId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Custom Barcode / QR Upload */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Attach Custom Barcode / QR Image (Optional)
              </label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-3 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload size={18} className="text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700">
                  {newCustomQr ? 'Barcode Image Attached ✓' : 'Upload QR Screenshot from Paytm/GPay'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  PNG, JPG (or leave empty to auto-generate)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {newCustomQr && (
                <div className="mt-2 text-center">
                  <img
                    src={newCustomQr}
                    alt="Custom Barcode Preview"
                    className="w-20 h-20 mx-auto object-contain rounded-lg border border-slate-200 p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setNewCustomQr(undefined)}
                    className="text-[10px] text-rose-600 font-bold mt-1"
                  >
                    Remove uploaded image
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="defaultCheck"
                checked={newIsDefault}
                onChange={(e) => setNewIsDefault(e.target.checked)}
                className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="defaultCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Set as Primary / Default for receiving payments
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddUpi(false)}
                className="text-xs font-bold text-slate-500 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl shadow-xs"
              >
                Save UPI & Barcode
              </button>
            </div>
          </form>
        )}

        {/* List of UPI accounts & barcodes */}
        {upiList.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <QrCode size={24} className="text-slate-400 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-700">No UPI accounts added yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click "+ Add UPI & Barcode" above to attach your Paytm, PhonePe or GPay accounts.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upiList.map((acc) => {
              const displayQr = acc.customQrImage || generateUPIQRCodeUrl({
                upiId: acc.upiId,
                payeeName: currentUser.name,
                amount: 500,
                note: 'SplitShare Payment',
              });

              return (
                <div
                  key={acc.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    acc.isDefault
                      ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Barcode / QR Thumbnail with Zoom on Click */}
                      <div
                        onClick={() =>
                          setZoomQr({
                            label: acc.label,
                            upiId: acc.upiId,
                            qrUrl: displayQr,
                          })
                        }
                        className="relative group cursor-pointer w-16 h-16 rounded-xl bg-white p-1 border border-slate-200 shadow-xs shrink-0 flex items-center justify-center overflow-hidden"
                        title="Click to expand barcode"
                      >
                        <img
                          src={displayQr}
                          alt={acc.label}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Maximize2 size={14} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900">{acc.label}</h4>
                          {acc.isDefault && (
                            <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                              <Star size={9} fill="currentColor" />
                              Primary
                            </span>
                          )}
                          {acc.customQrImage && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded-md border border-indigo-200">
                              Custom Image
                            </span>
                          )}
                        </div>

                        <p className="font-mono text-xs text-slate-700 font-bold mt-1">
                          {acc.upiId}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleCopy(acc.upiId, acc.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 px-2 py-0.5 rounded-md transition-colors"
                          >
                            {copiedId === acc.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                            {copiedId === acc.id ? 'Copied' : 'Copy ID'}
                          </button>

                          <button
                            onClick={() =>
                              setZoomQr({
                                label: acc.label,
                                upiId: acc.upiId,
                                qrUrl: displayQr,
                              })
                            }
                            className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                          >
                            <Maximize2 size={10} />
                            View Barcode
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Set Default / Delete */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {!acc.isDefault && onSetDefaultUPIAccount && (
                        <button
                          onClick={() => onSetDefaultUPIAccount(acc.id)}
                          className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 bg-white border border-slate-200 px-2 py-1 rounded-lg transition-colors"
                        >
                          Make Primary
                        </button>
                      )}
                      {onDeleteUPIAccount && upiList.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${acc.label}?`)) {
                              onDeleteUPIAccount(acc.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Delete UPI"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Zoomed Barcode Modal */}
      {zoomQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">{zoomQr.label} Barcode</span>
              <button
                onClick={() => setZoomQr(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
              <img
                src={zoomQr.qrUrl}
                alt="Barcode"
                className="w-52 h-52 mx-auto object-contain rounded-xl"
              />
            </div>

            <p className="font-mono text-xs font-extrabold text-slate-900">{zoomQr.upiId}</p>
            <p className="text-[11px] text-slate-500">
              Scan with any UPI camera scanner (Paytm, GPay, PhonePe)
            </p>

            <button
              onClick={() => setZoomQr(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Switch Persona (for testing multi-device / multi-user flow) */}
      {(allMembers?.length || 0) > 1 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Switch Perspective
          </h3>
          <p className="text-xs text-slate-500">
            Test the approval workflow by acting as another member:
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {allMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectUser(m.id)}
                className={`p-2.5 rounded-xl flex items-center justify-between border text-left transition-all ${
                  m.id === currentUser.id
                    ? 'border-emerald-500 bg-emerald-50/60 font-bold text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>{m.avatar}</span>
                  <span className="text-xs truncate">{m.name}</span>
                </div>
                {m.id === currentUser.id && <ShieldCheck size={15} className="text-emerald-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Log Out button */}
      {onSignOut && (
        <div className="pt-2">
          <button
            onClick={onSignOut}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <LogOut size={14} className="text-slate-600" />
            Log Out ({currentUser.name})
          </button>
        </div>
      )}

      {/* Clear All Data button */}
      <div className="pt-2">
        <button
          onClick={() => {
            if (confirm('Are you sure you want to clear all groups and expenses?')) {
              onClearAllData();
            }
          }}
          className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Trash2 size={14} />
          Reset / Clear All Real Data
        </button>
      </div>
    </div>
  );
};
