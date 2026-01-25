import * as THREE from 'three';

/**
 * Экспортирует BufferGeometry в ASCII STL формат
 */
export function exportToSTL(geometry: THREE.BufferGeometry, filename: string = 'stamp.stl'): void {
  const stlString = generateSTLString(geometry);
  downloadSTL(stlString, filename);
}

/**
 * Генерирует ASCII STL строку из геометрии
 */
function generateSTLString(geometry: THREE.BufferGeometry): string {
  const vertices = geometry.attributes.position.array;
  const indices = geometry.index?.array;
  
  if (!indices) {
    throw new Error('Geometry must have indices');
  }

  let stl = 'solid stamp\n';

  // Итерируемся по треугольникам
  for (let i = 0; i < indices.length; i += 3) {
    const i1 = indices[i] * 3;
    const i2 = indices[i + 1] * 3;
    const i3 = indices[i + 2] * 3;

    const v1 = new THREE.Vector3(vertices[i1], vertices[i1 + 1], vertices[i1 + 2]);
    const v2 = new THREE.Vector3(vertices[i2], vertices[i2 + 1], vertices[i2 + 2]);
    const v3 = new THREE.Vector3(vertices[i3], vertices[i3 + 1], vertices[i3 + 2]);

    // Вычисляем нормаль треугольника
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    // Форматируем facet
    stl += `  facet normal ${formatNumber(normal.x)} ${formatNumber(normal.y)} ${formatNumber(normal.z)}\n`;
    stl += '    outer loop\n';
    stl += `      vertex ${formatNumber(v1.x)} ${formatNumber(v1.y)} ${formatNumber(v1.z)}\n`;
    stl += `      vertex ${formatNumber(v2.x)} ${formatNumber(v2.y)} ${formatNumber(v2.z)}\n`;
    stl += `      vertex ${formatNumber(v3.x)} ${formatNumber(v3.y)} ${formatNumber(v3.z)}\n`;
    stl += '    endloop\n';
    stl += '  endfacet\n';
  }

  stl += 'endsolid stamp\n';

  return stl;
}

/**
 * Форматирует число для STL (научная нотация с фиксированной точностью)
 */
function formatNumber(num: number): string {
  return num.toExponential(6);
}

/**
 * Скачивает STL файл в браузере
 */
function downloadSTL(stlString: string, filename: string): void {
  const blob = new Blob([stlString], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Очищаем URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Генерирует имя файла с timestamp
 */
export function generateSTLFilename(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `stamp_${timestamp}.stl`;
}