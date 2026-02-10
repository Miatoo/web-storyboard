import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';
import { ShotCard } from './ShotCard';
import { useTranslation } from '../../../i18n/useTranslation';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

const EMPTY_SHOTS: any[] = [];

export function Sidebar() {
  const { t } = useTranslation();
  const shotsRaw = useProjectStore(useShallow((state) => state.project?.shots || EMPTY_SHOTS));
  const shots = useMemo(() => {
    const shotsArray = Array.isArray(shotsRaw) ? shotsRaw : [];
    return [...shotsArray].sort((a, b) => a.order - b.order);
  }, [shotsRaw]);
  const createShot = useProjectStore((state) => state.createShot);
  const activeShotId = useUIStore((state) => state.activeShotId);
  const setActiveShot = useUIStore((state) => state.setActiveShot);

  const handleCreateShot = () => {
    const newShotId = createShot();
    setActiveShot(newShotId);
  };

  return (
    <aside className="w-64 flex flex-col gap-1 shrink-0 p-1">
      <div className="retro-window flex-1 flex flex-col overflow-hidden">
        <div className="retro-header">
          <span>SHOT_LIST</span>
          <span>×</span>
        </div>
        <div className="p-1 border-b-2 border-black dark:border-white">
          <button
            onClick={handleCreateShot}
            className="pixel-border-button bg-primary text-white dark:bg-white dark:text-black w-full px-4 py-1 flex items-center gap-2 justify-center"
          >
            <span>➕</span> {t('sidebar.newShot')}
          </button>
        </div>
      
        <div className="flex-1 overflow-y-auto p-1 space-y-1">
          {shots.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              {t('sidebar.noShots')}，{t('sidebar.noShots.hint')}
            </div>
          ) : (
            shots.map((shot) => (
              <ShotCard
                key={shot.id}
                shot={shot}
                isActive={shot.id === activeShotId}
                onClick={() => setActiveShot(shot.id)}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}



