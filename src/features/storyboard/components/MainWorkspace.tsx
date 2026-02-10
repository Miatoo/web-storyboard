import { useUIStore } from '../../../store/uiStore';
import { BoardView } from '../views/BoardView';
import { Pose3DView } from '../views/Pose3DView';
import { AnnotationView } from '../views/AnnotationView';
import { AIImageView } from '../views/AIImageView';
import { ViewModeSelector } from './ViewModeSelector';

export function MainWorkspace() {
  const viewMode = useUIStore((state) => state.viewMode);

  const renderView = () => {
    switch (viewMode) {
      case 'board':
        return <BoardView />;
      case 'pose3d':
        return <Pose3DView />;
      case 'annotation':
        return <AnnotationView />;
      case 'aigenerate':
        return <AIImageView />;
      default:
        return <BoardView />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-1 gap-1">
      {/* 视图模式切换器 */}
      <div className="retro-window p-1 bg-white dark:bg-gray-800">
        <ViewModeSelector />
      </div>
      
      {/* 当前视图内容 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderView()}
      </div>
    </div>
  );
}



