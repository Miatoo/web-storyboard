import { forwardRef, useState, useEffect } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { PoseEditorCanvasRef } from './PoseEditorCanvas';
import { useTranslation } from '../../../i18n/useTranslation';

interface PoseControlsProps {
  shotId: string;
}

export const PoseControls = forwardRef<PoseEditorCanvasRef, PoseControlsProps>(
  ({ shotId }, ref) => {
    const { t } = useTranslation();
    const getShot = useProjectStore((state) => state.getShot);
    const updateShot = useProjectStore((state) => state.updateShot);
    const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');

    const shot = getShot(shotId);
    if (!shot) return null;

    // 定期检查当前模式（用于同步键盘快捷键）
    useEffect(() => {
      const interval = setInterval(() => {
        if (ref && typeof ref !== 'function' && ref.current) {
          const currentMode = ref.current.getTransformMode();
          if (currentMode && currentMode !== transformMode) {
            setTransformMode(currentMode);
          }
        }
      }, 100);
      return () => clearInterval(interval);
    }, [ref, transformMode]);

    const handleSetMode = (mode: 'translate' | 'rotate' | 'scale') => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.setTransformMode(mode);
        setTransformMode(mode);
      }
    };

    const handleGenerateImage = async () => {
      if (!ref || typeof ref === 'function' || !ref.current) {
        console.error('Canvas ref 不可用');
        return;
      }

      try {
        // 从当前视角渲染截图
        const imageData = await ref.current.renderToImage();

        updateShot(shotId, {
          image: imageData,
          imageSource: '3d_pose',
          sourceParams: shot.sourceParams || {
            pose3d: {
              pose: { joints: {}, presetName: 'standing' },
              camera: {
                framing: shot.framing,
                angle: shot.cameraAngle,
                position: { x: 0, y: 1.6, z: 4 },
                rotation: { x: 0, y: 0, z: 0 },
                fov: 50,
              },
              renderStyle: 'wireframe',
            },
          },
        });
      } catch (error) {
        console.error('生成镜头图失败:', error);
      }
    };

    return (
      <div className="space-y-3 border-t-2 border-black dark:border-white pt-3">
        {/* 变换模式控制 */}
        <div>
          <label className="block text-sm font-bold uppercase mb-2">
            {t('pose3d.transformMode')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSetMode('translate')}
              className={`pixel-border-button px-3 py-1 text-sm ${
                transformMode === 'translate'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title={`${t('pose3d.move')} (T)`}
            >
              {t('pose3d.move')}
            </button>
            <button
              onClick={() => handleSetMode('rotate')}
              className={`pixel-border-button px-3 py-1 text-sm ${
                transformMode === 'rotate'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title={`${t('pose3d.rotate')} (R)`}
            >
              {t('pose3d.rotate')}
            </button>
            <button
              onClick={() => handleSetMode('scale')}
              className={`pixel-border-button px-3 py-1 text-sm ${
                transformMode === 'scale'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title={`${t('pose3d.scale')} (S)`}
            >
              {t('pose3d.scale')}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {t('pose3d.shortcuts')}
          </p>
        </div>

        {/* 生成按钮 */}
        <div>
          <button
            onClick={handleGenerateImage}
            className="pixel-border-button w-full px-4 py-2 bg-black text-white dark:bg-white dark:text-black"
          >
            {t('pose3d.generateShotImage')}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {t('pose3d.generateShotHint')}
          </p>
        </div>
      </div>
    );
  }
);

PoseControls.displayName = 'PoseControls';
