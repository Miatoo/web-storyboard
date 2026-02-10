import { useEffect, useRef, useState } from 'react';
import { ColorWheel } from './ColorWheel';
import { useTranslation } from '../../../i18n/useTranslation';

interface DrawingToolsProps {
  shotId: string;
  onToolChange: (tool: 'brush' | 'arrow' | 'text' | 'eraser') => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onOpacityChange?: (opacity: number) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  currentTool: 'brush' | 'arrow' | 'text' | 'eraser';
  currentColor: string;
  currentBrushSize: number;
  currentOpacity?: number;
  enablePressure?: boolean;
  onPressureToggle?: (enabled: boolean) => void;
  smoothness?: number; // 平滑度：1-10
  onSmoothnessChange?: (smoothness: number) => void;
}

// 只保留5个快速颜色
const QUICK_COLORS = [
  '#000000', // 黑色
  '#FFFFFF', // 白色
  '#FF0000', // 红色
  '#00FF00', // 绿色
  '#0000FF', // 蓝色
];

const BRUSH_SIZES = [1, 2, 3, 5, 8, 10, 15, 20];

export function DrawingTools({
  shotId: _shotId,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onOpacityChange,
  onUndo,
  canUndo = false,
  currentTool,
  currentColor,
  currentBrushSize,
  currentOpacity = 100,
  enablePressure = true,
  onPressureToggle,
  smoothness = 5,
  onSmoothnessChange,
}: DrawingToolsProps) {
  const { t } = useTranslation();
  const [showColorWheel, setShowColorWheel] = useState(false);
  const colorButtonRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭色轮
  useEffect(() => {
    if (!showColorWheel) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (colorButtonRef.current && !colorButtonRef.current.contains(e.target as Node)) {
        setShowColorWheel(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showColorWheel]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 工具选择 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold uppercase">{t('drawing.tools')}</span>
        <button
          onClick={() => onToolChange('brush')}
          className={`pixel-border-button px-2 py-1 text-xs ${
            currentTool === 'brush'
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          {t('drawing.brush')}
        </button>
        <button
          onClick={() => onToolChange('eraser')}
          className={`pixel-border-button px-2 py-1 text-xs ${
            currentTool === 'eraser'
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          {t('drawing.eraser')}
        </button>
        <button
          onClick={() => onToolChange('arrow')}
          className={`pixel-border-button px-2 py-1 text-xs ${
            currentTool === 'arrow'
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          {t('drawing.arrow')}
        </button>
        <button
          onClick={() => onToolChange('text')}
          className={`pixel-border-button px-2 py-1 text-xs ${
            currentTool === 'text'
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          {t('drawing.text')}
        </button>
      </div>

      {/* 颜色选择 */}
      <div className="flex items-center gap-2 relative" ref={colorButtonRef}>
        <span className="text-sm font-bold uppercase">{t('drawing.color')}</span>
        <div className="flex gap-1 items-center">
          {/* 5个快速颜色 */}
          {QUICK_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-6 h-6 border-2 transition-all ${
                currentColor === color
                  ? 'border-black dark:border-white scale-110'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          {/* 色轮按钮 */}
          <button
            onClick={() => setShowColorWheel(!showColorWheel)}
            className={`w-6 h-6 border-2 pixel-border-button px-1 py-0.5 text-xs flex items-center justify-center ${
              showColorWheel
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            title={t('drawing.colorWheel')}
          >
            🎨
          </button>
        </div>
        {/* 色轮弹窗 */}
        {showColorWheel && (
          <div className="absolute top-full left-0 mt-2 z-[9999]">
            <ColorWheel
              currentColor={currentColor}
              onColorChange={onColorChange}
              onClose={() => setShowColorWheel(false)}
            />
          </div>
        )}
      </div>

      {/* 画笔大小 */}
      {(currentTool === 'brush' || currentTool === 'eraser') && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase">
            {t('drawing.size')}
          </span>
          <div className="flex gap-1">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => onBrushSizeChange(size)}
                className={`pixel-border-button px-1.5 py-0.5 text-xs ${
                  currentBrushSize === size
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 透明度控制 */}
      {(currentTool === 'brush' || currentTool === 'arrow') && onOpacityChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase">{t('drawing.opacity')}</span>
          <div className="flex items-center gap-1">
            <input
              type="range"
              min="0"
              max="100"
              value={currentOpacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              style={{
                background: `linear-gradient(to right, ${currentColor} 0%, ${currentColor} ${currentOpacity}%, #ccc ${currentOpacity}%, #ccc 100%)`,
              }}
            />
            <span className="text-xs font-bold min-w-[2.5rem] text-right">
              {currentOpacity}%
            </span>
          </div>
        </div>
      )}

      {/* 压感开关 */}
      {currentTool === 'brush' && onPressureToggle && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase">{t('drawing.pressure')}</span>
          <button
            onClick={() => onPressureToggle(!enablePressure)}
            className={`pixel-border-button px-2 py-1 text-xs ${
              enablePressure
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            {enablePressure ? t('drawing.on') : t('drawing.off')}
          </button>
        </div>
      )}

      {/* 平滑度控制 */}
      {currentTool === 'brush' && onSmoothnessChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase">{t('drawing.smoothness')}</span>
          <div className="flex items-center gap-1">
            <input
              type="range"
              min="1"
              max="10"
              value={smoothness}
              onChange={(e) => onSmoothnessChange(Number(e.target.value))}
              className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span className="text-xs font-bold min-w-[1.5rem] text-right">
              {smoothness}
            </span>
          </div>
        </div>
      )}

      {/* 撤销按钮 */}
      {onUndo && (
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`pixel-border-button ml-auto px-2 py-1 text-xs ${
            canUndo
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title={t('drawing.undoTitle')}
        >
          {t('drawing.undo')}
        </button>
      )}
    </div>
  );
}
