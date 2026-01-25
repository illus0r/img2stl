// Настройки обработки изображения
export interface ImageSettings {
  invert: boolean;
  gaussianBlur: number; // 0-20
  uniformBlur: number; // 0-20
  bezierCurve: [number, number, number, number]; // [x1, y1, x2, y2]
  // Jump Flooding - в бэклоге
  // jumpFlooding: boolean;
  // jumpFloodingThreshold: number;
}

// Настройки генерации сетки
export interface MeshSettings {
  resolution: number; // 10-1024
  extrusionHeight: number; // мм
  baseHeight: number; // мм
  width: number; // мм
  height: number; // мм (связано с width через aspect ratio)
}

// Дефолтные значения
export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  invert: false,
  gaussianBlur: 0,
  uniformBlur: 0,
  bezierCurve: [0, 0, 1, 1], // Linear (no transformation)
};

export const DEFAULT_MESH_SETTINGS: MeshSettings = {
  resolution: 100,
  extrusionHeight: 10,
  baseHeight: 2,
  width: 100,
  height: 100,
};