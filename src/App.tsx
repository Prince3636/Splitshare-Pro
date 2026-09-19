import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { Group, Member, Expense } from './types';
import { Header } from './components/Layout/Header';
import { BottomNav, NavTab } from './components/Layout/BottomNav';
import { GroupsListView } from './components/Views/GroupsListView';
import { GroupDetailView } from './components/Views/GroupDetailView';
import { ApprovalsView } from './components/Views/ApprovalsView';
import { ActivityView } from './components/Views/ActivityView';
import { ProfileView } from './components/Views/ProfileView';

// Modals
import { AddExpenseModal } from './components/Modals/AddExpenseModal';
import { SettleUpModal } from './components/Modals/SettleUpModal';
import { CreateGroupModal } from './components/Modals/CreateGroupModal';
import { AddKittyModal } from './components/Modals/AddKittyModal';
import { DisputeModal } from './components/Modals/DisputeModal';
import { InviteEmailModal } from './components/Modals/InviteEmailModal';
import { NotificationsDrawer } from './components/Modals/NotificationsDrawer';
import { AuthModal } from './components/Auth/AuthModal';
import { AuthScreen } from './components/Auth/AuthScreen';
import { FloatingAlert } from './components/Common/FloatingAlert';

import { ArrowLeft } from 'lucide-react';

export const App: React.FC = () => {
  // Auth Store
  const {
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
    return <AuthScreen onSignIn={signIn} onSignUp={signUp} />;
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
              onAddUPIAccount={addUPIAccount}
              onDeleteUPIAccount={deleteUPIAccount}
              onSetDefaultUPIAccount={setDefaultUPIAccount}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(t) => {
            setActiveTab(t);
          }}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* Modals */}
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
            // Register friend as account or member
            const res = signUp({
              username: newM.name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 100),
              email: `${newM.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
              password: 'password123',
              name: newM.name,
              upiId: newM.upiId,
            });
            return res.account
              ? {
                  id: res.account.id,
                  name: res.account.name,
                  avatar: res.account.avatar,
                  color: '#10b981',
                  email: res.account.email,
                  upiId: res.account.upiId,
                }
              : {
                  id: 'm_' + Date.now(),
                  name: newM.name,
                  avatar: '😀',
                  color: '#10b981',
                  upiId: newM.upiId,
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
      </div>
    </div>
  );
};
