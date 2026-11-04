import React, { useState } from 'react';
import { Group, Member, Expense, Settlement, KittyContribution, KittyExpense, ChatMessage } from '../../types';
import { calculateBalances } from '../../utils/debtSimplifier';
import { formatCurrency, formatRelativeDate, CATEGORY_DETAILS } from '../../utils/formatters';
import { formatForeignExpense } from '../../utils/currencies';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  PiggyBank, 
  PieChart as PieIcon, 
  ListOrdered, 
  Scale, 
  MessageCircle, 
  Share2,
  CheckCircle2,
  MoreVertical,
  Trash2,
  LogOut,
  Download,
  Copy,
  Check,
  Search,
  FileText,
  ArrowUpDown,
  X,
  Image as ImageIcon,
  Send,
  Paperclip
} from 'lucide-react';
import { generateWhatsAppNudge } from '../../utils/whatsapp';
import { generateGroupWhatsAppSummary, downloadGroupCSV } from '../../utils/exportSummary';
import { DeleteGroupModal } from '../Modals/DeleteGroupModal';

interface GroupDetailViewProps {
  group: Group;
  currentUser: Member;
  allMembers: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  kittyContributions: KittyContribution[];
  kittyExpenses: KittyExpense[];
  messages?: ChatMessage[];
  onSendMessage?: (text: string, mediaUrl?: string) => void;
  onOpenAddExpense: () => void;
  onOpenSettleModal: (debtor: Member, creditor: Member, amount: number) => void;
  onOpenKittyModal: () => void;
  onOpenDisputeModal: (expense: Expense) => void;
  onAcceptApproval: (expenseId: string) => void;
  onOpenInviteModal: () => void;
  onSendReminder: (expenseId: string, memberId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onLeaveGroup: (groupId: string) => void;
}

type GroupSubTab = 'expenses' | 'balances' | 'kitty' | 'chat' | 'analytics';

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  group,
  currentUser,
  allMembers,
  expenses,
  settlements,
  kittyContributions,
  kittyExpenses,
  messages = [],
  onSendMessage,
  onOpenAddExpense,
  onOpenSettleModal,
  onOpenKittyModal,
  onOpenDisputeModal,
  onAcceptApproval,
  onOpenInviteModal,
  onSendReminder,
  onDeleteGroup,
  onLeaveGroup,
}) => {
  const [subTab, setSubTab] = useState<GroupSubTab>('expenses');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [viewingProof, setViewingProof] = useState<string | null>(null);

  // Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest'>('newest');

  // Chat state
  const [chatText, setChatText] = useState('');
  const [chatMedia, setChatMedia] = useState<string | null>(null);

  // Filter for this group
  const groupExpenses = expenses.filter((e) => e.groupId === group.id);
  const groupSettlements = settlements.filter((s) => s.groupId === group.id);
  const groupKittyContr = kittyContributions.filter((k) => k.groupId === group.id);
  const groupKittyExp = kittyExpenses.filter((ke) => ke.groupId === group.id);
  const groupMessages = messages.filter((m) => m.groupId === group.id);

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatText.trim() && !chatMedia) return;
    if (onSendMessage) {
      onSendMessage(chatText.trim(), chatMedia || undefined);
    }
    setChatText('');
    setChatMedia(null);
  };

  const handleChatPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        setChatMedia(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Group members list
  const memberIds = group.members.map((m) => m.id);

  // Calculate balances & simplified debts
  const { netBalances, simplifiedDebts } = calculateBalances(
    memberIds,
    groupExpenses,
    groupSettlements
  );

  // Calculate Kitty metrics
  const totalKittyIn = groupKittyContr.reduce((sum, k) => sum + k.amount, 0);
  const totalKittyOut = groupKittyExp.reduce((sum, ke) => sum + ke.amount, 0);
  const kittyBalance = totalKittyIn - totalKittyOut;

  // Calculate total confirmed expenditure
  const totalConfirmedSpend = groupExpenses
    .filter((e) => e.status === 'CONFIRMED')
    .reduce((sum, e) => sum + e.amount, 0);

  // Current user's net position in this group
  const myBalance = netBalances[currentUser.id] || 0;

  // Budget progress
  const targetBudget = group.targetBudget || 0;
  const budgetPercentage = targetBudget > 0 ? Math.min(100, Math.round((totalConfirmedSpend / targetBudget) * 100)) : 0;

  // Creator check
  const isCreator = group.createdBy === currentUser.id;

  // Filtered and sorted bills based on search, category and sort order
  const filteredExpenses = React.useMemo(() => {
    const list = groupExpenses.filter((e) => {
      const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'highest') {
        return b.amount - a.amount;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [groupExpenses, searchQuery, selectedCategory, sortBy]);

  const handleCopySummary = async () => {
    const summary = generateGroupWhatsAppSummary({
      group,
      expenses: groupExpenses,
      simplifiedDebts,
      allMembers,
      totalSpent: totalConfirmedSpend,
    });

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${group.name} - SplitShare Summary`,
          text: summary,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {}
  };

  const handleLeaveGroupClick = () => {
    if (Math.abs(myBalance) > 0.01) {
      alert(`You cannot leave the group until your balance (${formatCurrency(myBalance)}) is settled!`);
      return;
    }
    if (confirm(`Are you sure you want to leave "${group.name}"?`)) {
      onLeaveGroup(group.id);
    }
  };

  return (
    <div className="pb-28">
      {/* Group Hero Banner */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-5 pt-5 pb-6 rounded-b-3xl shadow-lg relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-white/10 rounded-2xl backdrop-blur-xs">{group.emoji}</span>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">{group.name}</h1>
              <p className="text-xs text-slate-300">
                {group.members.length} members • {groupExpenses.length} bills
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenInviteModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
              title="Invite Friend by Email"
            >
              + Invite
            </button>

            {/* 3-dots Group Settings Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                title="Group Options"
              >
                <MoreVertical size={16} />
              </button>

              {showSettingsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSettingsMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white text-slate-800 shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Group Actions
                    </div>

                    <button
                      onClick={() => {
                        handleCopySummary();
                        setShowSettingsMenu(false);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      {copiedSummary ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                      {copiedSummary ? 'Summary Copied!' : 'Copy WhatsApp Summary'}
                    </button>

                    <button
                      onClick={() => {
                        downloadGroupCSV(group, groupExpenses, allMembers);
                        setShowSettingsMenu(false);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      <Download size={14} />
                      Download CSV Spreadsheet
                    </button>

                    <div className="border-t border-slate-100 my-1 pt-1">
                      {isCreator ? (
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            setIsDeleteModalOpen(true);
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={14} />
                          Delete Group (Creator Only)
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            handleLeaveGroupClick();
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2 text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                          <LogOut size={14} />
                          Leave Group
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* My Net Balance Pill */}
        <div className="mt-4 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Your Net Balance
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xl font-black ${
                myBalance > 0.01 ? 'text-emerald-400' : myBalance < -0.01 ? 'text-rose-400' : 'text-slate-200'
              }`}>
                {myBalance > 0.01 ? `+${formatCurrency(myBalance)}` : myBalance < -0.01 ? `-${formatCurrency(Math.abs(myBalance))}` : 'All settled up!'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Total Spent
            </span>
            <p className="text-base font-bold text-white mt-0.5">
              {formatCurrency(totalConfirmedSpend)}
            </p>
          </div>
        </div>

        {/* Target Budget Meter (if set) */}
        {targetBudget > 0 && (
          <div className="mt-3.5 space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-slate-300">
              <span>Trip Budget Meter</span>
              <span>
                {formatCurrency(totalConfirmedSpend)} / {formatCurrency(targetBudget)} ({budgetPercentage}%)
              </span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetPercentage >= 100
                    ? 'bg-rose-500'
                    : budgetPercentage >= 80
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${budgetPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="max-w-md mx-auto px-3 sm:px-4 mt-3">
        <div className="flex bg-slate-200/70 p-1 rounded-2xl gap-1 text-[11px] sm:text-xs font-bold text-slate-600">
          <button
            onClick={() => setSubTab('expenses')}
            className={`flex-1 py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              subTab === 'expenses'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <ListOrdered size={14} className="shrink-0" />
            <span>Bills ({groupExpenses.length})</span>
          </button>
          <button
            onClick={() => setSubTab('balances')}
            className={`flex-1 py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              subTab === 'balances'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <Scale size={14} className="shrink-0" />
            <span>Balances ({simplifiedDebts.length})</span>
          </button>
          <button
            onClick={() => setSubTab('kitty')}
            className={`flex-1 py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              subTab === 'kitty'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <PiggyBank size={14} className="shrink-0" />
            <span>Kitty</span>
          </button>
          <button
            onClick={() => setSubTab('chat')}
            className={`flex-1 py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              subTab === 'chat'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <MessageCircle size={14} className="shrink-0" />
            <span>Chat{groupMessages.length > 0 ? ` (${groupMessages.length})` : ''}</span>
          </button>
          <button
            onClick={() => setSubTab('analytics')}
            className={`flex-1 py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              subTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <PieIcon size={14} className="shrink-0" />
            <span>Stats</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-md mx-auto px-4 mt-4 space-y-3">
        {/* TAB 1: EXPENSES LIST WITH SEARCH & CATEGORY FILTER */}
        {subTab === 'expenses' && (
          <div className="space-y-2.5">
            {/* Search Bar & Category Filter */}
            {groupExpenses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-slate-400">
                      <Search size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search bills..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-emerald-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSortBy(sortBy === 'newest' ? 'highest' : 'newest')}
                    className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                    title={`Current sort: ${sortBy === 'newest' ? 'Newest bills' : 'Highest amount'}. Tap to toggle.`}
                  >
                    <ArrowUpDown size={13} className="text-emerald-600" />
                    <span>{sortBy === 'newest' ? 'Newest' : 'Highest ₹'}</span>
                  </button>
                </div>

                {/* Category filter pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(CATEGORY_DETAILS).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                        selectedCategory === key
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupExpenses.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
                <span className="text-4xl block mb-2">🧾</span>
                <h3 className="font-bold text-slate-800 text-sm">No bills added yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Add an expense to start tracking and splitting shared bills.
                </p>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
                <p className="text-xs font-bold text-slate-600">No bills match your search.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredExpenses.map((expense) => {
                const payer = allMembers.find((m) => m.id === expense.paidById) || group.members[0];
                const cat = CATEGORY_DETAILS[expense.category] || CATEGORY_DETAILS.other;
                const isPaidByMe = expense.paidById === currentUser.id;
                const mySplit = expense.splits.find((s) => s.memberId === currentUser.id);

                // Check my approval status if pending
                const myApproval = expense.approvals?.[currentUser.id];
                const isPendingForMe = expense.status === 'PENDING_APPROVAL' && myApproval?.status === 'PENDING';

                return (
                  <div
                    key={expense.id}
                    className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                      expense.status === 'PENDING_APPROVAL'
                        ? 'border-amber-300 ring-1 ring-amber-300/40'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl ${cat.bg} flex items-center justify-center text-xl shrink-0`}>
                          {cat.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900">{expense.title}</h3>
                            {expense.status === 'PENDING_APPROVAL' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock size={11} />
                                Pending Approval
                              </span>
                            )}
                            {expense.status === 'CONFIRMED' && expense.requiresApproval && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                <ShieldCheck size={11} />
                                Approved
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1">
                            <span className="font-semibold text-slate-700">{payer.name.split(' ')[0]}</span>
                            <span>paid {formatCurrency(expense.amount)}</span>
                            {expense.currency && expense.currency !== 'INR' && expense.originalAmount && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md">
                                {formatForeignExpense(expense.amount, expense.currency, expense.originalAmount).replace(/₹[0-9,.]+\s*/, '')}
                              </span>
                            )}
                            <span>• {formatRelativeDate(expense.date)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isPaidByMe ? (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-600 block">you lent</span>
                            <span className="text-sm font-extrabold text-emerald-600">
                              +{formatCurrency(expense.amount - (mySplit?.amount || 0))}
                            </span>
                          </div>
                        ) : mySplit ? (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-rose-500 block">your share</span>
                            <span className="text-sm font-extrabold text-rose-600">
                              -{formatCurrency(mySplit.amount)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">not involved</span>
                            <span className="text-xs font-semibold text-slate-500">₹0</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Split Mode details pill */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Split: <strong className="text-slate-700 capitalize">{expense.splitType.toLowerCase()}</strong> across {expense.splits.length} members</span>
                      {expense.notes && <span className="italic truncate max-w-[150px]">"{expense.notes}"</span>}
                    </div>

                    {/* Actionable Prompt if CURRENT USER needs to accept or query this bill */}
                    {isPendingForMe && (
                      <div className="mt-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                          <span>Confirm your share ({formatCurrency(mySplit?.amount || 0)})</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => onOpenDisputeModal(expense)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-white border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            Query
                          </button>
                          <button
                            onClick={() => onAcceptApproval(expense.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle2 size={13} />
                            Accept
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Re-request reminder button for Payer / Creator */}
                    {isPaidByMe && expense.status === 'PENDING_APPROVAL' && (
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <Clock size={12} className="text-amber-600" />
                            Awaiting Member Approvals:
                          </span>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(expense.approvals || {}).map(([mId, appr]) => {
                            if (appr.status !== 'PENDING') return null;
                            const target = allMembers.find((m) => m.id === mId) || group.members.find((m) => m.id === mId);
                            return (
                              <div key={mId} className="flex items-center justify-between text-xs py-1 border-t border-slate-100 first:border-0">
                                <span className="text-slate-700 font-medium">
                                  {target?.name || 'Friend'} ({appr.lastReminderAt ? 'Reminded' : 'Waiting'})
                                </span>
                                <button
                                  onClick={() => {
                                    onSendReminder(expense.id, mId);
                                    alert(`Re-request reminder sent to ${target?.name || 'member'}!`);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center gap-1 transition-colors"
                                >
                                  <Clock size={11} />
                                  Send Re-request / Reminder
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: BALANCES & DEBT SIMPLIFICATION */}
        {subTab === 'balances' && (
          <div className="space-y-3">
            {/* Net balances list */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Member Net Positions
              </h3>
              <div className="divide-y divide-slate-100">
                {group.members.map((member) => {
                  const bal = netBalances[member.id] || 0;
                  return (
                    <div key={member.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{member.avatar}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {member.name} {member.id === currentUser.id ? '(You)' : ''}
                          </p>
                          <p className="text-[10px] text-slate-500">{member.upiId || 'No UPI ID'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-extrabold ${
                          bal > 0.01 ? 'text-emerald-600' : bal < -0.01 ? 'text-rose-600' : 'text-slate-500 font-semibold'
                        }`}>
                          {bal > 0.01
                            ? (member.id === currentUser.id ? `You get back ${formatCurrency(bal)}` : `gets back ${formatCurrency(bal)}`)
                            : bal < -0.01
                            ? (member.id === currentUser.id ? `You owe ${formatCurrency(Math.abs(bal))}` : `owes ${formatCurrency(Math.abs(bal))}`)
                            : 'Settled'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart Simplified Debts (Who pays whom) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Scale size={14} className="text-emerald-600" />
                    Simplified Settle-ups
                  </h3>
                  <p className="text-[11px] text-slate-500">Direct minimum-cash-flow payments</p>
                </div>
              </div>

              {simplifiedDebts.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs font-medium">
                  🎉 Everyone in this group is completely settled up!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {simplifiedDebts.map((debt, idx) => {
                    const debtor = allMembers.find((m) => m.id === debt.fromMemberId) || group.members[0];
                    const creditor = allMembers.find((m) => m.id === debt.toMemberId) || group.members[1];
                    const isMyDebt = debt.fromMemberId === currentUser.id;
                    const isOwedToMe = debt.toMemberId === currentUser.id;

                    const whatsappUrl = generateWhatsAppNudge({
                      borrowerName: debtor.name.split(' ')[0],
                      lenderName: creditor.name.split(' ')[0],
                      amount: debt.amount,
                      groupName: group.name,
                      lenderUpi: creditor.upiId,
                      tone: 'friendly',
                    });

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 ${
                          isMyDebt
                            ? 'bg-rose-50/70 border-rose-200'
                            : isOwedToMe
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{debtor.avatar}</span>
                          <div className="min-w-0 truncate">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {debtor.name.split(' ')[0]} <span className="font-normal text-slate-500">pays</span> {creditor.name.split(' ')[0]}
                            </p>
                            <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                              {formatCurrency(debt.amount)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-emerald-600 transition-colors"
                            title="Send WhatsApp Nudge"
                          >
                            <MessageCircle size={15} />
                          </a>

                          <button
                            onClick={() => onOpenSettleModal(debtor, creditor, debt.amount)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 whitespace-nowrap"
                          >
                            Settle Up
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past settlements */}
            {groupSettlements.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Settlement History
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {groupSettlements.map((s) => {
                    const from = allMembers.find((m) => m.id === s.fromMemberId) || group.members[0];
                    const to = allMembers.find((m) => m.id === s.toMemberId) || group.members[1];
                    return (
                      <div key={s.id} className="py-2.5 flex items-center justify-between text-slate-600">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">{from.name}</span>
                            <span className="text-slate-400">paid</span>
                            <span className="font-semibold text-slate-800">{to.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {s.upiRef && <span className="text-[10px] text-slate-500 font-mono">Ref: {s.upiRef}</span>}
                            {s.proofImage && (
                              <button
                                type="button"
                                onClick={() => setViewingProof(s.proofImage!)}
                                className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                              >
                                <span>🧾</span> View Receipt Proof
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-emerald-600 text-sm">{formatCurrency(s.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: KITTY POOL */}
        {subTab === 'kitty' && (
          <div className="space-y-3">
            <div className="bg-gradient-to-tr from-indigo-700 to-purple-600 text-white rounded-2xl p-4 shadow-md text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                Current Kitty Balance
              </span>
              <h2 className="text-3xl font-black mt-1">{formatCurrency(kittyBalance)}</h2>
              <p className="text-[11px] text-indigo-200 mt-1">
                Total Pooled: {formatCurrency(totalKittyIn)} • Spent: {formatCurrency(totalKittyOut)}
              </p>

              <button
                onClick={onOpenKittyModal}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-700 text-xs font-bold shadow-xs hover:bg-indigo-50 transition-all active:scale-95"
              >
                <PiggyBank size={15} />
                Manage Kitty Fund
              </button>
            </div>

            {/* Kitty Spendings list */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Recent Kitty Expenses
              </h3>
              {groupKittyExp.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No kitty expenses recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {groupKittyExp.map((ke) => (
                    <div key={ke.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{ke.title}</p>
                        <p className="text-[10px] text-slate-500">{formatRelativeDate(ke.date)}</p>
                      </div>
                      <span className="text-xs font-bold text-rose-600">-{formatCurrency(ke.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: GROUP CHAT & BILL DISCUSSIONS */}
        {subTab === 'chat' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[520px] overflow-hidden animate-in fade-in">
            {/* Chat Header */}
            <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 leading-tight">
                    {group.name} Chat
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {group.members.length} members • Real-time discussion
                  </p>
                </div>
              </div>

              {/* Quick Nudge Suggestions */}
              <div className="flex gap-1">
                {['Payment done! 💸', 'Check bill 👍'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      if (onSendMessage) onSendMessage(chip);
                    }}
                    className="hidden sm:inline-flex px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 rounded-lg transition-colors active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/40">
              {groupMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <MessageCircle size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No messages yet in this group</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Discuss bill splits, notify friends when you've paid via UPI, or share receipts!
                  </p>
                  <div className="flex gap-1.5 pt-2">
                    {['Hi everyone! 👋', 'I paid via GPay 💸', 'Please check the bill 🧾'].map((quick) => (
                      <button
                        key={quick}
                        onClick={() => {
                          if (onSendMessage) onSendMessage(quick);
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-300 text-[11px] font-bold text-slate-700 rounded-xl shadow-2xs transition-all active:scale-95"
                      >
                        {quick}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                groupMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      {!isMe && (
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-xs">{msg.senderAvatar || '👤'}</span>
                          <span className="text-[10px] font-bold text-slate-600">
                            {msg.senderName}
                          </span>
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] rounded-2xl p-3 shadow-2xs space-y-1.5 ${
                          isMe
                            ? 'bg-emerald-600 text-white rounded-tr-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        {msg.mediaUrl && (
                          <div
                            onClick={() => setViewingProof(msg.mediaUrl || null)}
                            className="cursor-pointer rounded-xl overflow-hidden bg-slate-900 max-h-48 group relative"
                            title="Tap to enlarge"
                          >
                            <img
                              src={msg.mediaUrl}
                              alt="Shared Receipt"
                              className="w-full max-h-48 object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}

                        {msg.text && (
                          <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap break-words">
                            {msg.text}
                          </p>
                        )}

                        <div className={`flex items-center justify-end gap-1 text-[9px] ${
                          isMe ? 'text-emerald-100' : 'text-slate-400'
                        }`}>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMe && <Check size={11} className="inline text-emerald-200" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Media Attachment Preview if uploaded */}
            {chatMedia && (
              <div className="px-3 pt-2 bg-white border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={chatMedia}
                    alt="Upload Preview"
                    className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                  />
                  <span className="text-[11px] font-bold text-slate-600">Receipt / Image attached</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChatMedia(null)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendChat} className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
              <label className="cursor-pointer text-slate-400 hover:text-emerald-600 p-2 rounded-xl hover:bg-slate-50 transition-colors shrink-0" title="Attach Receipt/Photo">
                <Paperclip size={18} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleChatPhotoUpload}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                placeholder="Type a message..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-100 rounded-xl text-xs font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500/20 border border-transparent focus:border-emerald-500 transition-all"
              />

              <button
                type="submit"
                disabled={!chatText.trim() && !chatMedia}
                className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-95"
                title="Send Message"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: ANALYTICS & STATS */}
        {subTab === 'analytics' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Spending by Category
              </h3>
              <div className="space-y-2.5">
                {Object.entries(CATEGORY_DETAILS).map(([key, cat]) => {
                  const spent = groupExpenses
                    .filter((e) => e.category === key && e.status === 'CONFIRMED')
                    .reduce((sum, e) => sum + e.amount, 0);

                  if (spent === 0) return null;
                  const pct = totalConfirmedSpend > 0 ? Math.round((spent / totalConfirmedSpend) * 100) : 0;

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <span>{cat.icon}</span> {cat.label}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(spent)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (+ Add Expense) - Positioned safely above bottom nav & aligned inside container */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+12px)] left-1/2 -translate-x-1/2 w-full max-w-md px-4 pointer-events-none z-20 flex justify-end">
        <button
          onClick={onOpenAddExpense}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xl shadow-emerald-600/40 hover:scale-105 transition-all active:scale-95"
        >
          <Plus size={18} />
          Add Bill
        </button>
      </div>

      {/* Two-step Delete Group Confirmation Modal (Creator Only) */}
      <DeleteGroupModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        group={group}
        onConfirmDelete={onDeleteGroup}
      />

      {/* Payment Proof Receipt Lightbox Modal */}
      {viewingProof && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Payment Proof Receipt"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setViewingProof(null)}
        >
          <div
            className="bg-white rounded-3xl p-4 max-w-sm w-full space-y-3 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>🧾</span> Payment Receipt Proof
              </h3>
              <button
                onClick={() => setViewingProof(null)}
                className="min-w-[40px] min-h-[40px] rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-96">
              <img
                src={viewingProof}
                alt="Payment Receipt Screenshot"
                className="w-full max-h-96 object-contain"
              />
            </div>
            <button
              onClick={() => setViewingProof(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all active:scale-95"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
