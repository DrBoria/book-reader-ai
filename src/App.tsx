import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './stores';
import { rootStore } from './stores';
import { Sidebar } from './components/Sidebar';
import { BooksPage } from './pages/BooksPage';
import { TagsPage } from './pages/TagsPage';
import { ChatPage } from './pages/ChatPage';
import { UploadPage } from './pages/UploadPage';
import { SettingsPage } from './pages/SettingsPage';

const App: React.FC = () => {
  return (
    <StoreProvider value={rootStore}>
      <Router>
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <header className="bg-white shadow-sm border-b px-6 py-4 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Book Reader AI Agent
                  </h1>
                  <p className="text-sm text-gray-600">
                    DeepSeek R1 + LM Studio
                  </p>
                </div>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/books" replace />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
    </StoreProvider>
  );
};

export default App;
