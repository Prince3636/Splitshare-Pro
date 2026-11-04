import React, { useState, useEffect, Suspense } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { Group, Member, Expense } from './types';
import { Header } from './components/Layout/Header';
import { BottomNav, NavTab } from './components/Layout/BottomNav';
import { FloatingAlert } from './components/Common/FloatingAlert';
import { ArrowLeft } from 'lucide-react';

const AuthScreen = React.lazy(() => import('./components/Auth/AuthScreen').then(m => ({ default: m.AuthScreen })));

// Code-split Views
const GroupsListView = React.lazy(() => import('./components/Views/GroupsListView').then(m => ({ default: m.GroupsListView })));
const GroupDetailView = React.lazy(() => import('./components/Views/GroupDetailView').then(m => ({ default: m.GroupDetailView })));
const ApprovalsView = React.lazy(() => import('./components/Views/ApprovalsView').then(m => ({ default: m.ApprovalsView })));
const ActivityView = React.lazy(() => import('./components/Views/ActivityView').then(m => ({ default: m.ActivityView })));
const ProfileView = React.lazy(() => import('./components/Views/ProfileView').then(m => ({ default: m.ProfileView })));

// Code-split Modals
const AddExpenseModal = React.lazy(() => import('./components/Modals/AddExpenseModal').then(m => ({ default: m.AddExpenseModal })));
const SettleUpModal = React.lazy(() => import('./components/Modals/SettleUpModal').then(m => ({ default: m.SettleUpModal })));
const CreateGroupModal = React.lazy(() => import('./components/Modals/CreateGroupModal').then(m => ({ default: m.CreateGroupModal })));
const AddKittyModal = React.lazy(() => import('./components/Modals/AddKittyModal').then(m => ({ default: m.AddKittyModal })));
const DisputeModal = React.lazy(() => import('./components/Modals/DisputeModal').then(m => ({ default: m.DisputeModal })));
const InviteEmailModal = React.lazy(() => import('./components/Modals/InviteEmailModal').then(m => ({ default: m.InviteEmailModal })));
const NotificationsDrawer = React.lazy(() => import('./components/Modals/NotificationsDrawer').then(m => ({ default: m.NotificationsDrawer })));
const AuthModal = React.lazy(() => import('./components/Auth/AuthModal').then(m => ({ default: m.AuthModal })));

export const App: React.FC = () => {
  // Auth Store
  const {
    accounts,
    currentAccount,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    setLoggedInAccount,
    switchAccount,
    updateAccount,
    addUPIAccount,
    updateUPIAccount,
    deleteUPIAccount,
    setDefaultUPIAccount,
  } = useAuthStore();

  // App Store (scoped to currentAccount)
  const {
    currentUser,
    groups,
    allGroupsRaw,
    createGroup,
    deleteGroup,
    leaveGroup,
    inviteMemberByEmail,
    acceptGroupInvite,
    declineGroupInvite,
    pendingInvites,
    notifications,
    markAllNotificationsRead,
    expenses,
    addExpense,
    sendReRequestReminder,
    respondToApproval,
    settlements,
    recordSettlement,
    kittyContributions,
    kittyExpenses,
    addKittyContribution,
    addKittyExpense,
    clearAllData,
  } = useAppStore(currentAccount);

  const [activeTab, setActiveTab] = useState<NavTab>('groups');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isInviteEmailOpen, setIsInviteEmailOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isKittyOpen, setIsKittyOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Network connection monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Settle modal data
  const [settleData, setSettleData] = useState<{
    isOpen: boolean;
    debtor: Member | null;
    creditor: Member | null;
    amount: number;
  }>({
    isOpen: false,
    debtor: null,
    creditor: null,
    amount: 0,
  });

  // Dispute modal data
  const [disputeData, setDisputeData] = useState<{
    isOpen: boolean;
    expense: Expense | null;
  }>({
    isOpen: false,
    expense: null,
  });

  // Count pending approvals specifically for the current user
  const pendingApprovalsCount = expenses.filter(
    (e) =>
      e.status === 'PENDING_APPROVAL' &&
      e.approvals?.[currentUser.id]?.status === 'PENDING'
  ).length;

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length + pendingInvites.length;

  // Check URL query for direct join token: ?join=INVITE_ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId) {
      setIsNotificationsOpen(true);
    }
  }, []);

  // Android hardware / gesture back button handling via @capacitor/app
  useEffect(() => {
    let handlerPromise: any = null;
    try {
      handlerPromise = CapApp.addListener('backButton', () => {
        // Priority 1: Dismiss active modals
        if (isAuthOpen) { setIsAuthOpen(false); return; }
        if (isInviteEmailOpen) { setIsInviteEmailOpen(false); return; }
        if (isNotificationsOpen) { setIsNotificationsOpen(false); return; }
        if (isAddExpenseOpen) { setIsAddExpenseOpen(false); return; }
        if (isCreateGroupOpen) { setIsCreateGroupOpen(false); return; }
        if (isKittyOpen) { setIsKittyOpen(false); return; }
        if (settleData.isOpen) { setSettleData((prev) => ({ ...prev, isOpen: false })); return; }
        if (disputeData.isOpen) { setDisputeData((prev) => ({ ...prev, isOpen: false })); return; }

        // Priority 2: Clear selected group back to list
        if (selectedGroup) {
          setSelectedGroup(null);
          return;
        }

        // Priority 3: Return to default 'groups' tab
        if (activeTab !== 'groups') {
          setActiveTab('groups');
          return;
        }

        // Priority 4: Exit app
        CapApp.exitApp();
      });
    } catch {
      // Ignored outside Capacitor environment
    }

    return () => {
      if (handlerPromise && typeof handlerPromise.then === 'function') {
        handlerPromise.then((h: any) => h.remove?.()).catch(() => {});
      }
    };
  }, [
    isAuthOpen,
    isInviteEmailOpen,
    isNotificationsOpen,
    isAddExpenseOpen,
    isCreateGroupOpen,
    isKittyOpen,
    settleData.isOpen,
    disputeData.isOpen,
    selectedGroup,
    activeTab,
  ]);

  const handleOpenSettle = (debtor: Member, creditor: Member, amount: number) => {
    setSettleData({
      isOpen: true,
      debtor,
      creditor,
      amount,
    });
  };

  const handleOpenDispute = (expense: Expense) => {
    setDisputeData({
      isOpen: true,
      expense,
    });
  };

  const handleAcceptApproval = (expenseId: string) => {
    respondToApproval(expenseId, currentUser.id, 'ACCEPTED');
  };

  const handleDisputeSubmit = (expenseId: string, note: string) => {
    respondToApproval(expenseId, currentUser.id, 'DISPUTED', note);
  };

  // Keep selectedGroup synced with store updates
  const activeSelectedGroup = selectedGroup
    ? groups.find((g) => g.id === selectedGroup.id) || null
    : null;

  // If no account is logged in, show the clean Login & Sign Up screen first (zero demo data)
  if (!currentAccount) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs">Loading SplitShare...</div>}>
        <AuthScreen onSignIn={signIn} onSignUp={signUp} onSetAccount={setLoggedInAccount} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-100 flex justify-center text-slate-900 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col shadow-2xl relative border-x border-slate-200 overflow-x-hidden">
        {/* Floating Top Alert Banner for Pending Bills & Invites */}
        <FloatingAlert
          notifications={notifications}
          pendingApprovalsCount={pendingApprovalsCount}
          pendingInvitesCount={pendingInvites.length}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenApprovals={() => setActiveTab('approvals')}
        />

        {/* Top Header */}
        <Header
          currentUser={currentUser}
          currentAccount={currentAccount}
          accounts={accounts}
          onSelectAccount={switchAccount}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onResetData={clearAllData}
          onSignOut={signOut}
          pendingApprovalsCount={pendingApprovalsCount}
          unreadNotificationsCount={unreadNotificationsCount}
        />

        {/* Offline Banner Indicator */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2 shadow-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
            <span>Offline Mode — Showing local data. Will sync when reconnected.</span>
          </div>
        )}

        {/* Back navigation header if inside a group */}
        {activeTab === 'groups' && activeSelectedGroup && (
          <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setSelectedGroup(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={16} />
              All Groups
            </button>
            <span className="text-xs font-semibold text-slate-400">
              {activeSelectedGroup.name}
            </span>
          </div>
        )}

        {/* Main Content Area Based on Active Tab */}
        <main className="flex-1 w-full pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
          <Suspense fallback={<div className="flex items-center justify-center p-8 text-xs font-semibold text-slate-400">Loading view...</div>}>
            {activeTab === 'groups' && (
              activeSelectedGroup ? (
                <GroupDetailView
                  group={activeSelectedGroup}
                  currentUser={currentUser}
                  allMembers={activeSelectedGroup.members}
                  expenses={expenses}
                  settlements={settlements}
                  kittyContributions={kittyContributions}
                  kittyExpenses={kittyExpenses}
                  onOpenAddExpense={() => setIsAddExpenseOpen(true)}
                  onOpenSettleModal={handleOpenSettle}
                  onOpenKittyModal={() => setIsKittyOpen(true)}
                  onOpenDisputeModal={handleOpenDispute}
                  onAcceptApproval={handleAcceptApproval}
                  onOpenInviteModal={() => setIsInviteEmailOpen(true)}
                  onSendReminder={sendReRequestReminder}
                  onDeleteGroup={(gId) => {
                    const res = deleteGroup(gId, currentUser.id);
                    if (res.success) {
                      setSelectedGroup(null);
                    } else {
                      alert(res.error || 'Failed to delete group');
                    }
                  }}
                  onLeaveGroup={(gId) => {
                    const res = leaveGroup(gId, currentUser.id);
                    if (res.success) {
                      setSelectedGroup(null);
                    } else {
                      alert(res.error || 'Failed to leave group');
                    }
                  }}
                />
              ) : (
                <GroupsListView
                  groups={groups}
                  currentUser={currentUser}
                  expenses={expenses}
                  settlements={settlements}
                  notifications={notifications}
                  onSelectGroup={(g) => setSelectedGroup(g)}
                  onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
                />
              )
            )}

            {activeTab === 'approvals' && (
              <ApprovalsView
                currentUser={currentUser}
                allMembers={currentUser ? [currentUser] : []}
                groups={groups}
                expenses={expenses}
                onAcceptApproval={handleAcceptApproval}
                onOpenDisputeModal={handleOpenDispute}
              />
            )}

            {activeTab === 'activity' && (
              <ActivityView
                expenses={expenses}
                settlements={settlements}
                kittyContributions={kittyContributions}
                kittyExpenses={kittyExpenses}
                groups={groups}
                allMembers={currentUser ? [currentUser] : []}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                currentUser={currentUser}
                allMembers={accounts.map((a) => ({
                  id: a.id,
                  name: a.name,
                  avatar: a.avatar,
                  color: '#10b981',
                  email: a.email,
                  upiId: a.upiId,
                  upiAccounts: a.upiAccounts,
                  phone: a.phone,
                }))}
                groups={groups}
                expenses={expenses}
                settlements={settlements}
                onSelectUser={switchAccount}
                onUpdateProfile={updateAccount}
                onClearAllData={clearAllData}
                onSignOut={signOut}
                onDeleteAccount={deleteAccount}
                onAddUPIAccount={addUPIAccount}
                onUpdateUPIAccount={updateUPIAccount}
                onDeleteUPIAccount={deleteUPIAccount}
                onSetDefaultUPIAccount={setDefaultUPIAccount}
              />
            )}
          </Suspense>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(t) => {
            setActiveTab(t);
          }}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* Modals wrapped in Suspense */}
        <Suspense fallback={null}>
          {activeSelectedGroup && (
            <>
              <AddExpenseModal
                isOpen={isAddExpenseOpen}
                onClose={() => setIsAddExpenseOpen(false)}
                group={activeSelectedGroup}
                currentUser={currentUser}
                onAddExpense={(exp) => {
                  addExpense(exp);
                }}
              />

              <AddKittyModal
                isOpen={isKittyOpen}
                onClose={() => setIsKittyOpen(false)}
                group={activeSelectedGroup}
                currentUser={currentUser}
                onAddContribution={(data) => {
                  addKittyContribution({
                    ...data,
                    groupId: activeSelectedGroup.id,
                  });
                }}
                onAddExpense={(data) => {
                  addKittyExpense({
                    ...data,
                    groupId: activeSelectedGroup.id,
                  });
                }}
              />

              <InviteEmailModal
                isOpen={isInviteEmailOpen}
                onClose={() => setIsInviteEmailOpen(false)}
                group={activeSelectedGroup}
                onSendInvite={inviteMemberByEmail}
              />
            </>
          )}

          <CreateGroupModal
            isOpen={isCreateGroupOpen}
            onClose={() => setIsCreateGroupOpen(false)}
            allMembers={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              avatar: a.avatar,
              color: '#10b981',
              email: a.email,
              upiId: a.upiId,
              phone: a.phone,
            }))}
            currentUser={currentUser}
            onAddMember={(newM) => {
              // Create local group member without resetting the active logged-in user
              return {
                id: 'm_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now()),
                name: newM.name.trim(),
                avatar: '😀',
                color: '#10b981',
                upiId: newM.upiId?.trim() || undefined,
              };
            }}
            onCreateGroup={(newGrp) => {
              const created = createGroup(newGrp);
              setSelectedGroup(created);
            }}
          />

          {settleData.isOpen && settleData.debtor && settleData.creditor && (
            <SettleUpModal
              isOpen={settleData.isOpen}
              onClose={() => setSettleData({ ...settleData, isOpen: false })}
              debtor={settleData.debtor}
              creditor={{
                ...settleData.creditor,
                upiAccounts:
                  settleData.creditor.upiAccounts ||
                  accounts.find((a) => a.id === settleData.creditor?.id)?.upiAccounts,
              }}
              amount={settleData.amount}
              groupName={activeSelectedGroup?.name || 'Group'}
              onConfirmSettlement={(settlement) => {
                recordSettlement({
                  ...settlement,
                  groupId: activeSelectedGroup?.id || groups[0]?.id || 'g1',
                  confirmed: true,
                });
              }}
            />
          )}

          {disputeData.isOpen && disputeData.expense && (
            <DisputeModal
              isOpen={disputeData.isOpen}
              onClose={() => setDisputeData({ ...disputeData, isOpen: false })}
              expense={disputeData.expense}
              currentUser={currentUser}
              onDispute={handleDisputeSubmit}
            />
          )}

          {/* Notifications & Invites Drawer */}
          <NotificationsDrawer
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            notifications={notifications}
            pendingInvites={pendingInvites}
            expenses={expenses}
            currentUser={currentUser}
            onAcceptInvite={(invId) => {
              acceptGroupInvite(invId);
              setIsNotificationsOpen(false);
            }}
            onDeclineInvite={declineGroupInvite}
            onAcceptApproval={handleAcceptApproval}
            onOpenDisputeModal={handleOpenDispute}
            onMarkAllRead={markAllNotificationsRead}
          />

          {/* Authentication Modal */}
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            accounts={accounts}
            currentAccount={currentAccount}
            onSignUp={signUp}
            onSignIn={signIn}
            onSwitchAccount={switchAccount}
          />
        </Suspense>
      </div>
    </div>
  );
};
