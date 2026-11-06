/**
 * Generates ready-to-send WhatsApp reminder messages with direct payment links
 */

export interface NudgeParams {
  borrowerName: string;
  lenderName: string;
  amount: number;
  groupName: string;
  lenderUpi?: string;
  tone?: 'friendly' | 'funny' | 'formal';
}

export function generateWhatsAppNudge({
  borrowerName,
  lenderName,
  amount,
  groupName,
  lenderUpi,
  tone = 'friendly',
}: NudgeParams): string {
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
  let message = '';

  if (tone === 'funny') {
    message = `Oye ${borrowerName}! 🍕 Kal ka ${groupName} ka hisab ${formattedAmount} baaki hai. Chai thandi hone se pehle pay karde bhai, warna agle trip pe tu hi bill bharega! 😂`;
  } else if (tone === 'formal') {
    message = `Hi ${borrowerName}, please find the pending balance of ${formattedAmount} for "${groupName}". Kindly clear it when convenient.`;
  } else {
    message = `Hey ${borrowerName}! Just sharing the pending bill for "${groupName}". Your share is ${formattedAmount}.`;
  }

  if (lenderUpi) {
    message += `\n\nPay via UPI: ${lenderUpi}\nOr settle directly on SplitShare: https://split-share-puce.vercel.app`;
  } else {
    message += `\n\nView details & settle on SplitShare: https://split-share-puce.vercel.app`;
  }

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
