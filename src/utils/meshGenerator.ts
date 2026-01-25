import * as THREE from 'three';
import type { MeshSettings } from '../types';

/**
 * Генерирует 3D геометрию штампа из обработанного изображения
 */
export function generateStampGeometry(
  imageData: ImageData,
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

  // Генерируем верхнюю поверхность (рельеф)
  const vertexMap: number[][] = [];
  
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

  // Создаём BufferGeometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  
  // Вычисляем нормали для корректного освещения
  geometry.computeVertexNormals();

  return geometry;
}