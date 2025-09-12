import React from 'react';
import { BookContent } from '../../types';
import { Book, Plus } from 'lucide-react';
import { BookActions } from './BookActions';
import { Typography, Button, Paper, List, ListItem, ListItemText, ListItemButton } from '@mui/material';
import { ContentCard } from '../common/ContentCard';
import { observer } from 'mobx-react-lite';

interface BookSelectorProps {
  books: BookContent[];
  currentBook: BookContent | null;
  onBookSelect: (bookId: string | null) => void;
  onNewBook: () => void;
  onUpdateBook: (bookId: string, updates: { title?: string; author?: string }) => Promise<boolean>;
  onDeleteBook: (bookId: string) => Promise<boolean>;
}

export const BookSelector: React.FC<BookSelectorProps> = observer(({
  books,
  currentBook,
  onBookSelect,
  onNewBook,
  onUpdateBook,
  onDeleteBook
}) => {
  return (
    <ContentCard>
      <Typography variant="h6" gutterBottom>
        Books ({books.length})
      </Typography>

      <Button
        variant="contained"
        size="small"
        onClick={onNewBook}
        startIcon={<Plus size={16} />}
      >
        Add Book
      </Button>

      <List>
        <ListItem disablePadding>
          <ListItemButton
            selected={!currentBook}
            onClick={() => onBookSelect(null)}
          >
            <ListItemText
              primary="All Books"
              secondary="Search across all books"
            />
          </ListItemButton>
        </ListItem>

        {books.map((book) => (
          <ListItem key={book.id} disablePadding>
            <ListItemButton
              selected={currentBook?.id === book.id}
              onClick={() => onBookSelect(book.id)}
            >
              <ListItemText
                primary={book.title}
                secondary={`${book.pages.length} pages • ${new Date(book.uploadedAt).toLocaleDateString()}`}
              />
            </ListItemButton>
            <BookActions
              book={book}
              onUpdate={onUpdateBook}
              onDelete={onDeleteBook}
            />
          </ListItem>
        ))}
      </List>

      {books.length === 0 && (
        <ContentCard type="empty">
          <Book size={48} />
          <Typography variant="body1">No books uploaded yet</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload your first PDF to get started
          </Typography>
        </ContentCard>
      )}
    </ContentCard>
  );
});
