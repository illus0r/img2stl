// @ts-nocheck - TODO: fix R3F types for React
import { useEffect, useState } from 'react';
import { useAppContext } from '../../store/useAppContext';
import { generateStampGeometry } from '../../utils/meshGenerator';
import type * as THREE from 'three';

const StampMesh = () => {
  const { processedImageData, meshSettings } = useAppContext();
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (!processedImageData) {
      setGeometry(null);
      return;
    }

    try {
      const newGeometry = generateStampGeometry(processedImageData, meshSettings);
      setGeometry(newGeometry);
      
      // Cleanup старой геометрии
      return () => {
        newGeometry.dispose();
      };
    } catch (error) {
      console.error('Ошибка генерации геометрии:', error);
      setGeometry(null);
    }
  }, [processedImageData, meshSettings]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#999999" />
    </mesh>
  );
};

export default StampMesh;