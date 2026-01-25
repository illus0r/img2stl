import * as THREE from 'three';
import type { MeshSettings } from '../types';

/**
 * Генерирует 3D геометрию штампа из обработанного изображения
 * @param imageData - обработанное изображение (grayscale для высоты)
 * @param sourceImageData - исходное изображение (RGB для цветов)
 * @param settings - настройки сетки
 */
export function generateStampGeometry(
  imageData: ImageData,
  sourceImageData: ImageData | null,
  settings: MeshSettings
): THREE.BufferGeometry {
  const { width: imgWidth, height: imgHeight } = imageData;
  const { resolution, extrusionHeight, baseHeight } = settings;

  // Определяем разрешение сетки (по меньшей стороне)
  const minDimension = Math.min(imgWidth, imgHeight);
  const aspectRatio = imgWidth / imgHeight;
  
  let segmentsX: number;
  let segmentsY: number;
  
  if (imgWidth < imgHeight) {
    segmentsX = Math.min(resolution, imgWidth);
    segmentsY = Math.min(Math.round(resolution / aspectRatio), imgHeight);
  } else {
    segmentsY = Math.min(resolution, imgHeight);
    segmentsX = Math.min(Math.round(resolution * aspectRatio), imgWidth);
  }

  // Ограничиваем максимум 1024
  segmentsX = Math.min(segmentsX, 1024);
  segmentsY = Math.min(segmentsY, 1024);

  // Создаём массивы для вершин, нормалей и индексов
  const vertices: number[] = [];
  const indices: number[] = [];

  // Размеры в мм берём из настроек
  const meshWidth = settings.width;
  const meshHeight = settings.height;

  // Генерируем верхнюю поверхность (рельеф) с vertex colors
  const vertexMap: number[][] = [];
  const colors: number[] = [];
  
  for (let y = 0; y <= segmentsY; y++) {
    vertexMap[y] = [];
    for (let x = 0; x <= segmentsX; x++) {
      // Позиция в мировых координатах
      const px = (x / segmentsX - 0.5) * meshWidth;
      const py = (y / segmentsY - 0.5) * meshHeight;
      
      // Сэмплируем heightmap из imageData
      const imgX = Math.floor((x / segmentsX) * (imgWidth - 1));
      const imgY = Math.floor((y / segmentsY) * (imgHeight - 1));
      const pixelIndex = (imgY * imgWidth + imgX) * 4;
      const grayscale = imageData.data[pixelIndex] / 255; // 0-1
      
      // Высота = base + grayscale * extrusion
      const pz = baseHeight + grayscale * extrusionHeight;
      
      vertexMap[y][x] = vertices.length / 3;
      vertices.push(px, py, pz);
      
      // Добавляем vertex color из исходного изображения
      if (sourceImageData) {
        const srcImgX = Math.floor((x / segmentsX) * (sourceImageData.width - 1));
        const srcImgY = Math.floor((y / segmentsY) * (sourceImageData.height - 1));
        const srcPixelIndex = (srcImgY * sourceImageData.width + srcImgX) * 4;
        const r = sourceImageData.data[srcPixelIndex] / 255;
        const g = sourceImageData.data[srcPixelIndex + 1] / 255;
        const b = sourceImageData.data[srcPixelIndex + 2] / 255;
        colors.push(r, g, b);
      } else {
        // Если нет исходного изображения - используем grayscale
        colors.push(grayscale, grayscale, grayscale);
      }
    }
  }

  // Генерируем треугольники для верхней поверхности
  for (let y = 0; y < segmentsY; y++) {
    for (let x = 0; x < segmentsX; x++) {
      const a = vertexMap[y][x];
      const b = vertexMap[y][x + 1];
      const c = vertexMap[y + 1][x + 1];
      const d = vertexMap[y + 1][x];
      
      // Два треугольника на квад
      indices.push(a, b, c);
      indices.push(a, c, d);
    }
  }

  // Добавляем нижнюю поверхность (плоское основание)
  const bottomVertexStart = vertices.length / 3;
  
  for (let y = 0; y <= segmentsY; y++) {
    for (let x = 0; x <= segmentsX; x++) {
      const px = (x / segmentsX - 0.5) * meshWidth;
      const py = (y / segmentsY - 0.5) * meshHeight;
      const pz = 0; // Плоское дно
      
      vertices.push(px, py, pz);
      
      // Цвет для дна - темно-серый
      colors.push(0.3, 0.3, 0.3);
    }
  }

  // Треугольники для нижней поверхности (обратный порядок для правильных нормалей)
  for (let y = 0; y < segmentsY; y++) {
    for (let x = 0; x < segmentsX; x++) {
      const a = bottomVertexStart + y * (segmentsX + 1) + x;
      const b = bottomVertexStart + y * (segmentsX + 1) + (x + 1);
      const c = bottomVertexStart + (y + 1) * (segmentsX + 1) + (x + 1);
      const d = bottomVertexStart + (y + 1) * (segmentsX + 1) + x;
      
      // Обратный порядок для нормалей вниз
      indices.push(a, c, b);
      indices.push(a, d, c);
    }
  }

  // Добавляем боковые стенки (флипнутые нормали наружу)
  // Левая стенка (x = 0)
  for (let y = 0; y < segmentsY; y++) {
    const topA = vertexMap[y][0];
    const topB = vertexMap[y + 1][0];
    const bottomA = bottomVertexStart + y * (segmentsX + 1);
    const bottomB = bottomVertexStart + (y + 1) * (segmentsX + 1);
    
    indices.push(topA, topB, bottomA);
    indices.push(topB, bottomB, bottomA);
  }

  // Правая стенка (x = segmentsX)
  for (let y = 0; y < segmentsY; y++) {
    const topA = vertexMap[y][segmentsX];
    const topB = vertexMap[y + 1][segmentsX];
    const bottomA = bottomVertexStart + y * (segmentsX + 1) + segmentsX;
    const bottomB = bottomVertexStart + (y + 1) * (segmentsX + 1) + segmentsX;
    
    indices.push(topA, bottomA, topB);
    indices.push(topB, bottomA, bottomB);
  }

  // Передняя стенка (y = 0)
  for (let x = 0; x < segmentsX; x++) {
    const topA = vertexMap[0][x];
    const topB = vertexMap[0][x + 1];
    const bottomA = bottomVertexStart + x;
    const bottomB = bottomVertexStart + x + 1;
    
    indices.push(topA, bottomA, topB);
    indices.push(topB, bottomA, bottomB);
  }

  // Задняя стенка (y = segmentsY)
  for (let x = 0; x < segmentsX; x++) {
    const topA = vertexMap[segmentsY][x];
    const topB = vertexMap[segmentsY][x + 1];
    const bottomA = bottomVertexStart + segmentsY * (segmentsX + 1) + x;
    const bottomB = bottomVertexStart + segmentsY * (segmentsX + 1) + x + 1;
    
    indices.push(topA, topB, bottomA);
    indices.push(topB, bottomB, bottomA);
  }

  // Добавляем цвета для боковых стенок
  // Левая стенка
  for (let y = 0; y < segmentsY; y++) {
    // Цвета уже добавлены для верхних вершин, для нижних добавим темно-серый
    // (они уже есть в массиве colors)
  }
  
  // Создаём BufferGeometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  
  // Вычисляем нормали для корректного освещения
  geometry.computeVertexNormals();

  return geometry;
}