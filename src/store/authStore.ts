import { useState, useEffect } from 'react';
import { UserAccount, UPIAccount } from '../types';
import { fetchState, connectWebSocket, apiSignUp, apiSignIn, apiUpdateAccount } from '../utils/api';

const SESSION_STORAGE_KEY = 'splitshare_auth_session_v4';

const DEFAULT_INITIAL_ACCOUNTS: UserAccount[] = [];

export function useAuthStore() {
  const loadCurrentUserId = (): string => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return saved;
    } catch (e) {
      console.error(e);
    }
    return '';
  };

  const [accounts, setAccounts] = useState<UserAccount[]>(DEFAULT_INITIAL_ACCOUNTS);
  const [currentUserId, setCurrentUserId] = useState<string>(loadCurrentUserId);

  useEffect(() => {
    // Fetch accounts from server
    fetchState()
      .then((res) => {
        if (res?.data?.accounts) {
          setAccounts(res.data.accounts);
        }
      })
      .catch(() => {});

    // Listen for new user registrations and updates live via WebSocket!
    const cleanup = connectWebSocket((serverData) => {
      if (serverData?.accounts) {
        setAccounts(serverData.accounts);
      }
    });

    return cleanup;
  }, []);

  useEffect(() => {
    try {
      if (currentUserId) {
        localStorage.setItem(SESSION_STORAGE_KEY, currentUserId);
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUserId]);

  const currentAccount = accounts.find((a) => a.id === currentUserId) || null;

  const signUp = (data: {
    username: string;
    email: string;
    password: string;
    name: string;
    upiId?: string;
    phone?: string;
  }): { success: boolean; error?: string; account?: UserAccount } => {
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();

    if (accounts.some((a) => a.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: 'Username is already taken.' };
    }
    if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const initialUpiAccounts: UPIAccount[] = [];
    if (data.upiId?.trim()) {
      initialUpiAccounts.push({
        id: 'upi_' + Date.now(),
        label: 'Primary UPI',
        upiId: data.upiId.trim(),
        isDefault: true,
        createdAt: new Date().toISOString(),
      });
    }

    const localNewAccount: UserAccount = {
      id: 'u_' + Date.now(),
      username: cleanUsername,
      email: cleanEmail,
      password: data.password,
      name: data.name.trim(),
      avatar: '😎',
      upiId: data.upiId?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      upiAccounts: initialUpiAccounts,
      createdAt: new Date().toISOString(),
    };

    // Broadcast to server
    apiSignUp({
      ...data,
      upiAccounts: initialUpiAccounts,
    })
      .then((res) => {
        if (res?.account) {
          setCurrentUserId(res.account.id);
        }
      })
      .catch(console.error);

    setAccounts((prev) => [...prev, localNewAccount]);
    setCurrentUserId(localNewAccount.id);

    return { success: true, account: localNewAccount };
  };

  const signIn = (
    emailOrUsername: string,
    password: string
  ): { success: boolean; error?: string; account?: UserAccount } => {
    const query = emailOrUsername.trim().toLowerCase();
    const cleanPhone = query.replace(/[\s+-]/g, '');
    const found = accounts.find(
      (a) =>
        (a.username.toLowerCase() === query ||
          a.email.toLowerCase() === query ||
          (a.phone && a.phone.replace(/[\s+-]/g, '') === cleanPhone)) &&
        a.password === password
    );

    if (!found) {
      return { success: false, error: 'Invalid credentials. Please check your username/email/mobile or password.' };
    }

    setCurrentUserId(found.id);
    return { success: true, account: found };
  };

  const signOut = () => {
    setCurrentUserId('');
  };

  const switchAccount = (userId: string) => {
    if (accounts.some((a) => a.id === userId)) {
      setCurrentUserId(userId);
    }
  };

  const updateAccount = (updates: Partial<UserAccount>) => {
    if (currentAccount) {
      apiUpdateAccount(currentAccount.id, updates).catch(console.error);
    }
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === currentUserId ? { ...acc, ...updates } : acc))
    );
  };

  const addUPIAccount = (accountData: {
    label: string;
    upiId: string;
    isDefault?: boolean;
    customQrImage?: string;
  }) => {
    const newUPI: UPIAccount = {
      id: 'upi_' + Date.now(),
      label: accountData.label.trim(),
      upiId: accountData.upiId.trim(),
      isDefault: Boolean(accountData.isDefault),
      customQrImage: accountData.customQrImage,
      createdAt: new Date().toISOString(),
    };

    const currentList = currentAccount?.upiAccounts || [];
    const makeDefault = newUPI.isDefault || currentList.length === 0;

    const updatedList = makeDefault
      ? currentList.map((u) => ({ ...u, isDefault: false }))
      : currentList;

    const finalList = [...updatedList, { ...newUPI, isDefault: makeDefault }];

    updateAccount({
      upiId: makeDefault ? newUPI.upiId : currentAccount?.upiId,
      upiAccounts: finalList,
    });
  };

  const deleteUPIAccount = (upiIdToRemove: string) => {
    const filtered = (currentAccount?.upiAccounts || []).filter((u) => u.id !== upiIdToRemove);
    const wasDefault = (currentAccount?.upiAccounts || []).find((u) => u.id === upiIdToRemove)?.isDefault;

    if (wasDefault && filtered.length > 0) {
      filtered[0].isDefault = true;
    }

    updateAccount({
      upiId: filtered.find((u) => u.isDefault)?.upiId || filtered[0]?.upiId || undefined,
      upiAccounts: filtered,
    });
  };

  const setDefaultUPIAccount = (upiIdToDefault: string) => {
    let chosenUpi = currentAccount?.upiId;

    const updatedList = (currentAccount?.upiAccounts || []).map((u) => {
      if (u.id === upiIdToDefault) {
        chosenUpi = u.upiId;
        return { ...u, isDefault: true };
      }
      return { ...u, isDefault: false };
    });

    updateAccount({
      upiId: chosenUpi,
      upiAccounts: updatedList,
    });
  };

  return {
    accounts,
    currentAccount,
    signUp,
    signIn,
    signOut,
    switchAccount,
    updateAccount,
    addUPIAccount,
    deleteUPIAccount,
    setDefaultUPIAccount,
  };
}
