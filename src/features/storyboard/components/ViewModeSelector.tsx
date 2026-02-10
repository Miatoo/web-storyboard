import { useUIStore } from '../../../store/uiStore';
import { ViewMode } from '../../../types';
import { useTranslation } from '../../../i18n/useTranslation';

export function ViewModeSelector() {
  const { t } = useTranslation();
  const viewMode = useUIStore((state) => state.viewMode);
  const setViewMode = useUIStore((state) => state.setViewMode);

  const viewModeLabelKey: Record<ViewMode, 'view.board' | 'view.pose3d' | 'view.annotation' | 'view.aiImage'> = {
    board: 'view.board',
    pose3d: 'view.pose3d',
    annotation: 'view.annotation',
    aigenerate: 'view.aiImage',
  };

  return (
    <div className="flex gap-2">
      {(Object.keys(viewModeLabelKey) as ViewMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={`pixel-border-button px-4 py-1 text-sm ${
            viewMode === mode
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          {t(viewModeLabelKey[mode])}
        </button>
      ))}
    </div>
  );
}



