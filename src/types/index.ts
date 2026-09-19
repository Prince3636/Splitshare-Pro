export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE';

export type ApprovalStatus = 'PENDING' | 'ACCEPTED' | 'DISPUTED';

export type ExpenseStatus = 'CONFIRMED' | 'PENDING_APPROVAL' | 'REJECTED';

export interface UPIAccount {
  id: string;
  label: string; // e.g. 'Paytm', 'Google Pay', 'PhonePe', 'HDFC Bank'
  upiId: string;
  isDefault: boolean;
  customQrImage?: string; // Optional user uploaded QR code image URL or base64
  createdAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  password: string;
  name: string;
  avatar: string;
  color?: string;
  upiId?: string;
  upiAccounts?: UPIAccount[];
  phone?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  color: string;
  email?: string;
  upiId?: string;
  upiAccounts?: UPIAccount[];
  phone?: string;
}

export interface SplitItem {
  memberId: string;
  amount: number;
  percentage?: number;
  shares?: number;
}

export interface MemberApproval {
  memberId: string;
  status: ApprovalStatus;
  respondedAt?: string;
  queryNote?: string;
  lastReminderAt?: string;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidById: string;
  date: string;
  category: 'food' | 'travel' | 'stay' | 'groceries' | 'entertainment' | 'utilities' | 'other';
  splitType: SplitType;
  splits: SplitItem[];
  requiresApproval: boolean;
  status: ExpenseStatus;
  approvals: Record<string, MemberApproval>;
  notes?: string;
  receiptUrl?: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  date: string;
  upiRef?: string;
  confirmed: boolean;
}

export interface KittyContribution {
  id: string;
  groupId: string;
  memberId: string;
  amount: number;
  date: string;
}

export interface KittyExpense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  addedById: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  currency: string;
  members: Member[];
  createdBy: string;
  targetBudget?: number;
  createdAt: string;
  kittyActive?: boolean;
}

export interface SimplifiedDebt {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  groupEmoji: string;
  invitedEmail: string;
  inviterName: string;
  inviterId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  recipientEmail?: string;
  recipientUserId?: string;
  type: 'INVITE' | 'BILL_APPROVAL' | 'REMINDER';
  title: string;
  message: string;
  relatedId?: string; // expenseId or inviteId
  groupId?: string;
  createdAt: string;
  read: boolean;
}
