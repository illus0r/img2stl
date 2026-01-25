// @ts-nocheck - TODO: fix R3F types for React 19
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Box, Typography } from '@mui/material';
import StampMesh from './StampMesh';
import { useAppContext } from '../../store/useAppContext';

const Viewer3D = () => {
  const { meshSettings } = useAppContext();
  
  // Вычисляем центр модели по Z (середина высоты штампа)
  const centerZ = meshSettings.baseHeight + (meshSettings.extrusionHeight / 2);
  const cameraDistance = Math.max(meshSettings.width, meshSettings.height) * 1.5;
  
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ 
          position: [cameraDistance, cameraDistance, cameraDistance],
          fov: 50,
          up: [0, 0, 1] // Z вверх
        }}
        style={{ background: '#badbee' }}
      >
        {/* Освещение */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[100, 100, 100]} intensity={0.8} />
        <directionalLight position={[-100, -100, 50]} intensity={0.3} />
        
        {/* 3D модель штампа */}
        <StampMesh />
        
        {/* Контролы для вращения и масштабирования */}
        <OrbitControls enableDamping={false} target={[0, 0, centerZ]} />
      </Canvas>
      
      {/* Временная метка */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          color: 'rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}
      >
        3D Viewer
      </Typography>
    </Box>
  );
};

export default Viewer3D;