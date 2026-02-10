import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';

interface ColorWheelProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  onClose?: () => void;
}

// HSV 转 RGB
function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// RGB 转 HSV
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    if (max === r) {
      h = ((g - b) / diff) % 6;
    } else if (max === g) {
      h = (b - r) / diff + 2;
    } else {
      h = (r - g) / diff + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : diff / max;
  const v = max;

  return { h, s, v };
}

// RGB 转十六进制
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

// 十六进制转 RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

export function ColorWheel({ currentColor, onColorChange, onClose }: ColorWheelProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brightnessRef = useRef<HTMLCanvasElement>(null);
  const [hsv, setHsv] = useState(() => {
    const rgb = hexToRgb(currentColor);
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingBrightness, setIsDraggingBrightness] = useState(false);

  const size = 200;
  const center = size / 2;
  const radius = 85;

  // 绘制色轮
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // 绘制色轮
    for (let angle = 0; angle < 360; angle += 0.5) {
      const h = angle;
      for (let r = 0; r < radius; r++) {
        const s = r / radius;
        const v = 1;
        const { r: rgbR, g: rgbG, b: rgbB } = hsvToRgb(h, s, v);
        const x = center + Math.cos((angle * Math.PI) / 180) * r;
        const y = center + Math.sin((angle * Math.PI) / 180) * r;
        ctx.fillStyle = `rgb(${rgbR}, ${rgbG}, ${rgbB})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // 绘制当前选择的点
    const s = hsv.s;
    const angle = (hsv.h * Math.PI) / 180;
    const r = s * radius;
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hsv.h, hsv.s]);

  // 绘制亮度条
  useEffect(() => {
    const canvas = brightnessRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 20;
    canvas.height = size;

    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    const { r, g, b } = hsvToRgb(hsv.h, hsv.s, 1);
    gradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
    gradient.addColorStop(1, 'rgb(0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 20, size);

    // 绘制亮度指示器
    const y = size * (1 - hsv.v);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(20, y);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hsv.h, hsv.s, hsv.v]);

  // 更新颜色
  useEffect(() => {
    const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const hex = rgbToHex(r, g, b);
    onColorChange(hex);
  }, [hsv, onColorChange]);

  // 处理色轮点击/拖拽
  const handleColorWheelMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    handleColorWheelMouseMove(e);
  };

  const handleColorWheelMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging && !isDraggingBrightness) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;

    const distance = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    const h = (angle + 360) % 360;
    const s = Math.min(1, distance / radius);

    setHsv(prev => ({ ...prev, h, s }));
  };

  const handleColorWheelMouseUp = () => {
    setIsDragging(false);
  };

  // 处理亮度条点击/拖拽
  const handleBrightnessMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDraggingBrightness(true);
    handleBrightnessMouseMove(e);
  };

  const handleBrightnessMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingBrightness && !isDragging) return;

    const canvas = brightnessRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const v = Math.max(0, Math.min(1, 1 - y / size));

    setHsv(prev => ({ ...prev, v }));
  };

  const handleBrightnessMouseUp = () => {
    setIsDraggingBrightness(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - center;
        const y = e.clientY - rect.top - center;
        const distance = Math.sqrt(x * x + y * y);
        const angle = Math.atan2(y, x) * (180 / Math.PI);
        const h = (angle + 360) % 360;
        const s = Math.min(1, distance / radius);
        setHsv(prev => ({ ...prev, h, s }));
      }
      if (isDraggingBrightness) {
        const canvas = brightnessRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const v = Math.max(0, Math.min(1, 1 - y / size));
        setHsv(prev => ({ ...prev, v }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsDraggingBrightness(false);
    };

    if (isDragging || isDraggingBrightness) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isDraggingBrightness]);

  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hex = rgbToHex(r, g, b);

  return (
    <div className="absolute z-[9999] bg-white dark:bg-gray-800 border-2 border-black dark:border-white p-2 shadow-lg retro-window">
      <div className="flex gap-2 items-start">
        {/* 色轮 */}
        <canvas
          ref={canvasRef}
          className="cursor-crosshair border border-gray-300 dark:border-gray-600"
          onMouseDown={handleColorWheelMouseDown}
          onMouseMove={handleColorWheelMouseMove}
          onMouseUp={handleColorWheelMouseUp}
          onMouseLeave={handleColorWheelMouseUp}
        />
        
        {/* 亮度条 */}
        <canvas
          ref={brightnessRef}
          className="cursor-ns-resize border border-gray-300 dark:border-gray-600"
          onMouseDown={handleBrightnessMouseDown}
          onMouseMove={handleBrightnessMouseMove}
          onMouseUp={handleBrightnessMouseUp}
          onMouseLeave={handleBrightnessMouseUp}
        />
        
        {/* 颜色预览和十六进制值 */}
        <div className="flex flex-col gap-2 min-w-[120px]">
          <div className="flex flex-col gap-1">
            <div
              className="w-full h-12 border-2 border-black dark:border-white"
              style={{ backgroundColor: hex }}
            />
            <input
              type="text"
              value={hex.toUpperCase()}
              onChange={(e) => {
                const hex = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                  const rgb = hexToRgb(hex);
                  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                  setHsv(hsv);
                }
              }}
              className="w-full px-2 py-1 text-xs border-2 border-black dark:border-white bg-white dark:bg-gray-700 text-black dark:text-white font-mono"
            />
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="pixel-border-button px-2 py-1 text-xs bg-black text-white dark:bg-white dark:text-black"
            >
              {t('common.confirm')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

