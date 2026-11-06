import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
  flushOfflineQueue,
} from './offlineQueue';
import * as apiModule from './api';

// In-memory mock for localStorage in Node/Vitest environment
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => {
    store[key] = value.toString();
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key in store) delete store[key];
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('offlineQueue Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('correctly queues and retrieves offline actions', () => {
    expect(getOfflineQueue()).toEqual([]);

    addToOfflineQueue('ADD_EXPENSE', { title: 'Dinner', amount: 500 });
    const queue = getOfflineQueue();

    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe('ADD_EXPENSE');
    expect(queue[0].payload.title).toBe('Dinner');
    expect(queue[0].payload.amount).toBe(500);
  });

  it('removes specific actions from the queue by ID', () => {
    addToOfflineQueue('ADD_EXPENSE', { title: 'Coffee', amount: 80 });
    addToOfflineQueue('RECORD_SETTLEMENT', { amount: 200 });

    let queue = getOfflineQueue();
    expect(queue.length).toBe(2);

    const firstId = queue[0].id;
    removeFromOfflineQueue(firstId);

    queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe('RECORD_SETTLEMENT');
  });

  it('clears all items in the queue', () => {
    addToOfflineQueue('ADD_EXPENSE', { title: 'Lunch', amount: 250 });
    clearOfflineQueue();
    expect(getOfflineQueue()).toEqual([]);
  });

  it('flushes pending queue items when online API succeeds', async () => {
    vi.spyOn(apiModule, 'apiAddExpense').mockResolvedValue({ success: true } as any);
    vi.spyOn(apiModule, 'apiRecordSettlement').mockResolvedValue({ success: true } as any);

    addToOfflineQueue('ADD_EXPENSE', { title: 'Cab', amount: 300 });
    addToOfflineQueue('RECORD_SETTLEMENT', { amount: 150 });

    expect(getOfflineQueue().length).toBe(2);

    const result = await flushOfflineQueue();
    expect(result.syncedCount).toBe(2);
    expect(result.remainingCount).toBe(0);
    expect(getOfflineQueue().length).toBe(0);
  });

  it('preserves items in queue if API reports offline status', async () => {
    vi.spyOn(apiModule, 'apiAddExpense').mockResolvedValue({ success: false, offline: true } as any);

    addToOfflineQueue('ADD_EXPENSE', { title: 'Metro', amount: 40 });

    const result = await flushOfflineQueue();
    expect(result.syncedCount).toBe(0);
    expect(result.remainingCount).toBe(1);
    expect(getOfflineQueue().length).toBe(1);
  });
});
