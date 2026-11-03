import { describe, it, expect } from 'vitest';
import { calculateBalances } from './debtSimplifier';
import { Expense, Settlement } from '../types';

const makeExpense = (
  p: Partial<Expense> &
    Pick<Expense, 'id' | 'groupId' | 'title' | 'amount' | 'paidById' | 'category' | 'splitType' | 'splits'>
): Expense => ({
  date: new Date().toISOString(),
  status: 'CONFIRMED',
  requiresApproval: false,
  approvals: {},
  ...p,
});

describe('calculateBalances & Debt Simplifier', () => {
  it('calculates equal splits between two members correctly', () => {
    const members = ['user1', 'user2'];
    const expenses: Expense[] = [
      makeExpense({
        id: 'e1',
        groupId: 'g1',
        title: 'Dinner',
        amount: 500,
        paidById: 'user1',
        category: 'food',
        splitType: 'EQUAL',
        splits: [
          { memberId: 'user1', amount: 250 },
          { memberId: 'user2', amount: 250 },
        ],
      }),
    ];

    const { netBalances, simplifiedDebts } = calculateBalances(members, expenses, []);

    expect(netBalances['user1']).toBe(250);
    expect(netBalances['user2']).toBe(-250);
    expect(simplifiedDebts).toHaveLength(1);
    expect(simplifiedDebts[0]).toEqual({
      fromMemberId: 'user2',
      toMemberId: 'user1',
      amount: 250,
    });
  });

  it('simplifies 3-party triangular debts into a single direct transaction', () => {
    const members = ['Alice', 'Bob', 'Charlie'];
    const expenses: Expense[] = [
      makeExpense({
        id: 'e1',
        groupId: 'g1',
        title: 'Movie',
        amount: 300,
        paidById: 'Alice',
        category: 'entertainment',
        splitType: 'EXACT',
        splits: [{ memberId: 'Bob', amount: 300 }],
      }),
      makeExpense({
        id: 'e2',
        groupId: 'g1',
        title: 'Dinner',
        amount: 300,
        paidById: 'Charlie',
        category: 'food',
        splitType: 'EXACT',
        splits: [{ memberId: 'Alice', amount: 300 }],
      }),
    ];

    const { netBalances, simplifiedDebts } = calculateBalances(members, expenses, []);

    expect(netBalances['Alice']).toBe(0);
    expect(netBalances['Bob']).toBe(-300);
    expect(netBalances['Charlie']).toBe(300);

    expect(simplifiedDebts).toHaveLength(1);
    expect(simplifiedDebts[0]).toEqual({
      fromMemberId: 'Bob',
      toMemberId: 'Charlie',
      amount: 300,
    });
  });

  it('ignores PENDING_APPROVAL and DISPUTED expenses', () => {
    const members = ['user1', 'user2'];
    const expenses: Expense[] = [
      makeExpense({
        id: 'e1',
        groupId: 'g1',
        title: 'Pending Lunch',
        amount: 600,
        paidById: 'user1',
        category: 'food',
        splitType: 'EQUAL',
        status: 'PENDING_APPROVAL',
        splits: [
          { memberId: 'user1', amount: 300 },
          { memberId: 'user2', amount: 300 },
        ],
      }),
    ];

    const { netBalances, simplifiedDebts } = calculateBalances(members, expenses, []);

    expect(netBalances['user1']).toBe(0);
    expect(netBalances['user2']).toBe(0);
    expect(simplifiedDebts).toHaveLength(0);
  });

  it('correctly settles debts with confirmed settlements', () => {
    const members = ['user1', 'user2'];
    const expenses: Expense[] = [
      makeExpense({
        id: 'e1',
        groupId: 'g1',
        title: 'Cab ride',
        amount: 400,
        paidById: 'user1',
        category: 'travel',
        splitType: 'EQUAL',
        splits: [
          { memberId: 'user1', amount: 200 },
          { memberId: 'user2', amount: 200 },
        ],
      }),
    ];

    const settlements: Settlement[] = [
      {
        id: 's1',
        groupId: 'g1',
        fromMemberId: 'user2',
        toMemberId: 'user1',
        amount: 200,
        confirmed: true,
        date: new Date().toISOString(),
      },
    ];

    const { netBalances, simplifiedDebts } = calculateBalances(members, expenses, settlements);

    expect(netBalances['user1']).toBe(0);
    expect(netBalances['user2']).toBe(0);
    expect(simplifiedDebts).toHaveLength(0);
  });

  it('handles 3-way odd splits with floating point rounding accuracy', () => {
    const members = ['m1', 'm2', 'm3'];
    const expenses: Expense[] = [
      makeExpense({
        id: 'e1',
        groupId: 'g1',
        title: 'Odd split bill',
        amount: 100,
        paidById: 'm1',
        category: 'other',
        splitType: 'EQUAL',
        splits: [
          { memberId: 'm1', amount: 33.34 },
          { memberId: 'm2', amount: 33.33 },
          { memberId: 'm3', amount: 33.33 },
        ],
      }),
    ];

    const { netBalances } = calculateBalances(members, expenses, []);

    expect(netBalances['m1']).toBeCloseTo(66.66, 2);
    expect(netBalances['m2']).toBeCloseTo(-33.33, 2);
    expect(netBalances['m3']).toBeCloseTo(-33.33, 2);
  });
});
