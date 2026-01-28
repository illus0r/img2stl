import { Box, Typography, Slider, TextField, Button, Divider } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAppContext } from '../../store/useAppContext';
import { useSTLExport } from '../../hooks/useSTLExport';

const MeshSettingsPanel = () => {
  const { meshSettings, updateMeshSettings, imageAspectRatio } = useAppContext();
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
      const newHeight = value / imageAspectRatio;
      updateMeshSettings({ width: value, height: newHeight });
    }
  };

  const handleHeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value > 0) {
      const newWidth = value * imageAspectRatio;
      updateMeshSettings({ height: value, width: newWidth });
    }
  };

  const handleOutlineThresholdChange = (_event: Event, value: number | number[]) => {
    updateMeshSettings({ outlineThreshold: value as number });
  };

  const handleOutlineOffsetChange = (_event: Event, value: number | number[]) => {
    updateMeshSettings({ outlineOffset: value as number });
  };

  const handleSaveSTL = () => {
    exportSTL();
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Настройки сетки
      </Typography>

      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" gutterBottom>
          Разрешение: {meshSettings.resolution}
        </Typography>
        <Slider
          value={meshSettings.resolution}
          onChange={handleResolutionChange}
          min={10}
          max={1024}
          step={1}
          size="small"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mt: 1 }}>
        <TextField
          label="Экструзия"
          type="number"
          size="small"
          value={meshSettings.extrusionHeight.toFixed(2)}
          onChange={handleExtrusionHeightChange}
          inputProps={{ min: 0, step: 0.01 }}
        />
        <TextField
          label="Основание"
          type="number"
          size="small"
          value={meshSettings.baseHeight.toFixed(2)}
          onChange={handleBaseHeightChange}
          inputProps={{ min: 0, step: 0.01 }}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mt: 0.5 }}>
        <TextField
          label="Ширина"
          type="number"
          size="small"
          value={meshSettings.width.toFixed(2)}
          onChange={handleWidthChange}
          inputProps={{ min: 0, step: 0.01 }}
        />
        <TextField
          label="Высота"
          type="number"
          size="small"
          value={meshSettings.height.toFixed(2)}
          onChange={handleHeightChange}
          inputProps={{ min: 0, step: 0.01 }}
        />
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" gutterBottom>
          Порог: {meshSettings.outlineThreshold}
        </Typography>
        <Slider
          value={meshSettings.outlineThreshold}
          onChange={handleOutlineThresholdChange}
          min={0}
          max={255}
          step={1}
          size="small"
        />
      </Box>

      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" gutterBottom>
          Отступ: {meshSettings.outlineOffset}%
        </Typography>
        <Slider
          value={meshSettings.outlineOffset}
          onChange={handleOutlineOffsetChange}
          min={0}
          max={50}
          step={0.5}
          size="small"
        />
      </Box>

      <Divider sx={{ my: 1 }} />

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
