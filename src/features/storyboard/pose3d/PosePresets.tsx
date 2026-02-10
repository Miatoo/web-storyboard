import { useProjectStore } from '../../../store/projectStore';
import { PoseEditorCanvasRef } from './PoseEditorCanvas';
import { useEffect, useState } from 'react';
import { getAssetPath } from '../../../utils/pathUtils';
import { useTranslation } from '../../../i18n/useTranslation';

interface PosePresetsProps {
  shotId: string;
  canvasRef?: React.RefObject<PoseEditorCanvasRef>;
}

export function PosePresets({ shotId, canvasRef }: PosePresetsProps) {
  const { t } = useTranslation();
  const getShot = useProjectStore((state) => state.getShot);
  const [poses, setPoses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const shot = getShot(shotId);

  // 加载预设动作列表
  useEffect(() => {
    const loadPoses = async () => {
      try {
        setLoading(true);
        const response = await fetch(getAssetPath('/models/poses/poses.json'));
        if (response.ok) {
          const data = await response.json();
          // poses.json 是对象格式，键是 ID，值是动作数据
          const posesArray = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
            label: data[key].name || key,
          }));

          // 按名称排序，优先显示常用动作
          posesArray.sort((a, b) => {
            const priority: Record<string, number> = {
              stand: 1,
              sit: 2,
              walk: 3,
              run: 4,
              default: 5,
            };
            const aName = a.name?.toLowerCase() || '';
            const bName = b.name?.toLowerCase() || '';
            const aPriority =
              Object.keys(priority).find((p) => aName.includes(p)) ? 1 : 999;
            const bPriority =
              Object.keys(priority).find((p) => bName.includes(p)) ? 1 : 999;
            return aPriority - bPriority;
          });

          setPoses(posesArray);
          console.log(`加载了 ${posesArray.length} 个预设动作`);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('加载预设动作失败:', error);
        // 使用默认预设
        setPoses([
          { id: '1', name: 'standing', label: 'standing', state: { skeleton: {} } },
          { id: '2', name: 'sitting', label: 'sitting', state: { skeleton: {} } },
          { id: '3', name: 'walking', label: 'walking', state: { skeleton: {} } },
          { id: '4', name: 'running', label: 'running', state: { skeleton: {} } },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadPoses();
  }, []);

  const handlePresetSelect = (pose: any) => {
    if (!shot || !canvasRef?.current) {
      console.warn('Shot 或 Canvas ref 不可用');
      return;
    }

    const characters = canvasRef.current.getCharacters();
    if (characters.length === 0) {
      alert(t('pose3d.alertAddCharacterFirst'));
      return;
    }

    // 获取当前选中的角色，如果没有选中则使用第一个
    const selectedId = canvasRef.current.getSelectedCharacterId() || characters[0]?.id;

    if (!selectedId) {
      alert(t('pose3d.alertNoAvailableCharacter'));
      return;
    }

    console.log('应用姿态:', pose.name || pose.label, '到角色:', selectedId);
    console.log('姿态数据:', pose);

    // 应用姿态到选中的角色
    canvasRef.current.applyPose(selectedId, pose);
  };

  if (loading) {
    return (
      <div className="border-t-2 border-black dark:border-white pt-3">
        <h3 className="text-sm font-bold uppercase mb-2">{t('pose3d.posePresets')}</h3>
        <div className="text-xs text-gray-500">{t('pose3d.loading')}</div>
      </div>
    );
  }

  return (
    <div className="border-t-2 border-black dark:border-white pt-3">
      <h3 className="text-sm font-bold uppercase mb-2">
        {t('pose3d.posePresetsCount').replace('{count}', String(poses.length))}
      </h3>
      <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
        {poses.map((pose) => (
          <button
            key={pose.id || pose.name}
            onClick={() => handlePresetSelect(pose)}
            className="pixel-border-button px-3 py-1 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-xs whitespace-nowrap"
            title={pose.keywords || pose.name || ''}
          >
            {pose.label || pose.name || `Pose ${pose.id}`}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {t('pose3d.applyPoseHint')}
      </p>
    </div>
  );
}
