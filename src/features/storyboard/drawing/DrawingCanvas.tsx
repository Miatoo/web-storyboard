import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useTranslation } from '../../../i18n/useTranslation';

interface DrawingCanvasProps {
  shotId: string;
  tool: 'brush' | 'arrow' | 'text' | 'eraser';
  color: string;
  brushSize: number;
  opacity?: number; // 0-100
  enablePressure?: boolean; // 是否启用压感
  smoothness?: number; // 平滑度：1-10
  onHistoryChange?: (canUndo: boolean) => void;
}

export interface DrawingCanvasRef {
  undo: () => void;
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(function DrawingCanvas({
  shotId,
  tool,
  color,
  brushSize,
  opacity = 100,
  enablePressure = true,
  smoothness = 5,
  onHistoryChange,
}: DrawingCanvasProps, ref) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const getShot = useProjectStore((state) => state.getShot);
  const updateShot = useProjectStore((state) => state.updateShot);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<string[]>([]); // 保存历史状态的数组
  const baseImageRef = useRef<string | null>(null); // 保存底图（用于撤销时恢复）
  const lastPosRef = useRef<{ x: number; y: number; time: number } | null>(null); // 用于计算速度
  const currentPressureRef = useRef<number>(1); // 当前压力值（0-1）
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null); // 临时画布，用于绘制当前笔触（不透明）
  const tempCtxRef = useRef<CanvasRenderingContext2D | null>(null); // 临时画布的上下文
  const pathPointsRef = useRef<Array<{ x: number; y: number; pressure: number }>>([]); // 保存绘制路径点用于平滑
  const arrowBaseImageDataRef = useRef<ImageData | null>(null); // 保存箭头绘制开始时的基础状态（ImageData，用于同步恢复）
  const [textInput, setTextInput] = useState<{ 
    x: number; 
    y: number; 
    text: string;
    fontSize: number;
    visible: boolean;
    isDragging: boolean;
    dragOffset: { x: number; y: number } | null;
  } | null>(null); // 文字输入框状态
  const textInputRef = useRef<HTMLTextAreaElement>(null); // 文字输入框引用
  const textInputContainerRef = useRef<HTMLDivElement>(null); // 文字输入框容器引用
  const textObjectsRef = useRef<Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
    opacity: number;
    isSelected?: boolean;
    isDragging?: boolean;
    dragOffset?: { x: number; y: number };
  }>>([]); // 已完成的文字对象数组
  const selectedTextIdRef = useRef<string | null>(null); // 当前选中的文字ID

  const shot = getShot(shotId);

  // 暴露 undo 方法给父组件
  useImperativeHandle(ref, () => ({
    undo: () => {
      if (!canvasRef.current || historyRef.current.length === 0) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 移除当前状态（最后一次绘制）
      historyRef.current.pop();
      
      // 恢复上一个状态
      if (historyRef.current.length > 0) {
        const prevState = historyRef.current[historyRef.current.length - 1];
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          // 更新 shot 的 image
          const imageData = canvas.toDataURL('image/png');
          updateShot(shotId, {
            image: imageData,
            imageSource: 'drawing',
          });
        };
        img.src = prevState;
      } else if (baseImageRef.current) {
        // 如果没有历史记录，恢复到底图
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          // 更新 shot 的 image
          const imageData = canvas.toDataURL('image/png');
          updateShot(shotId, {
            image: imageData,
            imageSource: 'drawing',
          });
        };
        img.src = baseImageRef.current;
      }
      
      // 通知父组件历史状态变化
      if (onHistoryChange) {
        onHistoryChange(historyRef.current.length > 0);
      }
    },
  }), [shotId, updateShot, onHistoryChange]);

  // 初始化画布（只在 shotId 变化时执行）
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !shot) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // 设置画布大小（只在初始化时执行）
    const initCanvas = () => {
      const currentWidth = canvas.width;
      const currentHeight = canvas.height;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      // 只在尺寸真正变化时才重新设置画布大小
      if (currentWidth !== newWidth || currentHeight !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;

        // 如果有底图，绘制底图
        if (shot.image) {
          const img = new Image();
          img.onload = () => {
            // 计算缩放比例以适应画布
            const scale = Math.min(
              canvas.width / img.width,
              canvas.height / img.height
            );
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            // 保存底图
            baseImageRef.current = canvas.toDataURL('image/png');
            // 重置历史记录
            historyRef.current = [];
            if (onHistoryChange) {
              onHistoryChange(false);
            }
          };
          img.src = shot.image;
        } else {
          // 绘制白色背景
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // 保存底图
          baseImageRef.current = canvas.toDataURL('image/png');
          // 重置历史记录
          historyRef.current = [];
          if (onHistoryChange) {
            onHistoryChange(false);
          }
        }
      }
    };

    initCanvas();
  }, [shotId, shot?.id]); // 只在 shotId 或 shot.id 变化时初始化

  // 绘制功能（独立于初始化）
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !shot) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // 初始化临时画布（如果还没有初始化）
    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas');
      tempCanvasRef.current.width = canvas.width || containerRef.current.clientWidth;
      tempCanvasRef.current.height = canvas.height || containerRef.current.clientHeight;
      tempCtxRef.current = tempCanvasRef.current.getContext('2d');
    } else {
      // 确保临时画布尺寸与主画布一致
      if (tempCanvasRef.current.width !== canvas.width || tempCanvasRef.current.height !== canvas.height) {
        tempCanvasRef.current.width = canvas.width;
        tempCanvasRef.current.height = canvas.height;
      }
    }

    // 保存当前画布状态到历史
    const saveStateToHistory = () => {
      const imageData = canvas.toDataURL('image/png');
      historyRef.current.push(imageData);
      // 限制历史记录数量（最多100个，增加容量）
      if (historyRef.current.length > 100) {
        historyRef.current.shift();
      }
      if (onHistoryChange) {
        onHistoryChange(historyRef.current.length > 0);
      }
    };


    // 处理窗口大小变化（只调整画布大小，不重新绘制内容）
    const handleResize = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const currentWidth = canvas.width;
      const currentHeight = canvas.height;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      // 只在尺寸真正变化时才调整
      if (currentWidth !== newWidth || currentHeight !== newHeight) {
        // 保存当前画布内容
        const currentImageData = canvas.toDataURL('image/png');
        
        // 调整画布大小
        canvas.width = newWidth;
        canvas.height = newHeight;

        // 恢复画布内容
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = currentImageData;
      }
    };

    window.addEventListener('resize', handleResize);

    // 获取缩放后的坐标和压力值
    const getScaledCoordinates = (e: MouseEvent | TouchEvent | PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX: number;
      let clientY: number;
      let pressure = 1; // 默认压力值
      
      if (e instanceof PointerEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
        // PointerEvent 支持压感（如果设备支持）
        if (e.pointerType === 'pen' || e.pointerType === 'touch') {
          pressure = e.pressure || 1;
        }
      } else if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        // TouchEvent
        clientX = e.touches[0]?.clientX || 0;
        clientY = e.touches[0]?.clientY || 0;
        // 触摸事件可能支持 force (iOS) 或 pressure
        const touch = e.touches[0];
        if (touch && 'force' in touch && touch.force !== undefined) {
          pressure = touch.force;
        }
      }
      
      // 计算缩放比例：实际画布尺寸 / 显示尺寸
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      
      return { x, y, pressure };
    };

    // 根据速度和位置计算压力（用于不支持压感的设备）
    const calculateVelocityPressure = (x: number, y: number): number => {
      if (!lastPosRef.current) return 1;
      
      const now = Date.now();
      const deltaTime = now - lastPosRef.current.time;
      if (deltaTime === 0) return currentPressureRef.current;
      
      const deltaX = x - lastPosRef.current.x;
      const deltaY = y - lastPosRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime; // 像素/毫秒
      
      // 速度越快，压力越小（模拟快速移动时笔刷变细）
      // 将速度映射到 0.3 到 1.5 的压力范围（慢速时压力大，快速时压力小）
      // 最大速度假设为 2 像素/毫秒
      const maxVelocity = 2;
      const normalizedVelocity = Math.min(velocity / maxVelocity, 1);
      const pressure = 1.5 - (normalizedVelocity * 1.2); // 1.5 到 0.3 的范围
      
      // 平滑压力变化
      const smoothFactor = 0.3;
      currentPressureRef.current = currentPressureRef.current * (1 - smoothFactor) + pressure * smoothFactor;
      
      lastPosRef.current = { x, y, time: now };
      return currentPressureRef.current;
    };

    // 应用颜色（不使用透明度，透明度由 globalAlpha 控制）
    const applyStyle = () => {
      return color;
    };

    // 计算实际笔刷大小（考虑压感）
    const getEffectiveBrushSize = (pressure: number = 1): number => {
      if (!enablePressure) return brushSize;
      // 压力范围 0.3-1.5，映射到笔刷大小的 0.3-1.5 倍
      return brushSize * Math.max(0.3, Math.min(1.5, pressure));
    };

    // 使用二次贝塞尔曲线平滑绘制路径
    const drawSmoothPath = (
      ctx: CanvasRenderingContext2D,
      points: Array<{ x: number; y: number }>,
      smoothness: number
    ) => {
      if (points.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      if (points.length === 2) {
        // 只有两个点，直接连线
        ctx.lineTo(points[1].x, points[1].y);
      } else {
        // 使用二次贝塞尔曲线平滑
        // 平滑度越高，控制点距离中点越近（更平滑）
        const smoothnessFactor = Math.min(0.95, smoothness / 10); // 0.1 到 0.95
        
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          
          if (i < points.length - 1) {
            // 中间点：使用前后点的平均值作为控制点，使路径更平滑
            const next = points[i + 1];
            // 控制点在前一个点和下一个点的中点
            const cpX = prev.x + (next.x - prev.x) * 0.5 * smoothnessFactor;
            const cpY = prev.y + (next.y - prev.y) * 0.5 * smoothnessFactor;
            // 目标点是当前点和控制点的中点
            const targetX = curr.x + (cpX - curr.x) * smoothnessFactor;
            const targetY = curr.y + (cpY - curr.y) * smoothnessFactor;
            ctx.quadraticCurveTo(cpX, cpY, targetX, targetY);
          } else {
            // 最后一个点：直接连到当前点
            const cpX = prev.x + (curr.x - prev.x) * smoothnessFactor;
            const cpY = prev.y + (curr.y - prev.y) * smoothnessFactor;
            ctx.quadraticCurveTo(cpX, cpY, curr.x, curr.y);
          }
        }
      }
      
      ctx.stroke();
    };

    // 绘制事件
    const startDrawing = (e: MouseEvent | TouchEvent | PointerEvent) => {
      isDrawingRef.current = true;
      const { x, y, pressure } = getScaledCoordinates(e);

      startPosRef.current = { x, y };
      lastPosRef.current = { x, y, time: Date.now() };
      currentPressureRef.current = pressure;

      // 在开始绘制前保存当前状态到历史
      if (tool === 'brush' || tool === 'eraser' || tool === 'arrow' || tool === 'text') {
        saveStateToHistory();
      }

      // 对于箭头工具，保存基础状态的 ImageData（用于同步恢复）
      if (tool === 'arrow' && canvas) {
        arrowBaseImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }

      // 对于文字工具
      if (tool === 'text') {
        // 如果已经有一个输入框，检查是否点击在输入框上
        if (textInput && textInputContainerRef.current) {
          const rect = textInputContainerRef.current.getBoundingClientRect();
          let clientX = 0;
          let clientY = 0;
          if (e instanceof MouseEvent) {
            clientX = e.clientX;
            clientY = e.clientY;
          } else if (e instanceof TouchEvent && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
          } else if ('clientX' in e && 'clientY' in e) {
            clientX = typeof e.clientX === 'number' ? e.clientX : 0;
            clientY = typeof e.clientY === 'number' ? e.clientY : 0;
          }
          
          // 如果点击在输入框上，不创建新输入框（拖拽由输入框自身处理）
          if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
            return;
          }
        }

        // 检查是否点击在已绘制的文字对象上
        const { x, y } = getScaledCoordinates(e);
        let clickedTextObj: typeof textObjectsRef.current[0] | undefined;
        
        if (canvas && ctx) {
          // 临时设置字体以测量文字宽度
          ctx.save();
          clickedTextObj = textObjectsRef.current.find((textObj) => {
            // 粗略检测：检查点击位置是否在文字对象的矩形区域内
            const lines = textObj.text.split('\n');
            const lineHeight = textObj.fontSize * 1.2;
            const textHeight = lines.length * lineHeight;
            
            // 估算文字宽度
            ctx.font = `${textObj.fontSize}px sans-serif`;
            const metrics = ctx.measureText(textObj.text.split('\n')[0] || '');
            const textWidth = metrics.width;
            
            const padding = 10; // 点击容差
            return (
              x >= textObj.x - padding &&
              x <= textObj.x + textWidth + padding &&
              y >= textObj.y - padding &&
              y <= textObj.y + textHeight + padding
            );
          });
          ctx.restore();
        }

        if (clickedTextObj) {
          // 选中文字对象，开始拖拽
          isDrawingRef.current = false;
          selectedTextIdRef.current = clickedTextObj.id;
          // 取消其他文字的选中状态
          textObjectsRef.current.forEach((obj) => {
            obj.isSelected = obj.id === clickedTextObj.id;
            obj.isDragging = obj.id === clickedTextObj.id;
            obj.dragOffset = obj.id === clickedTextObj.id ? {
              x: x - obj.x,
              y: y - obj.y,
            } : undefined;
          });
          // 重新渲染
          drawAllTextObjects();
          return;
        }
        
        // 没有点击到已绘制的文字，创建新的输入框
        isDrawingRef.current = false;
        // 取消所有文字的选中状态
        textObjectsRef.current.forEach((obj) => {
          obj.isSelected = false;
          obj.isDragging = false;
        });
        selectedTextIdRef.current = null;
        setTextInput({
          x,
          y,
          text: '',
          fontSize: brushSize * 5, // 初始字体大小
          visible: true,
          isDragging: false,
          dragOffset: null,
        });
        // 延迟聚焦，确保输入框已渲染
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
        return;
      }

      if (tool === 'brush' || tool === 'eraser') {
        const effectiveSize = getEffectiveBrushSize(pressure);
        
        // 初始化路径点数组
        pathPointsRef.current = [{ x, y, pressure }];
        
        if (tool === 'eraser') {
          // 橡皮擦：初始化路径点数组
          pathPointsRef.current = [{ x, y, pressure }];
          // 绘制起始点（小圆点）
          ctx.globalCompositeOperation = 'destination-out';
          ctx.globalAlpha = opacity / 100;
          ctx.beginPath();
          ctx.arc(x, y, effectiveSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        } else {
          // 画笔：直接在主画布上初始化
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = color;
          ctx.globalAlpha = opacity / 100;
          ctx.lineWidth = effectiveSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y);
          // 绘制起始点（小圆点）
          ctx.arc(x, y, effectiveSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.globalAlpha = 1;
        }
      }
    };

    const draw = (e: MouseEvent | TouchEvent | PointerEvent) => {
      // 处理文字输入框拖拽
      if (tool === 'text' && textInput && textInput.isDragging && textInput.dragOffset) {
        e.preventDefault();
        const { x, y } = getScaledCoordinates(e);
        setTextInput({
          ...textInput,
          x: x - textInput.dragOffset.x,
          y: y - textInput.dragOffset.y,
        });
        return;
      }

      // 处理已绘制文字对象的拖拽
      if (tool === 'text' && selectedTextIdRef.current) {
        const selectedTextObj = textObjectsRef.current.find((obj) => obj.id === selectedTextIdRef.current && obj.isDragging);
        if (selectedTextObj && selectedTextObj.dragOffset) {
          e.preventDefault();
          const { x, y } = getScaledCoordinates(e);
          selectedTextObj.x = x - selectedTextObj.dragOffset.x;
          selectedTextObj.y = y - selectedTextObj.dragOffset.y;
          // 重新渲染所有文字对象（先恢复底图，再绘制文字）
          // 使用 requestAnimationFrame 来避免过度渲染
          if (canvas && ctx) {
            // 先清除所有文字（通过恢复底图或非文字内容）
            // 这里使用 baseImageRef 作为底图，然后绘制所有文字对象
            const baseImageToUse = baseImageRef.current || (shot.image || null);
            
            if (baseImageToUse) {
              const img = new Image();
              img.onload = () => {
                // 清除画布
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // 绘制底图（包含所有非文字内容）
                // 如果 baseImageRef 存在，使用它；否则使用 shot.image
                if (baseImageRef.current === baseImageToUse) {
                  // 这是初始底图，需要缩放
                  const scale = Math.min(
                    canvas.width / img.width,
                    canvas.height / img.height
                  );
                  const x = (canvas.width - img.width * scale) / 2;
                  const y = (canvas.height - img.height * scale) / 2;
                  ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                } else {
                  // 这是完整的画布图像，直接绘制
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
                // 绘制所有文字对象（拖拽时不保存状态，避免重复）
                drawTextObjectsOnly(ctx, canvas, true);
              };
              img.src = baseImageToUse;
            } else {
              // 没有底图，清除后重新绘制
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              drawTextObjectsOnly(ctx, canvas);
            }
          }
          return;
        }
      }

      if (!isDrawingRef.current) return;

      e.preventDefault();
      const { x, y, pressure: devicePressure } = getScaledCoordinates(e);
      
      // 计算实际压力：如果设备支持压感就用设备压感，否则用速度模拟
      let effectivePressure = devicePressure;
      if (enablePressure && (e instanceof MouseEvent || (e instanceof PointerEvent && e.pointerType === 'mouse'))) {
        // 鼠标或不支持压感的设备，使用速度模拟
        effectivePressure = calculateVelocityPressure(x, y);
      } else if (enablePressure) {
        effectivePressure = devicePressure;
      } else {
        effectivePressure = 1;
      }

      if (tool === 'brush' || tool === 'eraser') {
        const effectiveSize = getEffectiveBrushSize(effectivePressure);
        
        if (tool === 'eraser') {
          // 橡皮擦：使用路径点数组来绘制平滑的擦除路径
          // 添加当前点到路径数组
          pathPointsRef.current.push({ x, y, pressure: effectivePressure });
          
          // 限制路径点数量
          if (pathPointsRef.current.length > 50) {
            pathPointsRef.current.shift();
          }
          
          // 使用路径点绘制擦除路径
          if (pathPointsRef.current.length >= 2) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.globalAlpha = opacity / 100;
            ctx.lineWidth = effectiveSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // 绘制路径
            ctx.beginPath();
            const firstPoint = pathPointsRef.current[0];
            ctx.moveTo(firstPoint.x, firstPoint.y);
            
            // 连接所有路径点
            for (let i = 1; i < pathPointsRef.current.length; i++) {
              ctx.lineTo(pathPointsRef.current[i].x, pathPointsRef.current[i].y);
            }
            ctx.stroke();
            
            // 重置混合模式
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
          }
          
          // 更新起始点，用于下一次绘制
          if (startPosRef.current) {
            startPosRef.current.x = x;
            startPosRef.current.y = y;
          }
          
          // 检查并删除被擦除的文字对象
          // 计算擦除路径的边界框（使用路径点数组）
          let eraserMinX = x;
          let eraserMaxX = x;
          let eraserMinY = y;
          let eraserMaxY = y;
          
          if (pathPointsRef.current.length > 0) {
            pathPointsRef.current.forEach((point) => {
              eraserMinX = Math.min(eraserMinX, point.x);
              eraserMaxX = Math.max(eraserMaxX, point.x);
              eraserMinY = Math.min(eraserMinY, point.y);
              eraserMaxY = Math.max(eraserMaxY, point.y);
            });
          }
          
          // 添加笔刷半径
          eraserMinX -= effectiveSize / 2;
          eraserMaxX += effectiveSize / 2;
          eraserMinY -= effectiveSize / 2;
          eraserMaxY += effectiveSize / 2;
          
          let textRemoved = false;
          const originalLength = textObjectsRef.current.length;
          
          textObjectsRef.current = textObjectsRef.current.filter((textObj) => {
            // 计算文字对象的边界
            ctx.save();
            ctx.font = `${textObj.fontSize}px sans-serif`;
            const metrics = ctx.measureText(textObj.text.split('\n')[0] || '');
            const textWidth = metrics.width;
            ctx.restore();
            
            const lines = textObj.text.split('\n');
            const lineHeight = textObj.fontSize * 1.2;
            const textHeight = lines.length * lineHeight;
            
            const textRight = textObj.x + textWidth;
            const textBottom = textObj.y + textHeight;
            
            // 检查擦除区域是否与文字对象重叠
            const overlaps = !(textRight < eraserMinX || textObj.x > eraserMaxX || 
                               textBottom < eraserMinY || textObj.y > eraserMaxY);
            
            if (overlaps) {
              textRemoved = true;
              return false; // 删除这个文字对象
            }
            return true; // 保留这个文字对象
          });
          
          // 如果有文字对象被删除，重新渲染画布
          if (textRemoved || textObjectsRef.current.length < originalLength) {
            // 重新渲染整个画布（包括剩余的文字对象）
            renderAllTextObjects();
          }
        } else {
          // 画笔：使用平滑路径绘制
          // 添加当前点到路径数组
          pathPointsRef.current.push({ x, y, pressure: effectivePressure });
          
          // 限制路径点数量（保留最近的50个点，避免内存问题）
          if (pathPointsRef.current.length > 50) {
            pathPointsRef.current.shift();
          }
          
          // 根据平滑度决定每次绘制使用的点数
          // 平滑度越高，使用更多的历史点来绘制平滑曲线
          const pointsToUse = Math.min(
            pathPointsRef.current.length,
            Math.max(2, Math.ceil((smoothness / 10) * pathPointsRef.current.length) || 2)
          );
          
          // 使用最近的几个点进行平滑绘制
          const pointsToDraw = pathPointsRef.current.slice(-pointsToUse);
          
          // 设置绘制样式
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = color;
          ctx.globalAlpha = opacity / 100;
          
          // 使用平均压力计算笔刷大小
          const avgPressure = pointsToDraw.reduce((sum, p) => sum + p.pressure, 0) / pointsToDraw.length;
          const avgSize = getEffectiveBrushSize(avgPressure);
          
          ctx.lineWidth = avgSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // 如果点太少或平滑度很低，直接连线
          if (pointsToDraw.length <= 2 || smoothness <= 2) {
            ctx.beginPath();
            ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);
            for (let i = 1; i < pointsToDraw.length; i++) {
              ctx.lineTo(pointsToDraw[i].x, pointsToDraw[i].y);
            }
            ctx.stroke();
          } else {
            // 使用平滑算法绘制
            drawSmoothPath(ctx, pointsToDraw.map(p => ({ x: p.x, y: p.y })), smoothness);
          }
          
          // 更新起始点
          if (startPosRef.current) {
            startPosRef.current.x = x;
            startPosRef.current.y = y;
          }
          
          // 重置透明度（不影响后续绘制）
          ctx.globalAlpha = 1;
        }
      } else if (tool === 'arrow' && startPosRef.current) {
        // 恢复基础状态（同步方式：使用 ImageData）
        if (arrowBaseImageDataRef.current) {
          ctx.putImageData(arrowBaseImageDataRef.current, 0, 0);
        } else {
          // 如果没有保存的基础状态，清除画布
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // 设置绘制样式（箭头）
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = opacity / 100;
        // 绘制箭头（支持透明度）
        drawArrow(ctx, startPosRef.current.x, startPosRef.current.y, x, y, applyStyle(), brushSize);
        // 重置透明度，避免影响后续绘制
        ctx.globalAlpha = 1;
      }
    };

    const stopDrawing = () => {
      // 停止文字输入框拖拽
      if (tool === 'text' && textInput && textInput.isDragging) {
        setTextInput(prev => prev ? { ...prev, isDragging: false, dragOffset: null } : null);
        return;
      }

      // 停止已绘制文字对象的拖拽
      if (tool === 'text' && selectedTextIdRef.current) {
        const selectedTextObj = textObjectsRef.current.find((obj) => obj.id === selectedTextIdRef.current);
        if (selectedTextObj && selectedTextObj.isDragging) {
          selectedTextObj.isDragging = false;
          selectedTextObj.dragOffset = undefined;
          // 保存画布状态
          const imageData = canvas.toDataURL('image/png');
          updateShot(shotId, {
            image: imageData,
            imageSource: 'drawing',
          });
          // 保存历史记录
          saveStateToHistory();
        }
        return;
      }

      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        // 保存当前画布状态
        const imageData = canvas.toDataURL('image/png');
        updateShot(shotId, {
          image: imageData,
          imageSource: 'drawing',
        });
        startPosRef.current = null;
        lastPosRef.current = null;
        pathPointsRef.current = []; // 清空路径点
        currentPressureRef.current = 1;
        arrowBaseImageDataRef.current = null; // 清空箭头基础状态
      }
    };

    // 优先使用 Pointer Events（支持压感）
    canvas.addEventListener('pointerdown', startDrawing as EventListener);
    canvas.addEventListener('pointermove', draw as EventListener);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointerout', stopDrawing);
    
    // 兼容性：如果不支持 Pointer Events，回退到 Mouse/Touch Events
    canvas.addEventListener('mousedown', startDrawing as EventListener);
    canvas.addEventListener('mousemove', draw as EventListener);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing as EventListener);
    canvas.addEventListener('touchmove', draw as EventListener);
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', startDrawing as EventListener);
      canvas.removeEventListener('pointermove', draw as EventListener);
      canvas.removeEventListener('pointerup', stopDrawing);
      canvas.removeEventListener('pointerout', stopDrawing);
      canvas.removeEventListener('mousedown', startDrawing as EventListener);
      canvas.removeEventListener('mousemove', draw as EventListener);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing as EventListener);
      canvas.removeEventListener('touchmove', draw as EventListener);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [shotId, tool, color, brushSize, opacity, enablePressure, smoothness, updateShot, onHistoryChange]); // 移除 shot 依赖，避免重复初始化

  // 将文字保存为对象（而不是直接绘制到画布）
  const saveTextAsObject = (text: string, x: number, y: number, fontSize: number) => {
    if (!text.trim()) return;
    
    // 创建文字对象
    const textObj = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      text,
      fontSize,
      color,
      opacity,
      isSelected: false,
      isDragging: false,
    };
    
    // 添加到文字对象数组
    textObjectsRef.current.push(textObj);
    
    // 重新渲染画布（包括所有文字对象）
    renderAllTextObjects();
    // 注意：drawAllTextObjects 内部会保存画布状态到 updateShot
  };

  // 渲染所有文字对象到画布
  const renderAllTextObjects = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 直接调用 drawAllTextObjects，它已经包含了清除画布和绘制底图的逻辑
    drawAllTextObjects();
  };

  // 绘制所有文字对象
  const drawAllTextObjects = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 先清除画布，恢复底图（如果有）
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 如果有底图，先绘制底图
    if (baseImageRef.current) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        // 绘制所有文字对象（在底图上）
        drawTextObjectsOnly(ctx, canvas);
      };
      img.src = baseImageRef.current;
    } else {
      // 没有底图，直接绘制白色背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // 然后绘制所有文字对象
      drawTextObjectsOnly(ctx, canvas);
    }
  };

  // 只绘制文字对象（不清除画布，用于在已有内容上叠加文字）
  const drawTextObjectsOnly = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, skipSave = false) => {
    // 绘制所有文字对象
    textObjectsRef.current.forEach((textObj) => {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = textObj.opacity / 100;
      ctx.fillStyle = textObj.color;
      ctx.font = `${textObj.fontSize}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      // 处理多行文字
      const lines = textObj.text.split('\n');
      const lineHeight = textObj.fontSize * 1.2;
      
      lines.forEach((line, index) => {
        ctx.fillText(line, textObj.x, textObj.y + index * lineHeight);
      });

      // 如果选中，绘制边框
      if (textObj.isSelected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const metrics = ctx.measureText(textObj.text.split('\n')[0] || '');
        const textHeight = lines.length * lineHeight;
        const padding = 4;
        ctx.strokeRect(
          textObj.x - padding,
          textObj.y - padding,
          Math.max(metrics.width, 50) + padding * 2,
          textHeight + padding * 2
        );
        ctx.setLineDash([]);
      }

      ctx.restore();
    });

    ctx.globalAlpha = 1;

    // 如果不是跳过保存，则保存画布状态
    if (!skipSave) {
      const imageData = canvas.toDataURL('image/png');
      updateShot(shotId, {
        image: imageData,
        imageSource: 'drawing',
      });
    }
  };

  // 处理文字输入确认
  const handleTextConfirm = (text: string) => {
    if (textInput) {
      saveTextAsObject(text, textInput.x, textInput.y, textInput.fontSize);
      setTextInput(null);
    }
  };

  // 处理文字输入取消
  const handleTextCancel = () => {
    setTextInput(null);
  };

  // 当工具切换到非文字工具时，关闭输入框
  useEffect(() => {
    if (tool !== 'text' && textInput) {
      setTextInput(null);
    }
  }, [tool, textInput]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full border border-gray-300 bg-white cursor-crosshair"
        style={{ touchAction: 'none' }}
      />
      {/* 文字输入框 - PS风格，可拖拽 */}
      {textInput && textInput.visible && canvasRef.current && containerRef.current && (
        <div
          ref={textInputContainerRef}
          className="absolute pointer-events-auto select-none"
          style={{
            left: `${((textInput.x / canvasRef.current.width) * containerRef.current.clientWidth)}px`,
            top: `${((textInput.y / canvasRef.current.height) * containerRef.current.clientHeight)}px`,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={(e) => {
            // 如果点击在输入框边缘区域（header），允许拖拽
            const target = e.target as HTMLElement;
            if (target.closest('.text-input-header') && !target.closest('button')) {
              e.preventDefault();
              e.stopPropagation();
              if (!canvasRef.current || !containerRef.current) return;
              
              // 计算相对于画布的坐标
              const canvasRect = canvasRef.current.getBoundingClientRect();
              const clientX = e.clientX;
              const clientY = e.clientY;
              const scaleX = canvasRef.current.width / canvasRect.width;
              const scaleY = canvasRef.current.height / canvasRect.height;
              const x = (clientX - canvasRect.left) * scaleX;
              const y = (clientY - canvasRect.top) * scaleY;
              
              setTextInput({
                ...textInput,
                isDragging: true,
                dragOffset: {
                  x: x - textInput.x,
                  y: y - textInput.y,
                },
              });
            }
          }}
        >
          <div className="retro-window bg-white dark:bg-gray-900 min-w-[200px] max-w-[400px]">
            {/* 拖拽手柄 */}
            <div className="text-input-header retro-header p-1 cursor-move flex items-center justify-between">
              <span className="text-xs">{t('drawing.textTool.title')}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTextCancel();
                }}
                className="pixel-border-button px-1.5 py-0.5 text-xs hover:bg-gray-200 dark:hover:bg-gray-700"
                onMouseDown={(e) => e.stopPropagation()}
              >
                ×
              </button>
            </div>
            {/* 文字输入区域 */}
            <div className="p-2">
              <textarea
                ref={textInputRef}
                value={textInput.text}
                onChange={(e) => {
                  setTextInput({
                    ...textInput,
                    text: e.target.value,
                  });
                }}
                className="w-full border-2 border-black dark:border-white p-2 text-sm outline-none bg-transparent text-black dark:text-white resize-none font-mono"
                placeholder={t('drawing.textTool.placeholder')}
                style={{
                  fontSize: `${textInput.fontSize}px`,
                  lineHeight: '1.5',
                  minHeight: '60px',
                }}
                onKeyDown={(e) => {
                  // Ctrl+Enter 或 Cmd+Enter 确认
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleTextConfirm(textInput.text);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleTextCancel();
                  }
                  // 阻止事件冒泡，避免触发画布事件
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  // 阻止拖拽，允许文字选择
                  e.stopPropagation();
                }}
                autoFocus
                rows={3}
              />
              {/* 字体大小调整 */}
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {t('drawing.textTool.size')}
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={textInput.fontSize}
                  onChange={(e) => {
                    setTextInput({
                      ...textInput,
                      fontSize: parseInt(e.target.value, 10),
                    });
                  }}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={textInput.fontSize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 10 && val <= 200) {
                      setTextInput({
                        ...textInput,
                        fontSize: val,
                      });
                    }
                  }}
                  className="w-16 border-2 border-black dark:border-white p-1 text-xs text-center bg-white dark:bg-gray-800 text-black dark:text-white"
                />
              </div>
              {/* 提示信息 */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('drawing.textTool.hint')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// 绘制箭头函数（支持透明度）
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number
) {
  // 箭头头部长度（根据线条宽度动态调整）
  const headlen = Math.max(10, lineWidth * 3);
  const angle = Math.atan2(toY - fromY, toX - fromX);

  // 保存当前状态
  ctx.save();
  
  // 设置样式（透明度由 globalAlpha 控制）
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 绘制箭头线条
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  // 箭头线条应该停在箭头头部之前，避免重叠
  const arrowLineEndX = toX - headlen * Math.cos(angle);
  const arrowLineEndY = toY - headlen * Math.sin(angle);
  ctx.lineTo(arrowLineEndX, arrowLineEndY);
  ctx.stroke();

  // 绘制箭头头部（三角形）
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  
  // 恢复状态
  ctx.restore();
}
