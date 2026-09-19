export function formatCurrency(amount: number, currency: string = '₹'): string {
  const formatted = Math.abs(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
  return `${currency}${formatted}`;
}

export function formatRelativeDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const CATEGORY_DETAILS: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  food: { label: 'Food & Dining', icon: '🍕', bg: 'bg-orange-50', text: 'text-orange-600' },
  travel: { label: 'Travel & Cabs', icon: '🚕', bg: 'bg-blue-50', text: 'text-blue-600' },
  stay: { label: 'Hotel & Stay', icon: '🏨', bg: 'bg-purple-50', text: 'text-purple-600' },
  groceries: { label: 'Groceries', icon: '🛒', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  entertainment: { label: 'Entertainment', icon: '🍿', bg: 'bg-pink-50', text: 'text-pink-600' },
  utilities: { label: 'Bills & Rent', icon: '⚡', bg: 'bg-amber-50', text: 'text-amber-600' },
  other: { label: 'General', icon: '📦', bg: 'bg-slate-50', text: 'text-slate-600' },
};
