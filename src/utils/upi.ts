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
  const cleanUPI = upiId.trim();
  const cleanName = encodeURIComponent(payeeName.trim());
  const cleanNote = encodeURIComponent(note || 'SplitShare Bill Settlement');
  const formattedAmount = amount.toFixed(2);

  // Standard NPCI UPI URI Specification
  return `upi://pay?pa=${cleanUPI}&pn=${cleanName}&am=${formattedAmount}&cu=INR&tn=${cleanNote}`;
}

export function generateUPIQRCodeUrl(params: UPIParams): string {
  const upiUri = generateUPILink(params);
  // High-reliability QR Server API for fast instant rendering on mobile
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
}
