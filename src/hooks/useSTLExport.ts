import { useCallback } from 'react';
import { useAppContext } from '../store/useAppContext';
import { generateOutlineGeometry } from '../utils/outlineGenerator';
import { exportToSTL, generateSTLFilename } from '../utils/stlExporter';

export const useSTLExport = () => {
  const { processedImageData, sourceImageData, meshSettings } = useAppContext();

  const exportSTL = useCallback(() => {
    if (!processedImageData) {
      alert('Сначала загрузите изображение');
      return;
    }

    try {
      const result = generateOutlineGeometry(
        processedImageData,
        sourceImageData,
        meshSettings,
        meshSettings.outlineThreshold,
        meshSettings.outlineOffset
      );

      const filename = generateSTLFilename();
      exportToSTL(result.geometry, filename);

      result.geometry.dispose();

      console.log(`STL файл ${filename} успешно сохранён`);
    } catch (error) {
      console.error('Ошибка экспорта STL:', error);
      alert('Ошибка при экспорте STL файла');
    }
  }, [processedImageData, sourceImageData, meshSettings]);

  return { exportSTL, canExport: !!processedImageData };
};
