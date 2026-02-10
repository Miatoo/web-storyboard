import { create } from 'zustand';

export type UserRole = 'admin' | 'user';

export interface User {
  username: string;
  role: UserRole;
}

interface AuthState {
  currentUser: User | null;
  token: string | null;
  initialized: boolean;
  initAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const STORAGE_KEY = 'storyboard_auth_jwt_v1';

function loadSession(): { token: string | null; user: User | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { token: null, user: null };
    return {
      token: typeof parsed.token === 'string' ? parsed.token : null,
      user:
        parsed.user && typeof parsed.user.username === 'string' && parsed.user.role
          ? { username: parsed.user.username, role: parsed.user.role as UserRole }
          : null,
    };
  } catch {
    return { token: null, user: null };
  }
}

function saveSession(session: { token: string | null; user: User | null }) {
  try {
    if (!session.token || !session.user) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  token: null,
  initialized: false,

  initAuth: async () => {
    if (get().initialized) return;
    const session = loadSession();
    if (!session.token) {
      set({ currentUser: null, token: null, initialized: true });
      return;
    }
    const { token } = session;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        saveSession({ token: null, user: null });
        set({ currentUser: null, token: null, initialized: true });
        return;
      }
      const data = (await res.json()) as { user?: { username: string; role: UserRole } };
      if (!data.user) {
        saveSession({ token: null, user: null });
        set({ currentUser: null, token: null, initialized: true });
        return;
      }
      const nextUser: User = { username: data.user.username, role: data.user.role };
      saveSession({ token, user: nextUser });
      set({ currentUser: nextUser, token, initialized: true });
    } catch {
      saveSession({ token: null, user: null });
      set({ currentUser: null, token: null, initialized: true });
    }
  },

  login: async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          return { success: false, message: '用户名或密码错误' };
        }
        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          if (data.error === 'EMAIL_NOT_VERIFIED') return { success: false, message: '邮箱未验证，请先完成邮箱验证码验证' };
        }
        return { success: false, message: '登录失败，请稍后重试' };
      }
      const data = (await res.json()) as {
        token: string;
        user: { username: string; role: UserRole };
      };
      const nextUser: User = { username: data.user.username, role: data.user.role };
      saveSession({ token: data.token, user: nextUser });
      set({ currentUser: nextUser, token: data.token, initialized: true });
      return { success: true };
    } catch {
      return { success: false, message: '网络错误，请稍后重试' };
    }
  },

  logout: () => {
    saveSession({ token: null, user: null });
    set({ currentUser: null, token: null, initialized: true });
  },
}));

