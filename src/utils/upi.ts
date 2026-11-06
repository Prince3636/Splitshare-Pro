import QRCode from 'qrcode';

/**
 * UPI deep link and QR code utilities for direct mobile payment
 */

export interface UPIParams {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}

export function generateUPILink({ upiId, payeeName, amount, note }: UPIParams): string {
  // Strict sanitization: strip invalid URI injection characters, keep only valid VPA characters
  const cleanUPI = (upiId || '').trim().replace(/[^a-zA-Z0-9.\-_@]/g, '');
  const cleanName = encodeURIComponent((payeeName || 'Member').trim());
  const cleanNote = encodeURIComponent(note || 'SplitShare Bill Settlement');
  const formattedAmount = Number(amount || 0).toFixed(2);

  // Standard NPCI UPI URI Specification (literal @ is expected by banking apps)
  return `upi://pay?pa=${cleanUPI}&pn=${cleanName}&am=${formattedAmount}&cu=INR&tn=${cleanNote}`;
}

export function generateAppSpecificUPILink(app: 'gpay' | 'phonepe' | 'paytm' | 'generic', params: UPIParams): string {
  const baseUpi = generateUPILink(params);
  const query = baseUpi.replace('upi://pay?', '');

  switch (app) {
    case 'gpay':
      // Google Pay intent / custom URI
      return `gpay://upi/pay?${query}`;
    case 'phonepe':
      // PhonePe custom URI
      return `phonepe://pay?${query}`;
    case 'paytm':
      // Paytm custom URI
      return `paytmmp://pay?${query}`;
    case 'generic':
    default:
      return baseUpi;
  }
}

/**
 * Generate client-side offline QR code data URL (PNG/Base64)
 * 100% private, zero network roundtrip, works offline and in airplane mode.
 */
export async function generateUPIQRCodeUrl(params: UPIParams): Promise<string> {
  const upiUri = generateUPILink(params);
  try {
    return await QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Error generating offline QR code:', err);
    return '';
  }
}
