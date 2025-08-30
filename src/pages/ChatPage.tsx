import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';
import { SearchScope } from '../components/SearchScope';
import { ChatInterface } from '../components/ChatInterface';
import { useNavigate } from 'react-router-dom';

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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">AI Chat Assistant</h2>
      
      {bookStore.books.length > 0 && (
        <>
          <SearchScope
            currentBook={bookStore.currentBook}
            selectedTag={tagStore.selectedTag?.id || null}
            tags={tagStore.tags}
            onScopeChange={handleScopeChange}
          />
          <div className="bg-white rounded-lg shadow-sm border h-[calc(100vh-200px)]">
            <ChatInterface
              messages={uiStore.chatMessages}
              onSendMessage={handleChatMessage}
              isBookLoaded={bookStore.books.length > 0}
            />
          </div>
        </>
      )}
      
      {bookStore.books.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Upload a book to start chatting with AI</p>
          <button
            onClick={() => navigate('/upload')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Upload Book
          </button>
        </div>
      )}
    </div>
  );
});