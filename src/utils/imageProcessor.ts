import type { ImageSettings } from '../types';
import { applyGaussianBlurShader, applyUniformBlurShader, applyCubicBezierShader } from './shaderBlur';

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
  
  // Размытия через WebGL шейдеры
  if (settings.gaussianBlur > 0) {
    imageData = applyGaussianBlurShader(imageData, settings.gaussianBlur);
  }
  
  if (settings.uniformBlur > 0) {
    imageData = applyUniformBlurShader(imageData, settings.uniformBlur);
  }
  
  // Применяем cubic bezier transfer function через шейдер ПОСЛЕ размытий
  imageData = applyCubicBezierShader(imageData, settings.bezierCurve);

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

