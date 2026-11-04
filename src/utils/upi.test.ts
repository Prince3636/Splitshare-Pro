import { describe, it, expect } from 'vitest';
import { generateUPILink, generateAppSpecificUPILink } from './upi';

describe('UPI Intent and Scheme Generator', () => {
  const sampleParams = {
    upiId: 'rahul@upi',
    payeeName: 'Rahul Sharma',
    amount: 1250,
    note: 'Goa dinner split',
  };

  it('generates standard NPCI compliant upi:// URI', () => {
    const uri = generateUPILink(sampleParams);
    expect(uri).toContain('upi://pay?');
    expect(uri).toContain('pa=rahul@upi');
    expect(uri).toContain('am=1250.00');
    expect(uri).toContain('cu=INR');
  });

  it('generates app-specific intent URIs for GPay, PhonePe, and Paytm', () => {
    const gpayUri = generateAppSpecificUPILink('gpay', sampleParams);
    expect(gpayUri.startsWith('gpay://upi/pay?')).toBe(true);

    const phonepeUri = generateAppSpecificUPILink('phonepe', sampleParams);
    expect(phonepeUri.startsWith('phonepe://pay?')).toBe(true);

    const paytmUri = generateAppSpecificUPILink('paytm', sampleParams);
    expect(paytmUri.startsWith('paytmmp://pay?')).toBe(true);
  });
});

