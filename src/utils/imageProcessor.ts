import type { ImageSettings } from '../types';

/**
 * Обрабатывает изображение согласно настройкам
 * Возвращает ImageData с обработанным изображением
 */
export async function processImage(
  sourceImageUrl: string,
  settings: ImageSettings
): Promise<ImageData> {
  // Загружаем изображение
  const img = await loadImage(sourceImageUrl);
  
  // Создаём canvas для обработки
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Рисуем исходное изображение
  ctx.drawImage(img, 0, 0);
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Pipeline обработки
  imageData = convertToGrayscale(imageData);
  
  if (settings.invert) {
    imageData = invertImage(imageData);
  }
  
  if (settings.gaussianBlur > 0) {
    imageData = applyGaussianBlur(imageData, settings.gaussianBlur);
  }
  
  if (settings.uniformBlur > 0) {
    imageData = applyUniformBlur(imageData, settings.uniformBlur);
  }
  
  // Применяем cubic bezier transfer function
  imageData = applyCubicBezier(imageData, settings.bezierCurve);

  return imageData;
}

/**
 * Загружает изображение из URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Конвертирует изображение в grayscale
 */
function convertToGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Luminance formula
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // Alpha остаётся без изменений
  }
  
  return imageData;
}

/**
 * Инвертирует яркость изображения
 */
function invertImage(imageData: ImageData): ImageData {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
    // Alpha остаётся без изменений
  }
  
  return imageData;
}

/**
 * Применяет Gaussian blur (простая CPU версия для MVP)
 * TODO: заменить на WebGL shader для производительности
 */
function applyGaussianBlur(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData;
  
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return imageData;
  
  ctx.putImageData(imageData, 0, 0);
  
  // Используем встроенный filter для Gaussian blur
  // Это не идеально, но работает для MVP
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';
  
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Применяет uniform blur с круглой маской (box blur)
 * TODO: заменить на WebGL shader для производительности
 */
function applyUniformBlur(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData;
  
  const { width, height } = imageData;
  const data = imageData.data;
  const output = new Uint8ClampedArray(data.length);
  const kernelRadius = Math.ceil(radius);
  
  // Box blur с круглой маской
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      
      for (let ky = -kernelRadius; ky <= kernelRadius; ky++) {
        for (let kx = -kernelRadius; kx <= kernelRadius; kx++) {
          // Проверяем что точка внутри круглой маски
          const dist = Math.sqrt(kx * kx + ky * ky);
          if (dist > radius) continue;
          
          const px = x + kx;
          const py = y + ky;
          
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const i = (py * width + px) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }
      }
      
      const i = (y * width + x) * 4;
      output[i] = r / count;
      output[i + 1] = g / count;
      output[i + 2] = b / count;
      output[i + 3] = data[i + 3]; // Alpha
    }
  }
  
  return new ImageData(output, width, height);
}

/**
 * Применяет cubic bezier transfer function для преобразования яркости
 */
function applyCubicBezier(
  imageData: ImageData,
  curve: [number, number, number, number]
): ImageData {
  const [x1, y1, x2, y2] = curve;
  const data = imageData.data;
  
  // Создаём lookup table для быстрого преобразования
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const value = cubicBezier(t, x1, y1, x2, y2);
    lut[i] = Math.round(value * 255);
  }
  
  // Применяем LUT к каждому пикселю
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]; // Grayscale, все каналы одинаковые
    const transformed = lut[gray];
    data[i] = transformed;
    data[i + 1] = transformed;
    data[i + 2] = transformed;
  }
  
  return imageData;
}

/**
 * Вычисляет значение cubic bezier кривой в точке t
 * Кривая проходит через (0,0) и (1,1), контрольные точки (x1,y1) и (x2,y2)
 */
function cubicBezier(
  t: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  // Используем упрощённую формулу для Y координаты
  // при заданном t (не ищем t по X, а просто используем t напрямую)
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  // Cubic Bezier: B(t) = (1-t)³P0 + 3(1-t)²t*P1 + 3(1-t)t²*P2 + t³*P3
  // P0 = (0,0), P1 = (x1,y1), P2 = (x2,y2), P3 = (1,1)
  const y = mt3 * 0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * 1;
  
  return Math.max(0, Math.min(1, y));
}