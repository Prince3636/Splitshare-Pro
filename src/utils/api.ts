/**
 * SplitShare Real-Time API & Authenticated WebSocket Client
 */

export function getBackendBaseUrl(): string {
  // 1. Check if user configured a custom backend in localStorage
  const savedUrl = localStorage.getItem('SPLITSHARE_SERVER_URL');
  if (savedUrl) {
    return savedUrl.replace(/\/$/, '');
  }

  // 2. Read from Vite environment variable (production / staging)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // 3. Web version running in browser uses relative path with Vite proxy
  return '';
}

export function setBackendBaseUrl(url: string) {
  if (!url) {
    localStorage.removeItem('SPLITSHARE_SERVER_URL');
  } else {
    localStorage.setItem('SPLITSHARE_SERVER_URL', url.trim().replace(/\/$/, ''));
  }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('splitshare_auth_jwt_token');
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem('splitshare_auth_jwt_token', token);
    } else {
      localStorage.removeItem('splitshare_auth_jwt_token');
    }
  } catch (e) {
    console.error('Failed to set auth token', e);
  }
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const base = getBackendBaseUrl();
  const url = base ? `${base}${endpoint}` : endpoint;

  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      setStoredToken(null);
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return { success: res.ok, status: res.status };
  } catch (err: any) {
    console.error(`API Fetch Error on ${endpoint}:`, err);
    return { success: false, error: err.message || 'Network request failed' };
  }
}

export async function fetchState() {
  return apiFetch('/api/state');
}

export async function apiSignUp(data: any) {
  return apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiSignIn(identifier: string, password: string) {
  return apiFetch('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export async function apiUpdateAccount(userId: string, updates: any) {
  return apiFetch('/api/auth/update', {
    method: 'POST',
    body: JSON.stringify({ userId, updates }),
  });
}

export async function apiDeleteAccount() {
  return apiFetch('/api/auth/account', {
    method: 'DELETE',
  });
}

export async function apiCreateGroup(data: any) {
  return apiFetch('/api/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteGroup(groupId: string, userId: string) {
  return apiFetch(`/api/groups/${groupId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });
}

export async function apiLeaveGroup(groupId: string, userId: string) {
  return apiFetch(`/api/groups/${groupId}/leave`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function apiInviteEmail(groupId: string, email: string) {
  return apiFetch(`/api/groups/${groupId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function apiAcceptInvite(inviteId: string) {
  return apiFetch(`/api/invites/${inviteId}/accept`, {
    method: 'POST',
  });
}

export async function apiDeclineInvite(inviteId: string) {
  return apiFetch(`/api/invites/${inviteId}/decline`, {
    method: 'POST',
  });
}

export async function apiAddExpense(expenseData: any) {
  return apiFetch('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(expenseData),
  });
}

export async function apiRespondApproval(expenseId: string, status: string, queryNote?: string) {
  return apiFetch(`/api/expenses/${expenseId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ status, queryNote }),
  });
}

export async function apiSendReminder(expenseId: string, memberId: string, senderName: string) {
  return apiFetch(`/api/expenses/${expenseId}/remind`, {
    method: 'POST',
    body: JSON.stringify({ memberId, senderName }),
  });
}

export async function apiRecordSettlement(settlementData: any) {
  return apiFetch('/api/settlements', {
    method: 'POST',
    body: JSON.stringify(settlementData),
  });
}

export async function apiAddKittyContribution(data: any) {
  return apiFetch('/api/kitty/contribute', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiAddKittyExpense(data: any) {
  return apiFetch('/api/kitty/expense', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Connect to WebSocket with JWT auth & exponential backoff
 */
export function connectWebSocket(onStateUpdate: (data: any) => void) {
  const backendBase = getBackendBaseUrl();
  const token = getStoredToken();
  if (!token) return () => {};

  let wsUrl = '';
  if (backendBase) {
    const wsBase = backendBase.replace(/^http/, 'ws');
    wsUrl = `${wsBase}/ws?token=${encodeURIComponent(token)}`;
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
  }

  let ws: WebSocket | null = null;
  let reconnectTimer: any = null;
  let reconnectAttempts = 0;
  const maxDelay = 30000;

  function connect() {
    if (document.hidden) return; // Battery saver: pause connection when app is in background

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'INIT_STATE' || message.type === 'STATE_UPDATED') {
            onStateUpdate(message.payload);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = (event) => {
        if (event.code !== 4001) { // Do not reconnect if unauthorized
          const delay = Math.min(maxDelay, 2000 * Math.pow(1.5, reconnectAttempts)) + Math.random() * 1000;
          reconnectAttempts++;
          reconnectTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    } catch {
      const delay = Math.min(maxDelay, 2000 * Math.pow(1.5, reconnectAttempts));
      reconnectAttempts++;
      reconnectTimer = setTimeout(connect, delay);
    }
  }

  connect();

  const handleVisibilityChange = () => {
    if (!document.hidden && (!ws || ws.readyState === WebSocket.CLOSED)) {
      connect();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
