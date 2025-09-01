import React from 'react';
import { Typography } from '@mui/material';
import { BookContent } from '../../types';
import { BookActions } from './BookActions';
import { ContentCard } from '../common/ContentCard';

interface BookItemProps {
  book: BookContent;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (bookId: string, updates: { title?: string; author?: string }) => Promise<boolean>;
  onDelete: (bookId: string) => Promise<boolean>;
}

export const BookItem: React.FC<BookItemProps> = ({
  book,
  isSelected,
  onSelect,
  onUpdate,
  onDelete
}) => {
  return (
    <ContentCard
      type="book"
      variant={isSelected ? 'elevation' : 'outlined'}
      onClick={onSelect}
      container
    >
      <Typography variant="body1" fontWeight="medium">
        📄 {book.title}
      </Typography>
      
      {book.author && (
        <Typography variant="body2" color="text.secondary">
          by {book.author}
        </Typography>
      )}
      
      <Typography variant="caption" color="text.secondary">
        {book.pages.length} pages • {new Date(book.uploadedAt).toLocaleDateString()}
      </Typography>
      
      <BookActions
        book={book}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </ContentCard>
  );
};
