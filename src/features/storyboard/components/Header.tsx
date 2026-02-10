import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore, ThemeStyle, Language } from '../../../store/uiStore';
import { useTranslation } from '../../../i18n/useTranslation';
import { TranslationKey } from '../../../i18n/translations';
import { ExportButton } from './ExportButton';
import { ImportButton } from './ImportButton';
import { getAIImageConfig, saveAIImageConfig, validateAPIConfig } from '../../../services/aiImageService';
import { AIImageConfig } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { LoginModal } from '../../auth/LoginModal';

export function Header() {
  const { t } = useTranslation();
  const project = useProjectStore((state) => state.project);
  const updateProjectName = useProjectStore((state) => state.updateProjectName);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project?.name || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const [loginOpen, setLoginOpen] = useState(false);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const openMetadataPanel = useUIStore((state) => state.openMetadataPanel);

  useEffect(() => {
    setEditName(project?.name || '');
  }, [project?.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleNameClick = () => {
    if (project) {
      setIsEditing(true);
      setEditName(project.name);
    }
  };

  const handleNameBlur = () => {
    if (project && editName.trim()) {
      updateProjectName(editName.trim());
    } else if (project) {
      setEditName(project.name);
    }
    setIsEditing(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      if (project) {
        setEditName(project.name);
      }
      setIsEditing(false);
    }
  };

  return (
    <header className="retro-window m-1 flex items-center justify-between p-1 bg-white dark:bg-gray-800 text-lg">
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="text-lg font-semibold border-2 border-black dark:border-white bg-white dark:bg-gray-900 px-2 py-1 focus:outline-none"
          />
        ) : (
          <h1
            className="text-2xl font-bold px-2 border-r-2 border-black dark:border-white cursor-pointer"
            onClick={handleNameClick}
            title={t('header.editProjectName')}
          >
            {project?.name || t('app.title')}
          </h1>
        )}
        <div className="flex gap-2">
          <ImportButton />
          <ExportButton />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* 使用教程按钮 */}
        <a
          href="https://my.feishu.cn/wiki/Af18wmF3niflAnkxZaPcuRs2nCh?from=from_copylink"
          target="_blank"
          rel="noopener noreferrer"
          className="pixel-border-button px-3 py-1 text-sm bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
          title="使用教程"
        >
          使用教程
        </a>
        {/* 属性面板唤出按钮（右侧属性被关闭后，可以从这里重新打开） */}
        <button
          onClick={() => openMetadataPanel()}
          className="pixel-border-button px-3 py-1 text-sm bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
          title={t('metadata.title')}
        >
          属性
        </button>
        {currentUser ? (
          <>
            <button
              onClick={() => logout()}
              className="pixel-border-button px-3 py-1 text-sm bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
              title={`已登录：${currentUser.username}`}
            >
              退出
            </button>
          </>
        ) : (
          <button
            onClick={() => setLoginOpen(true)}
            className="pixel-border-button px-3 py-1 text-sm bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
          >
            登录
          </button>
        )}
        <LanguageSelector />
        <ThemeStyleSelector />
        <SettingsButton />
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </header>
  );
}

function LanguageSelector() {
  const { t, language } = useTranslation();
  const setLanguage = useUIStore((state) => state.setLanguage);
  const [showMenu, setShowMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  const languages: { value: Language; label: string; flag: string }[] = [
    { value: 'zh', label: '中文', flag: '🇨🇳' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
  ];

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showMenu]);

  const currentLang = languages.find((l) => l.value === language) || languages[0];

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setShowMenu(!showMenu)}
          className="pixel-border-button bg-white dark:bg-gray-700 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 text-sm"
          title={t('header.language')}
        >
          <span>{currentLang.flag}</span>
          <span>{currentLang.label}</span>
        </button>
      </div>
      {showMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowMenu(false)}
          />
          <div 
            className="fixed z-[9999] retro-window bg-white dark:bg-gray-900 min-w-[120px]"
            style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="retro-header">
              <span>{t('header.language')}</span>
              <button
                onClick={() => setShowMenu(false)}
                className="text-white dark:text-black hover:opacity-70"
              >
                ×
              </button>
            </div>
            <div className="p-2 space-y-1">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => {
                    setLanguage(lang.value);
                    setShowMenu(false);
                  }}
                  className={`pixel-border-button w-full px-3 py-2 text-left flex items-center gap-2 ${
                    language === lang.value
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                  {language === lang.value && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

function ThemeStyleSelector() {
  const { t } = useTranslation();
  const themeStyle = useUIStore((state) => state.themeStyle);
  const setThemeStyle = useUIStore((state) => state.setThemeStyle);
  const [showMenu, setShowMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  const themes: { value: ThemeStyle; labelKey: string; icon: string }[] = [
    { value: 'retro-pixel', labelKey: 'theme.retro-pixel', icon: '🎮' },
    { value: 'modern', labelKey: 'theme.modern', icon: '✨' },
    { value: 'classic', labelKey: 'theme.classic', icon: '📋' },
    { value: 'retro-story', labelKey: 'theme.retro-story', icon: '📖' },
    { value: 'desert-mirage', labelKey: 'theme.desert-mirage', icon: '🌵' },
    { value: 'liquid-mesh', labelKey: 'theme.liquid-mesh', icon: '💧' },
  ];

  const currentTheme = themes.find((th) => th.value === themeStyle) || themes[0];

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showMenu]);

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setShowMenu(!showMenu)}
          className="pixel-border-button bg-white dark:bg-gray-700 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 text-sm"
          title={t('header.themeSelector')}
        >
          <span>{currentTheme.icon}</span>
          <span>{t(currentTheme.labelKey as TranslationKey)}</span>
        </button>
      </div>
      {showMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowMenu(false)}
          />
          <div 
            className="fixed z-[9999] retro-window bg-white dark:bg-gray-900 min-w-[150px]"
            style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="retro-header">
              <span>{t('header.themeSelector.title')}</span>
              <button
                onClick={() => setShowMenu(false)}
                className="text-white dark:text-black hover:opacity-70"
              >
                ×
              </button>
            </div>
            <div className="p-2 space-y-1">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => {
                    setThemeStyle(theme.value);
                    setShowMenu(false);
                  }}
                  className={`pixel-border-button w-full px-3 py-2 text-left flex items-center gap-2 ${
                    themeStyle === theme.value
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{theme.icon}</span>
                  <span>{t(theme.labelKey as TranslationKey)}</span>
                  {themeStyle === theme.value && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

function SettingsButton() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowSettings(true)}
        className="pixel-border-button bg-white dark:bg-gray-700 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center text-sm"
        title="设置"
      >
        ⚙️
      </button>
      {showSettings &&
        createPortal(
          <SettingsModal onClose={() => setShowSettings(false)} />,
          document.body
        )}
    </>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const project = useProjectStore((state) => state.project);
  const updateProjectAspectRatio = useProjectStore((state) => state.updateProjectAspectRatio);
  const updatePdfHeaderText = useProjectStore((state) => state.updatePdfHeaderText);
  const showSafeFrame = useUIStore((state) => state.showSafeFrame);
  const setShowSafeFrame = useUIStore((state) => state.setShowSafeFrame);
  const [pdfHeaderText, setPdfHeaderText] = useState(project?.pdfHeaderText || t('settings.pdfHeaderText.placeholder'));
  
  // AI生图API配置
  const [aiApiEndpoint, setAiApiEndpoint] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModelName, setAiModelName] = useState('');
  const [aiConfigMessage, setAiConfigMessage] = useState('');
  const [isValidatingAI, setIsValidatingAI] = useState(false);
  
  useEffect(() => {
    const config = getAIImageConfig();
    if (config) {
      setAiApiEndpoint(config.apiEndpoint);
      setAiApiKey(config.apiKey);
      setAiModelName(config.modelName);
    }
  }, []);

  // 同步项目中的 PDF 右上角文本
  useEffect(() => {
    setPdfHeaderText(project?.pdfHeaderText || t('settings.pdfHeaderText.placeholder'));
  }, [project?.pdfHeaderText, t]);

  const aspectRatios = [
    '16:9',
    '9:16',
    '1:1',
    '4:3',
    '3:2',
    '2.39:1',
    '2.35:1',
    '1.85:1',
  ] as const;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10040]"
      onClick={onClose}
    >
      <div
        className="retro-window bg-white dark:bg-gray-900 p-6 max-w-md w-full mx-4 z-[10050]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="retro-header mb-4">
          <span>{t('header.settings')}</span>
          <button
            onClick={onClose}
            className="text-white dark:text-black hover:opacity-70 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.aspectRatio')}
            </label>
            <div className="flex flex-wrap gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => updateProjectAspectRatio(ratio)}
                  className={`pixel-border-button px-3 py-1.5 text-sm ${
                    project?.aspectRatio === ratio
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{t('settings.safeFrame')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('settings.safeFrame.description')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSafeFrame(!showSafeFrame)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showSafeFrame ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    showSafeFrame ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.pdfHeaderText')}
            </label>
            <input
              type="text"
              value={pdfHeaderText}
              onChange={(e) => setPdfHeaderText(e.target.value)}
              onBlur={() => updatePdfHeaderText(pdfHeaderText)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              placeholder={t('settings.pdfHeaderText.placeholder')}
              className="w-full bg-white dark:bg-gray-900 border-2 border-black dark:border-white p-1 text-lg outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('settings.pdfHeaderText.help')}
            </p>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('settings.aiImageConfig')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('settings.aiImageConfig.apiEndpoint')} <span className="text-red-500">{t('settings.aiImageConfig.required')}</span>
                </label>
                <input
                  type="text"
                  value={aiApiEndpoint}
                  onChange={(e) => setAiApiEndpoint(e.target.value)}
                  placeholder="https://www.sutong.info/v1beta/models/gemini-2.5-flash-image:generateContent"
                  className="w-full bg-white dark:bg-gray-900 border-2 border-black dark:border-white p-1 text-lg outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('settings.aiImageConfig.hintEndpoint')}
                  <br />
                  {t('settings.aiImageConfig.hintEndpointExample')}
                  <code className="bg-gray-100 px-1 rounded text-xs">
                    https://www.sutong.info/v1beta/models/gemini-2.5-flash-image:generateContent
                  </code>
                  <br />
                  {t('settings.aiImageConfig.hintEndpointNote')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('settings.aiImageConfig.apiKey')} <span className="text-red-500">{t('settings.aiImageConfig.required')}</span>
                </label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={t('settings.aiImageConfig.apiKey.placeholder')}
                  className="w-full bg-white dark:bg-gray-900 border-2 border-black dark:border-white p-1 text-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('settings.aiImageConfig.modelName')} <span className="text-red-500">{t('settings.aiImageConfig.required')}</span>
                </label>
                <input
                  type="text"
                  value={aiModelName}
                  onChange={(e) => setAiModelName(e.target.value)}
                  placeholder={t('settings.aiImageConfig.modelName.placeholder')}
                  className="w-full bg-white dark:bg-gray-900 border-2 border-black dark:border-white p-1 text-lg outline-none"
                />
              </div>
              {aiConfigMessage && (
                <div className={`text-xs p-2 rounded ${
                  aiConfigMessage.startsWith('✓')
                    ? 'text-green-700 bg-green-50'
                    : aiConfigMessage.startsWith('✗')
                    ? 'text-red-700 bg-red-50'
                    : 'text-blue-700 bg-blue-50'
                }`}>
                  {aiConfigMessage}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!aiApiEndpoint || !aiApiKey || !aiModelName) {
                      setAiConfigMessage(t('settings.aiImageConfig.fillAll'));
                      return;
                    }
                    const config: AIImageConfig = {
                      apiEndpoint: aiApiEndpoint.trim(),
                      apiKey: aiApiKey.trim(),
                      modelName: aiModelName.trim(),
                    };
                    saveAIImageConfig(config);
                    setAiConfigMessage(t('settings.aiImageConfig.saved'));
                    setTimeout(() => setAiConfigMessage(''), 2000);
                  }}
                  className="pixel-border-button bg-black text-white dark:bg-white dark:text-black flex-1 py-1"
                >
                  {t('settings.aiImageConfig.save')}
                </button>
                <button
                  onClick={async () => {
                    if (!aiApiEndpoint || !aiApiKey || !aiModelName) {
                      setAiConfigMessage(t('settings.aiImageConfig.fillFirst'));
                      return;
                    }
                    setIsValidatingAI(true);
                    setAiConfigMessage(t('settings.aiImageConfig.testing'));
                    try {
                      const config: AIImageConfig = {
                        apiEndpoint: aiApiEndpoint.trim(),
                        apiKey: aiApiKey.trim(),
                        modelName: aiModelName.trim(),
                      };
                      await validateAPIConfig(config);
                      setAiConfigMessage(t('settings.aiImageConfig.success'));
                    } catch (error: any) {
                      // 显示详细错误信息
                      const errorMsg = error.message || '未知错误';
                      setAiConfigMessage(`${t('settings.aiImageConfig.testFailedPrefix')}${errorMsg}`);
                      // 错误信息较长时，延长显示时间
                      setTimeout(() => setAiConfigMessage(''), errorMsg.length > 100 ? 8000 : 5000);
                    } finally {
                      setIsValidatingAI(false);
                    }
                  }}
                  disabled={isValidatingAI || !aiApiEndpoint || !aiApiKey || !aiModelName}
                  className="pixel-border-button bg-white dark:bg-gray-700 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidatingAI ? t('settings.aiImageConfig.testing') : t('settings.aiImageConfig.test')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


