import { useCallback } from 'react';
import { useAppContext } from '../store/useAppContext';
import { generateStampGeometry } from '../utils/meshGenerator';
import { generateOutlineGeometry } from '../utils/outlineGenerator';
import { exportToSTL, generateSTLFilename } from '../utils/stlExporter';

/**
 * Хук для экспорта 3D модели в STL формат
 */
export const useSTLExport = () => {
  const { processedImageData, sourceImageData, meshSettings } = useAppContext();

  const exportSTL = useCallback(() => {
    if (!processedImageData) {
      alert('Сначала загрузите изображение');
      return;
    }

    try {
      // Генерируем геометрию (с учётом useOutline)
      const geometry = meshSettings.useOutline
        ? generateOutlineGeometry(
            processedImageData,
            sourceImageData,
            meshSettings,
            meshSettings.outlineThreshold,
            meshSettings.outlineOffset
          )
        : generateStampGeometry(processedImageData, sourceImageData, meshSettings);
      
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
  }, [processedImageData, sourceImageData, meshSettings]);

  return { exportSTL, canExport: !!processedImageData };
};