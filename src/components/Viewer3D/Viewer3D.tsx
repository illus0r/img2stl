// @ts-nocheck - TODO: fix R3F types for React 19
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Box, Typography } from '@mui/material';
import StampMesh from './StampMesh';

const Viewer3D = () => {
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ 
          position: [100, 100, 100],
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
        <OrbitControls enableDamping={false} target={[0, 0, 25]} />
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