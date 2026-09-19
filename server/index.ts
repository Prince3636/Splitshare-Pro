import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed accounts if database doesn't exist
const INITIAL_DATA = {
  accounts: [],
  groups: [],
  expenses: [],
  settlements: [],
  kittyContributions: [],
  kittyExpenses: [],
  invites: [],
  notifications: [],
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading database:', e);
  }
  return INITIAL_DATA;
}

let db = loadDatabase();

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

// Setup Express and HTTP server
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support custom barcode image uploads

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Real-time WebSocket Broadcast
function broadcast(type: string, payload?: any) {
  const message = JSON.stringify({
    type,
    payload: payload || db,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  // Send current state immediately upon connecting
  ws.send(JSON.stringify({ type: 'INIT_STATE', payload: db }));
});

// --- REST API ENDPOINTS ---

// Get full current state
app.get('/api/state', (req, res) => {
  res.json({ success: true, data: db });
});

// Auth: Sign Up
app.post('/api/auth/signup', (req, res) => {
  const { username, email, password, name, upiId, phone } = req.body;
  const cleanUsername = username?.trim().toLowerCase();
  const cleanEmail = email?.trim().toLowerCase();

  if (db.accounts.some((a: any) => a.username.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ success: false, error: 'Username already taken.' });
  }
  if (db.accounts.some((a: any) => a.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ success: false, error: 'Email already registered.' });
  }

  const avatarList = ['😀', '😎', '🚀', '🌟', '🎸', '⚽', '🎯', '🎨', '🍕', '🦁'];
  const randomAvatar = avatarList[Math.floor(Math.random() * avatarList.length)];

  const initialUpiAccounts: any[] = [];
  if (upiId?.trim()) {
    initialUpiAccounts.push({
      id: 'upi_' + Date.now(),
      label: 'Primary UPI',
      upiId: upiId.trim(),
      isDefault: true,
      createdAt: new Date().toISOString(),
    });
  }

  const newAccount = {
    id: 'u_' + Date.now(),
    username: cleanUsername,
    email: cleanEmail,
    password,
    name: name.trim(),
    avatar: randomAvatar,
    upiId: upiId?.trim() || undefined,
    phone: phone?.trim() || undefined,
    upiAccounts: initialUpiAccounts,
    createdAt: new Date().toISOString(),
  };

  db.accounts.push(newAccount);
  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true, account: newAccount });
});

// Auth: Sign In
app.post('/api/auth/signin', (req, res) => {
  const { identifier, password } = req.body;
  const query = identifier?.trim().toLowerCase();

  const found = db.accounts.find(
    (a: any) =>
      (a.username.toLowerCase() === query || a.email.toLowerCase() === query) &&
      a.password === password
  );

  if (!found) {
    return res.status(401).json({ success: false, error: 'Invalid username/email or password.' });
  }

  res.json({ success: true, account: found });
});

// Auth: Update Profile (Name, Phone, UPI IDs, Barcodes)
app.post('/api/auth/update', (req, res) => {
  const { userId, updates } = req.body;
  const idx = db.accounts.findIndex((a: any) => a.id === userId);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  db.accounts[idx] = { ...db.accounts[idx], ...updates };

  // Update in groups where this member is listed
  db.groups.forEach((g: any) => {
    g.members = g.members.map((m: any) => {
      if (m.id === userId) {
        return {
          ...m,
          name: updates.name || m.name,
          phone: updates.phone !== undefined ? updates.phone : m.phone,
          upiId: updates.upiId !== undefined ? updates.upiId : m.upiId,
          upiAccounts: updates.upiAccounts || m.upiAccounts,
        };
      }
      return m;
    });
  });

  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true, account: db.accounts[idx] });
});

// Groups: Create Group
app.post('/api/groups', (req, res) => {
  const { name, emoji, description, currency, members, createdBy, targetBudget, kittyActive } = req.body;

  const newGroup = {
    id: 'g_' + Date.now(),
    name: name.trim(),
    emoji: emoji || '🏖️',
    description: description?.trim() || undefined,
    currency: currency || '₹',
    members: members || [],
    createdBy,
    targetBudget,
    kittyActive: kittyActive !== undefined ? kittyActive : true,
    createdAt: new Date().toISOString(),
  };

  db.groups.unshift(newGroup);
  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true, group: newGroup });
});

// Groups: Delete Group (Creator Only)
app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const group = db.groups.find((g: any) => g.id === id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

  if (group.createdBy !== userId) {
    return res.status(403).json({ success: false, error: 'Only the group creator can delete this group.' });
  }

  db.groups = db.groups.filter((g: any) => g.id !== id);
  db.expenses = db.expenses.filter((e: any) => e.groupId !== id);
  db.settlements = db.settlements.filter((s: any) => s.groupId !== id);
  db.kittyContributions = db.kittyContributions.filter((k: any) => k.groupId !== id);
  db.kittyExpenses = db.kittyExpenses.filter((ke: any) => ke.groupId !== id);

  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true });
});

// Groups: Leave Group
app.post('/api/groups/:id/leave', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const group = db.groups.find((g: any) => g.id === id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

  if (group.createdBy === userId) {
    return res.status(400).json({ success: false, error: 'Group creator cannot leave the group.' });
  }

  group.members = group.members.filter((m: any) => m.id !== userId);
  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true });
});

// Groups: Invite by Email
app.post('/api/groups/:id/invite', (req, res) => {
  const { id } = req.params;
  const { email, inviterId, inviterName } = req.body;
  const group = db.groups.find((g: any) => g.id === id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

  const cleanEmail = email.trim().toLowerCase();

  const newInvite = {
    id: 'inv_' + Date.now(),
    groupId: group.id,
    groupName: group.name,
    groupEmoji: group.emoji,
    invitedEmail: cleanEmail,
    inviterName,
    inviterId,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  const newNotif = {
    id: 'notif_' + Date.now(),
    recipientEmail: cleanEmail,
    type: 'INVITE',
    title: 'Group Invitation ✉️',
    message: `${inviterName} invited you to join "${group.name}"`,
    relatedId: newInvite.id,
    groupId: group.id,
    createdAt: new Date().toISOString(),
    read: false,
  };

  db.invites.unshift(newInvite);
  db.notifications.unshift(newNotif);
  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true, invite: newInvite });
});

// Invites: Accept Invite
app.post('/api/invites/:id/accept', (req, res) => {
  const { id } = req.params;
  const { user } = req.body; // { id, name, avatar, email, upiId, upiAccounts, phone }

  const invite = db.invites.find((i: any) => i.id === id);
  if (!invite) return res.status(404).json({ success: false, error: 'Invite not found.' });

  const group = db.groups.find((g: any) => g.id === invite.groupId);
  if (group) {
    if (!group.members.some((m: any) => m.id === user.id || m.email === user.email)) {
      group.members.push({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        color: '#10b981',
        email: user.email,
        upiId: user.upiId,
        upiAccounts: user.upiAccounts || [],
        phone: user.phone,
      });
    }
  }

  invite.status = 'ACCEPTED';
  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true, group });
});

// Invites: Decline Invite
app.post('/api/invites/:id/decline', (req, res) => {
  const { id } = req.params;
  const invite = db.invites.find((i: any) => i.id === id);
  if (invite) {
    invite.status = 'DECLINED';
    saveDatabase();
    broadcast('STATE_UPDATED', db);
  }
  res.json({ success: true });
});

// Expenses: Add Expense
app.post('/api/expenses', (req, res) => {
  const expenseData = req.body; // title, amount, paidById, groupId, splitType, splits, requiresApproval
  const isApprovalReq = expenseData.requiresApproval;
  const approvals: Record<string, any> = {};
  const newNotifs: any[] = [];

  const payer = db.accounts.find((a: any) => a.id === expenseData.paidById);
  const payerName = payer?.name || 'Someone';

  if (isApprovalReq) {
    expenseData.splits.forEach((s: any) => {
      if (s.memberId !== expenseData.paidById) {
        approvals[s.memberId] = {
          memberId: s.memberId,
          status: 'PENDING',
        };

        newNotifs.push({
          id: 'notif_exp_' + Date.now() + '_' + s.memberId,
          recipientUserId: s.memberId,
          type: 'BILL_APPROVAL',
          title: 'New Bill Awaiting Approval 🧾',
          message: `${payerName} split "${expenseData.title}" (Your share: ₹${s.amount.toFixed(0)})`,
          groupId: expenseData.groupId,
          relatedId: 'e_' + Date.now(),
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    });
  }

  const newExpense = {
    ...expenseData,
    id: 'e_' + Date.now(),
    status: isApprovalReq && Object.keys(approvals).length > 0 ? 'PENDING_APPROVAL' : 'CONFIRMED',
    approvals,
  };

  db.expenses.unshift(newExpense);
  db.notifications.unshift(...newNotifs);
  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true, expense: newExpense });
});

// Expenses: Respond to Approval (Accept or Dispute)
app.post('/api/expenses/:id/respond', (req, res) => {
  const { id } = req.params;
  const { memberId, status, queryNote } = req.body;

  const expense = db.expenses.find((e: any) => e.id === id);
  if (!expense) return res.status(404).json({ success: false, error: 'Expense not found.' });

  expense.approvals = expense.approvals || {};
  expense.approvals[memberId] = {
    memberId,
    status,
    respondedAt: new Date().toISOString(),
    queryNote: queryNote || undefined,
  };

  const approvalValues = Object.values(expense.approvals);
  const hasDispute = approvalValues.some((a: any) => a.status === 'DISPUTED');
  const allAccepted = approvalValues.length > 0 && approvalValues.every((a: any) => a.status === 'ACCEPTED');

  if (hasDispute) {
    expense.status = 'PENDING_APPROVAL';
  } else if (allAccepted) {
    expense.status = 'CONFIRMED';
  }

  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true, expense });
});

// Expenses: Send Re-Request Reminder
app.post('/api/expenses/:id/remind', (req, res) => {
  const { id } = req.params;
  const { memberId, senderName } = req.body;

  const expense = db.expenses.find((e: any) => e.id === id);
  if (!expense) return res.status(404).json({ success: false, error: 'Expense not found.' });

  const mySplit = expense.splits.find((s: any) => s.memberId === memberId);
  const amountStr = mySplit ? `₹${mySplit.amount.toFixed(0)}` : '';

  if (expense.approvals && expense.approvals[memberId]) {
    expense.approvals[memberId].lastReminderAt = new Date().toISOString();
  }

  const notif = {
    id: 'notif_rem_' + Date.now(),
    recipientUserId: memberId,
    type: 'REMINDER',
    title: 'Reminder: Bill Approval ⏰',
    message: `${senderName || 'Friend'} requested you to accept "${expense.title}" (${amountStr})`,
    relatedId: expense.id,
    groupId: expense.groupId,
    createdAt: new Date().toISOString(),
    read: false,
  };

  db.notifications.unshift(notif);
  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true });
});

// Settlements: Record Payment
app.post('/api/settlements', (req, res) => {
  const settlementData = req.body;
  const newSettlement = {
    ...settlementData,
    id: 's_' + Date.now(),
    date: new Date().toISOString(),
    confirmed: true,
  };

  db.settlements.unshift(newSettlement);
  saveDatabase();
  broadcast('STATE_UPDATED', db);

  res.json({ success: true, settlement: newSettlement });
});

// Kitty: Add Contribution
app.post('/api/kitty/contribute', (req, res) => {
  const entry = {
    ...req.body,
    id: 'k_' + Date.now(),
    date: new Date().toISOString(),
  };
  db.kittyContributions.unshift(entry);
  saveDatabase();
  broadcast('STATE_UPDATED', db);
  res.json({ success: true, entry });
});

// Kitty: Spend from Kitty
app.post('/api/kitty/expense', (req, res) => {
  const expense = {
    ...req.body,
    id: 'ke_' + Date.now(),
    date: new Date().toISOString(),
  };
  db.kittyExpenses.unshift(expense);
  saveDatabase();
  broadcast('STATE_UPDATED', db);
  res.json({ success: true, expense });
});

// Clear All Data
app.post('/api/reset', (req, res) => {
  db = {
    ...INITIAL_DATA,
    groups: [],
    expenses: [],
    settlements: [],
    kittyContributions: [],
    kittyExpenses: [],
    invites: [],
    notifications: [],
  };
  saveDatabase();
  broadcast('STATE_UPDATED', db);
  res.json({ success: true });
});

// Start listening on port 3001
const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SplitShare Real-Time Server running on port ${PORT}`);
});
