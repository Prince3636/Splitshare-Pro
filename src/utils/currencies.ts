/**
 * Multi-Currency Support, Exchange Rate & Location Auto-Detection Utilities
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

export interface DetectedLocationInfo {
  currencyCode: string;
  countryName: string;
  source: 'timezone' | 'locale' | 'gps' | 'default';
  locationDetail: string;
}

/**
 * Fast, privacy-safe, offline-capable location & currency detection
 * Uses browser timezone and language locale without intrusive permission popups.
 */
export function detectLocationCurrency(): DetectedLocationInfo {
  if (typeof window === 'undefined') {
    return {
      currencyCode: 'INR',
      countryName: 'India',
      source: 'default',
      locationDetail: 'Server Default',
    };
  }

  // 1. Timezone-based detection
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lowerTz = tz.toLowerCase();

    if (lowerTz.includes('kolkata') || lowerTz.includes('calcutta') || lowerTz.includes('india')) {
      return { currencyCode: 'INR', countryName: 'India', source: 'timezone', locationDetail: tz };
    }
    if (lowerTz.includes('dubai') || lowerTz.includes('abu_dhabi') || lowerTz.includes('uae')) {
      return { currencyCode: 'AED', countryName: 'United Arab Emirates', source: 'timezone', locationDetail: tz };
    }
    if (lowerTz.includes('bangkok') || lowerTz.includes('thailand')) {
      return { currencyCode: 'THB', countryName: 'Thailand', source: 'timezone', locationDetail: tz };
    }
    if (lowerTz.includes('singapore')) {
      return { currencyCode: 'SGD', countryName: 'Singapore', source: 'timezone', locationDetail: tz };
    }
    if (lowerTz.includes('tokyo') || lowerTz.includes('japan')) {
      return { currencyCode: 'JPY', countryName: 'Japan', source: 'timezone', locationDetail: tz };
    }
    if (lowerTz.includes('london') || lowerTz.includes('belfast') || lowerTz.includes('britain')) {
      return { currencyCode: 'GBP', countryName: 'United Kingdom', source: 'timezone', locationDetail: tz };
    }
    if (lowerTz.startsWith('america/') || lowerTz.includes('new_york') || lowerTz.includes('los_angeles') || lowerTz.includes('chicago')) {
      return { currencyCode: 'USD', countryName: 'United States', source: 'timezone', locationDetail: tz };
    }
    if (lowerTz.startsWith('europe/')) {
      return { currencyCode: 'EUR', countryName: 'Europe', source: 'timezone', locationDetail: tz };
    }
  } catch {}

  // 2. Locale-based fallback
  try {
    const lang = (navigator.language || '').toLowerCase();
    if (lang.endsWith('-in') || lang.startsWith('hi') || lang.startsWith('ta') || lang.startsWith('te') || lang.startsWith('mr') || lang.startsWith('bn')) {
      return { currencyCode: 'INR', countryName: 'India', source: 'locale', locationDetail: lang };
    }
    if (lang.endsWith('-ae')) {
      return { currencyCode: 'AED', countryName: 'UAE', source: 'locale', locationDetail: lang };
    }
    if (lang.endsWith('-th')) {
      return { currencyCode: 'THB', countryName: 'Thailand', source: 'locale', locationDetail: lang };
    }
    if (lang.endsWith('-sg')) {
      return { currencyCode: 'SGD', countryName: 'Singapore', source: 'locale', locationDetail: lang };
    }
    if (lang.endsWith('-jp')) {
      return { currencyCode: 'JPY', countryName: 'Japan', source: 'locale', locationDetail: lang };
    }
    if (lang.endsWith('-gb')) {
      return { currencyCode: 'GBP', countryName: 'United Kingdom', source: 'locale', locationDetail: lang };
    }
    if (lang.endsWith('-us')) {
      return { currencyCode: 'USD', countryName: 'United States', source: 'locale', locationDetail: lang };
    }
  } catch {}

  return { currencyCode: 'INR', countryName: 'India', source: 'default', locationDetail: 'Standard' };
}

/**
 * Optional GPS-based high-accuracy location currency detection
 */
export async function detectGPSLocationCurrency(): Promise<DetectedLocationInfo | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // India bounding box (approx lat 6-37, lon 68-98)
        if (latitude >= 6 && latitude <= 37 && longitude >= 68 && longitude <= 98) {
          resolve({ currencyCode: 'INR', countryName: 'India', source: 'gps', locationDetail: `GPS: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          return;
        }
        // UAE (lat 22-26.5, lon 51-56.5)
        if (latitude >= 22 && latitude <= 26.5 && longitude >= 51 && longitude <= 56.5) {
          resolve({ currencyCode: 'AED', countryName: 'UAE', source: 'gps', locationDetail: `GPS: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          return;
        }
        // Thailand (lat 5.5-20.5, lon 97-106)
        if (latitude >= 5.5 && latitude <= 20.5 && longitude >= 97 && longitude <= 106) {
          resolve({ currencyCode: 'THB', countryName: 'Thailand', source: 'gps', locationDetail: `GPS: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          return;
        }
        // Singapore (lat 1.15-1.48, lon 103.6-104.1)
        if (latitude >= 1.15 && latitude <= 1.48 && longitude >= 103.6 && longitude <= 104.1) {
          resolve({ currencyCode: 'SGD', countryName: 'Singapore', source: 'gps', locationDetail: `GPS: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          return;
        }
        // Japan (lat 24-46, lon 122-154)
        if (latitude >= 24 && latitude <= 46 && longitude >= 122 && longitude <= 154) {
          resolve({ currencyCode: 'JPY', countryName: 'Japan', source: 'gps', locationDetail: `GPS: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          return;
        }
        // UK (lat 49-61, lon -8-2)
        if (latitude >= 49 && latitude <= 61 && longitude >= -8 && longitude <= 2) {
          resolve({ currencyCode: 'GBP', countryName: 'United Kingdom', source: 'gps', locationDetail: `GPS: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          return;
        }
        // USA (lat 24-50, lon -125 to -66)
        if (latitude >= 24 && latitude <= 50 && longitude >= -125 && longitude <= -66) {
          resolve({ currencyCode: 'USD', countryName: 'United States', source: 'gps', locationDetail: `GPS: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          return;
        }
        // Europe (lat 35-71, lon -10 to 40)
        if (latitude >= 35 && latitude <= 71 && longitude >= -10 && longitude <= 40) {
          resolve({ currencyCode: 'EUR', countryName: 'Europe', source: 'gps', locationDetail: `GPS: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          return;
        }
        resolve(null);
      },
      () => resolve(null),
      { timeout: 6000, maximumAge: 300000 }
    );
  });
}
