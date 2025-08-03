import React from 'react';
import { BookContent } from '../types';
import { Book, Plus } from 'lucide-react';
import { BookActions } from './BookActions';

interface BookSelectorProps {
  books: BookContent[];
  currentBook: BookContent | null;
  onBookSelect: (book: BookContent | null) => void;
  onNewBook: () => void;
  onUpdateBook: (bookId: string, updates: { title?: string; author?: string }) => Promise<boolean>;
  onDeleteBook: (bookId: string) => Promise<boolean>;
}

export const BookSelector: React.FC<BookSelectorProps> = ({
  books,
  currentBook,
  onBookSelect,
  onNewBook,
  onUpdateBook,
  onDeleteBook
}) => {
  const getStatusIcon = (status: BookContent['status']) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'failed': return '❌';
      default: return '📄';
    }
  };

  const getStatusColor = (status: BookContent['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Book className="h-5 w-5 mr-2" />
          Books ({books.length})
        </h3>
        <button
          onClick={onNewBook}
          className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Book
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        <button
          onClick={() => onBookSelect(null)}
          className={`w-full text-left p-3 rounded-md border transition-colors ${
            !currentBook 
              ? 'bg-blue-50 border-blue-200 text-blue-800' 
              : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center">
            <span className="text-lg mr-2">📚</span>
            <span className="font-medium">All Books</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Search across all books
          </div>
        </button>

        {books.map((book) => (
          <button
            key={book.id}
            onClick={() => onBookSelect(book)}
            className={`w-full text-left p-3 rounded-md border transition-colors ${
              currentBook?.id === book.id 
                ? 'bg-blue-50 border-blue-200 text-blue-800' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 flex-1">
                <span className="text-lg mr-2">{getStatusIcon(book.status)}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{book.title}</div>
                  {book.author && (
                    <div className="text-sm text-gray-500 truncate">
                      by {book.author}
                    </div>
                  )}
                </div>
              </div>
              <div className={`text-xs ${getStatusColor(book.status)} ml-2`}>
                {book.status}
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {book.totalPages} pages • {new Date(book.uploadedAt).toLocaleDateString()}
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-200">
              <BookActions
                book={book}
                onUpdate={onUpdateBook}
                onDelete={onDeleteBook}
              />
            </div>
          </button>
        ))}
      </div>

      {books.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Book className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No books uploaded yet</p>
          <p className="text-sm">Upload your first PDF to get started</p>
        </div>
      )}
    </div>
  );
};
