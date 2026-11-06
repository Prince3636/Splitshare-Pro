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
import mongoose, { Schema } from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-load environment variables from .env
if (typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile();
  } catch {}
} else {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (key && !process.env[key]) {
              process.env[key] = val.replace(/^["']|["']$/g, '');
            }
          }
        }
      }
    }
  } catch {}
}

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Secure JWT Secret from environment (never hardcode in production)
const JWT_SECRET = process.env.JWT_SECRET || 'splitshare-prod-secret-key-change-in-env-984729';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('splitshare-prod-secret'))) {
  console.warn('⚠️ SECURITY WARNING: Using default/weak JWT_SECRET in production. Set a random JWT_SECRET in environment variables.');
}

// MongoDB Atlas Configuration & Flexible Auto-Sync
const MONGODB_URI = process.env.MONGODB_URI || '';
let isMongoConnected = false;

const MongoAccount = mongoose.model('Account', new Schema({}, { strict: false }));
const MongoGroup = mongoose.model('Group', new Schema({}, { strict: false }));
const MongoExpense = mongoose.model('Expense', new Schema({}, { strict: false }));
const MongoSettlement = mongoose.model('Settlement', new Schema({}, { strict: false }));
const MongoKittyContribution = mongoose.model('KittyContribution', new Schema({}, { strict: false }));
const MongoKittyExpense = mongoose.model('KittyExpense', new Schema({}, { strict: false }));
const MongoInvite = mongoose.model('Invite', new Schema({}, { strict: false }));
const MongoNotification = mongoose.model('Notification', new Schema({}, { strict: false }));
const MongoMessage = mongoose.model('ChatMessage', new Schema({}, { strict: false }));

const INITIAL_DATA = {
  accounts: [],
  groups: [],
  expenses: [],
  settlements: [],
  kittyContributions: [],
  kittyExpenses: [],
  invites: [],
  notifications: [],
  messages: [],
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

async function syncMongoToMemory() {
  try {
    const [accounts, groups, expenses, settlements, kittyContributions, kittyExpenses, invites, notifications, messages] =
      await Promise.all([
        MongoAccount.find({}).lean(),
        MongoGroup.find({}).lean(),
        MongoExpense.find({}).lean(),
        MongoSettlement.find({}).lean(),
        MongoKittyContribution.find({}).lean(),
        MongoKittyExpense.find({}).lean(),
        MongoInvite.find({}).lean(),
        MongoNotification.find({}).lean(),
        MongoMessage.find({}).lean(),
      ]);

    db.accounts = accounts.map(({ _id, __v, ...rest }: any) => rest);
    db.groups = groups.map(({ _id, __v, ...rest }: any) => rest);
    db.expenses = expenses.map(({ _id, __v, ...rest }: any) => rest);
    db.settlements = settlements.map(({ _id, __v, ...rest }: any) => rest);
    db.kittyContributions = kittyContributions.map(({ _id, __v, ...rest }: any) => rest);
    db.kittyExpenses = kittyExpenses.map(({ _id, __v, ...rest }: any) => rest);
    db.invites = invites.map(({ _id, __v, ...rest }: any) => rest);
    db.notifications = notifications.map(({ _id, __v, ...rest }: any) => rest);
    db.messages = messages.map(({ _id, __v, ...rest }: any) => rest);

    console.log('🍃 Loaded database state from MongoDB Atlas.');
    saveDatabase();
    broadcastScopedState();
  } catch (err: any) {
    console.error('Error syncing from MongoDB:', err.message);
  }
}

if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      isMongoConnected = true;
      console.log('🍃 MongoDB Atlas Connected Successfully!');
      syncMongoToMemory();
    })
    .catch((err) => {
      console.error('⚠️ MongoDB connection error, falling back to local database:', err.message);
    });
} else {
  console.log('ℹ️ Running on local database. Set MONGODB_URI in .env to connect MongoDB Atlas.');
}

async function syncMemoryToMongo() {
  if (!isMongoConnected) return;
  const collections = [
    { model: MongoAccount, data: db.accounts, key: 'id' },
    { model: MongoGroup, data: db.groups, key: 'id' },
    { model: MongoExpense, data: db.expenses, key: 'id' },
    { model: MongoSettlement, data: db.settlements, key: 'id' },
    { model: MongoKittyContribution, data: db.kittyContributions, key: 'id' },
    { model: MongoKittyExpense, data: db.kittyExpenses, key: 'id' },
    { model: MongoInvite, data: db.invites, key: 'id' },
    { model: MongoNotification, data: db.notifications, key: 'id' },
    { model: MongoMessage, data: db.messages || [], key: 'id' },
  ];

  for (const { model, data, key } of collections) {
    if (!data || data.length === 0) continue;
    const ops = data.map((item: any) => ({
      updateOne: {
        filter: { [key]: item[key] },
        update: { $set: item },
        upsert: true,
      },
    }));
    await (model as any).bulkWrite(ops);
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving database:', e);
  }

  if (isMongoConnected) {
    syncMemoryToMongo().catch((err) => console.error('Error syncing to MongoDB:', err.message));
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

  const userMessages = (db.messages || []).filter((m: any) => userGroupIds.has(m.groupId));

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
    messages: userMessages,
  };
}

const app = express();

// Security Headers & Rate Limiting
app.use(helmet());

// Hardened CORS policy: Restrict to official web app, Capacitor mobile origins & local development
const allowedOrigins = [
  'https://split-share-puce.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
];

if (process.env.CORS_ALLOWED_ORIGINS) {
  const custom = process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  allowedOrigins.push(...custom);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, native curl, or Capacitor webview)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by SplitShare CORS policy'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' })); // Reduced from 10MB to protect memory

// Global API rate limiter: max 300 requests per 15 minutes per IP
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalApiLimiter);

// Rate limiter for auth endpoints: max 30 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
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

// Health check endpoint (for monitoring, auto-recovery & Render free tier anti-sleep ping)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: isMongoConnected ? 'mongodb-atlas' : 'local-json',
  });
});

// Scoped State Endpoint (Requires Auth)
app.get('/api/state', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const state = getScopedStateForUser(req.user!.id, req.user!.email);
  res.json({ success: true, data: state });
});

// Sign Up Endpoint (Generates JWT)
app.post('/api/auth/signup', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name, upiId, avatar } = req.body;
    const cleanEmail = email?.trim().toLowerCase();
    const cleanName = name?.trim();

    if (!cleanEmail || !password || !cleanName) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    if ((db.accounts || []).some((a: any) => a.email && a.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ success: false, error: 'This email is already registered. Please sign in.' });
    }

    let baseUsername = req.body.username?.trim().toLowerCase() || cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    if (!baseUsername) baseUsername = 'user';
    let cleanUsername = baseUsername;
    let count = 1;
    while ((db.accounts || []).some((a: any) => a.username && a.username.toLowerCase() === cleanUsername)) {
      cleanUsername = `${baseUsername}_${Math.floor(Math.random() * 8999 + 1000)}`;
      count++;
      if (count > 10) break;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = 'u_' + crypto.randomUUID();

    const newAccount = {
      id: newUserId,
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      name: cleanName,
      avatar: avatar || '😎',
      upiId: upiId?.trim() || undefined,
      phone: req.body.phone?.trim() || undefined,
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
    res.status(500).json({ success: false, error: 'Service is temporarily busy. Please try signing up again in a moment.' });
  }
});

// Sign In Endpoint (Email & Password Login)
app.post('/api/auth/signin', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, identifier, password } = req.body;
    const loginEmail = (email || identifier)?.trim().toLowerCase();
    if (!loginEmail || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const found = (db.accounts || []).find(
      (a: any) =>
        (a.email && a.email.toLowerCase() === loginEmail) ||
        (a.username && a.username.toLowerCase() === loginEmail)
    );

    if (!found) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, found.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: found.id, email: found.email, username: found.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, account: sanitizeAccount(found) });
  } catch (err: any) {
    console.error('Signin error:', err);
    res.status(500).json({ success: false, error: 'Service is temporarily busy. Please try signing in again in a moment.' });
  }
});

// Federated / Social Sign-In (Exchanges verified profile for SplitShare JWT)
app.post('/api/auth/federated', authLimiter, async (req: Request, res: Response) => {
  try {
    const { account, idToken } = req.body;
    if (!account || !account.id || !account.email) {
      return res.status(400).json({ success: false, error: 'Valid account profile required.' });
    }

    const cleanEmail = account.email.trim().toLowerCase();

    // Cryptographic token verification for Google / Firebase identities
    if (idToken) {
      try {
        const verifyRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
        );
        if (verifyRes.ok) {
          const tokenInfo = (await verifyRes.json()) as any;
          if (tokenInfo.email && tokenInfo.email.toLowerCase() !== cleanEmail) {
            return res.status(401).json({ success: false, error: 'Email does not match verified identity token.' });
          }
        } else {
          return res.status(401).json({ success: false, error: 'Invalid Google identity token.' });
        }
      } catch (tokenErr) {
        console.warn('Identity token verification unreachable:', tokenErr);
      }
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, error: 'Cryptographic identity token is required for federated sign-in.' });
    }

    let found = (db.accounts || []).find(
      (a: any) => a.id === account.id || a.email.toLowerCase() === cleanEmail
    );

    if (!found) {
      found = {
        id: account.id,
        username: account.username || cleanEmail.split('@')[0],
        email: cleanEmail,
        name: account.name || 'SplitShare User',
        avatar: account.avatar || '😎',
        phone: account.phone || undefined,
        upiId: account.upiId || undefined,
        upiAccounts: account.upiAccounts || [],
        createdAt: new Date().toISOString(),
      };
      db.accounts.push(found);
      saveDatabase();
      broadcastScopedState();
    }

    const token = jwt.sign(
      { id: found.id, email: found.email, username: found.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, account: sanitizeAccount(found) });
  } catch (err: any) {
    console.error('Federated auth error:', err);
    res.status(500).json({ success: false, error: 'Authentication service temporarily busy. Please try again shortly.' });
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

  // Authorization check: Only existing group members can invite others
  if (!(group.members || []).some((m: any) => m.id === inviterId)) {
    return res.status(403).json({ success: false, error: 'Only members of this group can send invitations.' });
  }

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

  // Authorization check: User email must match invite email
  const cleanUserEmail = (req.user!.email || user?.email || '').toLowerCase();
  if (invite.invitedEmail && invite.invitedEmail.toLowerCase() !== cleanUserEmail) {
    return res.status(403).json({ success: false, error: 'You are not authorized to accept this invite.' });
  }

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
  if (!invite) return res.status(404).json({ success: false, error: 'Invite not found.' });

  // Authorization check: User email must match invite email
  const cleanUserEmail = (req.user!.email || '').toLowerCase();
  if (invite.invitedEmail && invite.invitedEmail.toLowerCase() !== cleanUserEmail) {
    return res.status(403).json({ success: false, error: 'You are not authorized to decline this invite.' });
  }

  invite.status = 'DECLINED';
  saveDatabase();
  broadcastScopedState();
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
  } else {
    // Notify other members that a new bill was added
    (group.members || []).forEach((m: any) => {
      if (m.id !== callerId) {
        newNotifs.push({
          id: 'notif_' + crypto.randomUUID(),
          recipientUserId: m.id,
          type: 'EXPENSE_ADDED',
          title: 'New Expense Added 💸',
          message: `${payerName} added "${expenseData.title}" in ${group.name} (₹${totalAmount.toFixed(0)})`,
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
    currency: expenseData.currency || 'INR',
    originalAmount: expenseData.originalAmount ? Number(expenseData.originalAmount) : undefined,
    exchangeRate: expenseData.exchangeRate ? Number(expenseData.exchangeRate) : undefined,
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

  // Authorization check: Caller must be a member of the group where the bill was added
  const group = (db.groups || []).find((g: any) => g.id === expense.groupId);
  if (!group || !(group.members || []).some((m: any) => m.id === memberId)) {
    return res.status(403).json({ success: false, error: 'Access denied: You are not a member of this group.' });
  }

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

  // Notify the bill payer about the response
  if (expense.paidById && expense.paidById !== memberId) {
    const responder = (db.accounts || []).find((a: any) => a.id === memberId);
    const responderName = responder?.name || 'A member';
    db.notifications.unshift({
      id: 'notif_' + crypto.randomUUID(),
      recipientUserId: expense.paidById,
      type: status === 'ACCEPTED' ? 'EXPENSE_APPROVED' : 'BILL_APPROVAL',
      title: status === 'ACCEPTED' ? 'Bill Approved ✅' : 'Bill Query Raised ⚠️',
      message:
        status === 'ACCEPTED'
          ? `${responderName} accepted your bill "${expense.title}".`
          : `${responderName} questioned "${expense.title}": "${queryNote || 'Needs check'}"`,
      groupId: expense.groupId,
      relatedId: expense.id,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  saveDatabase();
  broadcastScopedState();

  res.json({ success: true, expense });
});

// Settlement Recording (Two-way Handshake)
app.post('/api/settlements', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { groupId, creditorId, amount, upiRef, proofImage } = req.body;
  const debtorId = req.user!.id;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid positive amount required.' });
  }

  const group = (db.groups || []).find((g: any) => g.id === groupId);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

  // Authorization checks: Debtor and Creditor must both be members of this group
  if (!(group.members || []).some((m: any) => m.id === debtorId)) {
    return res.status(403).json({ success: false, error: 'You are not a member of this group.' });
  }

  if (creditorId && !(group.members || []).some((m: any) => m.id === creditorId)) {
    return res.status(400).json({ success: false, error: 'Payment recipient is not a member of this group.' });
  }

  const debtor = (db.accounts || []).find((a: any) => a.id === debtorId);
  const debtorName = debtor?.name || 'Someone';

  const newSettlement = {
    id: 's_' + crypto.randomUUID(),
    groupId,
    fromMemberId: debtorId,
    toMemberId: creditorId,
    amount: numAmount,
    upiRef: upiRef?.trim() || undefined,
    proofImage: proofImage || undefined,
    date: new Date().toISOString(),
    confirmed: true, // Marked recorded
  };

  db.settlements.unshift(newSettlement);

  db.notifications.unshift({
    id: 'notif_' + crypto.randomUUID(),
    recipientUserId: creditorId,
    type: 'SETTLEMENT',
    title: proofImage ? 'Payment Proof Received 🧾' : 'Payment Recorded / Settled 💸',
    message: `${debtorName} recorded a ₹${numAmount.toFixed(0)} payment in "${group.name}".${proofImage ? ' Screenshot attached.' : ''}`,
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

  const group = (db.groups || []).find((g: any) => g.id === groupId);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

  // Authorization check: Caller must be a group member
  if (!(group.members || []).some((m: any) => m.id === memberId)) {
    return res.status(403).json({ success: false, error: 'You are not a member of this group.' });
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

  const group = (db.groups || []).find((g: any) => g.id === groupId);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found.' });

  // Authorization check: Caller must be a group member
  if (!(group.members || []).some((m: any) => m.id === addedById)) {
    return res.status(403).json({ success: false, error: 'You are not a member of this group.' });
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

// --- GROUP CHAT ENDPOINTS ---

// Get group chat messages
app.get('/api/groups/:groupId/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { groupId } = req.params;
  const group = (db.groups || []).find((g: any) => g.id === groupId);
  if (!group || !(group.members || []).some((m: any) => m.id === req.user!.id)) {
    return res.status(403).json({ success: false, error: 'Access denied to group chat.' });
  }

  const groupMsgs = (db.messages || []).filter((m: any) => m.groupId === groupId);
  res.json({ success: true, data: groupMsgs });
});

// Send group chat message (Text + optional receipt/media)
app.post('/api/groups/:groupId/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { groupId } = req.params;
  const { text, mediaUrl } = req.body;
  if (!text?.trim() && !mediaUrl) {
    return res.status(400).json({ success: false, error: 'Message text or media is required.' });
  }

  const cleanText = (text || '').trim();
  if (cleanText.length > 2000) {
    return res.status(400).json({ success: false, error: 'Message text cannot exceed 2000 characters.' });
  }

  // Validate and cap mediaUrl (max 800KB base64 payload to prevent memory exhaustion / DoS)
  let cleanMediaUrl: string | undefined = undefined;
  if (mediaUrl) {
    if (typeof mediaUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid media format.' });
    }
    if (mediaUrl.length > 800 * 1024) {
      return res.status(400).json({ success: false, error: 'Attached photo is too large (max 600KB allowed).' });
    }
    if (!mediaUrl.startsWith('data:image/') && !mediaUrl.startsWith('https://')) {
      return res.status(400).json({ success: false, error: 'Only image attachments are allowed.' });
    }
    cleanMediaUrl = mediaUrl;
  }

  const group = (db.groups || []).find((g: any) => g.id === groupId);
  if (!group || !(group.members || []).some((m: any) => m.id === req.user!.id)) {
    return res.status(403).json({ success: false, error: 'Access denied to group chat.' });
  }

  const sender = (db.accounts || []).find((a: any) => a.id === req.user!.id);

  const message = {
    id: 'msg_' + crypto.randomUUID(),
    groupId,
    senderId: req.user!.id,
    senderName: sender?.name || req.user!.username || 'Member',
    senderAvatar: sender?.avatar || '😎',
    text: cleanText,
    mediaUrl: cleanMediaUrl,
    createdAt: new Date().toISOString(),
  };

  if (!db.messages) db.messages = [];
  db.messages.push(message);
  saveDatabase();
  broadcastScopedState();

  res.json({ success: true, message });
});

// NOTE: Dangerous unauthenticated /api/reset endpoint has been PERMANENTLY REMOVED.

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️ SplitShare Production-Hardened Server running on port ${PORT}`);
});

// Process-level Crash Resilience & Graceful Shutdown
process.on('uncaughtException', (err) => {
  console.error('🛡️ Uncaught Exception intercepted:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🛡️ Unhandled Rejection intercepted:', reason);
});

const gracefulShutdown = () => {
  console.log('🛡️ Gracefully shutting down SplitShare server...');
  server.close(() => {
    mongoose.disconnect().then(() => {
      console.log('🛡️ Closed MongoDB connection. Exiting process safely.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
