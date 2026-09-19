/**
 * SplitShare Real-Time API & WebSocket Client
 * Seamlessly connects both Web Browser (Vite dev/prod) and Native Android APK (Capacitor)
 */

export function getBackendBaseUrl(): string {
  // 1. Check if user configured a custom backend in localStorage
  const savedUrl = localStorage.getItem('SPLITSHARE_SERVER_URL');
  if (savedUrl) {
    return savedUrl.replace(/\/$/, '');
  }

  // 2. Check if running inside native Android APK (Capacitor)
  const isCapacitor =
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && !window.location.port);

  if (isCapacitor) {
    // Default to host machine's Wi-Fi IP running the SplitShare backend
    return 'http://192.168.1.34:3001';
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

async function apiFetch(endpoint: string, options?: RequestInit) {
  const base = getBackendBaseUrl();
  const url = base ? `${base}${endpoint}` : endpoint;
  const res = await fetch(url, options);
  return res.json();
}

export async function fetchState() {
  return apiFetch('/api/state');
}

export async function apiSignUp(data: any) {
  return apiFetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function apiSignIn(identifier: string, password: string) {
  return apiFetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
}

export async function apiUpdateAccount(userId: string, updates: any) {
  return apiFetch('/api/auth/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, updates }),
  });
}

export async function apiCreateGroup(data: any) {
  return apiFetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function apiDeleteGroup(groupId: string, userId: string) {
  return apiFetch(`/api/groups/${groupId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function apiLeaveGroup(groupId: string, userId: string) {
  return apiFetch(`/api/groups/${groupId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function apiInviteEmail(groupId: string, email: string, inviterId: string, inviterName: string) {
  return apiFetch(`/api/groups/${groupId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, inviterId, inviterName }),
  });
}

export async function apiAcceptInvite(inviteId: string, user: any) {
  return apiFetch(`/api/invites/${inviteId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user }),
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData),
  });
}

export async function apiRespondApproval(expenseId: string, memberId: string, status: string, queryNote?: string) {
  return apiFetch(`/api/expenses/${expenseId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, status, queryNote }),
  });
}

export async function apiSendReminder(expenseId: string, memberId: string, senderName: string) {
  return apiFetch(`/api/expenses/${expenseId}/remind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, senderName }),
  });
}

export async function apiRecordSettlement(settlementData: any) {
  return apiFetch('/api/settlements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settlementData),
  });
}

export async function apiAddKittyContribution(data: any) {
  return apiFetch('/api/kitty/contribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function apiAddKittyExpense(data: any) {
  return apiFetch('/api/kitty/expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function apiResetData() {
  return apiFetch('/api/reset', {
    method: 'POST',
  });
}

/**
 * Connect to WebSocket for instant real-time sync across phones
 */
export function connectWebSocket(onStateUpdate: (data: any) => void) {
  const backendBase = getBackendBaseUrl();
  let wsUrl = '';

  if (backendBase) {
    const wsBase = backendBase.replace(/^http/, 'ws');
    wsUrl = `${wsBase}/ws`;
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}/ws`;
  }

  let ws: WebSocket | null = null;
  let reconnectTimer: any = null;

  function connect() {
    try {
      ws = new WebSocket(wsUrl);

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

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    } catch (e) {
      reconnectTimer = setTimeout(connect, 2000);
    }
  }

  connect();

  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
