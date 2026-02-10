import { useState } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { useTranslation } from '../../../i18n/useTranslation';
import { useAuthStore } from '../../../store/authStore';

export function ExportButton() {
  const { t } = useTranslation();
  const project = useProjectStore((state) => state.project);
  const getShotsSorted = useProjectStore((state) => state.getShotsSorted);
  const [isExporting, setIsExporting] = useState(false);
  const currentUser = useAuthStore((s) => s.currentUser);

  const ensureLoggedIn = () => {
    if (!currentUser) {
      alert(t('auth.loginRequiredForExport'));
      return false;
    }
    return true;
  };

  const handleExportJSON = () => {
    if (!ensureLoggedIn()) return;
    if (!project) return;
    
    const shots = getShotsSorted();
      const exportData = {
        project: {
          name: project.name,
          aspectRatio: project.aspectRatio,
          pdfHeaderText: project.pdfHeaderText,
          createdAt: project.createdAt,
        },
      shots: shots.map((shot) => ({
        shotNumber: shot.shotNumber,
        order: shot.order,
        framing: shot.framing,
        cameraAngle: shot.cameraAngle,
        shotType: shot.shotType,
        duration: shot.duration,
        notes: shot.notes,
        imageUrl: shot.image || '',
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'storyboard'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    if (!ensureLoggedIn()) return;
    if (!project) return;
    
    setIsExporting(true);
    try {
      const shots = getShotsSorted();
      
      // 创建 ZIP 文件，包含 CSV 和所有图片
      const zip = new JSZip();
      
      // CSV 中只包含图片文件名，不包含 base64 编码
      const headers = ['Shot Number', 'Order', 'Framing', 'Camera Angle', 'Shot Type', 'Duration', 'Notes', 'Image File'];
      const rows = shots.map((shot) => {
        const imageFileName = shot.image ? `Shot_${shot.shotNumber.padStart(3, '0')}.png` : '';
        return [
          shot.shotNumber,
          shot.order,
          shot.framing,
          shot.cameraAngle,
          shot.shotType,
          shot.duration,
          `"${shot.notes.replace(/"/g, '""')}"`,
          imageFileName,
        ];
      });

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      // 将 CSV 添加到 ZIP
      zip.file(`${project.name || 'storyboard'}.csv`, '\ufeff' + csv);

      // 将所有图片添加到 ZIP
      for (const shot of shots) {
        if (shot.image) {
          const base64Data = shot.image.split(',')[1] || shot.image;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'image/png' });
          const filename = `Shot_${shot.shotNumber.padStart(3, '0')}.png`;
          zip.file(filename, blob);
        }
      }

      // 生成并下载 ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'storyboard'}_export.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出 CSV 失败:', error);
      alert(t('export.csvFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImages = async () => {
    if (!ensureLoggedIn()) return;
    if (!project) return;
    
    setIsExporting(true);
    try {
      const shots = getShotsSorted();
      const zip = new JSZip();

      for (const shot of shots) {
        if (shot.image) {
          // 将 base64 转换为 blob
          const base64Data = shot.image.split(',')[1] || shot.image;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'image/png' });
          const filename = `Shot_${shot.shotNumber.padStart(3, '0')}.png`;
          zip.file(filename, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'storyboard'}_images.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出图片失败:', error);
      alert(t('export.imagesFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  // 辅助函数：将中文文本渲染为图片（解决 jsPDF 中文乱码问题）
  const renderChineseTextToImage = (
    text: string,
    fontSize: number,
    color: { r: number; g: number; b: number } = { r: 100, g: 100, b: 100 }
  ): { imageData: string; width: number; height: number } => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { imageData: '', width: 0, height: 0 };

    // 设置字体和大小（优先使用系统中文字体）
    ctx.font = `${fontSize}px "Microsoft YaHei", "SimHei", "SimSun", Arial, sans-serif`;
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.textBaseline = 'top';

    // 测量文本宽度
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(fontSize * 1.2); // 行高

    // 设置画布大小（添加一些 padding）
    const padding = 10;
    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    // 重新设置上下文（canvas 尺寸改变后需要重新设置）
    ctx.font = `${fontSize}px "Microsoft YaHei", "SimHei", "SimSun", Arial, sans-serif`;
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.textBaseline = 'top';

    // 绘制文本
    ctx.fillText(text, padding, padding);

    return {
      imageData: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  };

  const handleExportPDF = async () => {
    if (!ensureLoggedIn()) return;
    if (!project) return;
    
    setIsExporting(true);
    try {
      const shots = getShotsSorted();
      
      // 解析项目的画幅比例
      const ratioString = project.aspectRatio || '16:9';
      const [wStr, hStr] = ratioString.split(':');
      const w = parseFloat(wStr || '16');
      const h = parseFloat(hStr || '9');
      const aspect = h === 0 ? 16 / 9 : w / h;
      
      // 判断是横版还是竖版
      const isPortrait = aspect < 1; // 竖版（如9:16）
      
      // 根据画幅选择页面方向
      const pdf = new jsPDF(isPortrait ? 'portrait' : 'landscape', 'mm', 'a4');
      
      // A4 尺寸：横向 297mm x 210mm，竖向 210mm x 297mm
      const pageWidth = isPortrait ? 210 : 297;
      const pageHeight = isPortrait ? 297 : 210;
      
      // 根据画幅调整网格配置
      // 横版：4*3 (12个镜头每页)
      // 竖版：3*4 (12个镜头每页，但布局不同)
      const cols = isPortrait ? 3 : 4;
      const rows = isPortrait ? 4 : 3;
      
      const margin = 12; // 页面边距
      const headerHeight = 20; // 标题区域高度
      const gap = 4; // 卡片之间的间距
      
      // 计算可用区域
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2 - headerHeight;
      
      // 计算每个卡片的大小（考虑间距）
      const totalGapWidth = gap * (cols - 1);
      const totalGapHeight = gap * (rows - 1);
      const cardWidth = (usableWidth - totalGapWidth) / cols;
      const cardHeight = (usableHeight - totalGapHeight) / rows;
      
      // 卡片内边距
      const cardPadding = 3;
      const infoHeight = 12; // 信息区域高度
      const imageAreaWidth = cardWidth - cardPadding * 2;
      const imageAreaHeight = cardHeight - cardPadding * 2 - infoHeight;
      
      // 计算图片区域的实际尺寸，使其与安全框画幅比例一致
      let finalImageAreaWidth = imageAreaWidth;
      let finalImageAreaHeight = imageAreaHeight;
      
      const imageAreaAspect = imageAreaWidth / imageAreaHeight;
      
      if (imageAreaAspect > aspect) {
        // 图片区域更宽，以高度为准，调整宽度
        finalImageAreaWidth = imageAreaHeight * aspect;
      } else {
        // 图片区域更高，以宽度为准，调整高度
        finalImageAreaHeight = imageAreaWidth / aspect;
      }
      
      // 计算居中偏移
      const imageOffsetX = (imageAreaWidth - finalImageAreaWidth) / 2;
      const imageOffsetY = (imageAreaHeight - finalImageAreaHeight) / 2;
      
      // 辅助函数：获取图片尺寸（从 base64）
      const getImageDimensions = (base64Image: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
          };
          img.onerror = () => {
            resolve({ width: 1, height: 1 }); // 默认比例
          };
          img.src = base64Image;
        });
      };
      
      // 预先获取所有图片的尺寸
      const imageDimensionsMap = new Map<string, { width: number; height: number }>();
      await Promise.all(
        shots.map(async (shot) => {
          if (shot.image) {
            const dims = await getImageDimensions(shot.image);
            imageDimensionsMap.set(shot.id, dims);
          }
        })
      );
      
      let shotIndex = 0;
      let pageNum = 0;
      
      while (shotIndex < shots.length) {
        if (pageNum > 0) {
          pdf.addPage();
        }
        
        // 绘制页面标题（使用 Canvas 渲染中文）
        const titleText = project.name || t('app.title');
        const titleResult = renderChineseTextToImage(titleText, 16, { r: 0, g: 0, b: 0 });
        if (titleResult.imageData && titleResult.width > 0 && titleResult.height > 0) {
          // 将像素转换为 mm（假设 96 DPI: 1 inch = 25.4mm, 96 pixels = 25.4mm）
          const titleWidthMm = (titleResult.width / 96) * 25.4;
          const titleHeightMm = (titleResult.height / 96) * 25.4;
          pdf.addImage(titleResult.imageData, 'PNG', margin, margin, titleWidthMm, titleHeightMm);
        }
        
        // 绘制右上角文本（支持占位符 {page}，使用 Canvas 渲染中文）
        const headerText = project.pdfHeaderText || t('settings.pdfHeaderText.placeholder');
        const headerTextWithPage = headerText.replace(/\{page\}/g, String(pageNum + 1));
        const headerResult = renderChineseTextToImage(headerTextWithPage, 10, { r: 100, g: 100, b: 100 });
        if (headerResult.imageData && headerResult.width > 0 && headerResult.height > 0) {
          // 将像素转换为 mm（假设 96 DPI）
          const headerWidthMm = (headerResult.width / 96) * 25.4;
          const headerHeightMm = (headerResult.height / 96) * 25.4;
          // 右对齐：从页面右边缘减去边距和图片宽度
          pdf.addImage(
            headerResult.imageData,
            'PNG',
            pageWidth - margin - headerWidthMm,
            margin,
            headerWidthMm,
            headerHeightMm
          );
        }
        
        // 绘制每个镜头卡片
        for (let r = 0; r < rows && shotIndex < shots.length; r++) {
          for (let c = 0; c < cols && shotIndex < shots.length; c++) {
            const shot = shots[shotIndex];
            
            // 计算卡片位置
            const cardX = margin + c * (cardWidth + gap);
            const cardY = margin + headerHeight + r * (cardHeight + gap);
            
            // 绘制卡片阴影效果（浅灰色矩形，稍微偏移）
            pdf.setFillColor(240, 240, 240);
            pdf.setDrawColor(240, 240, 240);
            pdf.rect(cardX + 1, cardY + 1, cardWidth, cardHeight, 'F');
            
            // 绘制卡片背景（白色，模拟卡片效果）
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(220, 220, 220); // 浅灰色边框
            pdf.setLineWidth(0.5);
            pdf.rect(cardX, cardY, cardWidth, cardHeight, 'FD'); // FD = fill and draw
            
            // 图片区域（已根据安全框画幅比例调整）
            const imageX = cardX + cardPadding + imageOffsetX;
            const imageY = cardY + cardPadding + imageOffsetY;
            
            if (shot.image) {
              try {
                // 获取图片的实际尺寸，确保按正确比例显示，不变形
                const imgDims = imageDimensionsMap.get(shot.id);
                if (imgDims && imgDims.width > 0 && imgDims.height > 0) {
                  const imgAspect = imgDims.width / imgDims.height;
                  
                  // 计算图片在PDF中的实际显示尺寸（保持宽高比，不变形）
                  let displayWidth = finalImageAreaWidth;
                  let displayHeight = finalImageAreaHeight;
                  
                  // 如果图片宽高比与目标区域不一致，按比例缩放以适应区域
                  const targetAspect = finalImageAreaWidth / finalImageAreaHeight;
                  
                  if (imgAspect > targetAspect) {
                    // 图片更宽，以高度为准
                    displayHeight = finalImageAreaHeight;
                    displayWidth = finalImageAreaHeight * imgAspect;
                    // 如果超出区域，则以宽度为准
                    if (displayWidth > finalImageAreaWidth) {
                      displayWidth = finalImageAreaWidth;
                      displayHeight = finalImageAreaWidth / imgAspect;
                    }
                  } else {
                    // 图片更高，以宽度为准
                    displayWidth = finalImageAreaWidth;
                    displayHeight = finalImageAreaWidth / imgAspect;
                    // 如果超出区域，则以高度为准
                    if (displayHeight > finalImageAreaHeight) {
                      displayHeight = finalImageAreaHeight;
                      displayWidth = finalImageAreaHeight * imgAspect;
                    }
                  }
                  
                  // 居中显示
                  const displayX = imageX + (finalImageAreaWidth - displayWidth) / 2;
                  const displayY = imageY + (finalImageAreaHeight - displayHeight) / 2;
                  
                  // 图片已经按照安全框画幅比例裁剪，按实际比例显示，不变形
                  pdf.addImage(
                    shot.image,
                    'PNG',
                    displayX,
                    displayY,
                    displayWidth,
                    displayHeight,
                    undefined,
                    'FAST'
                  );
                } else {
                  // 如果无法获取图片尺寸，使用默认方式（可能变形）
                  pdf.addImage(
                    shot.image,
                    'PNG',
                    imageX,
                    imageY,
                    finalImageAreaWidth,
                    finalImageAreaHeight,
                    undefined,
                    'FAST'
                  );
                }
              } catch (error) {
                console.error('添加图片失败:', error);
                // 如果图片加载失败，显示占位符
                pdf.setFillColor(240, 240, 240);
                pdf.rect(imageX, imageY, finalImageAreaWidth, finalImageAreaHeight, 'F');
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text(t('shot.noImage'), imageX + finalImageAreaWidth / 2, imageY + finalImageAreaHeight / 2, {
                  align: 'center',
                });
              }
            } else {
              // 没有图片时显示占位符
              pdf.setFillColor(240, 240, 240);
              pdf.rect(imageX, imageY, finalImageAreaWidth, finalImageAreaHeight, 'F');
              pdf.setFontSize(8);
              pdf.setTextColor(150, 150, 150);
              pdf.text(t('shot.noImage'), imageX + finalImageAreaWidth / 2, imageY + finalImageAreaHeight / 2, {
                align: 'center',
              });
            }
            
            // 绘制镜头信息（在卡片底部）
            const infoY = cardY + cardHeight - cardPadding - infoHeight + 3;
            pdf.setFontSize(8);
            pdf.setTextColor(0, 0, 0);
            pdf.text(`#${shot.shotNumber}`, imageX, infoY);
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`${shot.framing} | ${shot.cameraAngle}`, imageX, infoY + 4);
            pdf.setFontSize(7);
            pdf.text(`${shot.duration}s`, cardX + cardWidth - cardPadding, infoY, {
              align: 'right',
            });
            
            shotIndex++;
          }
        }
        
        pageNum++;
      }
      
      pdf.save(`${project.name || 'storyboard'}.pdf`);
    } catch (error) {
      console.error('导出 PDF 失败:', error);
      alert(t('export.pdfFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportJSON}
        className="pixel-border-button bg-white dark:bg-gray-700 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
        disabled={isExporting}
      >
        <span>💾</span> {t('common.exportJson')}
      </button>
      <button
        onClick={handleExportCSV}
        className="pixel-border-button bg-white dark:bg-gray-700 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600"
        disabled={isExporting}
      >
        {t('export.csv')}
      </button>
      <button
        onClick={handleExportImages}
        className="pixel-border-button bg-white dark:bg-gray-700 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600"
        disabled={isExporting}
      >
        {isExporting ? t('common.exporting') : t('export.imagesZip')}
      </button>
      <button
        onClick={handleExportPDF}
        className="pixel-border-button bg-white dark:bg-gray-700 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600"
        disabled={isExporting}
      >
        {isExporting ? t('common.exporting') : t('export.pdf')}
      </button>
    </div>
  );
}

