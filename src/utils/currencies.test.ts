import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyConfig,
  convertToINR,
  formatForeignExpense,
  detectLocationCurrency,
} from './currencies';

describe('Multi-Currency System', () => {
  it('has valid supported currencies', () => {
    expect(SUPPORTED_CURRENCIES.length).toBeGreaterThanOrEqual(5);
    const inr = getCurrencyConfig('INR');
    expect(inr.symbol).toBe('₹');
    expect(inr.defaultRateToINR).toBe(1.0);
  });

  it('accurately converts USD and EUR to INR', () => {
    const inrFromUSD = convertToINR(100, 'USD', 86.5);
    expect(inrFromUSD).toBe(8650);

    const inrFromEUR = convertToINR(50, 'EUR', 92.0);
    expect(inrFromEUR).toBe(4600);

    // Default rate conversion
    const inrFromAED = convertToINR(100, 'AED');
    expect(inrFromAED).toBe(2350);
  });

  it('formats foreign expense strings cleanly', () => {
    const formatted = formatForeignExpense(8650, 'USD', 100);
    expect(formatted).toBe('₹8,650 ($100)');

    const inrOnly = formatForeignExpense(1500, 'INR', 1500);
    expect(inrOnly).toBe('₹1,500');
  });

  it('auto-detects location currency smoothly without errors', () => {
    const detected = detectLocationCurrency();
    expect(detected).toBeDefined();
    expect(detected.currencyCode).toBeDefined();
    expect(typeof detected.currencyCode).toBe('string');
    expect(detected.currencyCode.length).toBe(3);
  });
});
