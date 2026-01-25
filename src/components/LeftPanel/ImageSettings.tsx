import { Box, Typography, Checkbox, FormControlLabel, Slider, TextField, Divider } from '@mui/material';
import { useAppContext } from '../../store/useAppContext';

const ImageSettingsPanel = () => {
  const { imageSettings, updateImageSettings } = useAppContext();

  const handleInvertChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateImageSettings({ invert: event.target.checked });
  };

  const handleGaussianBlurChange = (_event: Event, value: number | number[]) => {
    updateImageSettings({ gaussianBlur: value as number });
  };

  const handleUniformBlurChange = (_event: Event, value: number | number[]) => {
    updateImageSettings({ uniformBlur: value as number });
  };

  const handleBezierChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    const newCurve = [...imageSettings.bezierCurve] as [number, number, number, number];
    newCurve[index] = Math.max(0, Math.min(1, numValue));
    updateImageSettings({ bezierCurve: newCurve });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Обработка изображения
      </Typography>

      <FormControlLabel
        control={
          <Checkbox
            checked={imageSettings.invert}
            onChange={handleInvertChange}
          />
        }
        label="Инвертировать"
      />

      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" gutterBottom>
          Гаусс: {imageSettings.gaussianBlur.toFixed(1)}
        </Typography>
        <Slider
          value={imageSettings.gaussianBlur}
          onChange={handleGaussianBlurChange}
          min={0}
          max={50}
          step={0.1}
          size="small"
        />
      </Box>

      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" gutterBottom>
          Uniform: {imageSettings.uniformBlur.toFixed(1)}
        </Typography>
        <Slider
          value={imageSettings.uniformBlur}
          onChange={handleUniformBlurChange}
          min={0}
          max={50}
          step={0.1}
          size="small"
        />
      </Box>

      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" gutterBottom>
          Bezier
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0.5 }}>
          <TextField
            label="x1"
            type="number"
            size="small"
            value={imageSettings.bezierCurve[0]}
            onChange={(e) => handleBezierChange(0, e.target.value)}
            inputProps={{ min: 0, max: 1, step: 0.01 }}
          />
          <TextField
            label="y1"
            type="number"
            size="small"
            value={imageSettings.bezierCurve[1]}
            onChange={(e) => handleBezierChange(1, e.target.value)}
            inputProps={{ min: 0, max: 1, step: 0.01 }}
          />
          <TextField
            label="x2"
            type="number"
            size="small"
            value={imageSettings.bezierCurve[2]}
            onChange={(e) => handleBezierChange(2, e.target.value)}
            inputProps={{ min: 0, max: 1, step: 0.01 }}
          />
          <TextField
            label="y2"
            type="number"
            size="small"
            value={imageSettings.bezierCurve[3]}
            onChange={(e) => handleBezierChange(3, e.target.value)}
            inputProps={{ min: 0, max: 1, step: 0.01 }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default ImageSettingsPanel;