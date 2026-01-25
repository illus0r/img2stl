import * as THREE from 'three';
import type { MeshSettings } from '../types';

/**
 * Генерирует аутлайн по форме объекта на изображении
 * Использует Marching Squares для построения контура
 */
export function generateOutlineGeometry(
  imageData: ImageData,
  sourceImageData: ImageData | null,
  settings: MeshSettings,
  threshold: number = 127,
  offset: number = 0
): THREE.BufferGeometry {
  const { width: imgWidth, height: imgHeight } = imageData;
  const { resolution, extrusionHeight, baseHeight } = settings;

  // Бинаризуем изображение по порогу
  const binaryMap = binarizeImage(imageData, threshold);
  
  // Применяем отступ (опционально)
  const offsetBinaryMap = offset > 0 
    ? applyOffset(binaryMap, imgWidth, imgHeight, offset)
    : binaryMap;

  // Строим контур методом Marching Squares
  const contourPoints = marchingSquares(offsetBinaryMap, imgWidth, imgHeight);
  
  if (contourPoints.length < 3) {
    // Если контур не найден - возвращаем прямоугольник
    return generateRectangularGeometry(imageData, sourceImageData, settings);
  }

  // Упрощаем контур (каждую N-ю точку берём)
  const simplificationFactor = Math.max(1, Math.floor(contourPoints.length / resolution));
  const simplifiedContour = simplifyContour(contourPoints, simplificationFactor);

  // Определяем размеры модели
  const aspectRatio = imgWidth / imgHeight;
  const meshWidth = settings.width;
  const meshHeight = settings.height;

  // Генерируем 3D геометрию по контуру
  return generateMeshFromContour(
    simplifiedContour,
    imageData,
    sourceImageData,
    imgWidth,
    imgHeight,
    meshWidth,
    meshHeight,
    extrusionHeight,
    baseHeight,
    resolution
  );
}

/**
 * Бинаризует изображение по порогу
 */
function binarizeImage(imageData: ImageData, threshold: number): boolean[] {
  const { width, height, data } = imageData;
  const binary = new Array(width * height);
  
  for (let i = 0; i < width * height; i++) {
    const grayscale = data[i * 4]; // Первый канал (grayscale)
    binary[i] = grayscale > threshold;
  }
  
  return binary;
}

/**
 * Применяет отступ к бинарной карте (расширение/сжатие)
 */
function applyOffset(
  binaryMap: boolean[],
  width: number,
  height: number,
  offset: number
): boolean[] {
  const result = new Array(width * height).fill(false);
  const offsetPixels = Math.round(offset);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (binaryMap[y * width + x]) {
        // Если пиксель белый - распространяем его на окрестность
        for (let dy = -offsetPixels; dy <= offsetPixels; dy++) {
          for (let dx = -offsetPixels; dx <= offsetPixels; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (dx * dx + dy * dy <= offsetPixels * offsetPixels) {
                result[ny * width + nx] = true;
              }
            }
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Marching Squares алгоритм для построения контура
 */
function marchingSquares(
  binaryMap: boolean[],
  width: number,
  height: number
): Array<[number, number]> {
  const contour: Array<[number, number]> = [];
  const visited = new Set<string>();
  
  // Находим стартовую точку (первый пиксель на границе)
  let startX = -1, startY = -1;
  
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const tl = binaryMap[y * width + x];
      const tr = binaryMap[y * width + (x + 1)];
      const bl = binaryMap[(y + 1) * width + x];
      const br = binaryMap[(y + 1) * width + (x + 1)];
      
      // Если есть граница - начинаем отсюда
      const caseValue = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (caseValue > 0 && caseValue < 15) {
        startX = x;
        startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }
  
  if (startX === -1) {
    return []; // Контур не найден
  }
  
  // Обходим контур
  let x = startX;
  let y = startY;
  let prevDir = 0; // Направление: 0=right, 1=down, 2=left, 3=up
  
  do {
    const key = `${x},${y}`;
    if (visited.has(key) && contour.length > 10) {
      break; // Замкнули контур
    }
    visited.add(key);
    
    const tl = (y >= 0 && y < height && x >= 0 && x < width) ? binaryMap[y * width + x] : false;
    const tr = (y >= 0 && y < height && x + 1 >= 0 && x + 1 < width) ? binaryMap[y * width + (x + 1)] : false;
    const bl = (y + 1 >= 0 && y + 1 < height && x >= 0 && x < width) ? binaryMap[(y + 1) * width + x] : false;
    const br = (y + 1 >= 0 && y + 1 < height && x + 1 >= 0 && x + 1 < width) ? binaryMap[(y + 1) * width + (x + 1)] : false;
    
    const caseValue = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
    
    // Добавляем точку контура (центр квадрата)
    contour.push([x + 0.5, y + 0.5]);
    
    // Определяем следующее направление движения по контуру
    switch (caseValue) {
      case 1: case 14: x--; break;
      case 2: case 13: y++; break;
      case 3: case 12: x--; break;
      case 4: case 11: x++; break;
      case 6: case 9: y++; break;
      case 7: case 8: x--; break;
      default: x++; break;
    }
    
    // Предотвращение бесконечного цикла
    if (contour.length > width * height) break;
    
  } while (!(x === startX && y === startY));
  
  return contour;
}

/**
 * Упрощает контур (берёт каждую N-ю точку)
 */
function simplifyContour(
  contour: Array<[number, number]>,
  factor: number
): Array<[number, number]> {
  if (factor <= 1) return contour;
  
  const simplified: Array<[number, number]> = [];
  for (let i = 0; i < contour.length; i += factor) {
    simplified.push(contour[i]);
  }
  
  return simplified;
}

/**
 * Генерирует 3D геометрию из контура
 */
function generateMeshFromContour(
  contour: Array<[number, number]>,
  imageData: ImageData,
  sourceImageData: ImageData | null,
  imgWidth: number,
  imgHeight: number,
  meshWidth: number,
  meshHeight: number,
  extrusionHeight: number,
  baseHeight: number,
  resolution: number
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  
  const numPoints = contour.length;
  
  // Генерируем верхние вершины (рельеф по контуру)
  for (let i = 0; i < numPoints; i++) {
    const [imgX, imgY] = contour[i];
    
    // Конвертируем в мировые координаты
    const px = (imgX / imgWidth - 0.5) * meshWidth;
    const py = (imgY / imgHeight - 0.5) * meshHeight;
    
    // Сэмплируем высоту из heightmap
    const sampleX = Math.floor(Math.min(imgX, imgWidth - 1));
    const sampleY = Math.floor(Math.min(imgY, imgHeight - 1));
    const pixelIndex = (sampleY * imgWidth + sampleX) * 4;
    const grayscale = imageData.data[pixelIndex] / 255;
    
    const pz = baseHeight + grayscale * extrusionHeight;
    
    vertices.push(px, py, pz);
    
    // Vertex color из исходного изображения
    if (sourceImageData) {
      const srcX = Math.floor((imgX / imgWidth) * (sourceImageData.width - 1));
      const srcY = Math.floor((imgY / imgHeight) * (sourceImageData.height - 1));
      const srcPixelIndex = (srcY * sourceImageData.width + srcX) * 4;
      const r = sourceImageData.data[srcPixelIndex] / 255;
      const g = sourceImageData.data[srcPixelIndex + 1] / 255;
      const b = sourceImageData.data[srcPixelIndex + 2] / 255;
      colors.push(r, g, b);
    } else {
      colors.push(grayscale, grayscale, grayscale);
    }
  }
  
  // Генерируем нижние вершины (плоское основание)
  const bottomVertexStart = vertices.length / 3;
  for (let i = 0; i < numPoints; i++) {
    const [imgX, imgY] = contour[i];
    const px = (imgX / imgWidth - 0.5) * meshWidth;
    const py = (imgY / imgHeight - 0.5) * meshHeight;
    const pz = 0;
    
    vertices.push(px, py, pz);
    colors.push(0.3, 0.3, 0.3); // Темно-серый для дна
  }
  
  // Генерируем треугольники для верхней поверхности (веер из центра)
  // Находим центр контура
  let centerX = 0, centerY = 0, centerZ = 0;
  for (let i = 0; i < numPoints; i++) {
    centerX += vertices[i * 3];
    centerY += vertices[i * 3 + 1];
    centerZ += vertices[i * 3 + 2];
  }
  centerX /= numPoints;
  centerY /= numPoints;
  centerZ /= numPoints;
  
  // Добавляем центральную вершину
  const centerIndex = vertices.length / 3;
  vertices.push(centerX, centerY, centerZ);
  
  // Цвет центра - средний
  if (sourceImageData) {
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < numPoints; i++) {
      r += colors[i * 3];
      g += colors[i * 3 + 1];
      b += colors[i * 3 + 2];
    }
    colors.push(r / numPoints, g / numPoints, b / numPoints);
  } else {
    colors.push(centerZ / (baseHeight + extrusionHeight), centerZ / (baseHeight + extrusionHeight), centerZ / (baseHeight + extrusionHeight));
  }
  
  // Треугольники верхней поверхности (веер)
  for (let i = 0; i < numPoints; i++) {
    const next = (i + 1) % numPoints;
    indices.push(centerIndex, i, next);
  }
  
  // Треугольники нижней поверхности
  const bottomCenterIndex = vertices.length / 3;
  vertices.push(centerX, centerY, 0);
  colors.push(0.3, 0.3, 0.3);
  
  for (let i = 0; i < numPoints; i++) {
    const next = (i + 1) % numPoints;
    indices.push(bottomCenterIndex, bottomVertexStart + next, bottomVertexStart + i);
  }
  
  // Боковые стенки
  for (let i = 0; i < numPoints; i++) {
    const next = (i + 1) % numPoints;
    const topA = i;
    const topB = next;
    const bottomA = bottomVertexStart + i;
    const bottomB = bottomVertexStart + next;
    
    indices.push(topA, bottomA, topB);
    indices.push(topB, bottomA, bottomB);
  }
  
  // Создаём BufferGeometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * Fallback: генерирует прямоугольную геометрию (если контур не найден)
 */
function generateRectangularGeometry(
  imageData: ImageData,
  sourceImageData: ImageData | null,
  settings: MeshSettings
): THREE.BufferGeometry {
  // Импортируем оригинальный генератор
  // (это заглушка, реальная реализация будет в meshGenerator)
  const { width: imgWidth, height: imgHeight } = imageData;
  const { resolution, extrusionHeight, baseHeight } = settings;
  
  const vertices: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  
  // Простая прямоугольная сетка 2x2 для fallback
  const segmentsX = 2;
  const segmentsY = 2;
  
  const meshWidth = settings.width;
  const meshHeight = settings.height;
  
  for (let y = 0; y <= segmentsY; y++) {
    for (let x = 0; x <= segmentsX; x++) {
      const px = (x / segmentsX - 0.5) * meshWidth;
      const py = (y / segmentsY - 0.5) * meshHeight;
      
      const imgX = Math.floor((x / segmentsX) * (imgWidth - 1));
      const imgY = Math.floor((y / segmentsY) * (imgHeight - 1));
      const pixelIndex = (imgY * imgWidth + imgX) * 4;
      const grayscale = imageData.data[pixelIndex] / 255;
      
      const pz = baseHeight + grayscale * extrusionHeight;
      
      vertices.push(px, py, pz);
      colors.push(grayscale, grayscale, grayscale);
    }
  }
  
  // Индексы для прямоугольника
  for (let y = 0; y < segmentsY; y++) {
    for (let x = 0; x < segmentsX; x++) {
      const a = y * (segmentsX + 1) + x;
      const b = y * (segmentsX + 1) + (x + 1);
      const c = (y + 1) * (segmentsX + 1) + (x + 1);
      const d = (y + 1) * (segmentsX + 1) + x;
      
      indices.push(a, b, c);
      indices.push(a, c, d);
    }
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}