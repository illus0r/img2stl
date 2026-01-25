import { useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useAppContext } from '../../store/useAppContext';

const ImagePreview = () => {
  const { processedImageData, sourceImage } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Если есть обработанное изображение - показываем его
    if (processedImageData) {
      canvas.width = processedImageData.width;
      canvas.height = processedImageData.height;
      ctx.putImageData(processedImageData, 0, 0);
    } else if (sourceImage) {
      // Если только загружено исходное - показываем его
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = sourceImage;
    } else {
      // Очищаем canvas если нет изображения
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [processedImageData, sourceImage]);

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

      <Box
        sx={{
          mt: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: '1px solid #ddd',
          borderRadius: 1,
          p: 1,
          minHeight: 200,
          maxHeight: 600,
          overflow: 'auto',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            height: 'auto',
            imageRendering: 'pixelated',
          }}
        />
      </Box>
    </Box>
  );
};

export default ImagePreview;