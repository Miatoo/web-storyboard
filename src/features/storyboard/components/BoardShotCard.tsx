import { Shot } from '../../../types';
import { useProjectStore } from '../../../store/projectStore';
import { useMemo } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';

interface BoardShotCardProps {
  shot: Shot;
  isActive: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

export function BoardShotCard({
  shot,
  isActive,
  onClick,
  onDoubleClick,
}: BoardShotCardProps) {
  const { t } = useTranslation();
  const project = useProjectStore((state) => state.project);
  
  // 计算图片容器的宽高比样式
  const imageContainerStyle = useMemo(() => {
    const ratioString = project?.aspectRatio || '16:9';
    const [wStr, hStr] = ratioString.split(':');
    const w = parseFloat(wStr || '16');
    const h = parseFloat(hStr || '9');
    
    const style: React.CSSProperties = {
      width: '100%',
      backgroundColor: '#f3f4f6',
      overflow: 'hidden',
    };
    
    // 使用 aspect-ratio 让容器根据项目比例自适应高度
    (style as any).aspectRatio = `${w} / ${h}`;
    
    return style;
  }, [project?.aspectRatio]);
  
  return (
    <div className="space-y-2">
      <div
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={`retro-window p-1 cursor-pointer ${
          isActive ? 'ring-2 ring-primary' : ''
        }`}
      >
        {/* 缩略图区域 - 根据项目比例自适应 */}
        <div style={imageContainerStyle} className="relative group flex items-center justify-center">
        {shot.image ? (
          <img
            src={shot.image}
            alt={`Shot ${shot.shotNumber}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            {t('shot.noImage')}
          </div>
        )}
          <div className="absolute top-2 left-2 bg-black text-white px-2 text-sm">
            #{shot.shotNumber}
          </div>
        </div>
      </div>

      {/* 信息区域 */}
      <div className="retro-window p-2 text-sm bg-white dark:bg-gray-900">
        <div className="font-bold border-b border-black dark:border-white mb-1 uppercase">
          {shot.framing} / {shot.cameraAngle}
        </div>
        {shot.notes && (
          <p className="leading-tight text-xs">{shot.notes}</p>
        )}
        {shot.duration > 0 && (
          <p className="text-xs text-gray-500 mt-1">{shot.duration}{t('common.secondsShort')}</p>
        )}
      </div>
    </div>
  );
}



