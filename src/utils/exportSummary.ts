import { Group, Expense, Settlement, SimplifiedDebt, Member } from '../types';

export function generateGroupWhatsAppSummary({
  group,
  expenses,
  simplifiedDebts,
  allMembers,
  totalSpent,
}: {
  group: Group;
  expenses: Expense[];
  simplifiedDebts: SimplifiedDebt[];
  allMembers: Member[];
  totalSpent: number;
}): string {
  let text = `📊 *${group.emoji} ${group.name} - Expense Summary*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 *Total Spent:* ₹${totalSpent.toLocaleString('en-IN')}\n`;
  text += `👥 *Members:* ${group.members.map((m) => m.name.split(' ')[0]).join(', ')}\n\n`;

  text += `🧾 *Recent Bills (${expenses.length}):*\n`;
  expenses.slice(0, 8).forEach((e) => {
    const payer = allMembers.find((m) => m.id === e.paidById) || group.members.find((m) => m.id === e.paidById);
    text += `• ${e.title}: ₹${e.amount.toLocaleString('en-IN')} (Paid by ${payer?.name.split(' ')[0] || 'Member'})\n`;
  });

  text += `\n🤝 *Final Settlements (Who pays whom):*\n`;
  if (simplifiedDebts.length === 0) {
    text += `🎉 All balances are settled up!\n`;
  } else {
    simplifiedDebts.forEach((d) => {
      const from = allMembers.find((m) => m.id === d.fromMemberId) || group.members.find((m) => m.id === d.fromMemberId);
      const to = allMembers.find((m) => m.id === d.toMemberId) || group.members.find((m) => m.id === d.toMemberId);
      text += `👉 *${from?.name.split(' ')[0]}* pays *${to?.name.split(' ')[0]}*: ₹${d.amount.toLocaleString('en-IN')}\n`;
    });
  }

  text += `\nShared via SplitShare 💸`;
  return text;
}

export function downloadGroupCSV(group: Group, expenses: Expense[], allMembers: Member[]) {
  let csv = 'Date,Description,Category,Amount,Paid By,Split Mode,Status\n';

  expenses.forEach((e) => {
    const payer = allMembers.find((m) => m.id === e.paidById)?.name || 'Member';
    const row = [
      `"${new Date(e.date).toLocaleDateString()}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      e.amount,
      `"${payer}"`,
      `"${e.splitType}"`,
      `"${e.status}"`,
    ];
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${group.name.replace(/\s+/g, '_')}_expenses.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
