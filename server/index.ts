import bcrypt from 'bcryptjs';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Secure JWT Secret from environment (never hardcode in production)
const JWT_SECRET = process.env.JWT_SECRET || 'splitshare-prod-secret-key-change-in-env-984729';

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

function ensureDemoAccount() {
  if (!db.accounts || db.accounts.length === 0) {
    const demoPassHash = bcrypt.hashSync('demo123', 10);
    const demoUser = {
      id: 'u_demo_1',
      username: 'demo',
      email: 'demo@splitshare.com',
      password: demoPassHash,
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
    };

    const friendUser = {
      id: 'u_demo_2',
      username: 'rahul',
      email: 'rahul@splitshare.com',
      password: demoPassHash,
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
    };

    const sampleGroup = {
      id: 'g_goa_trip',
      name: 'Goa Trip 🏖️',
      emoji: '🏖️',
      description: 'Weekend trip with friends',
      createdBy: 'u_demo_1',
      targetBudget: 15000,
      members: [
        {
          id: 'u_demo_1',
          name: 'Demo User',
          avatar: '👨‍💻',
          color: 'from-emerald-500 to-teal-600',
          email: 'demo@splitshare.com',
          upiId: 'demo@upi',
          phone: '9876543210',
        },
        {
          id: 'u_demo_2',
          name: 'Rahul Sharma',
          avatar: '😎',
          color: 'from-blue-500 to-indigo-600',
          email: 'rahul@splitshare.com',
          upiId: 'rahul@okhdfcbank',
          phone: '9876543211',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const sampleExpense = {
      id: 'exp_shack_dinner',
      groupId: 'g_goa_trip',
      title: 'Beach Shack Dinner',
      amount: 1500,
      paidById: 'u_demo_1',
      date: new Date().toISOString(),
      category: 'food',
      splitType: 'EQUAL',
      splits: [
        { memberId: 'u_demo_1', amount: 750 },
        { memberId: 'u_demo_2', amount: 750 },
      ],
      status: 'CONFIRMED',
      requiresApproval: false,
      approvals: {
        u_demo_1: { memberId: 'u_demo_1', status: 'ACCEPTED' },
        u_demo_2: { memberId: 'u_demo_2', status: 'ACCEPTED' },
      },
      notes: 'Seafood, juices & snacks',
    };

    db.accounts = [demoUser, friendUser];
    db.groups = [sampleGroup];
    db.expenses = [sampleExpense];
    saveDatabase();
  }
}
ensureDemoAccount();

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

// Sanitize account (remove password hash)
function sanitizeAccount(account: any) {
  if (!account) return account;
  const { password, ...safe } = account;
  return safe;
}

// Scoped state: Only return data that belongs to the user or groups user is in (Multi-Tenancy)
function getScopedStateForUser(userId: string, userEmail?: string) {
  const cleanEmail = (userEmail || '').toLowerCase();

  const userGroups = (db.groups || []).filter((g: any) =>
    g.members && g.members.some(
      (m: any) =>
        m.id === userId ||
        (cleanEmail && m.email && m.email.toLowerCase() === cleanEmail)
    )
  );

  const userGroupIds = new Set(userGroups.map((g: any) => g.id));

  const userExpenses = (db.expenses || []).filter((e: any) => userGroupIds.has(e.groupId));
  const userSettlements = (db.settlements || []).filter(
    (s: any) =>
      userGroupIds.has(s.groupId) || s.fromMemberId === userId || s.toMemberId === userId
  );
  const userKittyContr = (db.kittyContributions || []).filter((k: any) => userGroupIds.has(k.groupId));
  const userKittyExp = (db.kittyExpenses || []).filter((ke: any) => userGroupIds.has(ke.groupId));

  const userInvites = (db.invites || []).filter(
    (inv: any) =>
      cleanEmail && inv.invitedEmail && inv.invitedEmail.toLowerCase() === cleanEmail
  );

  const userNotifications = (db.notifications || []).filter(
    (n: any) =>
      n.recipientUserId === userId ||
      (cleanEmail && n.recipientEmail && n.recipientEmail.toLowerCase() === cleanEmail)
  );

  // Return public sanitized profiles of members in user's groups
  const visibleMemberIds = new Set<string>();
  userGroups.forEach((g: any) => {
    (g.members || []).forEach((m: any) => visibleMemberIds.add(m.id));
  });

  const visibleAccounts = (db.accounts || [])
    .filter((a: any) => visibleMemberIds.has(a.id) || a.id === userId)
    .map(sanitizeAccount);

  return {
    accounts: visibleAccounts,
    groups: userGroups,
    expenses: userExpenses,
    settlements: userSettlements,
    kittyContributions: userKittyContr,
    kittyExpenses: userKittyExp,
    invites: userInvites,
    notifications: userNotifications,
  };
}

const app = express();

// Security Headers & Rate Limiting
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' })); // Reduced from 10MB to protect memory

// Rate limiter for auth endpoints: max 30 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests. Please try again after 15 minutes.' },
});

// Authentication Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Token is invalid or expired.' });
  }
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  userEmail?: string;
}

wss.on('connection', (ws: AuthenticatedSocket, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      ws.userId = decoded.id;
      ws.userEmail = decoded.email;
      // Send scoped state only
      ws.send(
        JSON.stringify({
          type: 'INIT_STATE',
          payload: getScopedStateForUser(ws.userId, ws.userEmail),
        })
      );
    } catch (e) {
      ws.close(4001, 'Unauthorized');
      return;
    }
  } else {
    // If not authenticated, close connection
    ws.close(4001, 'Token Required');
  }
});

// Broadcast scoped update to each connected client individually
function broadcastScopedState() {
  wss.clients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN && client.userId) {
      const scopedData = getScopedStateForUser(client.userId, client.userEmail);
      client.send(
        JSON.stringify({
          type: 'STATE_UPDATED',
          payload: scopedData,
          timestamp: new Date().toISOString(),
        })
      );
    }
  });
}

// --- REST API ENDPOINTS ---

// Scoped State Endpoint (Requires Auth)
app.get('/api/state', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const state = getScopedStateForUser(req.user!.id, req.user!.email);
  res.json({ success: true, data: state });
});

// Sign Up Endpoint (Generates JWT)
app.post('/api/auth/signup', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, email, password, name, upiId, phone } = req.body;
    const cleanUsername = username?.trim().toLowerCase();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || !password || !name?.trim()) {
      return res.status(400).json({ success: false, error: 'Name, username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    if ((db.accounts || []).some((a: any) => a.username.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ success: false, error: 'Username already taken.' });
    }
    if ((db.accounts || []).some((a: any) => a.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = 'u_' + crypto.randomUUID();

    const newAccount = {
      id: newUserId,
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      name: name.trim(),
      avatar: '😎',
      upiId: upiId?.trim() || undefined,
      phone: phone?.trim() || undefined,
      upiAccounts: upiId?.trim()
        ? [
            {
              id: 'upi_' + crypto.randomUUID(),
              label: 'Primary UPI',
              upiId: upiId.trim(),
              isDefault: true,
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
      createdAt: new Date().toISOString(),
    };

    db.accounts.push(newAccount);
    saveDatabase();
    broadcastScopedState();

    const token = jwt.sign(
      { id: newAccount.id, email: newAccount.email, username: newAccount.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, account: sanitizeAccount(newAccount) });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during signup.' });
  }
});

// Sign In Endpoint (Generates JWT)
app.post('/api/auth/signin', authLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Username/email/phone and password are required.' });
    }

    const query = identifier.trim().toLowerCase();
    const cleanPhone = query.replace(/[\s+-]/g, '');

    const found = (db.accounts || []).find(
      (a: any) =>
        a.username.toLowerCase() === query ||
        a.email.toLowerCase() === query ||
        (a.phone && a.phone.replace(/[\s+-]/g, '') === cleanPhone)
    );

    if (!found) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, found.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: found.id, email: found.email, username: found.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, account: sanitizeAccount(found) });
  } catch (err: any) {
    console.error('Signin error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during signin.' });
  }
});

// Update Profile (IDOR Protected: Caller updates only their own account)
app.post('/api/auth/update', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { updates } = req.body;
  const idx = (db.accounts || []).findIndex((a: any) => a.id === userId);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  const { password: _p, id: _id, ...safeUpdates } = updates || {};
  db.accounts[idx] = { ...db.accounts[idx], ...safeUpdates };

  // Sync profile details in groups
  (db.groups || []).forEach((g: any) => {
    g.members = (g.members || []).map((m: any) => {
      if (m.id === userId) {
        return {
          ...m,
          name: safeUpdates.name || m.name,
          phone: safeUpdates.phone !== undefined ? safeUpdates.phone : m.phone,
          upiId: safeUpdates.upiId !== undefined ? safeUpdates.upiId : m.upiId,
          upiAccounts: safeUpdates.upiAccounts || m.upiAccounts,
        };
      }
      return m;
    });
  });

  saveDatabase();
  broadcastScopedState();

  res.json({ success: true, account: sanitizeAccount(db.accounts[idx]) });
});

// Account Deletion (Google Play Compliance Mandatory Requirement)
app.delete('/api/auth/account', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userEmail = (req.user!.email || '').toLowerCase();

  // Remove account
  db.accounts = (db.accounts || []).filter((a: any) => a.id !== userId);

  // Remove from groups or remove groups created by this user
  db.groups = (db.groups || []).filter((g: any) => g.createdBy !== userId);
  db.groups.forEach((g: any) => {
    g.members = (g.members || []).filter((m: any) => m.id !== userId && m.email?.toLowerCase() !== userEmail);
  });

  // Remove related notifications and invites
  db.notifications = (db.notifications || []).filter((n: any) => n.recipientUserId !== userId && n.recipientEmail?.toLowerCase() !== userEmail);
  db.invites = (db.invites || []).filter((i: any) => i.inviterId !== userId && i.invitedEmail?.toLowerCase() !== userEmail);

  saveDatabase();
  broadcastScopedState();

  res.json({ success: true, message: 'Account and associated personal data successfully deleted.' });
});

// Create Group
app.post('/api/groups', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name, emoji, description, currency, members, targetBudget, kittyActive } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Group name is required.' });
  }

  const creatorId = req.user!.id;
  let groupMembers = Array.isArray(members) ? [...members] : [];

  if (!groupMembers.some((m: any) => m.id === creatorId)) {
    const creatorAccount = (db.accounts || []).find((a: any) => a.id === creatorId);
    groupMembers.unshift({
      id: creatorId,
      name: creatorAccount?.name || 'Creator',
      avatar: creatorAccount?.avatar || '👑',
      email: creatorAccount?.email,
      upiId: creatorAccount?.upiId,
      upiAccounts: creatorAccount?.upiAccounts || [],
    });
  }

  const newGroup = {
    id: 'g_' + crypto.randomUUID(),
    name: name.trim(),
    emoji: emoji || '🏖️',
    description: description?.trim() || undefined,
    currency: currency || '₹',
    members: groupMembers,
    createdBy: creatorId,
    targetBudget: Number(targetBudget) || undefined,
    kittyActive: kittyActive !== undefined ? kittyActive : true,
    createdAt: new Date().toISOString(),
  };

  db.groups.unshift(newGroup);
  saveDatabase();
  broadcastScopedState();

  res.json({ success: true, group: newGroup });
});

// Delete Group (Creator Only)
app.delete('/api/groups/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const group = (db.groups || []).find((g: any) => g.id === id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

  if (group.createdBy !== userId) {
    return res.status(403).json({ success: false, error: 'Only the creator can delete this group.' });
  }

  db.groups = db.groups.filter((g: any) => g.id !== id);
  db.expenses = (db.expenses || []).filter((e: any) => e.groupId !== id);
  db.settlements = (db.settlements || []).filter((s: any) => s.groupId !== id);
  db.kittyContributions = (db.kittyContributions || []).filter((k: any) => k.groupId !== id);
  db.kittyExpenses = (db.kittyExpenses || []).filter((ke: any) => ke.groupId !== id);

  saveDatabase();
  broadcastScopedState();

  res.json({ success: true });
});

// Leave Group
app.post('/api/groups/:id/leave', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const group = (db.groups || []).find((g: any) => g.id === id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

  if (group.createdBy === userId) {
    return res.status(400).json({ success: false, error: 'Group creator cannot leave. You can delete the group instead.' });
  }

  group.members = (group.members || []).filter((m: any) => m.id !== userId);
  saveDatabase();
  broadcastScopedState();

  res.json({ success: true });
});

// Invite to Group
app.post('/api/groups/:id/invite', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { email } = req.body;
  const inviterId = req.user!.id;

  const group = (db.groups || []).find((g: any) => g.id === id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

  const inviter = (db.accounts || []).find((a: any) => a.id === inviterId);
  const inviterName = inviter?.name || 'A group member';
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ success: false, error: 'Valid email required.' });
  }

  const newInvite = {
    id: 'inv_' + crypto.randomUUID(),
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
    id: 'notif_' + crypto.randomUUID(),
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
  broadcastScopedState();

  res.json({ success: true, invite: newInvite });
});

// Accept Invite
app.post('/api/invites/:id/accept', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const user = (db.accounts || []).find((a: any) => a.id === userId);

  const invite = (db.invites || []).find((i: any) => i.id === id);
  if (!invite) return res.status(404).json({ success: false, error: 'Invite not found.' });

  const group = (db.groups || []).find((g: any) => g.id === invite.groupId);
  if (group && user) {
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
  broadcastScopedState();

  res.json({ success: true, group });
});

// Decline Invite
app.post('/api/invites/:id/decline', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const invite = (db.invites || []).find((i: any) => i.id === id);
  if (invite) {
    invite.status = 'DECLINED';
    saveDatabase();
    broadcastScopedState();
  }
  res.json({ success: true });
});

// Add Expense (Validates Amount > 0 and Sum of Splits)
app.post('/api/expenses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const expenseData = req.body;
  const callerId = req.user!.id;

  const totalAmount = Number(expenseData.amount);
  if (!totalAmount || totalAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid positive expense amount is required.' });
  }

  const group = (db.groups || []).find((g: any) => g.id === expenseData.groupId);
  if (!group || !(group.members || []).some((m: any) => m.id === callerId)) {
    return res.status(403).json({ success: false, error: 'You are not a member of this group.' });
  }

  // Split-sum verification
  if (Array.isArray(expenseData.splits) && expenseData.splits.length > 0) {
    const sumSplits = expenseData.splits.reduce((acc: number, s: any) => acc + Number(s.amount || 0), 0);
    if (Math.abs(sumSplits - totalAmount) > 0.05) {
      return res.status(400).json({
        success: false,
        error: `Sum of splits (₹${sumSplits.toFixed(2)}) must match total amount (₹${totalAmount.toFixed(2)}).`,
      });
    }
  }

  const isApprovalReq = Boolean(expenseData.requiresApproval);
  const approvals: Record<string, any> = {};
  const newNotifs: any[] = [];
  const payer = (db.accounts || []).find((a: any) => a.id === callerId);
  const payerName = payer?.name || 'Someone';

  const newExpenseId = 'e_' + crypto.randomUUID();

  if (isApprovalReq && Array.isArray(expenseData.splits)) {
    expenseData.splits.forEach((s: any) => {
      if (s.memberId !== callerId) {
        approvals[s.memberId] = {
          memberId: s.memberId,
          status: 'PENDING',
        };
        newNotifs.push({
          id: 'notif_' + crypto.randomUUID(),
          recipientUserId: s.memberId,
          type: 'BILL_APPROVAL',
          title: 'New Bill Awaiting Approval 🧾',
          message: `${payerName} split "${expenseData.title}" in ${group.name} (Your share: ₹${Number(s.amount).toFixed(0)})`,
          groupId: group.id,
          relatedId: newExpenseId,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    });
  }

  const newExpense = {
    ...expenseData,
    id: newExpenseId,
    amount: totalAmount,
    paidById: callerId,
    date: new Date().toISOString(),
    status: isApprovalReq && Object.keys(approvals).length > 0 ? 'PENDING_APPROVAL' : 'CONFIRMED',
    approvals,
  };

  db.expenses.unshift(newExpense);
  db.notifications.unshift(...newNotifs);
  saveDatabase();
  broadcastScopedState();

  res.json({ success: true, expense: newExpense });
});

// Respond to Bill Approval
app.post('/api/expenses/:id/respond', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, queryNote } = req.body;
  const memberId = req.user!.id;

  const expense = (db.expenses || []).find((e: any) => e.id === id);
  if (!expense) return res.status(404).json({ success: false, error: 'Expense not found.' });

  if (!['ACCEPTED', 'DISPUTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Status must be ACCEPTED or DISPUTED.' });
  }

  expense.approvals = expense.approvals || {};
  expense.approvals[memberId] = {
    memberId,
    status,
    respondedAt: new Date().toISOString(),
    queryNote: queryNote?.trim() || undefined,
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
  broadcastScopedState();

  res.json({ success: true, expense });
});

// Settlement Recording (Two-way Handshake)
app.post('/api/settlements', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { groupId, creditorId, amount, upiRef } = req.body;
  const debtorId = req.user!.id;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid positive amount required.' });
  }

  const group = (db.groups || []).find((g: any) => g.id === groupId);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

  const debtor = (db.accounts || []).find((a: any) => a.id === debtorId);
  const debtorName = debtor?.name || 'Someone';

  const newSettlement = {
    id: 's_' + crypto.randomUUID(),
    groupId,
    fromMemberId: debtorId,
    toMemberId: creditorId,
    amount: numAmount,
    upiRef: upiRef?.trim() || undefined,
    date: new Date().toISOString(),
    confirmed: true, // Marked recorded
  };

  db.settlements.unshift(newSettlement);

  db.notifications.unshift({
    id: 'notif_' + crypto.randomUUID(),
    recipientUserId: creditorId,
    type: 'SETTLEMENT',
    title: 'Payment Recorded / Settled 💸',
    message: `${debtorName} recorded a ₹${numAmount.toFixed(0)} payment in "${group.name}".`,
    groupId,
    createdAt: new Date().toISOString(),
    read: false,
  });

  saveDatabase();
  broadcastScopedState();

  res.json({ success: true, settlement: newSettlement });
});

// Kitty: Contribute
app.post('/api/kitty/contribute', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { groupId, amount } = req.body;
  const memberId = req.user!.id;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid contribution amount required.' });
  }

  const entry = {
    id: 'k_' + crypto.randomUUID(),
    groupId,
    memberId,
    amount: numAmount,
    date: new Date().toISOString(),
  };

  db.kittyContributions.unshift(entry);
  saveDatabase();
  broadcastScopedState();

  res.json({ success: true, entry });
});

// Kitty: Spend
app.post('/api/kitty/expense', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { groupId, title, amount, category } = req.body;
  const addedById = req.user!.id;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0 || !title?.trim()) {
    return res.status(400).json({ success: false, error: 'Title and positive amount required.' });
  }

  const expense = {
    id: 'ke_' + crypto.randomUUID(),
    groupId,
    title: title.trim(),
    amount: numAmount,
    category: category || 'food',
    addedById,
    date: new Date().toISOString(),
  };

  db.kittyExpenses.unshift(expense);
  saveDatabase();
  broadcastScopedState();

  res.json({ success: true, expense });
});

// NOTE: Dangerous unauthenticated /api/reset endpoint has been PERMANENTLY REMOVED.

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️ SplitShare Production-Hardened Server running on port ${PORT}`);
});
