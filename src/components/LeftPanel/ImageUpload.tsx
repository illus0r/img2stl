import { useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useAppContext } from '../../store/useAppContext';

const ImageUpload = () => {
  const { setSourceImage, sourceImageFile } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Проверяем что это изображение
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите файл изображения');
        return;
      }

      // Создаём URL для отображения
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setSourceImage(file, dataUrl);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      alert('Ошибка при загрузке файла');
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Загрузка изображения
      </Typography>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <Button
        variant="contained"
        startIcon={<UploadIcon />}
        onClick={handleButtonClick}
        fullWidth
      >
        Выбрать изображение
      </Button>

      {sourceImageFile && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Загружено: {sourceImageFile.name}
        </Typography>
      )}
    </Box>
  );
};

export default ImageUpload;