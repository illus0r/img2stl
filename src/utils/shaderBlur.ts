import * as THREE from 'three';

/**
 * Применяет Gaussian blur через WebGL шейдер
 */
export function applyGaussianBlurShader(
  imageData: ImageData,
  radius: number
): ImageData {
  if (radius <= 0) return imageData;

  const { width, height } = imageData;

  // Создаём renderer и сцену
  const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
  renderer.setSize(width, height);

  // Создаём текстуру из ImageData
  const texture = new THREE.DataTexture(
    imageData.data,
    width,
    height,
    THREE.RGBAFormat
  );
  texture.needsUpdate = true;

  // Horizontal pass
  const horizontalTarget = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const horizontalMaterial = createGaussianBlurMaterial(
    texture,
    new THREE.Vector2(radius / width, 0)
  );

  renderPass(renderer, horizontalMaterial, horizontalTarget);

  // Vertical pass
  const verticalTarget = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const verticalMaterial = createGaussianBlurMaterial(
    horizontalTarget.texture,
    new THREE.Vector2(0, radius / height)
  );

  renderPass(renderer, verticalMaterial, verticalTarget);

  // Читаем результат
  const buffer = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(verticalTarget, 0, 0, width, height, buffer);

  // Cleanup
  renderer.dispose();
  texture.dispose();
  horizontalTarget.dispose();
  verticalTarget.dispose();
  horizontalMaterial.dispose();
  verticalMaterial.dispose();

  return new ImageData(new Uint8ClampedArray(buffer), width, height);
}

/**
 * Применяет uniform blur (box blur) с круглой маской через WebGL шейдер
 */
export function applyUniformBlurShader(
  imageData: ImageData,
  radius: number
): ImageData {
  if (radius <= 0) return imageData;

  const { width, height } = imageData;

  const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
  renderer.setSize(width, height);

  const texture = new THREE.DataTexture(
    imageData.data,
    width,
    height,
    THREE.RGBAFormat
  );
  texture.needsUpdate = true;

  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const material = createUniformBlurMaterial(texture, radius, width, height);

  renderPass(renderer, material, target);

  const buffer = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, height, buffer);

  renderer.dispose();
  texture.dispose();
  target.dispose();
  material.dispose();

  return new ImageData(new Uint8ClampedArray(buffer), width, height);
}

/**
 * Создаёт материал для Gaussian blur
 */
function createGaussianBlurMaterial(
  texture: THREE.Texture,
  direction: THREE.Vector2
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: texture },
      direction: { value: direction },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 direction;
      varying vec2 vUv;

      void main() {
        vec4 sum = vec4(0.0);
        
        // 9-tap Gaussian kernel
        sum += texture2D(tDiffuse, vUv - direction * 4.0) * 0.0162162162;
        sum += texture2D(tDiffuse, vUv - direction * 3.0) * 0.0540540541;
        sum += texture2D(tDiffuse, vUv - direction * 2.0) * 0.1216216216;
        sum += texture2D(tDiffuse, vUv - direction * 1.0) * 0.1945945946;
        sum += texture2D(tDiffuse, vUv) * 0.2270270270;
        sum += texture2D(tDiffuse, vUv + direction * 1.0) * 0.1945945946;
        sum += texture2D(tDiffuse, vUv + direction * 2.0) * 0.1216216216;
        sum += texture2D(tDiffuse, vUv + direction * 3.0) * 0.0540540541;
        sum += texture2D(tDiffuse, vUv + direction * 4.0) * 0.0162162162;
        
        gl_FragColor = sum;
      }
    `,
  });
}

/**
 * Создаёт материал для uniform blur с круглой маской
 */
function createUniformBlurMaterial(
  texture: THREE.Texture,
  radius: number,
  width: number,
  height: number
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: texture },
      radius: { value: radius },
      resolution: { value: new THREE.Vector2(width, height) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float radius;
      uniform vec2 resolution;
      varying vec2 vUv;

      void main() {
        vec2 pixelSize = 1.0 / resolution;
        vec4 sum = vec4(0.0);
        float count = 0.0;
        
        int iRadius = int(ceil(radius));
        
        for (int y = -50; y <= 50; y++) {
          if (abs(y) > iRadius) continue;
          
          for (int x = -50; x <= 50; x++) {
            if (abs(x) > iRadius) continue;
            
            // Проверяем что точка внутри круглой маски
            float dist = sqrt(float(x * x + y * y));
            if (dist > radius) continue;
            
            vec2 offset = vec2(float(x), float(y)) * pixelSize;
            sum += texture2D(tDiffuse, vUv + offset);
            count += 1.0;
          }
        }
        
        gl_FragColor = sum / count;
      }
    `,
  });
}

/**
 * Рендерит шейдер в render target
 */
function renderPass(
  renderer: THREE.WebGLRenderer,
  material: THREE.ShaderMaterial,
  target: THREE.WebGLRenderTarget
): void {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  geometry.dispose();
}

/**
 * Применяет Cubic Bezier transfer function через WebGL шейдер
 */
export function applyCubicBezierShader(
  imageData: ImageData,
  curve: [number, number, number, number]
): ImageData {
  const [x1, y1, x2, y2] = curve;
  
  // Если кривая линейная (0,0,1,1) - пропускаем обработку
  if (x1 === 0 && y1 === 0 && x2 === 1 && y2 === 1) {
    return imageData;
  }

  const { width, height } = imageData;

  const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
  renderer.setSize(width, height);

  const texture = new THREE.DataTexture(
    imageData.data,
    width,
    height,
    THREE.RGBAFormat
  );
  texture.needsUpdate = true;

  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const material = createCubicBezierMaterial(texture, x1, y1, x2, y2);

  renderPass(renderer, material, target);

  const buffer = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, height, buffer);

  renderer.dispose();
  texture.dispose();
  target.dispose();
  material.dispose();

  return new ImageData(new Uint8ClampedArray(buffer), width, height);
}

/**
 * Создаёт материал для Cubic Bezier transfer function
 */
function createCubicBezierMaterial(
  texture: THREE.Texture,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: texture },
      bezier: { value: new THREE.Vector4(x1, y1, x2, y2) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec4 bezier; // x1, y1, x2, y2
      varying vec2 vUv;

      // Вычисляет Y координату cubic bezier кривой при заданном t
      // Кривая проходит через (0,0) и (1,1), контрольные точки (x1,y1) и (x2,y2)
      float cubicBezier(float t, float y1, float y2) {
        float mt = 1.0 - t;
        float mt2 = mt * mt;
        float mt3 = mt2 * mt;
        float t2 = t * t;
        float t3 = t2 * t;
        
        // B(t) = (1-t)³*0 + 3(1-t)²t*y1 + 3(1-t)t²*y2 + t³*1
        return 3.0 * mt2 * t * y1 + 3.0 * mt * t2 * y2 + t3;
      }

      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        
        // Применяем bezier к каждому каналу
        float t = color.r; // Grayscale, все каналы одинаковые
        float transformed = cubicBezier(t, bezier.y, bezier.w);
        transformed = clamp(transformed, 0.0, 1.0);
        
        gl_FragColor = vec4(transformed, transformed, transformed, color.a);
      }
    `,
  });
}