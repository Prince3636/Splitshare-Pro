import { useState, useEffect } from 'react';
import { UserAccount, UPIAccount } from '../types';
import {
  fetchState,
  connectWebSocket,
  apiSignUp,
  apiSignIn,
  apiUpdateAccount,
  apiDeleteAccount,
  setStoredToken,
  getStoredToken,
} from '../utils/api';

const ACCOUNT_STORAGE_KEY = 'splitshare_auth_account_v5';

const DEMO_FALLBACK_ACCOUNTS: Record<string, UserAccount> = {
  demo: {
    id: 'u_demo_1',
    username: 'demo',
    email: 'demo@splitshare.com',
    name: 'Demo User',
    avatar: '👨‍💻',
    upiId: 'demo@upi',
    phone: '9876543210',
    upiAccounts: [
      {
        id: 'upi_demo_1',
        label: 'Google Pay',
        upiId: 'demo@upi',
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
  'demo@splitshare.com': {
    id: 'u_demo_1',
    username: 'demo',
    email: 'demo@splitshare.com',
    name: 'Demo User',
    avatar: '👨‍💻',
    upiId: 'demo@upi',
    phone: '9876543210',
    upiAccounts: [
      {
        id: 'upi_demo_1',
        label: 'Google Pay',
        upiId: 'demo@upi',
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
  '9876543210': {
    id: 'u_demo_1',
    username: 'demo',
    email: 'demo@splitshare.com',
    name: 'Demo User',
    avatar: '👨‍💻',
    upiId: 'demo@upi',
    phone: '9876543210',
    upiAccounts: [
      {
        id: 'upi_demo_1',
        label: 'Google Pay',
        upiId: 'demo@upi',
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
  rahul: {
    id: 'u_demo_2',
    username: 'rahul',
    email: 'rahul@splitshare.com',
    name: 'Rahul Sharma',
    avatar: '😎',
    upiId: 'rahul@okhdfcbank',
    phone: '9876543211',
    upiAccounts: [
      {
        id: 'upi_demo_2',
        label: 'Paytm',
        upiId: 'rahul@okhdfcbank',
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
};

export function useAuthStore() {
  const loadInitialAccount = (): UserAccount | null => {
    try {
      const saved = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(loadInitialAccount);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    fetchState()
      .then((res) => {
        if (res?.data?.accounts) {
          setAccounts(res.data.accounts);
          const found = res.data.accounts.find((a: UserAccount) => a.id === currentAccount?.id);
          if (found) {
            setCurrentAccount(found);
            localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(found));
          }
        }
      })
      .catch(() => {});

    const cleanup = connectWebSocket((serverData) => {
      if (serverData?.accounts) {
        setAccounts(serverData.accounts);
        const found = serverData.accounts.find((a: UserAccount) => a.id === currentAccount?.id);
        if (found) {
          setCurrentAccount(found);
          localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(found));
        }
      }
    });

    return cleanup;
  }, []);

  const signUp = async (data: {
    username: string;
    email: string;
    password: string;
    name: string;
    upiId?: string;
    phone?: string;
    avatar?: string;
  }): Promise<{ success: boolean; error?: string; account?: UserAccount }> => {
    try {
      const cleanUsername = data.username.trim().toLowerCase();
      const cleanEmail = data.email.trim().toLowerCase();

      const res = await apiSignUp({
        ...data,
        username: cleanUsername,
        email: cleanEmail,
      });

      if (res?.success && res?.token && res?.account) {
        setStoredToken(res.token);
        setCurrentAccount(res.account);
        setAccounts((prev) => [res.account, ...prev.filter((a) => a.id !== res.account.id)]);
        localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(res.account));
        return { success: true, account: res.account };
      }

      return { success: false, error: res?.error || 'Registration failed.' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error during signup.' };
    }
  };

  const signIn = async (
    emailOrUsername: string,
    password: string
  ): Promise<{ success: boolean; error?: string; account?: UserAccount }> => {
    const cleanId = emailOrUsername.trim().toLowerCase().replace(/[\s+-]/g, '');
    const cleanRaw = emailOrUsername.trim().toLowerCase();
    const demoAccount = DEMO_FALLBACK_ACCOUNTS[cleanId] || DEMO_FALLBACK_ACCOUNTS[cleanRaw];

    // Check direct demo credentials match
    if (demoAccount && password === 'demo123') {
      const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6I' + demoAccount.id;
      setStoredToken(demoToken);
      setCurrentAccount(demoAccount);
      setAccounts((prev) => [demoAccount, ...prev.filter((a) => a.id !== demoAccount.id)]);
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(demoAccount));
      return { success: true, account: demoAccount };
    }

    try {
      const res = await apiSignIn(emailOrUsername, password);
      if (res?.success && res?.token && res?.account) {
        setStoredToken(res.token);
        setCurrentAccount(res.account);
        setAccounts((prev) => [res.account, ...prev.filter((a) => a.id !== res.account.id)]);
        localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(res.account));
        return { success: true, account: res.account };
      }

      return {
        success: false,
        error: res?.error || 'Invalid credentials. Please verify your details.',
      };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error connecting to authentication service.' };
    }
  };

  const signOut = () => {
    setStoredToken(null);
    setCurrentAccount(null);
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    try {
      import('../services/firebase').then(({ signOutFirebase }) => signOutFirebase());
    } catch {}
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiDeleteAccount();
      if (res?.success) {
        signOut();
        return { success: true };
      }
      return { success: false, error: res?.error || 'Failed to delete account.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error during account deletion.' };
    }
  };

  const setLoggedInAccount = (account: UserAccount) => {
    setCurrentAccount(account);
    setAccounts((prev) => [account, ...prev.filter((a) => a.id !== account.id)]);
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    if (account.token) {
      setStoredToken(account.token);
    }
  };

  const switchAccount = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) {
      setCurrentAccount(acc);
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(acc));
      if (acc.token) {
        setStoredToken(acc.token);
      }
    }
  };

  const updateAccount = (updates: Partial<UserAccount>) => {
    if (!currentAccount) return;
    const updated = { ...currentAccount, ...updates };
    setCurrentAccount(updated);
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(updated));

    apiUpdateAccount(currentAccount.id, updates).catch(console.error);
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

  const updateUPIAccount = (accountData: {
    id: string;
    label: string;
    upiId: string;
    isDefault?: boolean;
    customQrImage?: string;
  }) => {
    if (!currentAccount) return;
    const currentList = currentAccount.upiAccounts || [];
    const makeDefault = Boolean(accountData.isDefault);

    let chosenUpi = currentAccount.upiId;

    const updatedList = currentList.map((u) => {
      if (u.id === accountData.id) {
        if (makeDefault) chosenUpi = accountData.upiId;
        return {
          ...u,
          label: accountData.label,
          upiId: accountData.upiId,
          customQrImage: accountData.customQrImage,
          isDefault: makeDefault || u.isDefault,
        };
      }
      return makeDefault ? { ...u, isDefault: false } : u;
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
    deleteAccount,
    switchAccount,
    setLoggedInAccount,
    updateAccount,
    addUPIAccount,
    updateUPIAccount,
    deleteUPIAccount,
    setDefaultUPIAccount,
  };
}
