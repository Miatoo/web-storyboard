import { create } from 'zustand';

interface AdminAuthState {
  initialized: boolean;
  hasPassword: boolean;
  isAuthenticated: boolean;
  init: () => void;
  setPassword: (password: string) => Promise<void>;
  login: (password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const STORAGE_KEY = 'storyboard_admin_auth_v1';

interface StoredAdminAuth {
  salt: string;
  passwordHash: string;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}:${salt}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function loadStored(): StoredAdminAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.salt && parsed.passwordHash) {
      return { salt: parsed.salt, passwordHash: parsed.passwordHash };
    }
    return null;
  } catch {
    return null;
  }
}

function saveStored(data: StoredAdminAuth) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  initialized: false,
  hasPassword: false,
  isAuthenticated: false,

  init: () => {
    if (get().initialized) return;
    const stored = loadStored();
    set({
      initialized: true,
      hasPassword: !!stored,
      isAuthenticated: false,
    });
  },

  setPassword: async (password: string) => {
    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword(password, salt);
    saveStored({ salt, passwordHash });
    set({
      hasPassword: true,
      isAuthenticated: true,
      initialized: true,
    });
  },

  login: async (password: string) => {
    const stored = loadStored();
    if (!stored) {
      return { success: false, message: '尚未设置管理员密码，请先初始化。' };
    }
    const hash = await hashPassword(password, stored.salt);
    if (hash !== stored.passwordHash) {
      return { success: false, message: '管理员密码错误' };
    }
    set({ isAuthenticated: true, hasPassword: true, initialized: true });
    return { success: true };
  },

  logout: () => {
    set({ isAuthenticated: false });
  },
}));











