import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';
import { SearchScope } from '../components/SearchScope';
import { ChatInterface } from '../components/ChatInterface';
import { useNavigate } from 'react-router-dom';
import { Typography, Button } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { ChatMessage } from '../types';
import { Container } from '../components/common/Container';
import { ContentCard } from '../components/common/ContentCard';

export const ChatPage: React.FC = observer(() => {
  const { bookStore, tagStore, uiStore } = useStore();
  const navigate = useNavigate();

  const handleChatMessage = async (message: string) => {
    uiStore.addChatMessage({
      id: Date.now().toString(),
      content: message,
      type: 'user' as const,
      timestamp: new Date(),
    });
  };

  const handleScopeChange = (scope: 'all' | 'book' | 'tag', value?: string) => {
    // Implementation for scope change
  };

  return (
    <Container type="page">
      <Typography variant="h4" gutterBottom>
        AI Chat Assistant
      </Typography>
      
      {bookStore.books.length > 0 && (
        <>
          <SearchScope
            currentBook={bookStore.currentBook || null}
            selectedTag={typeof tagStore.selectedTag === 'string' ? tagStore.selectedTag : tagStore.selectedTag?.id || null}
            tags={Array.from(tagStore.tags)}
            onScopeChange={handleScopeChange}
          />
          <ContentCard
            type="page"
            fullWidth
            sx={{ height: 'calc(100vh - 200px)', mt: 2 }}
          >
            <ChatInterface
              messages={Array.from(uiStore.chatMessages) as ChatMessage[]}
              onSendMessage={handleChatMessage}
              isBookLoaded={bookStore.books.length > 0}
            />
          </ContentCard>
        </>
      )}
      
      {bookStore.books.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Upload a book to start chatting with AI
          </Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => navigate('/upload')}
          >
            Upload Book
          </Button>
        </div>
      )}
    </Container>
  );
});