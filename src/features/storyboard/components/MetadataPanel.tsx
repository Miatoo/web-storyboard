import { useUIStore } from '../../../store/uiStore';
import { useProjectStore } from '../../../store/projectStore';
import { MetadataForm } from './MetadataForm';
import { useTranslation } from '../../../i18n/useTranslation';

export function MetadataPanel() {
  const { t } = useTranslation();
  const activeShotId = useUIStore((state) => state.activeShotId);
  const closeMetadataPanel = useUIStore((state) => state.closeMetadataPanel);
  const getShot = useProjectStore((state) => state.getShot);
  
  const shot = activeShotId ? getShot(activeShotId) : null;

  if (!shot) {
    return (
      <aside className="w-80 flex flex-col gap-1 shrink-0 p-1">
        <div className="retro-window flex-1 flex flex-col overflow-hidden">
          <div className="retro-header">
            <span>{t('metadata.title')}</span>
            <button
              onClick={closeMetadataPanel}
              className="text-white dark:text-black hover:opacity-70"
            >
              ×
            </button>
          </div>
          <div className="p-2">
            <div className="text-center text-gray-400 text-sm py-8">
              {t('metadata.selectShot')}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 flex flex-col gap-1 shrink-0 p-1">
      <div className="retro-window flex-1 flex flex-col overflow-hidden">
        <div className="retro-header">
          <span>{t('metadata.title')}</span>
          <button
            onClick={closeMetadataPanel}
            className="text-white dark:text-black hover:opacity-70"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <MetadataForm shot={shot} />
        </div>
      </div>
    </aside>
  );
}



