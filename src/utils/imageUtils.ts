/**
 * 图片工具函数
 * 用于处理图片格式转换、尺寸调整、压缩等操作
 */

/**
 * 将Base64或Blob URL转换为Blob
 */
export async function convertImageToBlob(image: string): Promise<Blob> {
  if (image.startsWith('data:')) {
    // Base64格式
    const response = await fetch(image);
    return await response.blob();
  } else if (image.startsWith('blob:')) {
    // Blob URL格式
    const response = await fetch(image);
    return await response.blob();
  } else {
    // 假设是URL，尝试获取
    const response = await fetch(image);
    return await response.blob();
  }
}

/**
 * 调整图片尺寸（保持宽高比）
 */
export function resizeImageForAI(
  image: Blob,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(image);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // 计算新尺寸（保持宽高比）
      let { width, height } = img;
      const aspectRatio = width / height;
      
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      
      // 创建canvas并绘制
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('图片转换失败'));
          }
        },
        'image/png',
        0.95
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    
    img.src = url;
  });
}

/**
 * 图片转Base64（支持格式转换）
 */
export function imageToBase64(image: Blob, format: string = 'image/png'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    
    reader.onerror = () => {
      reject(new Error('图片读取失败'));
    };
    
    // 如果格式不同，先转换
    if (image.type !== format) {
      const img = new Image();
      const url = URL.createObjectURL(image);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader2 = new FileReader();
              reader2.onload = () => resolve(reader2.result as string);
              reader2.onerror = () => reject(new Error('图片转换失败'));
              reader2.readAsDataURL(blob);
            } else {
              reject(new Error('图片转换失败'));
            }
          },
          format,
          0.95
        );
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };
      
      img.src = url;
    } else {
      reader.readAsDataURL(image);
    }
  });
}

/**
 * 压缩图片到指定大小（KB）
 */
export async function compressImage(
  image: Blob,
  maxSizeKB: number
): Promise<Blob> {
  const maxSizeBytes = maxSizeKB * 1024;
  
  // 如果图片已经小于目标大小，直接返回
  if (image.size <= maxSizeBytes) {
    return image;
  }
  
  // 逐步降低质量直到满足大小要求
  let quality = 0.9;
  
  const img = new Image();
  const url = URL.createObjectURL(image);
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      const tryCompress = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('图片压缩失败'));
              return;
            }
            
            if (blob.size <= maxSizeBytes || q <= 0.1) {
              resolve(blob);
            } else {
              tryCompress(q - 0.1);
            }
          },
          'image/jpeg',
          q
        );
      };
      
      tryCompress(quality);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    
    img.src = url;
  });
}

/**
 * 根据画幅比例计算图片尺寸
 */
export function calculateImageSize(
  aspectRatio: string,
  baseSize: number = 1024
): { width: number; height: number } {
  const [wStr, hStr] = aspectRatio.split(':');
  const w = parseFloat(wStr || '16');
  const h = parseFloat(hStr || '9');
  const ratio = w / h;
  
  let width: number;
  let height: number;
  
  if (w >= h) {
    // 横向或正方形
    width = baseSize;
    height = Math.round(baseSize / ratio);
  } else {
    // 纵向
    height = baseSize;
    width = Math.round(baseSize * ratio);
  }
  
  // 确保尺寸是8的倍数（某些API要求）
  width = Math.round(width / 8) * 8;
  height = Math.round(height / 8) * 8;
  
  return { width, height };
}

