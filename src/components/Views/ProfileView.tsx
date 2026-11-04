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
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendLocalPushNotification,
} from '../../utils/notifications';
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
  Navigation,
  ChevronRight,
  Bell,
  Shield,
  Layers,
  Receipt,
  ArrowRightLeft,
  AlertTriangle,
  ExternalLink
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

  // Modals state
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

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
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    currentUser.preferredCurrency || detectedLocation.currencyCode || 'INR'
  );

  // Notification status
  const [notifPermission, setNotifPermission] = useState<string>(() => getNotificationPermission());

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

  const handleApplyCurrencyChange = (newCode: string) => {
    setSelectedCurrency(newCode);
    onUpdateProfile({ preferredCurrency: newCode });
    setShowCurrencyModal(false);
  };

  const handleGPSDetect = async () => {
    setIsGpsDetecting(true);
    try {
      const gpsResult = await detectGPSLocationCurrency();
      if (gpsResult) {
        setDetectedLocation(gpsResult);
        setSelectedCurrency(gpsResult.currencyCode);
        onUpdateProfile({ preferredCurrency: gpsResult.currencyCode });
      } else {
        alert(`Location detected from device timezone: ${detectedLocation.locationDetail}`);
      }
    } catch {
      alert('GPS location detection unavailable.');
    } finally {
      setIsGpsDetecting(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!isNotificationSupported()) {
      alert('Push notifications are not supported on this browser.');
      return;
    }

    const granted = await requestNotificationPermission();
    const updated = getNotificationPermission();
    setNotifPermission(updated);

    if (granted) {
      sendLocalPushNotification({
        title: 'Push Alerts Enabled! 🔔',
        body: 'SplitShare will notify you in real-time for bills and settlements.',
      });
    }
  };

  const currencyConfig = getCurrencyConfig(activePrefCurrency);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-28">
      {/* 1. Profile Header Card */}
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

        {/* Quick Stats Summary Bar */}
        <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/10 rounded-xl p-2 backdrop-blur-xs">
            <span className="text-sm font-extrabold block">{groups.length}</span>
            <span className="text-[10px] text-emerald-100 font-medium">Active Groups</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2 backdrop-blur-xs">
            <span className="text-sm font-extrabold block">{expenses.length}</span>
            <span className="text-[10px] text-emerald-100 font-medium">Total Bills</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2 backdrop-blur-xs">
            <span className="text-sm font-extrabold block">{settlements.length}</span>
            <span className="text-[10px] text-emerald-100 font-medium">Settled Up</span>
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

      {/* 2. PAYMENT ACCOUNTS (UPI & QR) */}
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

      {/* 3. APP PREFERENCES & CONTROLS (Grouped Modern Menu List) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {/* Row 1: Currency Preference Button */}
        <button
          type="button"
          onClick={() => setShowCurrencyModal(true)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Default Currency & Trip Region</h3>
              <p className="text-[11px] text-slate-500">Auto-sets currency for trips & bills</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <span>{currencyConfig.flag}</span>
              <span>{currencyConfig.code} ({currencyConfig.symbol})</span>
            </span>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
        </button>

        {/* Row 2: Push Notifications Alerts */}
        <button
          type="button"
          onClick={handleToggleNotifications}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Push Notification Alerts</h3>
              <p className="text-[11px] text-slate-500">Real-time alerts for bills and payments</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
              notifPermission === 'granted'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {notifPermission === 'granted' ? 'Enabled 🔔' : 'Tap to Enable'}
            </span>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
        </button>

        {/* Row 3: Data & Security Controls (Opens Security Modal) */}
        <button
          type="button"
          onClick={() => setShowSecurityModal(true)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Data & Account Security</h3>
              <p className="text-[11px] text-slate-500">Cache management & account deletion</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-slate-500">Manage</span>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
        </button>
      </div>

      {/* 4. LOG OUT BUTTON (Clean & Prominent Outside, as requested) */}
      {onSignOut && (
        <div className="pt-1">
          <button
            onClick={onSignOut}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99]"
          >
            <LogOut size={16} className="text-slate-500" />
            Log Out ({currentUser.name})
          </button>
        </div>
      )}

      {/* 5. Minimal Footer */}
      <div className="pt-2 text-center space-y-1">
        <p className="text-[10px] text-slate-400 font-medium">
          SplitShare v1.0.0 • Protected by 256-bit Token Security
        </p>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: Currency & Trip Location Settings Modal */}
      {/* ========================================================= */}
      {showCurrencyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Currency & Regional Settings"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Currency & Region</h3>
                  <p className="text-[10px] text-slate-500">Choose your base currency</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCurrencyModal(false)}
                className="min-w-[36px] min-h-[36px] rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Location Detection Pill */}
            <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                  <MapPin size={13} className="text-blue-600" />
                  <span>Device Location Detected:</span>
                </div>
                <button
                  type="button"
                  onClick={handleGPSDetect}
                  disabled={isGpsDetecting}
                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                >
                  <Navigation size={10} className={isGpsDetecting ? 'animate-spin' : ''} />
                  {isGpsDetecting ? 'Pinpointing...' : 'GPS Auto-Detect'}
                </button>
              </div>
              <p className="text-[11px] text-blue-800 font-medium">
                {detectedLocation.source === 'gps'
                  ? `Pinpointed via GPS: ${detectedLocation.countryName}`
                  : `Detected via device timezone: ${detectedLocation.locationDetail} (${detectedLocation.countryName})`}
              </p>
            </div>

            {/* Currency Option List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Select Currency:
              </label>
              {SUPPORTED_CURRENCIES.map((c) => {
                const isSelected = selectedCurrency === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleApplyCurrencyChange(c.code)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{c.flag}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-900">{c.code}</span>
                          <span className="text-xs font-bold text-slate-500">({c.symbol})</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{c.name}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                        <Check size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCurrencyModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: Data & Account Security (Cleanly Isolated) */}
      {/* ========================================================= */}
      {showSecurityModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Data & Security Controls"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Data & Security</h3>
                  <p className="text-[10px] text-slate-500">Device storage & account safety</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSecurityModal(false)}
                className="min-w-[36px] min-h-[36px] rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Clear Local Cache */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Clear Local Offline Cache</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Deletes temporary cached items on this device without deleting your server data.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear local offline cache? Your cloud data will sync on next refresh.')) {
                    onClearAllData();
                    setShowSecurityModal(false);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <Trash2 size={13} />
                Clear Local Cache
              </button>
            </div>

            {/* Danger Zone: Permanent Account Deletion */}
            {onDeleteAccount && (
              <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200/80 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-950">Permanent Account Deletion</h4>
                    <p className="text-[10px] text-rose-800 mt-0.5">
                      Irreversibly deletes your account credentials and personal profile from the servers.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
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
                  className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-95"
                >
                  <Trash2 size={13} />
                  Delete Account & Purge Data
                </button>
              </div>
            )}

            {/* Legal & Policy Compliance Links */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-3 text-xs text-slate-500 font-semibold">
              <a
                href="/privacy-policy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-700 underline underline-offset-2 flex items-center gap-1 text-[11px]"
              >
                Privacy Policy <ExternalLink size={10} />
              </a>
              <span>•</span>
              <a
                href="/delete-account.html"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-rose-700 underline underline-offset-2 flex items-center gap-1 text-[11px]"
              >
                Web Deletion <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: Zoomed Barcode QR Preview */}
      {/* ========================================================= */}
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
    </div>
  );
};
