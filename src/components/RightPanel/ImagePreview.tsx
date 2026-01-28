import { useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useAppContext } from '../../store/useAppContext';

const ImagePreview = () => {
  const { processedImageData, sourceImage, debugImages } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dilationCanvasRef = useRef<HTMLCanvasElement>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement>(null);

  // Обработанное изображение
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (processedImageData) {
      canvas.width = processedImageData.width;
      canvas.height = processedImageData.height;
      ctx.putImageData(processedImageData, 0, 0);
    } else if (sourceImage) {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = sourceImage;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [processedImageData, sourceImage]);

  // После дилатации
  useEffect(() => {
    const canvas = dilationCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (debugImages.afterDilation) {
      canvas.width = debugImages.afterDilation.width;
      canvas.height = debugImages.afterDilation.height;
      ctx.putImageData(debugImages.afterDilation, 0, 0);
    } else {
      canvas.width = 1;
      canvas.height = 1;
      ctx.clearRect(0, 0, 1, 1);
    }
  }, [debugImages.afterDilation]);

  // После блура
  useEffect(() => {
    const canvas = blurCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (debugImages.afterBlur) {
      canvas.width = debugImages.afterBlur.width;
      canvas.height = debugImages.afterBlur.height;
      ctx.putImageData(debugImages.afterBlur, 0, 0);
    } else {
      canvas.width = 1;
      canvas.height = 1;
      ctx.clearRect(0, 0, 1, 1);
    }
  }, [debugImages.afterBlur]);

  const canvasStyle = {
    maxWidth: '100%',
    height: 'auto',
    imageRendering: 'pixelated' as const,
  };

  const boxStyle = {
    mt: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid #ddd',
    borderRadius: 1,
    p: 1,
    minHeight: 100,
    maxHeight: 300,
    overflow: 'auto',
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Обработанное изображение
      </Typography>

      {!sourceImage && !processedImageData && (
        <Typography variant="body2" color="text.secondary">
          Загрузите изображение для начала работы
        </Typography>
      )}

      <Box sx={boxStyle}>
        <canvas ref={canvasRef} style={canvasStyle} />
      </Box>

      {debugImages.afterDilation && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            После дилатации
          </Typography>
          <Box sx={boxStyle}>
            <canvas ref={dilationCanvasRef} style={canvasStyle} />
          </Box>
        </>
      )}

      {debugImages.afterBlur && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            После блура (для Marching Squares)
          </Typography>
          <Box sx={boxStyle}>
            <canvas ref={blurCanvasRef} style={canvasStyle} />
          </Box>
        </>
      )}
    </Box>
  );
};

export default ImagePreview;
