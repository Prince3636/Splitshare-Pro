/**
 * Multi-Currency Support & Exchange Rate Utilities
 * Base currency is INR (₹).
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  defaultRateToINR: number; // How many INR is 1 unit of this currency
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', defaultRateToINR: 1.0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', defaultRateToINR: 86.5 },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', defaultRateToINR: 92.0 },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', defaultRateToINR: 109.5 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: '🇦🇪', defaultRateToINR: 23.5 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭', defaultRateToINR: 2.5 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', defaultRateToINR: 64.5 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', defaultRateToINR: 0.57 },
];

export const CURRENCY_MAP: Record<string, CurrencyConfig> = SUPPORTED_CURRENCIES.reduce(
  (acc, c) => {
    acc[c.code] = c;
    return acc;
  },
  {} as Record<string, CurrencyConfig>
);

export function getCurrencyConfig(code: string = 'INR'): CurrencyConfig {
  return CURRENCY_MAP[code.toUpperCase()] || CURRENCY_MAP['INR'];
}

export function convertToINR(amount: number, currencyCode: string = 'INR', customRate?: number): number {
  if (currencyCode === 'INR') return amount;
  const rate = customRate && customRate > 0 ? customRate : getCurrencyConfig(currencyCode).defaultRateToINR;
  return Math.round(amount * rate * 100) / 100;
}

export function formatForeignExpense(amountINR: number, currency?: string, originalAmount?: number): string {
  if (!currency || currency === 'INR' || !originalAmount) {
    return `₹${amountINR.toLocaleString('en-IN')}`;
  }
  const cfg = getCurrencyConfig(currency);
  return `₹${amountINR.toLocaleString('en-IN')} (${cfg.symbol}${originalAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})`;
}
