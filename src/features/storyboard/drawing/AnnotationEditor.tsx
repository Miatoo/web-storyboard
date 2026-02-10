import { useState, useRef } from 'react';
import { useUIStore } from '../../../store/uiStore';
import { useProjectStore } from '../../../store/projectStore';
import { DrawingCanvas, DrawingCanvasRef } from './DrawingCanvas';
import { DrawingTools } from './DrawingTools';
import { useTranslation } from '../../../i18n/useTranslation';

export function AnnotationEditor() {
  const { t } = useTranslation();
  const activeShotId = useUIStore((state) => state.activeShotId);
  const getShot = useProjectStore((state) => state.getShot);
  const [tool, setTool] = useState<'brush' | 'arrow' | 'text' | 'eraser'>('brush');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [opacity, setOpacity] = useState(100);
  const [enablePressure, setEnablePressure] = useState(true);
  const [smoothness, setSmoothness] = useState(5); // 平滑度：1-10，默认5
  const [canUndo, setCanUndo] = useState(false);
  const canvasRef = useRef<DrawingCanvasRef>(null);

  const shot = activeShotId ? getShot(activeShotId) : null;

  if (!shot) {
    return (
      <div className="retro-window flex-1 flex flex-col items-center justify-center text-gray-400 bg-white dark:bg-gray-900">
        <div className="retro-header">
          <span>ANNOTATION_EDITOR</span>
        </div>
        <div className="p-4">{t('metadata.selectShot')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-1 p-1">
      {/* 工具栏 */}
      <div className="retro-window bg-white dark:bg-gray-900">
        <div className="retro-header">
          <span>TOOLS</span>
          <span>×</span>
        </div>
        <div className="p-2">
          <DrawingTools
            shotId={shot.id}
            onToolChange={setTool}
            onColorChange={setColor}
            onBrushSizeChange={setBrushSize}
            onOpacityChange={setOpacity}
            currentTool={tool}
            currentColor={color}
            currentBrushSize={brushSize}
            currentOpacity={opacity}
            enablePressure={enablePressure}
            onPressureToggle={setEnablePressure}
            smoothness={smoothness}
            onSmoothnessChange={setSmoothness}
            onUndo={() => canvasRef.current?.undo()}
            canUndo={canUndo}
          />
        </div>
      </div>

      {/* 画布区域 */}
      <div className="retro-window flex-1 flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-800">
        <div className="retro-header">
          <span>CANVAS</span>
        </div>
        <div className="flex-1 relative">
          <DrawingCanvas
            ref={canvasRef}
            shotId={shot.id}
            tool={tool}
            color={color}
            brushSize={brushSize}
            opacity={opacity}
            enablePressure={enablePressure}
            smoothness={smoothness}
            onHistoryChange={setCanUndo}
          />
        </div>
      </div>
    </div>
  );
}
