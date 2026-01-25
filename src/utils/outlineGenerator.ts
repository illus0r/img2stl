import * as THREE from 'three';
import type { MeshSettings } from '../types';

/**
 * Генерирует аутлайн по форме объекта на изображении
 * Использует решётку из вертикальных боксов
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

  console.log('=== OUTLINE GENERATOR (BOX GRID) DEBUG ===');
  console.log('Image size:', imgWidth, 'x', imgHeight);
  console.log('Threshold:', threshold);
  console.log('Offset:', offset);
  console.log('Resolution:', resolution);

  // Бинаризуем изображение по порогу
  const binaryMap = binarizeImage(imageData, threshold);
  
  // Подсчитываем белые пиксели
  const whitePixels = binaryMap.filter(v => v).length;
  console.log('White pixels after binarization:', whitePixels, '/', binaryMap.length, 
    '(' + (whitePixels / binaryMap.length * 100).toFixed(1) + '%)');
  
  // Визуализируем бинарную карту
  visualizeBinaryMap(binaryMap, imgWidth, imgHeight, 'Binary Map');
  
  // Применяем отступ (опционально)
  const offsetBinaryMap = offset > 0 
    ? applyOffset(binaryMap, imgWidth, imgHeight, offset)
    : binaryMap;

  if (offset > 0) {
    const whitePixelsAfterOffset = offsetBinaryMap.filter(v => v).length;
    console.log('White pixels after offset:', whitePixelsAfterOffset, 
      '(' + (whitePixelsAfterOffset / offsetBinaryMap.length * 100).toFixed(1) + '%)');
    visualizeBinaryMap(offsetBinaryMap, imgWidth, imgHeight, 'After Offset');
  }

  // Генерируем решётку из боксов
  return generateBoxGridGeometry(
    offsetBinaryMap,
    imageData,
    sourceImageData,
    imgWidth,
    imgHeight,
    settings
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
 * Генерирует геометрию из решётки вертикальных боксов
 * Оставляет только боксы, которые касаются белых пикселей
 */
function generateBoxGridGeometry(
  binaryMap: boolean[],
  imageData: ImageData,
  sourceImageData: ImageData | null,
  imgWidth: number,
  imgHeight: number,
  settings: MeshSettings
): THREE.BufferGeometry {
  const { resolution, extrusionHeight, baseHeight, width: meshWidth, height: meshHeight } = settings;

  console.log('Generating box grid geometry...');
  
  // Определяем размер боксов в пикселях
  const minDimension = Math.min(imgWidth, imgHeight);
  const boxSizePixels = Math.max(1, Math.floor(minDimension / resolution));
  
  const boxesX = Math.ceil(imgWidth / boxSizePixels);
  const boxesY = Math.ceil(imgHeight / boxSizePixels);
  
  console.log('Box size:', boxSizePixels, 'px');
  console.log('Grid size:', boxesX, 'x', boxesY, '=', boxesX * boxesY, 'boxes');
  
  // Собираем боксы, которые касаются белых пикселей
  const activeBoxes: Array<{ x: number; y: number }> = [];
  
  for (let by = 0; by < boxesY; by++) {
    for (let bx = 0; bx < boxesX; bx++) {
      // Проверяем хотя бы один угол бокса касается белого пикселя
      const corners = [
        [bx * boxSizePixels, by * boxSizePixels],
        [(bx + 1) * boxSizePixels, by * boxSizePixels],
        [bx * boxSizePixels, (by + 1) * boxSizePixels],
        [(bx + 1) * boxSizePixels, (by + 1) * boxSizePixels],
      ];
      
      let touchesWhite = false;
      for (const [px, py] of corners) {
        if (px < imgWidth && py < imgHeight) {
          if (binaryMap[py * imgWidth + px]) {
            touchesWhite = true;
            break;
          }
        }
      }
      
      if (touchesWhite) {
        activeBoxes.push({ x: bx, y: by });
      }
    }
  }
  
  console.log('Active boxes:', activeBoxes.length, '/', boxesX * boxesY, 
    '(' + (activeBoxes.length / (boxesX * boxesY) * 100).toFixed(1) + '%)');
  
  if (activeBoxes.length === 0) {
    console.warn('No active boxes! Falling back to rectangle');
    return generateRectangularGeometry(imageData, sourceImageData, settings);
  }
  
  // Визуализируем активные боксы
  visualizeBoxGrid(binaryMap, imgWidth, imgHeight, activeBoxes, boxSizePixels, 'Box Grid');
  
  // Генерируем геометрию из боксов
  const vertices: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  
  const boxWidthMm = meshWidth / boxesX;
  const boxHeightMm = meshHeight / boxesY;
  
  for (const { x: bx, y: by } of activeBoxes) {
    // Позиция бокса в мировых координатах (центрированно)
    const worldX = (bx / boxesX - 0.5) * meshWidth + boxWidthMm / 2;
    const worldY = (by / boxesY - 0.5) * meshHeight + boxHeightMm / 2;
    
    // Сэмплируем высоту из центра бокса
    const centerPixelX = Math.floor(bx * boxSizePixels + boxSizePixels / 2);
    const centerPixelY = Math.floor(by * boxSizePixels + boxSizePixels / 2);
    const pixelIndex = (centerPixelY * imgWidth + centerPixelX) * 4;
    const grayscale = imageData.data[pixelIndex] / 255;
    
    const topZ = baseHeight + grayscale * extrusionHeight;
    const bottomZ = 0;
    
    // Цвет из исходного изображения
    let r = grayscale, g = grayscale, b = grayscale;
    if (sourceImageData) {
      const srcX = Math.floor((centerPixelX / imgWidth) * (sourceImageData.width - 1));
      const srcY = Math.floor((centerPixelY / imgHeight) * (sourceImageData.height - 1));
      const srcPixelIndex = (srcY * sourceImageData.width + srcX) * 4;
      r = sourceImageData.data[srcPixelIndex] / 255;
      g = sourceImageData.data[srcPixelIndex + 1] / 255;
      b = sourceImageData.data[srcPixelIndex + 2] / 255;
    }
    
    // Генерируем вертикальный бокс (8 вершин)
    const halfW = boxWidthMm / 2;
    const halfH = boxHeightMm / 2;
    
    const baseIndex = vertices.length / 3;
    
    // Верхние 4 вершины
    vertices.push(worldX - halfW, worldY - halfH, topZ); colors.push(r, g, b); // 0
    vertices.push(worldX + halfW, worldY - halfH, topZ); colors.push(r, g, b); // 1
    vertices.push(worldX + halfW, worldY + halfH, topZ); colors.push(r, g, b); // 2
    vertices.push(worldX - halfW, worldY + halfH, topZ); colors.push(r, g, b); // 3
    
    // Нижние 4 вершины
    vertices.push(worldX - halfW, worldY - halfH, bottomZ); colors.push(0.3, 0.3, 0.3); // 4
    vertices.push(worldX + halfW, worldY - halfH, bottomZ); colors.push(0.3, 0.3, 0.3); // 5
    vertices.push(worldX + halfW, worldY + halfH, bottomZ); colors.push(0.3, 0.3, 0.3); // 6
    vertices.push(worldX - halfW, worldY + halfH, bottomZ); colors.push(0.3, 0.3, 0.3); // 7
    
    // Верхняя грань (2 треугольника)
    indices.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
    indices.push(baseIndex + 0, baseIndex + 2, baseIndex + 3);
    
    // Нижняя грань (2 треугольника, обратный порядок)
    indices.push(baseIndex + 4, baseIndex + 6, baseIndex + 5);
    indices.push(baseIndex + 4, baseIndex + 7, baseIndex + 6);
    
    // 4 боковые грани (по 2 треугольника каждая)
    // Передняя (Y-)
    indices.push(baseIndex + 0, baseIndex + 4, baseIndex + 1);
    indices.push(baseIndex + 1, baseIndex + 4, baseIndex + 5);
    
    // Правая (X+)
    indices.push(baseIndex + 1, baseIndex + 5, baseIndex + 2);
    indices.push(baseIndex + 2, baseIndex + 5, baseIndex + 6);
    
    // Задняя (Y+)
    indices.push(baseIndex + 2, baseIndex + 6, baseIndex + 3);
    indices.push(baseIndex + 3, baseIndex + 6, baseIndex + 7);
    
    // Левая (X-)
    indices.push(baseIndex + 3, baseIndex + 7, baseIndex + 0);
    indices.push(baseIndex + 0, baseIndex + 7, baseIndex + 4);
  }
  
  console.log('Generated', vertices.length / 3, 'vertices,', indices.length / 3, 'triangles');
  console.log('=== BOX GRID GENERATOR FINISHED ===');
  
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

/**
 * Визуализирует бинарную карту на canvas (для дебага)
 */
function visualizeBinaryMap(
  binaryMap: boolean[],
  width: number,
  height: number,
  label: string
): void {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.border = '1px solid red';
  canvas.style.margin = '5px';
  canvas.title = label;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const imageData = ctx.createImageData(width, height);
  
  for (let i = 0; i < binaryMap.length; i++) {
    const value = binaryMap[i] ? 255 : 0;
    imageData.data[i * 4] = value;
    imageData.data[i * 4 + 1] = value;
    imageData.data[i * 4 + 2] = value;
    imageData.data[i * 4 + 3] = 255;
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Добавляем на страницу
  const container = getOrCreateDebugContainer();
  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-block';
  wrapper.style.textAlign = 'center';
  
  const labelEl = document.createElement('div');
  labelEl.textContent = label;
  labelEl.style.fontSize = '10px';
  labelEl.style.marginBottom = '2px';
  
  wrapper.appendChild(labelEl);
  wrapper.appendChild(canvas);
  container.appendChild(wrapper);
}

/**
 * Визуализирует решётку боксов на canvas (для дебага)
 */
function visualizeBoxGrid(
  binaryMap: boolean[],
  width: number,
  height: number,
  activeBoxes: Array<{ x: number; y: number }>,
  boxSize: number,
  label: string
): void {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.border = '1px solid green';
  canvas.style.margin = '5px';
  canvas.title = label;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Рисуем бинарную карту как фон
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < binaryMap.length; i++) {
    const value = binaryMap[i] ? 255 : 0;
    imageData.data[i * 4] = value;
    imageData.data[i * 4 + 1] = value;
    imageData.data[i * 4 + 2] = value;
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  
  // Рисуем активные боксы зелёными прямоугольниками
  ctx.strokeStyle = 'lime';
  ctx.lineWidth = 1;
  for (const { x, y } of activeBoxes) {
    ctx.strokeRect(x * boxSize, y * boxSize, boxSize, boxSize);
  }
  
  // Добавляем на страницу
  const container = getOrCreateDebugContainer();
  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-block';
  wrapper.style.textAlign = 'center';
  
  const labelEl = document.createElement('div');
  labelEl.textContent = label + ' (' + activeBoxes.length + ' boxes)';
  labelEl.style.fontSize = '10px';
  labelEl.style.marginBottom = '2px';
  
  wrapper.appendChild(labelEl);
  wrapper.appendChild(canvas);
  container.appendChild(wrapper);
}

/**
 * Получает или создаёт контейнер для дебаг визуализаций
 */
function getOrCreateDebugContainer(): HTMLElement {
  let container = document.getElementById('outline-debug-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'outline-debug-container';
    container.style.position = 'fixed';
    container.style.bottom = '10px';
    container.style.left = '10px';
    container.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    container.style.maxWidth = '90vw';
    container.style.maxHeight = '200px';
    container.style.overflow = 'auto';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.gap = '10px';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '5px';
    closeBtn.style.right = '5px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'red';
    closeBtn.style.color = 'white';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.width = '20px';
    closeBtn.style.height = '20px';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.fontSize = '14px';
    closeBtn.style.lineHeight = '1';
    closeBtn.onclick = () => {
      if (container) container.remove();
    };
    
    container.appendChild(closeBtn);
    document.body.appendChild(container);
  } else {
    // Очищаем старые визуализации (кроме кнопки закрытия)
    const children = Array.from(container.children);
    children.forEach(child => {
      if (child.tagName !== 'BUTTON') {
        child.remove();
      }
    });
  }
  
  return container;
}