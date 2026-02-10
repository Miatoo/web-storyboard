import { Shot } from '../../../types';
import { useProjectStore } from '../../../store/projectStore';
import { useMemo } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';

interface ShotCardProps {
  shot: Shot;
  isActive: boolean;
  onClick: () => void;
}

export function ShotCard({ shot, isActive, onClick }: ShotCardProps) {
  const { t } = useTranslation();
  const project = useProjectStore((state) => state.project);
  
  // 检查是否有多个版本
  const hasMultipleVersions = shot.imageVersions && shot.imageVersions.length > 1;
  
  // 计算图片容器的宽高比样式
  const imageContainerStyle = useMemo(() => {
    const ratioString = project?.aspectRatio || '16:9';
    const [wStr, hStr] = ratioString.split(':');
    const w = parseFloat(wStr || '16');
    const h = parseFloat(hStr || '9');
    
    const style: React.CSSProperties = {
      width: '100%',
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    };
    
    // 使用 aspect-ratio 让容器根据比例自适应高度
    (style as any).aspectRatio = `${w} / ${h}`;
    
    return style;
  }, [project?.aspectRatio]);
  
  return (
    <div
      onClick={onClick}
      className={`sidebar-item ${isActive ? 'active' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] opacity-60" style={{ fontFamily: 'inherit' }}>
            SHOT #{String(shot.shotNumber).padStart(2, '0')}
          </span>
          {hasMultipleVersions && (
            <span className="px-1.5 py-0.5 bg-primary text-black text-xs font-bold">
              {shot.imageVersions?.length || 0}{t('shot.versions')}
            </span>
          )}
        </div>
        <span className="text-[10px] opacity-60" style={{ fontFamily: 'inherit' }}>
          {shot.framing} / {shot.cameraAngle}
        </span>
      </div>
      
      {/* 缩略图容器 - 根据项目比例自适应 */}
      <div style={imageContainerStyle} className="mb-2 border-2 border-primary">
        {shot.image ? (
          <img 
            src={shot.image} 
            alt={`Shot ${shot.shotNumber}`} 
            className="w-full h-full object-contain" 
          />
        ) : (
          <span className="text-xs text-gray-400" style={{ fontFamily: 'inherit' }}>{t('shot.noImage')}</span>
        )}
      </div>
      
      {shot.notes && (
        <p className="font-bold uppercase leading-tight text-sm line-clamp-2">
          {shot.notes}
        </p>
      )}
    </div>
  );
}



