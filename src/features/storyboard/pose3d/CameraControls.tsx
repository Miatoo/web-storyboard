import { useProjectStore } from '../../../store/projectStore';
import { Framing, CameraAngle } from '../../../types';
import { useTranslation } from '../../../i18n/useTranslation';

interface CameraControlsProps {
  shotId: string;
}

const framingOptions: Framing[] = ['CU', 'MS', 'WS', 'ECU', 'ELS'];

// 扩展镜头角度预设
const cameraPresets = [
  { angle: 'eye' as CameraAngle, height: 1.6 },
  { angle: 'low' as CameraAngle, height: 1.2 },
  { angle: 'high' as CameraAngle, height: 2.0 },
  { angle: 'low' as CameraAngle, height: 0.8 },
  { angle: 'high' as CameraAngle, height: 2.5 },
  { angle: 'eye' as CameraAngle, height: 1.4 },
  { angle: 'eye' as CameraAngle, height: 1.8 },
];

export function CameraControls({ shotId }: CameraControlsProps) {
  const { t } = useTranslation();
  const getShot = useProjectStore((state) => state.getShot);
  const updateShot = useProjectStore((state) => state.updateShot);

  const shot = getShot(shotId);
  if (!shot) return null;

  const handleFramingChange = (framing: Framing) => {
    updateShot(shotId, { framing });
  };

  const handlePresetSelect = (preset: typeof cameraPresets[0]) => {
    updateShot(shotId, { cameraAngle: preset.angle });
  };

  return (
    <div className="space-y-3 border-t-2 border-black dark:border-white pt-3">
      <div>
        <h3 className="text-sm font-bold uppercase mb-2">{t('pose3d.cameraControls')}</h3>
        
        {/* 景别选择 */}
        <div className="mb-3">
          <label className="block text-xs font-bold uppercase mb-1">{t('pose3d.framing')}</label>
          <div className="flex gap-1 flex-wrap">
            {framingOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleFramingChange(option)}
                className={`pixel-border-button px-2 py-1 text-xs ${
                  shot.framing === option
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {t(`framing.${option}` as any)} ({option})
              </button>
            ))}
          </div>
        </div>

        {/* 镜头角度预设 */}
        <div>
          <label className="block text-xs font-bold uppercase mb-1">{t('pose3d.cameraAnglePresets')}</label>
          <div className="flex gap-1 flex-wrap">
            {cameraPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => handlePresetSelect(preset)}
                className={`pixel-border-button px-2 py-1 text-xs ${
                  shot.cameraAngle === preset.angle
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {t(`cameraAngle.${preset.angle}` as any)} ({preset.height}m)
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
