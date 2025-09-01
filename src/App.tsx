import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import { StoreProvider } from './stores';
import { rootStore } from './stores';
import theme from './theme';
import { Sidebar } from './components/Sidebar';
import { BooksPage } from './pages/BooksPage';
import { TagsPage } from './pages/TagsPage';
import { ChatPage } from './pages/ChatPage';
import { UploadPage } from './pages/UploadPage';
import { SettingsPage } from './pages/SettingsPage';

// Enable MST devtools in development
if (process.env.NODE_ENV === 'development') {
  import('mobx-devtools-mst').then((mstDevtools) => {
    if (mstDevtools.default) {
      mstDevtools.default(rootStore);
    }
  }).catch((error) => {
    console.warn('Failed to connect MST DevTools:', error);
  });
}

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <StoreProvider value={rootStore}>
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <AppBar position="static" elevation={1}>
                <Toolbar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h1">
                      Book Reader AI Agent
                    </Typography>
                    <Typography variant="caption" color="inherit">
                      DeepSeek R1 + LM Studio
                    </Typography>
                  </Box>
                </Toolbar>
              </AppBar>
              <Container maxWidth={false} sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
                <Routes>
                  <Route path="/" element={<Navigate to="/books" replace />} />
                  <Route path="/books" element={<BooksPage />} />
                  <Route path="/tags" element={<TagsPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Container>
            </Box>
          </Box>
        </Router>
      </StoreProvider>
    </ThemeProvider>
  );
};

export default App;
