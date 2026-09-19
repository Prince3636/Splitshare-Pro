import { Expense, Settlement, SimplifiedDebt } from '../types';

/**
 * Calculates net balances for all members and simplifies them
 * using the Minimum Cash Flow (greedy) algorithm.
 */
export function calculateBalances(
  memberIds: string[],
  expenses: Expense[],
  settlements: Settlement[]
): {
  netBalances: Record<string, number>;
  simplifiedDebts: SimplifiedDebt[];
} {
  const netBalances: Record<string, number> = {};
  memberIds.forEach((id) => {
    netBalances[id] = 0;
  });

  // Process confirmed expenses only
  // (Expenses pending approval or disputed do not yet alter final balances!)
  expenses
    .filter((e) => e.status === 'CONFIRMED')
    .forEach((expense) => {
      const payerId = expense.paidById;
      
      // Add total to payer
      if (netBalances[payerId] !== undefined) {
        netBalances[payerId] += expense.amount;
      }

      // Subtract share from each split participant
      expense.splits.forEach((split) => {
        if (netBalances[split.memberId] !== undefined) {
          netBalances[split.memberId] -= split.amount;
        }
      });
    });

  // Process settlements (A paid B directly)
  settlements
    .filter((s) => s.confirmed)
    .forEach((settlement) => {
      if (netBalances[settlement.fromMemberId] !== undefined) {
        netBalances[settlement.fromMemberId] += settlement.amount;
      }
      if (netBalances[settlement.toMemberId] !== undefined) {
        netBalances[settlement.toMemberId] -= settlement.amount;
      }
    });

  // Round values to 2 decimal places to avoid IEEE float errors
  Object.keys(netBalances).forEach((id) => {
    netBalances[id] = Math.round(netBalances[id] * 100) / 100;
  });

  // Greedy Minimum Cash Flow to simplify debts
  const simplifiedDebts: SimplifiedDebt[] = [];
  
  // Separate into debtors (negative balance) and creditors (positive balance)
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.entries(netBalances).forEach(([id, balance]) => {
    if (balance < -0.01) {
      debtors.push({ id, amount: -balance });
    } else if (balance > 0.01) {
      creditors.push({ id, amount: balance });
    }
  });

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settledAmount = Math.min(debtor.amount, creditor.amount);

    if (settledAmount > 0.01) {
      simplifiedDebts.push({
        fromMemberId: debtor.id,
        toMemberId: creditor.id,
        amount: Math.round(settledAmount * 100) / 100,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount <= 0.01) i++;
    if (creditor.amount <= 0.01) j++;
  }

  return { netBalances, simplifiedDebts };
}
