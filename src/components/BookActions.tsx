import React, { useState } from 'react';
import { BookContent } from '../types';
import { Edit2, Trash2, Save, X } from 'lucide-react';

interface BookActionsProps {
  book: BookContent;
  onUpdate: (bookId: string, updates: { title?: string; author?: string }) => Promise<boolean>;
  onDelete: (bookId: string) => Promise<boolean>;
}

export const BookActions: React.FC<BookActionsProps> = ({
  book,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    const updates: { title?: string; author?: string } = {};
    
    if (title !== book.title) updates.title = title;
    if (author !== book.author) updates.author = author;
    
    if (Object.keys(updates).length > 0) {
      const success = await onUpdate(book.id, updates);
      if (success) {
        setIsEditing(false);
      } else {
        alert('Failed to update book');
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTitle(book.title);
    setAuthor(book.author || '');
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(book.id);
    if (!success) {
      alert('Failed to delete book');
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Book title"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Author
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Author name"
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
        title="Edit book"
      >
        <Edit2 className="h-3 w-3 mr-1" />
        Edit
      </button>
      
      {showDeleteConfirm ? (
        <div className="flex items-center space-x-1">
          <span className="text-xs text-red-600">Delete?</span>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? '...' : 'Yes'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
          title="Delete book"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </button>
      )}
    </div>
  );
};
