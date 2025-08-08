import React from 'react';
import { ActiveView } from './Sidebar';
import { BookContent, Tag, TaggedContent, ChatMessage, TagCategory } from '../types';
import { BookSelector } from './BookSelector';
import { TagPanel } from './TagPanel';
import { ChatInterface } from './ChatInterface';
import { FileUpload } from './FileUpload';
import { CategoryManager } from './TagManager';
import { SearchScope } from './SearchScope';
import { ContentDisplay } from './ContentDisplay';

interface MainContentProps {
  activeView: ActiveView;
  books: BookContent[];
  currentBook: BookContent | null;
  tags: Tag[];
  categories: TagCategory[];
  selectedTag: string | null;
  taggedContent: TaggedContent[];
  isProcessing: boolean;
  processingProgress: number;
  chatMessages: ChatMessage[];
  searchScope: 'all' | 'book' | 'tag';
  onBookSelect: (book: BookContent | null) => void;
  onNewBook: () => void;
  onUpdateBook: (bookId: string, updates: { title?: string; author?: string }) => Promise<boolean>;
  onDeleteBook: (bookId: string) => Promise<boolean>;
  onTagSelect: (tagId: string) => void;
  onAddCustomCategory: (categoryData: { name: string; description?: string; color?: string; dataType?: string }) => Promise<any>;
  onDeleteTag: (tagId: string) => Promise<void>;
  onBulkDeleteTags: (tagIds: string[]) => Promise<void>;
  onFileUpload: (file: File) => Promise<void>;
  onChatMessage: (message: string) => Promise<void>;
  onScopeChange: (scope: 'all' | 'book' | 'tag', value?: string) => void;
  onCategoriesUpdate: () => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  activeView,
  books,
  currentBook,
  tags,
  categories,
  selectedTag,
  taggedContent,
  isProcessing,
  processingProgress,
  chatMessages,
  searchScope,
  onBookSelect,
  onNewBook,
  onUpdateBook,
  onDeleteBook,
  onTagSelect,
  onAddCustomCategory,
  onDeleteTag,
  onBulkDeleteTags,
  onFileUpload,
  onChatMessage,
  onScopeChange,
  onCategoriesUpdate
}) => {
  const renderBooksView = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Books</h2>
      <BookSelector
        books={books}
        currentBook={currentBook}
        onBookSelect={onBookSelect}
        onNewBook={onNewBook}
        onUpdateBook={onUpdateBook}
        onDeleteBook={onDeleteBook}
      />
      
      {currentBook && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Current Book: {currentBook.title}</h3>
          <ContentDisplay
            book={currentBook}
            taggedContent={taggedContent}
            selectedTag={selectedTag}
            tags={tags}
            isProcessing={isProcessing}
            processingProgress={processingProgress}
          />
        </div>
      )}
    </div>
  );

  const renderTagsView = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tags</h2>
        <button
          onClick={() => onAddCustomCategory({ name: '', color: '#3B82F6' })}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Category
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TagPanel
            tags={tags}
            categories={categories}
            taggedContent={taggedContent}
            selectedTag={selectedTag}
            onTagSelect={onTagSelect}
            onDeleteTag={onDeleteTag}
            onBulkDeleteTags={onBulkDeleteTags}
          />
        </div>
        
        <div className="lg:col-span-2">
          {currentBook && (
            <>
              <SearchScope
                currentBook={currentBook}
                selectedTag={selectedTag}
                tags={tags}
                onScopeChange={onScopeChange}
              />
              <ContentDisplay
                book={currentBook}
                taggedContent={taggedContent}
                selectedTag={selectedTag}
                tags={tags}
                isProcessing={isProcessing}
                processingProgress={processingProgress}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderChatView = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">AI Chat Assistant</h2>
      
      {books.length > 0 && (
        <>
          <SearchScope
            currentBook={currentBook}
            selectedTag={selectedTag}
            tags={tags}
            onScopeChange={onScopeChange}
          />
          <div className="bg-white rounded-lg shadow-sm border h-[calc(100vh-200px)]">
            <ChatInterface
              messages={chatMessages}
              onSendMessage={onChatMessage}
              isBookLoaded={books.length > 0}
            />
          </div>
        </>
      )}
      
      {books.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Upload a book to start chatting with AI</p>
          <button
            onClick={() => window.location.href = '#upload'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Upload Book
          </button>
        </div>
      )}
    </div>
  );

  const renderUploadView = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Upload New Book</h2>
      <FileUpload onFileUpload={onFileUpload} isProcessing={isProcessing} />
    </div>
  );

  const renderSettingsView = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <CategoryManager
        tags={tags}
        categories={categories}
        onAddCategory={onAddCustomCategory}
        onClose={() => {}}
        onCategoriesUpdate={onCategoriesUpdate}
        isModal={false}
      />
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'books':
        return renderBooksView();
      case 'tags':
        return renderTagsView();
      case 'chat':
        return renderChatView();
      case 'upload':
        return renderUploadView();
      case 'settings':
        return renderSettingsView();
      default:
        return renderBooksView();
    }
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      {renderContent()}
    </div>
  );
};