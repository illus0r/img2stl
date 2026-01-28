import React, { createContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type {
  ImageSettings,
  MeshSettings,
} from '../types';
import {
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_MESH_SETTINGS,
} from '../types';

interface DebugImages {
  afterDilation: ImageData | null;
  afterBlur: ImageData | null;
}

interface AppState {
  sourceImage: string | null;
  sourceImageFile: File | null;
  sourceImageData: ImageData | null;
  imageAspectRatio: number;
  processedImageData: ImageData | null;
  debugImages: DebugImages;
  imageSettings: ImageSettings;
  meshSettings: MeshSettings;
}

interface AppContextType extends AppState {
  setSourceImage: (file: File, dataUrl: string) => void;
  setProcessedImageData: (imageData: ImageData | null) => void;
  setDebugImages: (images: DebugImages) => void;
  updateImageSettings: (settings: Partial<ImageSettings>) => void;
  updateMeshSettings: (settings: Partial<MeshSettings>) => void;
  resetSettings: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sourceImage, setSourceImageState] = useState<string | null>(null);
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [debugImages, setDebugImages] = useState<DebugImages>({ afterDilation: null, afterBlur: null });
  const [imageSettings, setImageSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS);
  const [meshSettings, setMeshSettings] = useState<MeshSettings>(DEFAULT_MESH_SETTINGS);

  const setSourceImage = useCallback((file: File, dataUrl: string) => {
    setSourceImageFile(file);
    setSourceImageState(dataUrl);

    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      setImageAspectRatio(aspectRatio);

      setMeshSettings(prev => ({
        ...prev,
        height: prev.width / aspectRatio
      }));

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        setSourceImageData(imgData);
      }
    };
    img.src = dataUrl;
  }, []);

  const updateImageSettings = useCallback((settings: Partial<ImageSettings>) => {
    setImageSettings((prev) => ({ ...prev, ...settings }));
  }, []);

  const updateMeshSettings = useCallback((settings: Partial<MeshSettings>) => {
    setMeshSettings((prev) => ({ ...prev, ...settings }));
  }, []);

  const resetSettings = useCallback(() => {
    setImageSettings(DEFAULT_IMAGE_SETTINGS);
    setMeshSettings(DEFAULT_MESH_SETTINGS);
  }, []);

  const value: AppContextType = {
    sourceImage,
    sourceImageFile,
    sourceImageData,
    imageAspectRatio,
    processedImageData,
    debugImages,
    imageSettings,
    meshSettings,
    setSourceImage,
    setProcessedImageData,
    setDebugImages,
    updateImageSettings,
    updateMeshSettings,
    resetSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
