import React from 'react';
import { BookContent, Tag } from '../types';
import { Search, Book, Tag as TagIcon, Globe } from 'lucide-react';

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
    <div className="bg-gray-50 p-3 rounded-lg mb-4">
      <div className="flex items-center mb-2">
        <Search className="h-4 w-4 mr-2 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Search Scope:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onScopeChange('all')}
          className={`flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${
            currentScope === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Globe className="h-3 w-3 mr-1" />
          All Books
        </button>

        {currentBook && (
          <button
            onClick={() => onScopeChange('book')}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${
              currentScope === 'book'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Book className="h-3 w-3 mr-1" />
            {currentBook.title}
          </button>
        )}

        {selectedTagObj && (
          <button
            onClick={() => onScopeChange('tag', selectedTag!)}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${
              currentScope === 'tag'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TagIcon className="h-3 w-3 mr-1" />
            {selectedTagObj.name}
          </button>
        )}
      </div>

      <div className="text-xs text-gray-500 mt-2">
        {currentScope === 'all' && 'Searching across all uploaded books'}
        {currentScope === 'book' && `Searching only in "${currentBook?.title}"`}
        {currentScope === 'tag' && `Searching only in content tagged as "${selectedTagObj?.name}"`}
      </div>
    </div>
  );
};
