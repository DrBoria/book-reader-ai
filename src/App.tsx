import React, { useState, useEffect } from "react";
import { BookContent, Tag, TaggedContent, ChatMessage, TagCategory } from "./types";
import { FileUpload } from "./components/FileUpload";
import { TagPanel } from "./components/TagPanel";
import { ContentDisplay } from "./components/ContentDisplay";
import { ChatInterface } from "./components/ChatInterface";
import { CategoryManager } from "./components/TagManager";
import { BookSelector } from "./components/BookSelector";
import { SearchScope } from "./components/SearchScope";
import { bookService } from "./services/bookService";
import { tagService } from "./services/tagService";
import { searchService } from "./services/searchService";
import { websocketService, ProcessingUpdate } from "./services/websocketService";

const App: React.FC = () => {
  const [books, setBooks] = useState<BookContent[]>([]);
  const [currentBook, setCurrentBook] = useState<BookContent | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [taggedContent, setTaggedContent] = useState<TaggedContent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showNewBookUpload, setShowNewBookUpload] = useState(false);
  const [searchScope, setSearchScope] = useState<'all' | 'book' | 'tag'>('all');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    // Initialize data and connections
    initializeApp();
    
    // Setup WebSocket
    websocketService.connect();
    websocketService.on('processing-update', handleProcessingUpdate);
    websocketService.on('processing-complete', handleProcessingComplete);
    websocketService.on('processing-error', handleProcessingError);
    
    return () => {
      websocketService.disconnect();
    };
  }, []);

  const initializeApp = async () => {
    try {
      const [fetchedBooks, fetchedTags, fetchedCategories] = await Promise.all([
        bookService.getAllBooks(),
        tagService.getAllTags(),
        tagService.getAllCategories()
      ]);
      
      setBooks(fetchedBooks);
      setTags(fetchedTags);
      setCategories(fetchedCategories);
      setConnectionStatus('connected');
      
      // Auto-select first book if available
      if (fetchedBooks.length > 0 && !currentBook) {
        setCurrentBook(fetchedBooks[0]);
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setConnectionStatus('disconnected');
    }
  };

  const refreshCategories = async () => {
    try {
      const [fetchedTags, fetchedCategories] = await Promise.all([
        tagService.getAllTags(),
        tagService.getAllCategories()
      ]);
      setTags(fetchedTags);
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Failed to refresh categories and tags:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      // Get category IDs for book processing
      const categoryIds = tags.filter(t => t.type === 'default').map(t => t.id);
      const result = await bookService.uploadBook(file, categoryIds);
      
      if (result) {
        // Join WebSocket room for this book
        websocketService.joinBook(result.bookId);
        
        // Refresh books list
        const updatedBooks = await bookService.getAllBooks();
        setBooks(updatedBooks);
        
        // Set as current book
        const newBook = updatedBooks.find(b => b.id === result.bookId);
        if (newBook) {
          setCurrentBook(newBook);
        }
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading PDF file. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTagSelect = async (tagId: string) => {
    setSelectedTag(tagId);
    
    if (currentBook) {
      const content = await tagService.getContentByTag(tagId, currentBook.id);
      setTaggedContent(content);
    }
  };

  const handleAddCustomCategory = async (categoryData: { name: string; description?: string; color?: string }) => {
    try {
      const category = await tagService.createCategory(categoryData);
      if (category) {
        const [updatedCategories, updatedTags] = await Promise.all([
          tagService.getAllCategories(),
          tagService.getAllTags()
        ]);
        setCategories(updatedCategories);
        setTags(updatedTags);
        return category;
      }
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category. Please try again.');
    }
    return null;
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await tagService.deleteTag(tagId);
      const [updatedCategories, updatedTags] = await Promise.all([
        tagService.getAllCategories(),
        tagService.getAllTags()
      ]);
      setCategories(updatedCategories);
      setTags(updatedTags);
      // Clear selection if deleted tag was selected
      if (selectedTag === tagId) {
        setSelectedTag(null);
        setTaggedContent([]);
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
      throw error;
    }
  };

  const handleBulkDeleteTags = async (tagIds: string[]) => {
    try {
      await tagService.bulkDeleteTags(tagIds);
      const [updatedCategories, updatedTags] = await Promise.all([
        tagService.getAllCategories(),
        tagService.getAllTags()
      ]);
      setCategories(updatedCategories);
      setTags(updatedTags);
      // Clear selection if deleted tag was selected
      if (selectedTag && tagIds.includes(selectedTag)) {
        setSelectedTag(null);
        setTaggedContent([]);
      }
    } catch (error) {
      console.error('Failed to bulk delete tags:', error);
      throw error;
    }
  };

  const handleChatMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Math.random().toString(36),
      type: "user",
      content: message,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);

    try {
      let bookIds: string[] | undefined;
      let tagId: string | undefined;
      
      if (searchScope === 'book' && currentBook) {
        bookIds = [currentBook.id];
      } else if (searchScope === 'tag' && selectedTag) {
        tagId = selectedTag;
      } else if (searchScope === 'all') {
        bookIds = books.map(b => b.id);
      }
      
      const response = await searchService.askQuestion(message, bookIds, tagId);
      
      if (response) {
        const assistantMessage: ChatMessage = {
          id: Math.random().toString(36),
          type: "assistant",
          content: response.answer,
          references: response.references,
          timestamp: new Date(response.timestamp)
        };
        
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error processing chat message:", error);
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36),
        type: "assistant",
        content: "Sorry, I encountered an error processing your question.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleBookSelect = (book: BookContent | null) => {
    setCurrentBook(book);
    setSelectedTag(null);
    setTaggedContent([]);
    setShowNewBookUpload(false);
    setSearchScope(book ? 'book' : 'all');
  };

  const handleNewBook = () => {
    setShowNewBookUpload(true);
    setCurrentBook(null);
    setSelectedTag(null);
    setTaggedContent([]);
  };

  const handleScopeChange = (scope: 'all' | 'book' | 'tag', value?: string) => {
    setSearchScope(scope);
    if (scope === 'all') {
      setCurrentBook(null);
      setSelectedTag(null);
      setTaggedContent([]);
    } else if (scope === 'tag' && value) {
      setSelectedTag(value);
      handleTagSelect(value);
    }
  };

  const handleUpdateBook = async (bookId: string, updates: { title?: string; author?: string }): Promise<boolean> => {
    try {
      const success = await bookService.updateBook(bookId, updates);
      if (success) {
        // Refresh books list
        const updatedBooks = await bookService.getAllBooks();
        setBooks(updatedBooks);
        
        // Update current book if it was the one edited
        if (currentBook?.id === bookId) {
          const updatedBook = updatedBooks.find(b => b.id === bookId);
          if (updatedBook) {
            setCurrentBook(updatedBook);
          }
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to update book:', error);
      return false;
    }
  };

  const handleDeleteBook = async (bookId: string): Promise<boolean> => {
    try {
      const success = await bookService.deleteBook(bookId);
      if (success) {
        // Remove from books list
        setBooks(prev => prev.filter(b => b.id !== bookId));
        
        // If deleted book was current, clear selection
        if (currentBook?.id === bookId) {
          setCurrentBook(null);
          setSelectedTag(null);
          setTaggedContent([]);
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to delete book:', error);
      return false;
    }
  };

  const handleProcessingUpdate = (update: ProcessingUpdate) => {
    if (currentBook && update.bookId === currentBook.id) {
      setProcessingProgress(update.progress);
      
      // Add new content as it becomes available
      if (update.newContent.length > 0) {
        setTaggedContent(prev => [...prev, ...update.newContent.map(content => ({
          ...content,
          bookId: update.bookId,
          pageId: '', // Will be set by server
        }))]);
      }
    }
  };

  const handleProcessingComplete = async (data: { bookId: string }) => {
    if (currentBook && data.bookId === currentBook.id) {
      setIsProcessing(false);
      setProcessingProgress(100);
      
      // Refresh current book data
      const updatedBook = await bookService.getBook(data.bookId);
      if (updatedBook) {
        setCurrentBook(updatedBook);
      }
      
      // Refresh tagged content if a tag is selected
      if (selectedTag) {
        const content = await tagService.getContentByTag(selectedTag, data.bookId);
        setTaggedContent(content);
      }
    }
  };

  const handleProcessingError = (data: { bookId: string; error: string }) => {
    if (currentBook && data.bookId === currentBook.id) {
      setIsProcessing(false);
      alert(`Error processing book: ${data.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📚 Book Reader AI Agent (DeepSeek R1 + LM Studio)
              </h1>
              <p className="text-gray-600 mt-1">
                AI agent for PDF book analysis powered by DeepSeek R1 via LM Studio
              </p>
            </div>
            <div className="text-right">
              {connectionStatus === 'connecting' && (
                <div className="text-yellow-600">🔄 Connecting to server...</div>
              )}
              {connectionStatus === 'connected' && (
                <div className="text-green-600">✅ Server Connected</div>
              )}
              {connectionStatus === 'disconnected' && (
                <div className="text-red-600">❌ Server Unavailable</div>
              )}
              {isProcessing && processingProgress > 0 && (
                <div className="text-blue-600">
                  📚 Processing: {processingProgress}%
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Books & Tags */}
          <div className="col-span-3 space-y-4">
            {/* Book Selector */}
            <BookSelector
              books={books}
              currentBook={currentBook}
              onBookSelect={handleBookSelect}
              onNewBook={handleNewBook}
              onUpdateBook={handleUpdateBook}
              onDeleteBook={handleDeleteBook}
            />

            {/* Tags Panel - only show if we have books */}
            {books.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Tags</h3>
                    <button
                      onClick={() => setShowCategoryManager(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Manage Categories
                    </button>
                  </div>
                </div>
                <div className="p-4 max-h-[calc(100vh-550px)] overflow-y-auto">
                  <TagPanel
                    tags={tags}
                    categories={categories}
                    taggedContent={taggedContent}
                    selectedTag={selectedTag}
                    onTagSelect={handleTagSelect}
                    onDeleteTag={handleDeleteTag}
                    onBulkDeleteTags={handleBulkDeleteTags}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="col-span-9">
            {books.length === 0 || showNewBookUpload ? (
              <div className="text-center py-12">
                <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search Scope */}
                <SearchScope
                  currentBook={currentBook}
                  selectedTag={selectedTag}
                  tags={tags}
                  onScopeChange={handleScopeChange}
                />

                <div className="grid grid-cols-2 gap-6 h-[calc(100vh-250px)]">
                  {/* Content Display */}
                  <div className="bg-white rounded-lg shadow-sm border overflow-y-auto">
                    <ContentDisplay
                      book={currentBook}
                      taggedContent={taggedContent}
                      selectedTag={selectedTag}
                      tags={tags}
                      isProcessing={isProcessing}
                      processingProgress={processingProgress}
                    />
                  </div>

                  {/* Chat Interface */}
                  <div className="bg-white rounded-lg shadow-sm border flex flex-col">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-semibold">AI Assistant</h3>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <ChatInterface
                        messages={chatMessages}
                        onSendMessage={handleChatMessage}
                        isBookLoaded={books.length > 0}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showCategoryManager && (
        <CategoryManager
          tags={tags}
          categories={categories}
          onAddCategory={handleAddCustomCategory}
          onClose={() => setShowCategoryManager(false)}
          onCategoriesUpdate={refreshCategories}
        />
      )}
    </div>
  );
};

export default App;
