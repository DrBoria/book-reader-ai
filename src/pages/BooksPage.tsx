import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';
import { BookSelector } from '../components/Book/BookSelector';
import { BookOverview } from '../components/Book/BookOverview';
import { Typography } from '@mui/material';
import { Container } from '../components/common/Container';
import { ContentCard } from '../components/common/ContentCard';

export const BooksPage: React.FC = observer(() => {
  const { bookStore, tagStore, uiStore } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    bookStore.loadBooks();
    tagStore.loadTaggedContent();
    tagStore.loadTags();
  }, [bookStore, tagStore]);

  const handleBookSelect = (bookId: string | null) => {
    if (bookId === null) {
      bookStore.setCurrentBook(undefined);
      return;
    }
    
    const mstBook = bookStore.books.find(b => b.id === bookId);
    if (mstBook) {
      bookStore.setCurrentBook(mstBook);
    }
  };

  const handleNewBook = () => {
    navigate('/upload');
  };

  const handleUpdateBook = async (bookId: string, updates: { title?: string; author?: string }) => {
    try {
      await bookStore.updateBook(bookId, updates);
      return true;
    } catch (error) {
      console.error('Failed to update book:', error);
      return false;
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    await bookStore.removeBook(bookId);
    return true;
  };

  return (
    <Container type="page">
      <Typography variant="h4" gutterBottom>
        Books
      </Typography>
      <BookSelector
        books={Array.from(bookStore.books)}
        currentBook={bookStore.currentBook || null}
        onBookSelect={handleBookSelect}
        onNewBook={handleNewBook}
        onUpdateBook={handleUpdateBook}
        onDeleteBook={handleDeleteBook}
      />
      
      {bookStore.currentBook && (
        <ContentCard type="page" fullWidth sx={{ mt: 2 }}>
          <Typography variant="h5" gutterBottom>
            Current Book: {bookStore.currentBook.title}
          </Typography>
          <BookOverview
            book={bookStore.currentBook}
            tags={Array.from(tagStore.tags)}
          />
        </ContentCard>
      )}
    </Container>
  );
});
