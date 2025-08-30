import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';
import { BookSelector } from '../components/BookSelector';
import { ContentDisplay } from '../components/ContentDisplay';

export const BooksPage: React.FC = observer(() => {
  const { bookStore, tagStore, uiStore } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    bookStore.loadBooks();
    tagStore.loadTaggedContent();
    tagStore.loadTags();
  }, [bookStore, tagStore]);

  const handleBookSelect = (book: any) => {
    bookStore.setCurrentBook(book);
  };

  const handleNewBook = () => {
    navigate('/upload');
  };

  const handleUpdateBook = async (bookId: string, updates: { title?: string; author?: string }) => {
    bookStore.updateBook(bookId, updates);
    return true;
  };

  const handleDeleteBook = async (bookId: string) => {
    bookStore.deleteBook(bookId);
    return true;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Books</h2>
      <BookSelector
        books={Array.from(bookStore.books)}
        currentBook={bookStore.currentBook || null}
        onBookSelect={handleBookSelect}
        onNewBook={handleNewBook}
        onUpdateBook={handleUpdateBook}
        onDeleteBook={handleDeleteBook}
      />
      
      {bookStore.currentBook && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">
            Current Book: {bookStore.currentBook.title}
          </h3>
          <ContentDisplay
            book={bookStore.currentBook}
            taggedContent={Array.from(tagStore.taggedContent)}
            selectedTag={tagStore.selectedTag?.id || null}
            tags={Array.from(tagStore.tags)}
            isProcessing={uiStore.isProcessing}
            processingProgress={uiStore.processingProgress}
          />
        </div>
      )}
    </div>
  );
});