import { useEffect } from 'react';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import { StoryboardEditor } from './features/storyboard/StoryboardEditor';
import './App.css';

function App() {
  const themeStyle = useUIStore((state) => state.themeStyle);
  const initAuth = useAuthStore((s) => s.initAuth);

  // 初始化登录状态（从 localStorage 恢复 token）
  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  // 初始化并应用风格到 body
  useEffect(() => {
    // 移除所有风格类
    const currentClasses = document.body.className;
    const cleanedClasses = currentClasses.replace(/\btheme-\w+\b/g, '').trim();
    // 如果清理后还有类，保留其他类；否则直接设置
    if (cleanedClasses) {
      document.body.className = cleanedClasses + ' ' + `theme-${themeStyle}`;
    } else {
      document.body.className = `theme-${themeStyle}`;
    }
  }, [themeStyle]);

  return (
    <div className={`h-full w-full overflow-hidden ${themeStyle === 'desert-mirage' || themeStyle === 'liquid-mesh' ? '' : 'bg-background-light dark:bg-background-dark grid-bg'}`}>
      <StoryboardEditor />
    </div>
  );
}

export default App;



