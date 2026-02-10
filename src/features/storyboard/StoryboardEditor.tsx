import { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MainWorkspace } from './components/MainWorkspace';
import { MetadataPanel } from './components/MetadataPanel';
import { AttributionBar } from './components/AttributionBar';

export function StoryboardEditor() {
  const isMetadataPanelOpen = useUIStore((state) => state.isMetadataPanelOpen);
  const project = useProjectStore((state) => state.project);
  const initProject = useProjectStore((state) => state.initProject);
  // 初始化本地项目：首次加载时创建一个内存中的项目
  useEffect(() => {
    if (!project) {
      initProject();
    }
  }, [project, initProject]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* 顶部工具栏 */}
      <Header />
      
      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* 左侧：镜头列表 */}
        <Sidebar />
        
        {/* 中间：主工作区 */}
        <MainWorkspace />
        
        {/* 右侧：镜头信息面板（可折叠） */}
        {isMetadataPanelOpen && <MetadataPanel />}
      </div>

      {/* 署名/来源（保持可见，尽量不影响布局） */}
      <AttributionBar />
    </div>
  );
}



