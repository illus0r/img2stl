import * as THREE from 'three';
import type { MeshSettings } from '../types';

/**
 * Генерирует аутлайн по форме объекта на изображении
 * Использует обрезанную сетку с краевыми рёбрами
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

  console.log('=== OUTLINE GENERATOR (CLIPPED GRID) DEBUG ===');
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
    // visualizeBinaryMap(offsetBinaryMap, imgWidth, imgHeight, 'After Offset');
  }

  // Генерируем обрезанную сетку
  return generateClippedGridGeometry(
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
 * Генерирует геометрию из обрезанной сетки с краевыми рёбрами
 * 1. Строим полную сетку как без аутлайна
 * 2. Удаляем вершины за пределами маски
 * 3. Для краевых вершин добавляем рёбра вниз до Z=0
 */
function generateClippedGridGeometry(
  binaryMap: boolean[],
  imageData: ImageData,
  sourceImageData: ImageData | null,
  imgWidth: number,
  imgHeight: number,
  settings: MeshSettings
): THREE.BufferGeometry {
  const { resolution, extrusionHeight, baseHeight, width: meshWidth, height: meshHeight } = settings;

  console.log('Generating clipped grid geometry...');

  // Определяем размер сетки
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

  segmentsX = Math.min(segmentsX, 1024);
  segmentsY = Math.min(segmentsY, 1024);

  console.log('Grid segments:', segmentsX, 'x', segmentsY);

  // Создаём полную сетку с маской
  const vertexMap: (number | null)[][] = [];
  const vertices: number[] = [];
  const colors: number[] = [];

  for (let y = 0; y <= segmentsY; y++) {
    vertexMap[y] = [];
    for (let x = 0; x <= segmentsX; x++) {
      // Проверяем клетку вокруг вершины (хотя бы один угол в белой области)
      const imgX = (x / segmentsX) * (imgWidth - 1);
      const imgY = (y / segmentsY) * (imgHeight - 1);

      // Проверяем 4 клетки вокруг вершины (если они есть)
      let shouldKeep = false;

      for (let dy = -1; dy <= 0; dy++) {
        for (let dx = -1; dx <= 0; dx++) {
          const checkX = x + dx;
          const checkY = y + dy;

          if (checkX >= 0 && checkX < segmentsX && checkY >= 0 && checkY < segmentsY) {
            // Проверяем 4 угла клетки
            const corners = [
              [checkX / segmentsX, checkY / segmentsY],
              [(checkX + 1) / segmentsX, checkY / segmentsY],
              [checkX / segmentsX, (checkY + 1) / segmentsY],
              [(checkX + 1) / segmentsX, (checkY + 1) / segmentsY],
            ];

            for (const [fx, fy] of corners) {
              const px = Math.floor(fx * (imgWidth - 1));
              const py = Math.floor(fy * (imgHeight - 1));
              if (binaryMap[py * imgWidth + px]) {
                shouldKeep = true;
                break;
              }
            }
            if (shouldKeep) break;
          }
        }
        if (shouldKeep) break;
      }

      if (!shouldKeep) {
        vertexMap[y][x] = null; // Вершина удалена
        continue;
      }

      // Создаём вершину
      const px = (x / segmentsX - 0.5) * meshWidth;
      const py = (y / segmentsY - 0.5) * meshHeight;

      // Сэмплируем heightmap
      const sampleX = Math.floor(imgX);
      const sampleY = Math.floor(imgY);
      const pixelIndex = (sampleY * imgWidth + sampleX) * 4;
      const grayscale = imageData.data[pixelIndex] / 255;

      const pz = baseHeight + grayscale * extrusionHeight;

      vertexMap[y][x] = vertices.length / 3;
      vertices.push(px, py, pz);

      // Vertex color
      if (sourceImageData) {
        const srcX = Math.floor((sampleX / imgWidth) * (sourceImageData.width - 1));
        const srcY = Math.floor((sampleY / imgHeight) * (sourceImageData.height - 1));
        const srcPixelIndex = (srcY * sourceImageData.width + srcX) * 4;
        const r = sourceImageData.data[srcPixelIndex] / 255;
        const g = sourceImageData.data[srcPixelIndex + 1] / 255;
        const b = sourceImageData.data[srcPixelIndex + 2] / 255;
        colors.push(r, g, b);
      } else {
        colors.push(grayscale, grayscale, grayscale);
      }
    }
  }

  console.log('Top surface vertices:', vertices.length / 3);

  // Генерируем треугольники верхней поверхности
  const indices: number[] = [];

  for (let y = 0; y < segmentsY; y++) {
    for (let x = 0; x < segmentsX; x++) {
      const v0 = vertexMap[y][x];
      const v1 = vertexMap[y][x + 1];
      const v2 = vertexMap[y + 1][x + 1];
      const v3 = vertexMap[y + 1][x];

      if (v0 !== null && v1 !== null && v2 !== null && v3 !== null) {
        indices.push(v0, v1, v2);
        indices.push(v0, v2, v3);
      }
    }
  }

  console.log('Top surface triangles:', indices.length / 3);

  // Находим краевые вершины и добавляем рёбра вниз
  const edgeVertices: Array<{
    topIndex: number;
    x: number;
    y: number;
    missingEdges: { left: boolean; right: boolean; top: boolean; bottom: boolean; }
  }> = [];

  for (let y = 0; y <= segmentsY; y++) {
    for (let x = 0; x <= segmentsX; x++) {
      const vIndex = vertexMap[y][x];
      if (vIndex === null) continue;

      // Проверяем соседей
      const hasLeft = x > 0 && vertexMap[y][x - 1] !== null;
      const hasRight = x < segmentsX && vertexMap[y][x + 1] !== null;
      const hasTop = y > 0 && vertexMap[y - 1][x] !== null;
      const hasBottom = y < segmentsY && vertexMap[y + 1][x] !== null;

      // Если хотя бы одного соседа нет - это край
      if (!hasLeft || !hasRight || !hasTop || !hasBottom) {
        edgeVertices.push({
          topIndex: vIndex,
          x,
          y,
          missingEdges: {
            left: !hasLeft,
            right: !hasRight,
            top: !hasTop,
            bottom: !hasBottom
          }
        });
      }
    }
  }

  console.log('Edge vertices:', edgeVertices.length);

  // Добавляем нижние вершины для краёв
  const bottomVertexStart = vertices.length / 3;

  for (const { topIndex } of edgeVertices) {
    const px = vertices[topIndex * 3];
    const py = vertices[topIndex * 3 + 1];

    vertices.push(px, py, 0);
    colors.push(0.5, 0.5, 0.5); // Серый для боковых стенок
  }

  console.log('Bottom vertices:', edgeVertices.length);

  // Генерируем боковые стенки для каждого крайнего ребра
  // Для каждой краевой вершины создаем прямоугольники в направлениях отсутствующих соседей
  let wallTriangles = 0;

  for (let i = 0; i < edgeVertices.length; i++) {
    const vertex = edgeVertices[i];
    const topIdx = vertex.topIndex;
    const bottomIdx = bottomVertexStart + i;

    const segmentSizeX = meshWidth / segmentsX;
    const segmentSizeY = meshHeight / segmentsY;

    // Левая стенка
    if (vertex.missingEdges.left) {
      const leftTopIdx = vertices.length / 3;
      const leftBottomIdx = leftTopIdx + 1;

      // Добавляем две дополнительные вершины слева от текущей
      const px = vertices[topIdx * 3] - segmentSizeX / 2;
      const py = vertices[topIdx * 3 + 1];
      const pzTop = vertices[topIdx * 3 + 2];

      vertices.push(px, py, pzTop); // левая верхняя
      colors.push(0.5, 0.5, 0.5);
      vertices.push(px, py, 0);     // левая нижняя
      colors.push(0.5, 0.5, 0.5);

      // Прямоугольник из 2 треугольников (нормали наружу)
      indices.push(topIdx, leftTopIdx, bottomIdx);
      indices.push(leftTopIdx, leftBottomIdx, bottomIdx);
      wallTriangles += 2;
    }

    // Правая стенка
    if (vertex.missingEdges.right) {
      const rightTopIdx = vertices.length / 3;
      const rightBottomIdx = rightTopIdx + 1;

      const px = vertices[topIdx * 3] + segmentSizeX / 2;
      const py = vertices[topIdx * 3 + 1];
      const pzTop = vertices[topIdx * 3 + 2];

      vertices.push(px, py, pzTop); // правая верхняя
      colors.push(0.5, 0.5, 0.5);
      vertices.push(px, py, 0);     // правая нижняя
      colors.push(0.5, 0.5, 0.5);

      // Прямоугольник из 2 треугольников (нормали наружу)
      indices.push(topIdx, bottomIdx, rightTopIdx);
      indices.push(rightTopIdx, bottomIdx, rightBottomIdx);
      wallTriangles += 2;
    }

    // Верхняя стенка
    if (vertex.missingEdges.top) {
      const topTopIdx = vertices.length / 3;
      const topBottomIdx = topTopIdx + 1;

      const px = vertices[topIdx * 3];
      const py = vertices[topIdx * 3 + 1] + segmentSizeY / 2;
      const pzTop = vertices[topIdx * 3 + 2];

      vertices.push(px, py, pzTop); // верхняя верхняя
      colors.push(0.5, 0.5, 0.5);
      vertices.push(px, py, 0);     // верхняя нижняя
      colors.push(0.5, 0.5, 0.5);

      // Прямоугольник из 2 треугольников (нормали наружу)
      indices.push(topIdx, bottomIdx, topTopIdx);
      indices.push(topTopIdx, bottomIdx, topBottomIdx);
      wallTriangles += 2;
    }

    // Нижняя стенка
    if (vertex.missingEdges.bottom) {
      const bottomTopIdx = vertices.length / 3;
      const bottomBottomIdx = bottomTopIdx + 1;

      const px = vertices[topIdx * 3];
      const py = vertices[topIdx * 3 + 1] - segmentSizeY / 2;
      const pzTop = vertices[topIdx * 3 + 2];

      vertices.push(px, py, pzTop); // нижняя верхняя
      colors.push(0.5, 0.5, 0.5);
      vertices.push(px, py, 0);     // нижняя нижняя
      colors.push(0.5, 0.5, 0.5);

      // Прямоугольник из 2 треугольников (нормали наружу)
      indices.push(topIdx, bottomTopIdx, bottomIdx);
      indices.push(bottomTopIdx, bottomBottomIdx, bottomIdx);
      wallTriangles += 2;
    }
  }

  console.log('Side wall triangles:', wallTriangles);

  // Добавляем плоское дно (Z=0)
  // Находим выпуклую оболочку нижних точек или просто триангулируем
  if (edgeVertices.length >= 3) {
    // Простая триангуляция веером из первой точки
    const firstBottomIdx = bottomVertexStart;

    for (let i = 1; i < edgeVertices.length - 1; i++) {
      indices.push(firstBottomIdx, bottomVertexStart + i + 1, bottomVertexStart + i);
    }
  }

  console.log('Total vertices:', vertices.length / 3);
  console.log('Total triangles:', indices.length / 3);
  console.log('=== CLIPPED GRID GENERATOR FINISHED ===');

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
