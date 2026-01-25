import { Box, Typography, Slider, TextField, Button, Divider } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAppContext } from '../../store/useAppContext';
import { useSTLExport } from '../../hooks/useSTLExport';

const MeshSettingsPanel = () => {
  const { meshSettings, updateMeshSettings, sourceImage, imageAspectRatio } = useAppContext();
  const { exportSTL, canExport } = useSTLExport();

  const handleResolutionChange = (_event: Event, value: number | number[]) => {
    updateMeshSettings({ resolution: value as number });
  };

  const handleExtrusionHeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= 0) {
      updateMeshSettings({ extrusionHeight: value });
    }
  };

  const handleBaseHeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= 0) {
      updateMeshSettings({ baseHeight: value });
    }
  };

  const handleWidthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value > 0) {
      // Пересчитываем высоту пропорционально с учётом aspect ratio
      const newHeight = value / imageAspectRatio;
      updateMeshSettings({ width: value, height: newHeight });
    }
  };

  const handleHeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value > 0) {
      // Пересчитываем ширину пропорционально с учётом aspect ratio
      const newWidth = value * imageAspectRatio;
      updateMeshSettings({ height: value, width: newWidth });
    }
  };

  const handleSaveSTL = () => {
    exportSTL();
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Настройки сетки
      </Typography>

      <Box sx={{ mt: 2 }}>
        <Typography gutterBottom>
          Разрешение: {meshSettings.resolution}
        </Typography>
        <Slider
          value={meshSettings.resolution}
          onChange={handleResolutionChange}
          min={10}
          max={1024}
          step={1}
          valueLabelDisplay="auto"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 2 }}>
        <TextField
          label="Высота экструзии (мм)"
          type="number"
          size="small"
          value={meshSettings.extrusionHeight}
          onChange={handleExtrusionHeightChange}
          inputProps={{ min: 0, step: 0.1 }}
        />
        <TextField
          label="Высота основания (мм)"
          type="number"
          size="small"
          value={meshSettings.baseHeight}
          onChange={handleBaseHeightChange}
          inputProps={{ min: 0, step: 0.1 }}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
        <TextField
          label="Ширина (мм)"
          type="number"
          size="small"
          value={meshSettings.width}
          onChange={handleWidthChange}
          inputProps={{ min: 0, step: 0.1 }}
        />
        <TextField
          label="Высота (мм)"
          type="number"
          size="small"
          value={meshSettings.height}
          onChange={handleHeightChange}
          inputProps={{ min: 0, step: 0.1 }}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Button
        variant="contained"
        color="primary"
        startIcon={<SaveIcon />}
        onClick={handleSaveSTL}
        fullWidth
        disabled={!canExport}
      >
        Сохранить STL
      </Button>
    </Box>
  );
};

export default MeshSettingsPanel;