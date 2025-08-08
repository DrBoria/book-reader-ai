import React, { useState, useEffect } from "react";
import { BookContent, Tag, TaggedContent, ChatMessage, TagCategory } from "./types";
import { Sidebar, ActiveView } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
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
  const [activeView, setActiveView] = useState<ActiveView>('books');
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default expanded width in pixels
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

  const handleAddCustomCategory = async (categoryData: { name: string; description?: string; color?: string; dataType?: string }) => {
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

  const handleChatMessage = async (message: string): Promise<void> => {
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
    setSearchScope(book ? 'book' : 'all');
  };

  const handleNewBook = () => {
    setActiveView('upload');
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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        bookCount={books.length}
        tagCount={tags.length}
        onWidthChange={setSidebarWidth}
      />
      
      <div 
        className="flex-1 flex flex-col transition-all duration-300 ease-in-out"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
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
            <div className="text-right">
              {connectionStatus === 'connecting' && (
                <div className="text-yellow-600 text-sm">🔄 Connecting...</div>
              )}
              {connectionStatus === 'connected' && (
                <div className="text-green-600 text-sm">✅ Connected</div>
              )}
              {connectionStatus === 'disconnected' && (
                <div className="text-red-600 text-sm">❌ Offline</div>
              )}
              {isProcessing && processingProgress > 0 && (
                <div className="text-blue-600 text-sm">
                  📚 {processingProgress}%
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
            <MainContent
              activeView={activeView}
              books={books}
              currentBook={currentBook}
              tags={tags}
              categories={categories}
              selectedTag={selectedTag}
              taggedContent={taggedContent}
              isProcessing={isProcessing}
              processingProgress={processingProgress}
              chatMessages={chatMessages}
              searchScope={searchScope}
              onBookSelect={handleBookSelect}
              onNewBook={handleNewBook}
              onUpdateBook={handleUpdateBook}
              onDeleteBook={handleDeleteBook}
              onTagSelect={handleTagSelect}
              onAddCustomCategory={handleAddCustomCategory}
              onDeleteTag={handleDeleteTag}
              onBulkDeleteTags={handleBulkDeleteTags}
              onFileUpload={handleFileUpload}
              onChatMessage={handleChatMessage}
              onScopeChange={handleScopeChange}
              onCategoriesUpdate={refreshCategories}
            />
          </div>
        </div>
      </div>
    );
  };

export default App;
