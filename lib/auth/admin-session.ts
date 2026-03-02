'use client';

type AdminSessionPayload = {
  user: string;
  issuedAt: number;
};

const SESSION_KEY = 'gp-admin-session';
const MODE_KEY = 'gp-admin-session-mode';
const REMEMBERED_USER_KEY = 'gp-admin-remembered-user';

function readPayload(raw: string | null): AdminSessionPayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AdminSessionPayload>;
    if (typeof parsed.user !== 'string' || parsed.user.length === 0) {
      return null;
    }

    return {
      user: parsed.user,
      issuedAt: typeof parsed.issuedAt === 'number' ? parsed.issuedAt : Date.now()
    };
  } catch {
    return null;
  }
}

function getStorage(mode: 'remember' | 'session') {
  return mode === 'remember' ? window.localStorage : window.sessionStorage;
}

export function saveAdminSession(user: string, remember: boolean) {
  if (typeof window === 'undefined') return;

  const payload: AdminSessionPayload = {
    user: user.trim(),
    issuedAt: Date.now()
  };

  if (remember) {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    window.localStorage.setItem(MODE_KEY, 'remember');
    window.localStorage.setItem(REMEMBERED_USER_KEY, payload.user);
  } else {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(MODE_KEY);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    window.sessionStorage.setItem(MODE_KEY, 'session');
    window.localStorage.removeItem(REMEMBERED_USER_KEY);
  }
}

export function getAdminSession(): AdminSessionPayload | null {
  if (typeof window === 'undefined') return null;

  const local = readPayload(window.localStorage.getItem(SESSION_KEY));
  if (local) return local;

  const session = readPayload(window.sessionStorage.getItem(SESSION_KEY));
  if (session) return session;

  return null;
}

export function isAdminAuthenticated() {
  return Boolean(getAdminSession());
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(MODE_KEY);
  window.localStorage.removeItem(REMEMBERED_USER_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(MODE_KEY);
}

export function clearSessionOnReloadIfNeeded() {
  if (typeof window === 'undefined') return;

  const mode = window.sessionStorage.getItem(MODE_KEY);
  if (mode === 'session') {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(MODE_KEY);
  }
}

export function getRememberedUser() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(REMEMBERED_USER_KEY) ?? '';
}
