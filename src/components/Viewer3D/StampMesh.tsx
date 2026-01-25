// @ts-nocheck - TODO: fix R3F types for React
import { useEffect, useState } from 'react';
import { useAppContext } from '../../store/useAppContext';
import { generateStampGeometry } from '../../utils/meshGenerator';
import { generateOutlineGeometry } from '../../utils/outlineGenerator';
import type * as THREE from 'three';

const StampMesh = () => {
  const { processedImageData, sourceImageData, meshSettings } = useAppContext();
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (!processedImageData) {
      setGeometry(null);
      return;
    }

    try {
      // Выбираем генератор в зависимости от настройки useOutline
      const newGeometry = meshSettings.useOutline
        ? generateOutlineGeometry(
            processedImageData,
            sourceImageData,
            meshSettings,
            meshSettings.outlineThreshold,
            meshSettings.outlineOffset
          )
        : generateStampGeometry(processedImageData, sourceImageData, meshSettings);
      
      setGeometry(newGeometry);
      
      // Cleanup старой геометрии
      return () => {
        newGeometry.dispose();
      };
    } catch (error) {
      console.error('Ошибка генерации геометрии:', error);
      setGeometry(null);
    }
  }, [processedImageData, sourceImageData, meshSettings]);

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