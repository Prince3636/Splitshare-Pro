import React, { useState } from 'react';
import { Member, Group, Expense, Settlement, UPIAccount } from '../../types';
import { calculateBalances } from '../../utils/debtSimplifier';
import { formatCurrency } from '../../utils/formatters';
import { generateUPIQRCodeUrl } from '../../utils/upi';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyConfig,
  detectLocationCurrency,
  detectGPSLocationCurrency,
  DetectedLocationInfo,
} from '../../utils/currencies';
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
  LogOut,
  Globe,
  MapPin,
  Navigation
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
  onDeleteAccount?: () => void;
  onAddUPIAccount?: (data: {
    label: string;
    upiId: string;
    isDefault?: boolean;
    customQrImage?: string;
  }) => void;
  onUpdateUPIAccount?: (data: {
    id: string;
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
  onDeleteAccount,
  onAddUPIAccount,
  onUpdateUPIAccount,
  onDeleteUPIAccount,
  onSetDefaultUPIAccount,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  // Add new UPI account modal / form
  const [showAddUpi, setShowAddUpi] = useState(false);
  const [newLabel, setNewLabel] = useState('Paytm');
  const [newUpiId, setNewUpiId] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [newCustomQr, setNewCustomQr] = useState<string | undefined>(undefined);

  // Edit UPI account modal / form
  const [editingUpiAccount, setEditingUpiAccount] = useState<UPIAccount | null>(null);
  const [editLabel, setEditLabel] = useState('Paytm');
  const [editUpiId, setEditUpiId] = useState('');
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editCustomQr, setEditCustomQr] = useState<string | undefined>(undefined);

  // Zoomed QR code modal
  const [zoomQr, setZoomQr] = useState<{
    label: string;
    upiId: string;
    qrUrl: string;
  } | null>(null);

  // Currency & Location state
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocationInfo>(() => detectLocationCurrency());
  const [isGpsDetecting, setIsGpsDetecting] = useState(false);

  const activePrefCurrency = currentUser.preferredCurrency || detectedLocation.currencyCode || 'INR';

  // Compute total net across all groups for currentUser (memoized)
  const totalNetBalance = React.useMemo(() => {
    let total = 0;
    groups.forEach((g) => {
      const groupExpenses = expenses.filter((e) => e.groupId === g.id);
      const groupSettlements = settlements.filter((s) => s.groupId === g.id);
      const { netBalances } = calculateBalances(
        g.members.map((m) => m.id),
        groupExpenses,
        groupSettlements
      );
      total += netBalances[currentUser.id] || 0;
    });
    return total;
  }, [groups, expenses, settlements, currentUser.id]);

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

  React.useEffect(() => {
    let isMounted = true;
    upiList.forEach((acc) => {
      if (acc.customQrImage) {
        setQrMap((prev) => ({ ...prev, [acc.id]: acc.customQrImage! }));
      } else {
        generateUPIQRCodeUrl({
          upiId: acc.upiId,
          payeeName: currentUser.name,
          amount: 500,
          note: 'SplitShare Payment',
        })
          .then((url) => {
            if (isMounted && url) {
              setQrMap((prev) => ({ ...prev, [acc.id]: url }));
            }
          })
          .catch(() => {});
      }
    });
    return () => {
      isMounted = false;
    };
  }, [upiList, currentUser.name]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (isEdit) {
        setEditCustomQr(reader.result as string);
      } else {
        setNewCustomQr(reader.result as string);
      }
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

  const handleStartEditUPI = (acc: UPIAccount) => {
    setEditingUpiAccount(acc);
    setEditLabel(acc.label);
    setEditUpiId(acc.upiId);
    setEditIsDefault(acc.isDefault);
    setEditCustomQr(acc.customQrImage);
  };

  const handleSaveEditUPI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUpiAccount) return;
    if (!editUpiId.trim()) {
      alert('Please enter a valid UPI ID');
      return;
    }

    if (onUpdateUPIAccount) {
      onUpdateUPIAccount({
        id: editingUpiAccount.id,
        label: editLabel.trim() || 'My UPI',
        upiId: editUpiId.trim(),
        isDefault: editIsDefault,
        customQrImage: editCustomQr,
      });
    }

    setEditingUpiAccount(null);
  };

  const handleCurrencyChange = (newCode: string) => {
    onUpdateProfile({ preferredCurrency: newCode });
  };

  const handleGPSDetect = async () => {
    setIsGpsDetecting(true);
    try {
      const gpsResult = await detectGPSLocationCurrency();
      if (gpsResult) {
        setDetectedLocation(gpsResult);
        onUpdateProfile({ preferredCurrency: gpsResult.currencyCode });
      } else {
        alert(`Location detected from device timezone: ${detectedLocation.locationDetail}`);
      }
    } catch {
      alert('Location detection unavailable.');
    } finally {
      setIsGpsDetecting(false);
    }
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{currentUser.name}</h1>
                <span className="text-[10px] bg-emerald-500/80 text-white px-2 py-0.5 rounded-full font-semibold border border-white/20 flex items-center gap-1">
                  <UserCheck size={11} /> Active
                </span>
              </div>
              <p className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
                <Smartphone size={12} className="opacity-80" />
                {currentUser.phone ? currentUser.phone : 'No phone linked'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setName(currentUser.name);
              setPhone(currentUser.phone || '');
              setIsEditing(!isEditing);
            }}
            className="flex items-center gap-1 text-xs font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 transition-colors"
          >
            <Edit3 size={13} />
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* Total Net Balance Across All Groups */}
        <div className="mt-5 pt-4 border-t border-white/20">
          <p className="text-xs uppercase tracking-wider text-emerald-100 font-semibold">
            Total Balance (All Groups)
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h2 className="text-2xl font-black">
              {totalNetBalance > 0.01
                ? `+${formatCurrency(totalNetBalance)}`
                : totalNetBalance < -0.01
                ? `-${formatCurrency(Math.abs(totalNetBalance))}`
                : 'All accounts balanced'}
            </h2>
            <span className="text-xs text-emerald-100 font-medium">
              {totalNetBalance > 0.01
                ? 'you will receive'
                : totalNetBalance < -0.01
                ? 'you need to pay'
                : 'settled'}
            </span>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-white/20 space-y-3 animate-in fade-in">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-100 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-emerald-200 text-xs font-semibold focus:outline-hidden focus:bg-white/20"
                placeholder="Your Name"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-100 mb-1">
                Phone Number (for UPI & WhatsApp)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-emerald-200 text-xs font-semibold focus:outline-hidden focus:bg-white/20"
                placeholder="e.g. 9876543210"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white text-emerald-800 shadow-md hover:bg-emerald-50 transition-colors"
              >
                Save Profile
              </button>
            </div>
          </form>
        )}
      </div>

      {/* PAYMENT ACCOUNTS (UPI & QR) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CreditCard size={15} className="text-emerald-600" />
              Payment Accounts
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">UPI IDs for receiving repayments</p>
          </div>
          <button
            onClick={() => setShowAddUpi(true)}
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl transition-all active:scale-95"
          >
            <Plus size={14} />
            Add UPI
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
                  onChange={(e) => handleImageUpload(e, false)}
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

        {/* Edit UPI Account Modal */}
        {editingUpiAccount && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit Payment Account"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          >
            <form
              onSubmit={handleSaveEditUPI}
              className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Edit3 size={15} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Payment Account</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUpiAccount(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Account Label / App Name
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {['Paytm', 'Google Pay', 'PhonePe', 'HDFC Bank', 'SBI UPI', 'CRED'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setEditLabel(lbl)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        editLabel === lbl
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Custom label"
                  className="w-full mt-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  UPI ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul@okhdfcbank"
                  value={editUpiId}
                  onChange={(e) => setEditUpiId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Custom Barcode / QR Upload in Edit */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Custom Barcode / QR Image
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                  <Upload size={18} className="text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-700">
                    {editCustomQr ? 'Replace Barcode Image' : 'Upload New QR Image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="hidden"
                  />
                </label>

                {editCustomQr && (
                  <div className="mt-2 text-center">
                    <img
                      src={editCustomQr}
                      alt="Barcode Preview"
                      className="w-20 h-20 mx-auto object-contain rounded-lg border border-slate-200 p-1 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setEditCustomQr(undefined)}
                      className="text-[10px] text-rose-600 font-bold mt-1 hover:underline"
                    >
                      Remove custom QR (Revert to auto-generated)
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editDefaultCheck"
                  checked={editIsDefault}
                  onChange={(e) => setEditIsDefault(e.target.checked)}
                  className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="editDefaultCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Set as Primary receiving account
                </label>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {onDeleteUPIAccount && upiList.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete payment account "${editingUpiAccount.label}"?`)) {
                        onDeleteUPIAccount(editingUpiAccount.id);
                        setEditingUpiAccount(null);
                      }
                    }}
                    className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 p-1"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUpiAccount(null)}
                    className="text-xs font-bold text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* List of UPI accounts & barcodes */}
        {upiList.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <QrCode size={24} className="text-slate-500 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-700">No payment accounts yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Add your UPI ID to receive direct settlements from friends.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upiList.map((acc) => {
              const displayQr = qrMap[acc.id] || acc.customQrImage || null;

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
                        onClick={() => {
                          if (displayQr) {
                            setZoomQr({
                              label: acc.label,
                              upiId: acc.upiId,
                              qrUrl: displayQr,
                            });
                          }
                        }}
                        className="relative group cursor-pointer w-16 h-16 rounded-xl bg-white p-1 border border-slate-200 shadow-xs shrink-0 flex items-center justify-center overflow-hidden"
                        title={displayQr ? "Click to expand QR code" : "Generating QR code..."}
                      >
                        {displayQr ? (
                          <>
                            <img
                              src={displayQr}
                              alt={acc.label}
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Maximize2 size={14} />
                            </div>
                          </>
                        ) : (
                          <QrCode size={22} className="text-slate-400 animate-pulse" />
                        )}
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
                            onClick={() => {
                              if (displayQr) {
                                setZoomQr({
                                  label: acc.label,
                                  upiId: acc.upiId,
                                  qrUrl: displayQr,
                                });
                              }
                            }}
                            className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                          >
                            <Maximize2 size={10} />
                            View QR Code
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Edit / Set Default / Delete */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        onClick={() => handleStartEditUPI(acc)}
                        className="flex items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-emerald-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs active:scale-95"
                        title="Edit Payment Account"
                      >
                        <Edit3 size={11} className="text-emerald-600" />
                        Edit
                      </button>

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

      {/* CURRENCY & REGIONAL SETTINGS */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Currency & Regional Settings
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Default currency for your bills and trips
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGPSDetect}
            disabled={isGpsDetecting}
            className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95"
            title="Auto-detect currency from device GPS"
          >
            <Navigation size={11} className={isGpsDetecting ? 'animate-spin' : ''} />
            {isGpsDetecting ? 'Locating...' : 'Auto Detect GPS'}
          </button>
        </div>

        {/* Active Currency Display & Picker */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{getCurrencyConfig(activePrefCurrency).flag}</span>
              <div>
                <span className="text-xs font-bold text-slate-900">
                  {activePrefCurrency} ({getCurrencyConfig(activePrefCurrency).symbol}) • {getCurrencyConfig(activePrefCurrency).name}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <MapPin size={10} className="text-emerald-600 shrink-0" />
                  {currentUser.preferredCurrency
                    ? `Saved Preference (Overrides location)`
                    : detectedLocation.source === 'gps'
                    ? `GPS Pinpointed: ${detectedLocation.countryName}`
                    : `Auto-detected from timezone (${detectedLocation.locationDetail})`}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Choose Currency:
            </label>
            <select
              value={activePrefCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol}) - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Zoomed Barcode Modal */}
      {zoomQr && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${zoomQr.label} Barcode`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">{zoomQr.label} QR Code</span>
              <button
                onClick={() => setZoomQr(null)}
                aria-label="Close QR code preview"
                className="min-w-[48px] min-h-[48px] rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block min-w-[208px] min-h-[208px] flex items-center justify-center">
              {zoomQr.qrUrl ? (
                <img
                  src={zoomQr.qrUrl}
                  alt="QR Code"
                  className="w-52 h-52 mx-auto object-contain rounded-xl"
                />
              ) : (
                <QrCode size={40} className="text-slate-400 animate-pulse" />
              )}
            </div>

            <p className="font-mono text-xs font-extrabold text-slate-900">{zoomQr.upiId}</p>
            <p className="text-[11px] text-slate-500">
              Scan with any UPI app (GPay, PhonePe, Paytm)
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
            if (confirm('Are you sure you want to clear all cached groups and expenses on this device?')) {
              onClearAllData();
            }
          }}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Trash2 size={14} />
          Clear Local Cache
        </button>
      </div>

      {/* Account Deletion (Google Play Store Mandatory Policy Compliance) */}
      {onDeleteAccount && (
        <div className="pt-2 pb-4">
          <button
            onClick={() => {
              const confirmed = window.confirm(
                '⚠️ PERMANENT ACCOUNT DELETION\n\nAre you sure you want to permanently delete your SplitShare account? All your personal account details will be purged from our servers. This cannot be undone.'
              );
              if (confirmed) {
                const check = window.prompt('Type DELETE to confirm permanent account deletion:');
                if (check === 'DELETE') {
                  onDeleteAccount();
                } else {
                  alert('Account deletion aborted: text did not match "DELETE".');
                }
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 size={14} />
            Delete Account & Purge Data
          </button>
        </div>
      )}

      {/* Legal & Compliance Links for Google Play Store Policy */}
      <div className="pt-2 pb-6 text-center space-y-1.5 border-t border-slate-200 mt-2">
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500 font-semibold">
          <a
            href="/privacy-policy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-700 underline underline-offset-2"
          >
            Privacy Policy
          </a>
          <span>•</span>
          <a
            href="/delete-account.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-rose-700 underline underline-offset-2"
          >
            Web Account Deletion
          </a>
        </div>
        <p className="text-[10px] text-slate-500">
          SplitShare v1.0.0 • Secure & Private
        </p>
      </div>
    </div>
  );
};
