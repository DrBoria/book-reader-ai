import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar, Toolbar, Typography } from '@mui/material';
import { StoreProvider } from './stores';
import { rootStore } from './stores';
import theme from './theme';
import { Sidebar } from './components/Sidebar';
import { Container } from './components/common/Container';
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
          <Container type="full" sx={{ display: 'flex', padding: '0!important' }}>
            <Sidebar />
            <Container type="full">
              <Routes>
                <Route path="/" element={<Navigate to="/books" replace />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Container>
          </Container>
        </Router>
      </StoreProvider>
    </ThemeProvider>
  );
};

export default App;
