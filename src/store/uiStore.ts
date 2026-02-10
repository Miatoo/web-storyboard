import { create } from 'zustand';
import { ViewMode } from '../types';

export type ThemeStyle = 'retro-pixel' | 'modern' | 'classic' | 'retro-story' | 'desert-mirage' | 'liquid-mesh';
export type Language = 'zh' | 'en';

interface UIStore {
  // 当前选中的镜头 ID
  activeShotId: string | null;
  
  // 当前视图模式
  viewMode: ViewMode;
  
  // 面板状态
  isMetadataPanelOpen: boolean;

  // 是否显示 3D 安全框
  showSafeFrame: boolean;

  // 前端风格
  themeStyle: ThemeStyle;
  
  // 语言设置
  language: Language;
  
  // Actions
  setActiveShot: (shotId: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleMetadataPanel: () => void;
  openMetadataPanel: () => void;
  closeMetadataPanel: () => void;
  setShowSafeFrame: (value: boolean) => void;
  setThemeStyle: (style: ThemeStyle) => void;
  setLanguage: (lang: Language) => void;
}

// 从 localStorage 加载保存的风格设置
const loadThemeStyle = (): ThemeStyle => {
  const saved = localStorage.getItem('themeStyle');
  if (saved && ['retro-pixel', 'modern', 'classic', 'retro-story', 'desert-mirage', 'liquid-mesh'].includes(saved)) {
    return saved as ThemeStyle;
  }
  return 'retro-pixel';
};

// 从 localStorage 加载保存的语言设置
const loadLanguage = (): Language => {
  const saved = localStorage.getItem('language');
  if (saved && (saved === 'zh' || saved === 'en')) {
    return saved as Language;
  }
  // 默认根据浏览器语言设置
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('zh') ? 'zh' : 'en';
};

// 从 localStorage 加载视图模式
const loadViewMode = (): ViewMode => {
  const saved = localStorage.getItem('viewMode') as ViewMode | null;
  if (saved && ['board', 'pose3d', 'annotation', 'aigenerate'].includes(saved)) {
    return saved;
  }
  return 'board';
};

// 从 localStorage 加载当前选中镜头
const loadActiveShotId = (): string | null => {
  const saved = localStorage.getItem('activeShotId');
  return saved || null;
};

// 从 localStorage 加载属性面板是否打开
const loadMetadataPanelOpen = (): boolean => {
  const saved = localStorage.getItem('isMetadataPanelOpen');
  if (saved === 'true') return true;
  if (saved === 'false') return false;
  return true;
};

export const useUIStore = create<UIStore>((set) => ({
  activeShotId: loadActiveShotId(),
  viewMode: loadViewMode(),
  isMetadataPanelOpen: loadMetadataPanelOpen(),
  showSafeFrame: true,
  themeStyle: loadThemeStyle(),
  language: loadLanguage(),
  
  setActiveShot: (shotId) => {
    if (shotId) {
      localStorage.setItem('activeShotId', shotId);
    } else {
      localStorage.removeItem('activeShotId');
    }
    set({ activeShotId: shotId });
  },
  
  setViewMode: (mode) => {
    localStorage.setItem('viewMode', mode);
    set({ viewMode: mode });
  },
  
  toggleMetadataPanel: () =>
    set((state) => {
      const next = !state.isMetadataPanelOpen;
      localStorage.setItem('isMetadataPanelOpen', String(next));
      return { isMetadataPanelOpen: next };
    }),
  
  openMetadataPanel: () => {
    localStorage.setItem('isMetadataPanelOpen', 'true');
    set({ isMetadataPanelOpen: true });
  },
  
  closeMetadataPanel: () => {
    localStorage.setItem('isMetadataPanelOpen', 'false');
    set({ isMetadataPanelOpen: false });
  },

  setShowSafeFrame: (value) => set({ showSafeFrame: value }),

  setThemeStyle: (style) => {
    localStorage.setItem('themeStyle', style);
    set({ themeStyle: style });
    // 应用风格到 body
    document.body.className = document.body.className.replace(/\btheme-\w+\b/g, '').trim();
    document.body.classList.add(`theme-${style}`);
  },

  setLanguage: (lang) => {
    localStorage.setItem('language', lang);
    set({ language: lang });
  },
}));


