import { useState, useEffect } from 'react';
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
} from '../types';
import {
  fetchState,
  connectWebSocket,
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
  apiResetData,
} from '../utils/api';

const STORAGE_KEY = 'splitshare_app_state_real_v4';

export function useAppStore(currentAccount: UserAccount | null) {
  const loadState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
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
    };
  };

  const [state, setState] = useState(loadState);

  // Connect to server and real-time WebSocket
  useEffect(() => {
    fetchState()
      .then((res) => {
        if (res?.data) {
          setState({
            groups: res.data.groups || [],
            expenses: res.data.expenses || [],
            settlements: res.data.settlements || [],
            kittyContributions: res.data.kittyContributions || [],
            kittyExpenses: res.data.kittyExpenses || [],
            invites: res.data.invites || [],
            notifications: res.data.notifications || [],
          });
        }
      })
      .catch(() => {
        // Fallback to local state if server isn't reached immediately
      });

    // Real-time live multi-phone synchronization
    const cleanup = connectWebSocket((serverData) => {
      if (serverData) {
        setState({
          groups: serverData.groups || [],
          expenses: serverData.expenses || [],
          settlements: serverData.settlements || [],
          kittyContributions: serverData.kittyContributions || [],
          kittyExpenses: serverData.kittyExpenses || [],
          invites: serverData.invites || [],
          notifications: serverData.notifications || [],
        });
      }
    });

    return cleanup;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }, [state]);

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

    // Call real-time API
    apiCreateGroup(payload).catch(console.error);

    const localGroup: Group = {
      ...payload,
      id: 'g_' + Date.now(),
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

    apiInviteEmail(groupId, cleanEmail, currentUser.id, currentUser.name).catch(console.error);

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
    apiAcceptInvite(inviteId, currentUser).catch(console.error);

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
    apiAddExpense(expenseData).catch(console.error);

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
    apiRespondApproval(expenseId, memberId, status, queryNote).catch(console.error);

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
    apiRecordSettlement(settlement).catch(console.error);

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
    apiAddKittyContribution(contribution).catch(console.error);
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
    apiAddKittyExpense(expense).catch(console.error);
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
    apiResetData().catch(console.error);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
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
    clearAllData,
  };
}
