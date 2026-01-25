import { Box, Grid, Paper, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AppProvider } from './store/AppContext';
import { useImageProcessing } from './hooks/useImageProcessing';
import LeftPanel from './components/LeftPanel/LeftPanel';
import Viewer3D from './components/Viewer3D/Viewer3D';
import ImagePreview from './components/RightPanel/ImagePreview';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function AppContent() {
  // Хук для автоматической обработки изображения при изменении настроек
  useImageProcessing();

  return (
    <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'flex' }}>
          <Grid container spacing={1} sx={{ height: '100%', p: 1 }}>
            {/* Левая панель - загрузка, настройки и превью */}
            <Grid item xs={12} md={3} sx={{ height: '100%', overflow: 'auto' }}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2, 
                  height: '100%',
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                <LeftPanel />
              </Paper>
            </Grid>

            {/* Центральная область - 3D viewer (расширена) */}
            <Grid item xs={12} md={9} sx={{ height: '100%' }}>
              <Box sx={{ height: '100%', position: 'relative' }}>
                <Viewer3D />
                
                {/* Preview обработанного изображения поверх 3D viewer */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 300,
                    maxHeight: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: 1,
                    boxShadow: 3,
                    p: 2,
                    overflow: 'auto',
                  }}
                >
                  <ImagePreview />
                </Box>
              </Box>
            </Grid>
          </Grid>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;