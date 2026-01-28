// @ts-nocheck - TODO: fix R3F types for React
import { useEffect, useState } from 'react';
import { useAppContext } from '../../store/useAppContext';
import { generateOutlineGeometry } from '../../utils/outlineGenerator';
import type * as THREE from 'three';

const StampMesh = () => {
  const { processedImageData, sourceImageData, meshSettings, setDebugImages } = useAppContext();
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (!processedImageData) {
      setGeometry(null);
      setDebugImages({ afterDilation: null, afterBlur: null });
      return;
    }

    try {
      const result = generateOutlineGeometry(
        processedImageData,
        sourceImageData,
        meshSettings,
        meshSettings.outlineThreshold,
        meshSettings.outlineOffset
      );

      setGeometry(result.geometry);
      setDebugImages(result.debugImages);

      return () => {
        result.geometry.dispose();
      };
    } catch (error) {
      console.error('Ошибка генерации геометрии:', error);
      setGeometry(null);
      setDebugImages({ afterDilation: null, afterBlur: null });
    }
  }, [processedImageData, sourceImageData, meshSettings, setDebugImages]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors />
    </mesh>
  );
};

export default StampMesh;
