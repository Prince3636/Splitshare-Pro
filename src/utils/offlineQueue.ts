/**
 * SplitShare Enterprise Offline Synchronization Engine
 * Queues mutations executed during low signal or offline states,
 * and seamlessly syncs them to MongoDB once connection recovers.
 */

import {
  apiAddExpense,
  apiRecordSettlement,
  apiAddKittyContribution,
  apiAddKittyExpense,
  apiCreateGroup,
} from './api';

export interface QueuedAction {
  id: string;
  type: 'ADD_EXPENSE' | 'RECORD_SETTLEMENT' | 'ADD_KITTY_CONTRIBUTION' | 'ADD_KITTY_EXPENSE' | 'CREATE_GROUP';
  payload: any;
  timestamp: number;
}

const QUEUE_STORAGE_KEY = 'splitshare_offline_sync_queue_v1';

export function getOfflineQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToOfflineQueue(type: QueuedAction['type'], payload: any): void {
  try {
    const queue = getOfflineQueue();
    queue.push({
      id: 'queue_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      type,
      payload,
      timestamp: Date.now(),
    });
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Could not persist offline queued action:', e);
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {}
}

export function removeFromOfflineQueue(actionId: string): void {
  try {
    const queue = getOfflineQueue().filter((item) => item.id !== actionId);
    if (queue.length === 0) {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } else {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    }
  } catch {}
}

/**
 * Flushes all pending offline actions sequentially
 */
export async function flushOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, remainingCount: 0 };
  }

  let syncedCount = 0;

  for (const action of queue) {
    try {
      let res: any = { success: false };

      switch (action.type) {
        case 'ADD_EXPENSE':
          res = await apiAddExpense(action.payload);
          break;
        case 'RECORD_SETTLEMENT':
          res = await apiRecordSettlement(action.payload);
          break;
        case 'ADD_KITTY_CONTRIBUTION':
          res = await apiAddKittyContribution(action.payload);
          break;
        case 'ADD_KITTY_EXPENSE':
          res = await apiAddKittyExpense(action.payload);
          break;
        case 'CREATE_GROUP':
          res = await apiCreateGroup(action.payload);
          break;
      }

      // If successful or non-retriable, remove from queue
      if (res?.success || (!res?.offline && res?.status !== 502 && res?.status !== 503)) {
        removeFromOfflineQueue(action.id);
        syncedCount++;
      } else {
        // Still offline or temporary network barrier, halt queue execution
        break;
      }
    } catch (e) {
      // Network interrupted during flush
      break;
    }
  }

  if (syncedCount > 0) {
    try {
      window.dispatchEvent(
        new CustomEvent('splitshare:offline-synced', {
          detail: { count: syncedCount },
        })
      );
    } catch {}
  }

  return {
    syncedCount,
    remainingCount: getOfflineQueue().length,
  };
}

