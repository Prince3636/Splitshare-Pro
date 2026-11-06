import { useState, useEffect, useRef } from 'react';
import {
  Group,
  Member,
  Expense,
  Settlement,
  KittyContribution,
  KittyExpense,
  ApprovalStatus,
  GroupInvite,
  AppNotification,
  UserAccount,
  ChatMessage,
} from '../types';
import {
  fetchState,
  connectWebSocket,
  getStoredToken,
  apiCreateGroup,
  apiDeleteGroup,
  apiLeaveGroup,
  apiInviteEmail,
  apiAcceptInvite,
  apiDeclineInvite,
  apiAddExpense,
  apiRespondApproval,
  apiSendReminder,
  apiRecordSettlement,
  apiAddKittyContribution,
  apiAddKittyExpense,
  apiSendGroupMessage,
} from '../utils/api';
import { sendLocalPushNotification } from '../utils/notifications';
import { addToOfflineQueue, flushOfflineQueue } from '../utils/offlineQueue';

const getStorageKey = (accountId?: string) =>
  accountId ? `splitshare_state_${accountId}` : 'splitshare_state_anon';

export function useAppStore(currentAccount: UserAccount | null) {
  const loadState = (accId?: string) => {
    try {
      const saved = localStorage.getItem(getStorageKey(accId));
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved state', e);
    }

    return {
      groups: [],
      expenses: [],
      settlements: [],
      kittyContributions: [],
      kittyExpenses: [],
      invites: [],
      notifications: [],
      messages: [],
    };
  };

  const [state, setState] = useState(() => loadState(currentAccount?.id));
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Connect to server and real-time WebSocket when account changes
  useEffect(() => {
    const currentStorageKey = getStorageKey(currentAccount?.id);
    const initialSaved = localStorage.getItem(currentStorageKey);
    if (initialSaved) {
      try {
        const parsed = JSON.parse(initialSaved);
        setState(parsed);
        (parsed.notifications || []).forEach((n: AppNotification) => {
          notifiedIdsRef.current.add(n.id);
        });
      } catch {
        // ignore
      }
    }

    const token = getStoredToken();
    if (!currentAccount || !token) {
      return;
    }

    const syncAndRefresh = () => {
      flushOfflineQueue()
        .then(() => fetchState())
        .then((res) => {
          if (res?.data) {
            (res.data.notifications || []).forEach((n: AppNotification) => {
              notifiedIdsRef.current.add(n.id);
            });
            setState({
              groups: res.data.groups || [],
              expenses: res.data.expenses || [],
              settlements: res.data.settlements || [],
              kittyContributions: res.data.kittyContributions || [],
              kittyExpenses: res.data.kittyExpenses || [],
              invites: res.data.invites || [],
              notifications: res.data.notifications || [],
              messages: res.data.messages || [],
            });
          }
        })
        .catch(() => {
          // Fallback to local state if server isn't reached immediately
        });
    };

    syncAndRefresh();
    window.addEventListener('online', syncAndRefresh);

    // Real-time live multi-phone synchronization
    const cleanup = connectWebSocket((serverData) => {
      if (serverData) {
        // Trigger push notifications for brand new unread alerts for this user
        const incomingNotifs = (serverData.notifications || []).filter(
          (n: AppNotification) =>
            n.recipientUserId === currentAccount?.id ||
            (currentAccount?.email &&
              n.recipientEmail &&
              n.recipientEmail.toLowerCase() === currentAccount.email.toLowerCase())
        );

        incomingNotifs.forEach((n: AppNotification) => {
          if (!n.read && !notifiedIdsRef.current.has(n.id)) {
            notifiedIdsRef.current.add(n.id);
            sendLocalPushNotification({
              title: n.title,
              body: n.message,
              tag: n.id,
            });
          }
        });

        setState({
          groups: serverData.groups || [],
          expenses: serverData.expenses || [],
          settlements: serverData.settlements || [],
          kittyContributions: serverData.kittyContributions || [],
          kittyExpenses: serverData.kittyExpenses || [],
          invites: serverData.invites || [],
          notifications: serverData.notifications || [],
          messages: serverData.messages || [],
        });
      }
    });

    return () => {
      cleanup();
      window.removeEventListener('online', syncAndRefresh);
    };
  }, [currentAccount?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(currentAccount?.id), JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }, [state, currentAccount?.id]);

  const currentUser: Member = currentAccount
    ? {
        id: currentAccount.id,
        name: currentAccount.name,
        avatar: currentAccount.avatar,
        color: '#10b981',
        email: currentAccount.email,
        upiId: currentAccount.upiId,
        upiAccounts: currentAccount.upiAccounts || [],
        phone: currentAccount.phone,
        preferredCurrency: currentAccount.preferredCurrency,
      }
    : {
        id: 'guest',
        name: 'Guest User',
        avatar: '👤',
        color: '#10b981',
      };

  // Filter groups that the current user belongs to (or invited to)
  const myGroups: Group[] = (state.groups || []).filter((g: Group) =>
    g.members.some(
      (m) =>
        m.id === currentUser.id ||
        (currentUser.email && m.email && m.email.toLowerCase() === currentUser.email.toLowerCase())
    )
  );

  // Filter notifications for the current user
  const myNotifications: AppNotification[] = (state.notifications || []).filter(
    (n: AppNotification) =>
      n.recipientUserId === currentUser.id ||
      (currentUser.email && n.recipientEmail && n.recipientEmail.toLowerCase() === currentUser.email.toLowerCase())
  );

  // Filter pending invites for the current user
  const myPendingInvites: GroupInvite[] = (state.invites || []).filter(
    (inv: GroupInvite) =>
      inv.status === 'PENDING' &&
      currentUser.email &&
      inv.invitedEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  const myGroupIds = new Set(myGroups.map((g) => g.id));

  // Strictly filter expenses for groups current user is a member of
  const myExpenses: Expense[] = (state.expenses || []).filter((e: Expense) =>
    myGroupIds.has(e.groupId)
  );

  // Strictly filter settlements for groups current user is a member of or where user is debtor/creditor
  const mySettlements: Settlement[] = (state.settlements || []).filter(
    (s: Settlement) =>
      myGroupIds.has(s.groupId) || s.fromMemberId === currentUser.id || s.toMemberId === currentUser.id
  );

  // Strictly filter kitty contributions & expenses
  const myKittyContributions: KittyContribution[] = (state.kittyContributions || []).filter(
    (k: KittyContribution) => myGroupIds.has(k.groupId)
  );

  const myKittyExpenses: KittyExpense[] = (state.kittyExpenses || []).filter(
    (ke: KittyExpense) => myGroupIds.has(ke.groupId)
  );

  const createGroup = (groupData: Omit<Group, 'id' | 'createdAt' | 'createdBy'>) => {
    let members = [...groupData.members];
    if (!members.some((m) => m.id === currentUser.id)) {
      members.unshift(currentUser);
    }

    const payload = {
      ...groupData,
      members,
      createdBy: currentUser.id,
    };

    // Call real-time API with offline resilience
    apiCreateGroup(payload)
      .then((res) => {
        if (res?.offline) addToOfflineQueue('CREATE_GROUP', payload);
      })
      .catch(() => {
        addToOfflineQueue('CREATE_GROUP', payload);
      });

    const localGroup: Group = {
      ...payload,
      id: 'g_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now()),
      createdAt: new Date().toISOString(),
    };

    setState((prev: any) => ({
      ...prev,
      groups: [localGroup, ...prev.groups],
    }));

    return localGroup;
  };

  const inviteMemberByEmail = (groupId: string, email: string) => {
    const group = (state.groups || []).find((g: Group) => g.id === groupId);
    if (!group) return null;

    const cleanEmail = email.trim().toLowerCase();

    if (group.members.some((m: Member) => m.email?.toLowerCase() === cleanEmail)) {
      alert('This user is already a member of this group!');
      return null;
    }

    apiInviteEmail(groupId, cleanEmail).catch(console.error);

    const invite: GroupInvite = {
      id: 'inv_' + Date.now(),
      groupId: group.id,
      groupName: group.name,
      groupEmoji: group.emoji,
      invitedEmail: cleanEmail,
      inviterName: currentUser.name,
      inviterId: currentUser.id,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    setState((prev: any) => ({
      ...prev,
      invites: [invite, ...prev.invites],
    }));

    return invite;
  };

  const acceptGroupInvite = (inviteId: string) => {
    apiAcceptInvite(inviteId).catch(console.error);

    setState((prev: any) => {
      const invite = prev.invites.find((i: GroupInvite) => i.id === inviteId);
      if (!invite) return prev;

      const updatedGroups = prev.groups.map((g: Group) => {
        if (g.id !== invite.groupId) return g;
        if (g.members.some((m: Member) => m.id === currentUser.id || m.email === currentUser.email)) {
          return g;
        }
        return {
          ...g,
          members: [...g.members, currentUser],
        };
      });

      return {
        ...prev,
        groups: updatedGroups,
        invites: prev.invites.map((i: GroupInvite) =>
          i.id === inviteId ? { ...i, status: 'ACCEPTED' } : i
        ),
      };
    });
  };

  const declineGroupInvite = (inviteId: string) => {
    apiDeclineInvite(inviteId).catch(console.error);
    setState((prev: any) => ({
      ...prev,
      invites: prev.invites.map((i: GroupInvite) =>
        i.id === inviteId ? { ...i, status: 'DECLINED' } : i
      ),
    }));
  };

  const addExpense = (expenseData: Omit<Expense, 'id' | 'status' | 'approvals'>) => {
    apiAddExpense(expenseData)
      .then((res) => {
        if (res?.offline) addToOfflineQueue('ADD_EXPENSE', expenseData);
      })
      .catch(() => {
        addToOfflineQueue('ADD_EXPENSE', expenseData);
      });

    const isApprovalReq = expenseData.requiresApproval;
    const approvals: Record<string, any> = {};

    if (isApprovalReq) {
      expenseData.splits.forEach((s) => {
        if (s.memberId !== expenseData.paidById) {
          approvals[s.memberId] = {
            memberId: s.memberId,
            status: 'PENDING',
          };
        }
      });
    }

    const newExpense: Expense = {
      ...expenseData,
      id: 'e_' + Date.now(),
      status: isApprovalReq && Object.keys(approvals).length > 0 ? 'PENDING_APPROVAL' : 'CONFIRMED',
      approvals,
    };

    setState((prev: any) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));

    return newExpense;
  };

  const sendReRequestReminder = (expenseId: string, memberId: string) => {
    apiSendReminder(expenseId, memberId, currentUser.name).catch(console.error);

    setState((prev: any) => ({
      ...prev,
      expenses: prev.expenses.map((e: Expense) => {
        if (e.id !== expenseId) return e;
        return {
          ...e,
          approvals: {
            ...e.approvals,
            [memberId]: {
              ...(e.approvals?.[memberId] || { memberId, status: 'PENDING' }),
              lastReminderAt: new Date().toISOString(),
            },
          },
        };
      }),
    }));
  };

  const respondToApproval = (
    expenseId: string,
    memberId: string,
    status: ApprovalStatus,
    queryNote?: string
  ) => {
    apiRespondApproval(expenseId, status, queryNote).catch(console.error);

    setState((prev: any) => {
      const updatedExpenses = prev.expenses.map((exp: Expense) => {
        if (exp.id !== expenseId) return exp;

        const updatedApprovals = {
          ...exp.approvals,
          [memberId]: {
            memberId,
            status,
            respondedAt: new Date().toISOString(),
            queryNote: queryNote || undefined,
          },
        };

        const approvalValues = Object.values(updatedApprovals);
        const hasDispute = approvalValues.some((a: any) => a.status === 'DISPUTED');
        const allAccepted = approvalValues.length > 0 && approvalValues.every((a: any) => a.status === 'ACCEPTED');

        let newStatus = exp.status;
        if (hasDispute) {
          newStatus = 'PENDING_APPROVAL';
        } else if (allAccepted) {
          newStatus = 'CONFIRMED';
        }

        return {
          ...exp,
          approvals: updatedApprovals,
          status: newStatus,
        };
      });

      return {
        ...prev,
        expenses: updatedExpenses,
      };
    });
  };

  const recordSettlement = (settlement: Omit<Settlement, 'id' | 'date'>) => {
    apiRecordSettlement(settlement)
      .then((res) => {
        if (res?.offline) addToOfflineQueue('RECORD_SETTLEMENT', settlement);
      })
      .catch(() => {
        addToOfflineQueue('RECORD_SETTLEMENT', settlement);
      });

    const newSettlement: Settlement = {
      ...settlement,
      id: 's_' + Date.now(),
      date: new Date().toISOString(),
    };

    setState((prev: any) => ({
      ...prev,
      settlements: [newSettlement, ...prev.settlements],
    }));

    return newSettlement;
  };

  const addKittyContribution = (contribution: Omit<KittyContribution, 'id' | 'date'>) => {
    apiAddKittyContribution(contribution)
      .then((res) => {
        if (res?.offline) addToOfflineQueue('ADD_KITTY_CONTRIBUTION', contribution);
      })
      .catch(() => {
        addToOfflineQueue('ADD_KITTY_CONTRIBUTION', contribution);
      });

    const newEntry: KittyContribution = {
      ...contribution,
      id: 'k_' + Date.now(),
      date: new Date().toISOString(),
    };
    setState((prev: any) => ({
      ...prev,
      kittyContributions: [newEntry, ...prev.kittyContributions],
    }));
  };

  const addKittyExpense = (expense: Omit<KittyExpense, 'id' | 'date'>) => {
    apiAddKittyExpense(expense)
      .then((res) => {
        if (res?.offline) addToOfflineQueue('ADD_KITTY_EXPENSE', expense);
      })
      .catch(() => {
        addToOfflineQueue('ADD_KITTY_EXPENSE', expense);
      });

    const newExpense: KittyExpense = {
      ...expense,
      id: 'ke_' + Date.now(),
      date: new Date().toISOString(),
    };
    setState((prev: any) => ({
      ...prev,
      kittyExpenses: [newExpense, ...prev.kittyExpenses],
    }));
  };

  const deleteGroup = (groupId: string, userId: string): { success: boolean; error?: string } => {
    const group = (state.groups || []).find((g: Group) => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found.' };

    if (group.createdBy !== userId) {
      return { success: false, error: 'Only the creator of this group can delete it!' };
    }

    apiDeleteGroup(groupId, userId).catch(console.error);

    setState((prev: any) => ({
      ...prev,
      groups: prev.groups.filter((g: Group) => g.id !== groupId),
      expenses: prev.expenses.filter((e: Expense) => e.groupId !== groupId),
      settlements: prev.settlements.filter((s: Settlement) => s.groupId !== groupId),
      kittyContributions: prev.kittyContributions.filter((k: KittyContribution) => k.groupId !== groupId),
      kittyExpenses: prev.kittyExpenses.filter((ke: KittyExpense) => ke.groupId !== groupId),
    }));

    return { success: true };
  };

  const leaveGroup = (groupId: string, userId: string): { success: boolean; error?: string } => {
    const group = (state.groups || []).find((g: Group) => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found.' };

    if (group.createdBy === userId) {
      return { success: false, error: 'Group creator cannot leave. You can delete the group instead.' };
    }

    apiLeaveGroup(groupId, userId).catch(console.error);

    setState((prev: any) => ({
      ...prev,
      groups: prev.groups.map((g: Group) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          members: g.members.filter((m: Member) => m.id !== userId),
        };
      }),
    }));

    return { success: true };
  };

  const markAllNotificationsRead = () => {
    setState((prev: any) => ({
      ...prev,
      notifications: prev.notifications.map((n: AppNotification) => ({ ...n, read: true })),
    }));
  };

  const clearAllData = () => {
    const clean = {
      groups: [],
      expenses: [],
      settlements: [],
      kittyContributions: [],
      kittyExpenses: [],
      invites: [],
      notifications: [],
    };
    setState(clean);
    try {
      localStorage.removeItem(getStorageKey(currentAccount?.id));
    } catch {
      // ignore
    }
  };

  const sendGroupChatMessage = async (groupId: string, text: string, mediaUrl?: string) => {
    const tempMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      groupId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar || '😎',
      text,
      mediaUrl,
      createdAt: new Date().toISOString(),
    };

    setState((prev: any) => ({
      ...prev,
      messages: [...(prev.messages || []), tempMsg],
    }));

    try {
      const res = await apiSendGroupMessage(groupId, { text, mediaUrl });
      if (res?.message) {
        setState((prev: any) => ({
          ...prev,
          messages: [...(prev.messages || []).filter((m: any) => m.id !== tempMsg.id), res.message],
        }));
      }
    } catch (e) {
      console.error('Failed to send group chat message:', e);
    }
  };

  return {
    currentUser,
    groups: myGroups,
    allGroupsRaw: (state.groups || []) as Group[],
    createGroup,
    deleteGroup,
    leaveGroup,
    inviteMemberByEmail,
    acceptGroupInvite,
    declineGroupInvite,
    pendingInvites: myPendingInvites,
    notifications: myNotifications,
    markAllNotificationsRead,
    expenses: myExpenses,
    addExpense,
    sendReRequestReminder,
    respondToApproval,
    settlements: mySettlements,
    recordSettlement,
    kittyContributions: myKittyContributions,
    kittyExpenses: myKittyExpenses,
    addKittyContribution,
    addKittyExpense,
    messages: (state.messages || []) as ChatMessage[],
    sendGroupChatMessage,
    clearAllData,
  };
}
