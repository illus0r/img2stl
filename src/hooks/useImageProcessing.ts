import { useEffect } from 'react';
import { useAppContext } from '../store/useAppContext';
import { processImage } from '../utils/imageProcessor';

/**
 * Хук для автоматической обработки изображения при изменении настроек
 */
export const useImageProcessing = () => {
  const { sourceImage, imageSettings, setProcessedImageData } = useAppContext();

  useEffect(() => {
    if (!sourceImage) {
      setProcessedImageData(null);
      return;
    }

    // Обрабатываем изображение асинхронно
    const process = async () => {
      try {
        const processed = await processImage(sourceImage, imageSettings);
        setProcessedImageData(processed);
      } catch (error) {
        console.error('Ошибка обработки изображения:', error);
        setProcessedImageData(null);
      }
    };

    process();
  }, [sourceImage, imageSettings, setProcessedImageData]);
};