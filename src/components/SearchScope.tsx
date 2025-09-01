import React from 'react';
import { Button, Typography } from '@mui/material';
import { BookContent, Tag } from '../types';
import { Search, Book, Tag as TagIcon, Globe } from 'lucide-react';
import { ContentCard } from './common/ContentCard';

interface SearchScopeProps {
  currentBook: BookContent | null;
  selectedTag: string | null;
  tags: Tag[];
  onScopeChange: (scope: 'all' | 'book' | 'tag', value?: string) => void;
}

export const SearchScope: React.FC<SearchScopeProps> = ({
  currentBook,
  selectedTag,
  tags,
  onScopeChange
}) => {
  const currentScope = selectedTag ? 'tag' : currentBook ? 'book' : 'all';
  const selectedTagObj = selectedTag ? tags.find(t => t.id === selectedTag) : null;

  return (
    <ContentCard>
      <Typography variant="subtitle2" gutterBottom>
        <Search size={16} /> Search Scope:
      </Typography>
      
      <Button
        onClick={() => onScopeChange('all')}
        variant={currentScope === 'all' ? 'contained' : 'outlined'}
        size="small"
        startIcon={<Globe />}
      >
        All Books
      </Button>

      {currentBook && (
        <Button
          onClick={() => onScopeChange('book')}
          variant={currentScope === 'book' ? 'contained' : 'outlined'}
          size="small"
          startIcon={<Book />}
        >
          {currentBook.title}
        </Button>
      )}

      {selectedTagObj && (
        <Button
          onClick={() => onScopeChange('tag', selectedTag!)}
          variant={currentScope === 'tag' ? 'contained' : 'outlined'}
          size="small"
          startIcon={<TagIcon />}
        >
          {selectedTagObj.name}
        </Button>
      )}

      <Typography variant="caption" color="text.secondary">
        {currentScope === 'all' && 'Searching across all uploaded books'}
        {currentScope === 'book' && `Searching only in "${currentBook?.title}"`}
        {currentScope === 'tag' && `Searching only in content tagged as "${selectedTagObj?.name}"`}
      </Typography>
    </ContentCard>
  );
};
