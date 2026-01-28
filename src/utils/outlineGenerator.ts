import * as THREE from 'three';
import type { MeshSettings } from '../types';
import { applyDilationShader, applyUniformBlurShader } from './shaderBlur';

export interface DebugImages {
  afterDilation: ImageData | null;
  afterBlur: ImageData | null;
}

export interface OutlineResult {
  geometry: THREE.BufferGeometry;
  debugImages: DebugImages;
}

/**
 * 3D призма из сетки квадратов с обрезкой по контуру марширующих квадратов
 */
export function generateOutlineGeometry(
  imageData: ImageData,
  _sourceImageData: ImageData | null,
  settings: MeshSettings,
  threshold: number = 127,
  offsetPercent: number = 0
): OutlineResult {
  const { width: imgWidth, height: imgHeight } = imageData;
  const { resolution, width: meshWidth, height: meshHeight, baseHeight, extrusionHeight } = settings;

  console.log('=== MARCHING SQUARES 3D PRISM ===');

  // Размер сетки
  const aspectRatio = imgWidth / imgHeight;
  let gridX: number, gridY: number;

  if (imgWidth < imgHeight) {
    gridX = Math.min(resolution, imgWidth);
    gridY = Math.min(Math.round(resolution / aspectRatio), imgHeight);
  } else {
    gridY = Math.min(resolution, imgHeight);
    gridX = Math.min(Math.round(resolution * aspectRatio), imgWidth);
  }

  gridX = Math.min(gridX, 1024);
  gridY = Math.min(gridY, 1024);

  console.log('Grid:', gridX, 'x', gridY);

  // Debug images
  const debugImages: DebugImages = {
    afterDilation: null,
    afterBlur: null,
  };

  // Шаг 1: Дилатация
  const maxDimension = Math.max(imgWidth, imgHeight);
  const offsetPixels = (offsetPercent / 100) * maxDimension;

  let processedImage = imageData;

  if (offsetPixels > 0) {
    console.log('Applying dilation:', offsetPixels.toFixed(1), 'px');
    processedImage = applyDilationShader(imageData, offsetPixels, threshold);
    debugImages.afterDilation = processedImage;
    console.log('Dilation done');
  } else {
    debugImages.afterDilation = imageData;
  }

  // Шаг 2: Блур
  const blurRadiusPixels = Math.round((2 / gridX) * imgWidth);
  if (blurRadiusPixels > 0) {
    console.log('Applying blur:', blurRadiusPixels, 'px');
    processedImage = applyUniformBlurShader(processedImage, blurRadiusPixels);
    console.log('Blur done');
  }
  debugImages.afterBlur = processedImage;

  // Извлекаем grayscale
  const grayscale = new Float32Array(imgWidth * imgHeight);
  for (let i = 0; i < imgWidth * imgHeight; i++) {
    grayscale[i] = imageData.data[i * 4];
  }

  const processedGrayscale = new Float32Array(imgWidth * imgHeight);
  for (let i = 0; i < imgWidth * imgHeight; i++) {
    processedGrayscale[i] = processedImage.data[i * 4];
  }

  // Сэмплируем сетку
  const gridValues: number[][] = [];
  for (let gy = 0; gy <= gridY; gy++) {
    gridValues[gy] = [];
    for (let gx = 0; gx <= gridX; gx++) {
      const imgX = Math.min(Math.floor((gx / gridX) * (imgWidth - 1)), imgWidth - 1);
      const imgY = Math.min(Math.floor((gy / gridY) * (imgHeight - 1)), imgHeight - 1);
      gridValues[gy][gx] = processedGrayscale[imgY * imgWidth + imgX];
    }
  }

  const vertices: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  const sampleHeight = (nx: number, ny: number): number => {
    const imgX = Math.min(Math.floor(nx * (imgWidth - 1)), imgWidth - 1);
    const imgY = Math.min(Math.floor(ny * (imgHeight - 1)), imgHeight - 1);
    return grayscale[imgY * imgWidth + imgX] / 255;
  };

  const topVertexMap = new Map<string, number>();
  const bottomVertexMap = new Map<string, number>();

  const addTopVertex = (nx: number, ny: number): number => {
    const key = `${nx.toFixed(6)},${ny.toFixed(6)}`;
    if (topVertexMap.has(key)) return topVertexMap.get(key)!;

    const idx = vertices.length / 3;
    const heightFactor = sampleHeight(nx, ny);
    const z = baseHeight + heightFactor * extrusionHeight;
    vertices.push((nx - 0.5) * meshWidth, (ny - 0.5) * meshHeight, z);
    colors.push(heightFactor, heightFactor, heightFactor);
    topVertexMap.set(key, idx);
    return idx;
  };

  const addBottomVertex = (nx: number, ny: number): number => {
    const key = `${nx.toFixed(6)},${ny.toFixed(6)}`;
    if (bottomVertexMap.has(key)) return bottomVertexMap.get(key)!;

    const idx = vertices.length / 3;
    vertices.push((nx - 0.5) * meshWidth, (ny - 0.5) * meshHeight, 0);
    colors.push(0.2, 0.2, 0.2);
    bottomVertexMap.set(key, idx);
    return idx;
  };

  const lerp = (a: number, b: number, va: number, vb: number): number => {
    if (Math.abs(vb - va) < 0.001) return (a + b) / 2;
    const t = (threshold - va) / (vb - va);
    return a + Math.max(0, Math.min(1, t)) * (b - a);
  };

  const edgeCount = new Map<string, { p1: [number, number]; p2: [number, number]; count: number }>();

  const makeEdgeKey = (p1: [number, number], p2: [number, number]): string => {
    const k1 = `${p1[0].toFixed(6)},${p1[1].toFixed(6)}`;
    const k2 = `${p2[0].toFixed(6)},${p2[1].toFixed(6)}`;
    return k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;
  };

  const addEdge = (p1: [number, number], p2: [number, number]) => {
    const key = makeEdgeKey(p1, p2);
    if (edgeCount.has(key)) {
      edgeCount.get(key)!.count++;
    } else {
      edgeCount.set(key, { p1, p2, count: 1 });
    }
  };

  for (let gy = 0; gy < gridY; gy++) {
    for (let gx = 0; gx < gridX; gx++) {
      const v00 = gridValues[gy][gx];
      const v10 = gridValues[gy][gx + 1];
      const v11 = gridValues[gy + 1][gx + 1];
      const v01 = gridValues[gy + 1][gx];

      const b00 = v00 > threshold;
      const b10 = v10 > threshold;
      const b11 = v11 > threshold;
      const b01 = v01 > threshold;

      const caseIdx = (b00 ? 1 : 0) | (b10 ? 2 : 0) | (b11 ? 4 : 0) | (b01 ? 8 : 0);

      if (caseIdx === 0) continue;

      const x0 = gx / gridX;
      const x1 = (gx + 1) / gridX;
      const y0 = gy / gridY;
      const y1 = (gy + 1) / gridY;

      const edgeBottom: [number, number] = [lerp(x0, x1, v00, v10), y0];
      const edgeRight: [number, number] = [x1, lerp(y0, y1, v10, v11)];
      const edgeTop: [number, number] = [lerp(x0, x1, v01, v11), y1];
      const edgeLeft: [number, number] = [x0, lerp(y0, y1, v00, v01)];

      const polygon: [number, number][] = [];

      if (b00) polygon.push([x0, y0]);
      if (b00 !== b10) polygon.push(edgeBottom);
      if (b10) polygon.push([x1, y0]);
      if (b10 !== b11) polygon.push(edgeRight);
      if (b11) polygon.push([x1, y1]);
      if (b11 !== b01) polygon.push(edgeTop);
      if (b01) polygon.push([x0, y1]);
      if (b01 !== b00) polygon.push(edgeLeft);

      if (polygon.length < 3) continue;

      const topIndices: number[] = [];
      for (const [px, py] of polygon) {
        topIndices.push(addTopVertex(px, py));
      }
      for (let i = 1; i < topIndices.length - 1; i++) {
        indices.push(topIndices[0], topIndices[i], topIndices[i + 1]);
      }

      const bottomIndices: number[] = [];
      for (const [px, py] of polygon) {
        bottomIndices.push(addBottomVertex(px, py));
      }
      for (let i = 1; i < bottomIndices.length - 1; i++) {
        indices.push(bottomIndices[0], bottomIndices[i + 1], bottomIndices[i]);
      }

      for (let i = 0; i < polygon.length; i++) {
        addEdge(polygon[i], polygon[(i + 1) % polygon.length]);
      }
    }
  }

  const boundaryEdges: Array<{ p1: [number, number]; p2: [number, number] }> = [];
  for (const edge of edgeCount.values()) {
    if (edge.count === 1) boundaryEdges.push(edge);
  }

  console.log('Boundary edges:', boundaryEdges.length);

  for (const { p1, p2 } of boundaryEdges) {
    const t1 = addTopVertex(p1[0], p1[1]);
    const t2 = addTopVertex(p2[0], p2[1]);
    const b1 = addBottomVertex(p1[0], p1[1]);
    const b2 = addBottomVertex(p2[0], p2[1]);

    indices.push(t1, b1, t2);
    indices.push(t2, b1, b2);
  }

  console.log('Vertices:', vertices.length / 3, 'Triangles:', indices.length / 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  console.log('=== DONE ===');

  return { geometry, debugImages };
}
