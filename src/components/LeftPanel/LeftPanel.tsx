import { Box, Divider } from '@mui/material';
import ImageUpload from './ImageUpload';
import ImageSettingsPanel from './ImageSettings';
import MeshSettingsPanel from './MeshSettings';

const LeftPanel = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ImageUpload />
      
      <Divider />
      
      <ImageSettingsPanel />
      
      <Divider />
      
      <MeshSettingsPanel />
    </Box>
  );
};

export default LeftPanel;