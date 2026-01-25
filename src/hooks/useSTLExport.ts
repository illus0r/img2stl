import { useCallback } from 'react';
import { useAppContext } from '../store/useAppContext';
import { generateStampGeometry } from '../utils/meshGenerator';
import { exportToSTL, generateSTLFilename } from '../utils/stlExporter';

/**
 * Хук для экспорта 3D модели в STL формат
 */
export const useSTLExport = () => {
  const { processedImageData, meshSettings } = useAppContext();

  const exportSTL = useCallback(() => {
    if (!processedImageData) {
      alert('Сначала загрузите изображение');
      return;
    }

    try {
      // Генерируем геометрию
      const geometry = generateStampGeometry(processedImageData, meshSettings);
      
      // Экспортируем в STL
      const filename = generateSTLFilename();
      exportToSTL(geometry, filename);
      
      // Очищаем геометрию
      geometry.dispose();
      
      console.log(`STL файл ${filename} успешно сохранён`);
    } catch (error) {
      console.error('Ошибка экспорта STL:', error);
      alert('Ошибка при экспорте STL файла');
    }
  }, [processedImageData, meshSettings]);

  return { exportSTL, canExport: !!processedImageData };
};