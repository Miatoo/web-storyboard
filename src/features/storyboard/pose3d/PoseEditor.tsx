import { useRef } from 'react';
import { useUIStore } from '../../../store/uiStore';
import { useProjectStore } from '../../../store/projectStore';
import { PoseEditorCanvas, PoseEditorCanvasRef } from './PoseEditorCanvas';
import { PoseControls } from './PoseControls';
import { CameraControls } from './CameraControls';
import { PosePresets } from './PosePresets';
import { CharacterList } from './CharacterList';
import { useTranslation } from '../../../i18n/useTranslation';

export function PoseEditor() {
  const { t } = useTranslation();
  const activeShotId = useUIStore((state) => state.activeShotId);
  const getShot = useProjectStore((state) => state.getShot);
  const canvasRef = useRef<PoseEditorCanvasRef>(null);

  const shot = activeShotId ? getShot(activeShotId) : null;

  if (!shot) {
    return (
      <div className="retro-window flex-1 flex items-center justify-center text-gray-400 bg-white dark:bg-gray-900">
        <div className="retro-header">
          <span>3D_POSE_EDITOR</span>
        </div>
        <div className="p-4">{t('metadata.selectShot')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-row gap-1 p-1">
      {/* 3D 场景画布 */}
      <div className="retro-window flex-1 relative bg-gray-900 overflow-hidden">
        <div className="retro-header">
          <span>3D_SCENE</span>
        </div>
        <div className="absolute inset-0 top-8">
          <PoseEditorCanvas ref={canvasRef} shotId={shot.id} />
        </div>
      </div>

      {/* 控制面板 - 右侧 */}
      <div className="w-80 flex flex-col gap-1 shrink-0">
        <div className="retro-window flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
          <div className="retro-header">
            <span>CONTROLS</span>
            <span>×</span>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto">
            {/* 角色列表和管理 */}
            <CharacterList canvasRef={canvasRef} />

            {/* 预设姿态 */}
            <PosePresets shotId={shot.id} canvasRef={canvasRef} />

            {/* 摄像机控制 */}
            <CameraControls shotId={shot.id} />

            {/* 生成按钮 */}
            <PoseControls ref={canvasRef} shotId={shot.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
