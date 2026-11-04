import React, { useState, useEffect } from 'react';
import { Group, Member, SplitType, SplitItem } from '../../types';
import { X, Check, AlertCircle, ShieldCheck, ShieldAlert, Users, PieChart, Calculator, Globe, Edit3 } from 'lucide-react';
import { CATEGORY_DETAILS } from '../../utils/formatters';
import { SUPPORTED_CURRENCIES, getCurrencyConfig, convertToINR } from '../../utils/currencies';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUser: Member;
  onAddExpense: (expense: any) => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  onAddExpense,
}) => {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [customRateStr, setCustomRateStr] = useState('');
  const [showRateEdit, setShowRateEdit] = useState(false);
  const [paidById, setPaidById] = useState(currentUser.id);
  const [category, setCategory] = useState<any>('food');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [notes, setNotes] = useState('');

  // Participating members for Equal split
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    group.members.map((m) => m.id)
  );

  // Custom values for Exact and Percentage
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  const currConfig = getCurrencyConfig(currency);
  const activeRate = currency === 'INR'
    ? 1.0
    : (parseFloat(customRateStr) > 0 ? parseFloat(customRateStr) : currConfig.defaultRateToINR);

  // Smart Category Auto-Detection based on keyword
  const handleTitleChange = (val: string) => {
    setTitle(val);
    const lower = val.toLowerCase();
    if (/pizza|burger|dinner|lunch|breakfast|chai|tea|coffee|snack|biryani|swiggy|zomato|cafe|restaurant|drinks|beer|food|maggie|paneer|sweet/i.test(lower)) {
      setCategory('food');
    } else if (/uber|ola|cab|taxi|auto|petrol|fuel|diesel|toll|train|flight|metro|bus|travel|rapido/i.test(lower)) {
      setCategory('travel');
    } else if (/movie|cinema|netflix|spotify|game|party|club|concert|fun|hotstar|prime/i.test(lower)) {
      setCategory('entertainment');
    } else if (/grocery|groceries|zepto|blinkit|instamart|vegetables|fruits|milk|ration|bread|egg/i.test(lower)) {
      setCategory('groceries');
    } else if (/amazon|flipkart|clothes|shopping|shoes|myntra|zara/i.test(lower)) {
      setCategory('shopping');
    } else if (/hotel|airbnb|room|stay|resort|hostel|rent|lodge|flat/i.test(lower)) {
      setCategory('stay');
    }
  };

  const handleQuickAdd = (addVal: number) => {
    const cur = parseFloat(amountStr) || 0;
    setAmountStr(String(Math.round((cur + addVal) * 100) / 100));
  };

  const handleSetAmount = (val: number) => {
    setAmountStr(String(val));
  };

  // Reset or initialize state
  useEffect(() => {
    if (isOpen) {
      setPaidById(currentUser.id);
      setSelectedMemberIds(group.members.map((m) => m.id));
      setCurrency('INR');
      setCustomRateStr('');
      setShowRateEdit(false);
      
      // Default equal percentages
      const defaultPct = (100 / group.members.length).toFixed(1);
      const initialPcts: Record<string, string> = {};
      group.members.forEach((m) => {
        initialPcts[m.id] = defaultPct;
      });
      setPercentages(initialPcts);
    }
  }, [isOpen, group, currentUser]);

  if (!isOpen) return null;

  const rawEnteredAmount = parseFloat(amountStr) || 0;
  const convertedInrAmount = currency === 'INR'
    ? rawEnteredAmount
    : convertToINR(rawEnteredAmount, currency, activeRate);

  // Calculate splits based on selected split type (all stored in INR for unified math)
  let computedSplits: SplitItem[] = [];
  let validationError: string | null = null;

  if (splitType === 'EQUAL') {
    if (selectedMemberIds.length === 0) {
      validationError = 'Select at least one member to split with';
    } else if (convertedInrAmount > 0) {
      const sharePerPerson = Math.round((convertedInrAmount / selectedMemberIds.length) * 100) / 100;
      let allocated = 0;
      computedSplits = selectedMemberIds.map((mId, index) => {
        const isLast = index === selectedMemberIds.length - 1;
        const finalShare = isLast
          ? Math.round((convertedInrAmount - allocated) * 100) / 100
          : sharePerPerson;
        allocated += finalShare;
        return {
          memberId: mId,
          amount: finalShare,
        };
      });
    }
  } else if (splitType === 'EXACT') {
    let sumExactEntered = 0;
    group.members.forEach((m) => {
      const amt = parseFloat(exactAmounts[m.id] || '0') || 0;
      sumExactEntered += amt;
    });

    const diff = Math.round((rawEnteredAmount - sumExactEntered) * 100) / 100;
    if (Math.abs(diff) > 0.01) {
      validationError = diff > 0 
        ? `${currConfig.symbol}${diff.toFixed(2)} remaining to assign` 
        : `Overallocated by ${currConfig.symbol}${Math.abs(diff).toFixed(2)}`;
    } else {
      let allocated = 0;
      computedSplits = group.members.map((m, index) => {
        const enteredVal = parseFloat(exactAmounts[m.id] || '0') || 0;
        const inrShare = currency === 'INR'
          ? enteredVal
          : (index === group.members.length - 1
              ? Math.round((convertedInrAmount - allocated) * 100) / 100
              : Math.round(enteredVal * activeRate * 100) / 100);
        allocated += inrShare;
        return {
          memberId: m.id,
          amount: inrShare,
        };
      });
    }
  } else if (splitType === 'PERCENTAGE') {
    let sumPct = 0;
    group.members.forEach((m) => {
      const p = parseFloat(percentages[m.id] || '0') || 0;
      sumPct += p;
    });

    const diffPct = Math.round((100 - sumPct) * 10) / 10;
    if (Math.abs(diffPct) > 0.05) {
      validationError = `Percentages must equal 100% (currently ${sumPct.toFixed(1)}%)`;
    } else {
      let allocated = 0;
      computedSplits = group.members.map((m, index) => {
        const p = parseFloat(percentages[m.id] || '0') || 0;
        const isLast = index === group.members.length - 1;
        const share = isLast
          ? Math.round((convertedInrAmount - allocated) * 100) / 100
          : Math.round((convertedInrAmount * (p / 100)) * 100) / 100;
        allocated += share;
        return {
          memberId: m.id,
          amount: share,
          percentage: p,
        };
      });
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a description for the expense');
      return;
    }
    if (convertedInrAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (validationError) {
      alert(validationError);
      return;
    }

    onAddExpense({
      groupId: group.id,
      title: title.trim(),
      amount: convertedInrAmount,
      currency: currency !== 'INR' ? currency : undefined,
      originalAmount: currency !== 'INR' ? rawEnteredAmount : undefined,
      exchangeRate: currency !== 'INR' ? activeRate : undefined,
      paidById,
      date: new Date().toISOString(),
      category,
      splitType,
      splits: computedSplits,
      requiresApproval,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add New Expense"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-all"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add New Expense</h2>
            <p className="text-xs text-slate-500 font-medium">{group.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close expense modal"
            className="min-w-[48px] min-h-[48px] rounded-full bg-slate-200/60 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Expense Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dinner, Cab to airport, Hotel room"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:font-normal"
            />
          </div>

          {/* Amount & Currency Selection Grid */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-7">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Amount ({currConfig.symbol})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-base">
                  {currConfig.symbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="col-span-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setCustomRateStr('');
                }}
                className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Currency Conversion Info Pill */}
          {currency !== 'INR' && rawEnteredAmount > 0 && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-950 flex items-center gap-1.5">
                  <Globe size={14} className="text-blue-600" />
                  Trip Conversion to INR:
                </span>
                <span className="font-extrabold text-blue-700 text-sm">
                  ≈ ₹{convertedInrAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-blue-800/80">
                <span>
                  Rate: 1 {currency} = ₹{activeRate} INR
                </span>
                <button
                  type="button"
                  onClick={() => setShowRateEdit(!showRateEdit)}
                  className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                >
                  <Edit3 size={11} /> {showRateEdit ? 'Hide' : 'Edit Rate'}
                </button>
              </div>

              {showRateEdit && (
                <div className="pt-2 border-t border-blue-200/80 flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-600">Custom Rate (₹):</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={String(currConfig.defaultRateToINR)}
                    value={customRateStr}
                    onChange={(e) => setCustomRateStr(e.target.value)}
                    className="w-24 px-2 py-1 text-xs font-bold rounded-lg border border-blue-300 bg-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setCustomRateStr('')}
                    className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Paid By Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Paid By
            </label>
            <select
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
            >
              {group.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.avatar} {m.name} {m.id === currentUser.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Amount Suggestion Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Quick:</span>
            {(currency === 'INR' ? [100, 200, 500, 1000, 2000] : [10, 20, 50, 100, 200]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetAmount(preset)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 shrink-0"
              >
                {currConfig.symbol}{preset}
              </button>
            ))}
            {(currency === 'INR' ? [50, 100, 500] : [5, 10, 50]).map((increment) => (
              <button
                key={'inc_' + increment}
                type="button"
                onClick={() => handleQuickAdd(increment)}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all active:scale-95 shrink-0"
              >
                +{increment}
              </button>
            ))}
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Category
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {Object.entries(CATEGORY_DETAILS).map(([key, cat]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    category === key
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Split Mode Selector Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Split Strategy
              </label>
              <span className="text-[11px] font-semibold text-emerald-600">
                {splitType === 'EQUAL' && 'Equally Divided'}
                {splitType === 'EXACT' && `Exact ${currConfig.symbol} Split`}
                {splitType === 'PERCENTAGE' && 'Percentage Share'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSplitType('EQUAL')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  splitType === 'EQUAL'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={14} />
                Equally
              </button>
              <button
                type="button"
                onClick={() => setSplitType('EXACT')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  splitType === 'EXACT'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator size={14} />
                Exact {currConfig.symbol}
              </button>
              <button
                type="button"
                onClick={() => setSplitType('PERCENTAGE')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  splitType === 'PERCENTAGE'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PieChart size={14} />
                Percent %
              </button>
            </div>
          </div>

          {/* Dynamic Split Details based on Split Strategy */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2.5">
            {splitType === 'EQUAL' && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Split with ({selectedMemberIds.length}/{group.members.length}):
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds(group.members.map((m) => m.id))}
                      className="text-[10px] font-bold text-emerald-700 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds([currentUser.id])}
                      className="text-[10px] font-bold text-slate-500 hover:underline"
                    >
                      Only Me
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.members.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    const perPersonRaw =
                      selectedMemberIds.length > 0
                        ? (rawEnteredAmount / selectedMemberIds.length).toFixed(1)
                        : '0';

                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.id));
                          } else {
                            setSelectedMemberIds([...selectedMemberIds, m.id]);
                          }
                        }}
                        className={`p-2 rounded-xl flex items-center justify-between text-left border transition-all ${
                          isSelected
                            ? 'bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-500/20'
                            : 'bg-slate-100/60 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span>{m.avatar}</span>
                          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                            {m.name.split(' ')[0]}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-[11px] font-bold text-emerald-600">
                            {currConfig.symbol}{perPersonRaw}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {splitType === 'EXACT' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] font-medium">
                  <span className="text-slate-500">Enter exact amount per person:</span>
                  {validationError && (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle size={12} />
                      {validationError}
                    </span>
                  )}
                </div>
                {group.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span>{m.avatar}</span>
                      <span className="text-xs font-semibold text-slate-800">{m.name}</span>
                    </div>
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">
                        {currConfig.symbol}
                      </span>
                      <input
                        type="number"
                        placeholder="0"
                        value={exactAmounts[m.id] || ''}
                        onChange={(e) =>
                          setExactAmounts({ ...exactAmounts, [m.id]: e.target.value })
                        }
                        className="w-full pl-6 pr-2 py-1 text-right text-xs font-bold rounded-lg border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {splitType === 'PERCENTAGE' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] font-medium">
                  <span className="text-slate-500">Set percentage per member:</span>
                  {validationError && (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle size={12} />
                      {validationError}
                    </span>
                  )}
                </div>
                {group.members.map((m) => {
                  const pct = parseFloat(percentages[m.id] || '0') || 0;
                  const calculatedAmt = ((rawEnteredAmount * pct) / 100).toFixed(1);

                  return (
                    <div key={m.id} className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{m.avatar}</span>
                        <span className="text-xs font-semibold text-slate-800">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {currConfig.symbol}{calculatedAmt}
                        </span>
                        <div className="relative w-20">
                          <input
                            type="number"
                            placeholder="0"
                            value={percentages[m.id] || ''}
                            onChange={(e) =>
                              setPercentages({ ...percentages, [m.id]: e.target.value })
                            }
                            className="w-full pr-5 pl-2 py-1 text-right text-xs font-bold rounded-lg border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                          />
                          <span className="absolute right-2 top-1 text-xs text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Approval System Toggle */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {requiresApproval ? (
                  <ShieldCheck size={20} className="text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert size={20} className="text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-amber-950">Require Member Approvals</h4>
                  <p className="text-[11px] text-amber-800/80 leading-relaxed mt-0.5">
                    When enabled, debtors get an instant approval prompt. The bill only updates final balances once accepted!
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={Boolean(validationError) || rawEnteredAmount <= 0}
            className="flex-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Check size={16} />
            Add Expense {rawEnteredAmount > 0 ? `(${currConfig.symbol}${rawEnteredAmount.toLocaleString('en-US')}${currency !== 'INR' ? ` ≈ ₹${convertedInrAmount.toLocaleString('en-IN')}` : ''})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
